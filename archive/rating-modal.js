/**
 * @file Manages the internal logic for the premium rating modal component.
 * This script should be self-contained and only handle events within the modal.
 */
import { showToast } from '../../utils/toast.js';
import { firestore } from '../../firebase/firebase-config.js';
import { generateId } from '../../utils/idGenerator.js';
import { AuthService } from '../../firebase/auth/auth.js';

/**
 * Fetches the rating modal HTML and inserts it into the DOM.
 * @returns {Promise<HTMLElement>} A promise that resolves with the rating modal element.
 */
export async function loadRatingModal() {
  try {
    const response = await fetch('./source/partials/modals/rating/rating-modal.html');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const htmlContent = await response.text();

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const modalElement = tempDiv.querySelector('#rating-modal');
    if (!modalElement) {
      throw new Error('Rating modal element not found in rating-modal.html');
    }

    const styleElement = tempDiv.querySelector('style');
    if (styleElement) {
      document.head.appendChild(styleElement);
    }

    document.body.appendChild(modalElement);
    return modalElement;

  } catch (error) {
    console.error('Error loading rating modal:', error);
    throw error;
  }
}

/**
 * Initializes the functionality of the rating modal.
 * @param {HTMLElement} modal The rating modal element.
 */
export function initRatingModal(modal) {
  if (!modal) {
    console.error("Rating modal element not found. Ensure loadRatingModal() was called.");
    return;
  }

  // Get all interactive elements from the modal
  const stars = modal.querySelectorAll('.star');
  const ratingFeedback = modal.querySelector('#ratingFeedback');
  const ratingValue = modal.querySelector('#ratingValue');
  const submitBtn = modal.querySelector('#submitBtn');
  const commentBoxWrapper = modal.querySelector('#commentBoxWrapper');
  const selectedRatingDiv = modal.querySelector('.selected-rating');
  const notNowBtn = modal.querySelector('#notNowBtn');
  const progressBar = modal.querySelector('#progressBar');
  const ratingBreakdown = modal.querySelector('#ratingBreakdown');
  const experienceTitle = modal.querySelector('#experienceTitle');
  const experienceChipsContainer = modal.querySelector('#experienceChips');
  
  let currentRating = 0;
  let selectedExperience = '';

  const ratingMessages = {
      1: "Poor experience 😞<br><span class='rating-feedback-subtitle'>We'll do better!</span>",
      2: "Could be better 😐<br><span class='rating-feedback-subtitle'>How can we improve?</span>", 
      3: "Good experience 🙂<br><span class='rating-feedback-subtitle'>Thanks for your feedback!</span>",
      4: "Great experience! 😊<br><span class='rating-feedback-subtitle'>We're glad you liked it!</span>",
      5: "Outstanding! 🤩<br><span class='rating-feedback-subtitle'>Thank you for your perfect rating!</span>"
  };

  const experienceOptions = {
      negative: [
          { tag: 'slow', icon: 'fa-turtle', text: 'Slow' },
          { tag: 'buggy', icon: 'fa-bug', text: 'Bugs' },
          { tag: 'confusing', icon: 'fa-question-circle', text: 'Confusing' },
      ],
      neutral: [
          { tag: 'average', icon: 'fa-chart-line', text: 'Average' },
          { tag: 'okay', icon: 'fa-thumbs-up', text: 'It\'s Okay' },
          { tag: 'needs_work', icon: 'fa-wrench', text: 'Needs Work' },
      ],
      positive: [
          { tag: 'fast', icon: 'fa-bolt', text: 'Fast' },
          { tag: 'great_ui', icon: 'fa-palette', text: 'Great UI' },
          { tag: 'love_it', icon: 'fa-heart', text: 'Love It!' },
      ]
  };

  const closeModal = () => {
    modal.style.display = 'none';
    // TODO: Add a resetForm() call here if needed when closing without submitting.
  };

  // Close modal when clicking outside of the content
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  // Star rating interaction logic
  stars.forEach(star => {
      star.addEventListener('click', function() {
          currentRating = parseInt(this.getAttribute('data-rating'));
          updateRatingUI();
          updateProgress(50);
      });
      star.addEventListener('mouseenter', function() {
          const rating = parseInt(this.getAttribute('data-rating'));
          highlightStars(rating);
          showFeedback(ratingMessages[rating]);
      });
      star.addEventListener('mouseleave', function() {
          highlightStars(currentRating);
          showFeedback(currentRating ? ratingMessages[currentRating] : "Tap stars to rate");
      });
  });

  function highlightStars(rating) {
      stars.forEach(star => {
          star.classList.toggle('active', parseInt(star.getAttribute('data-rating')) <= rating);
      });
  }

  function showFeedback(message) {
      ratingFeedback.innerHTML = message;
      ratingFeedback.classList.add('show');
  }

  function updateRatingUI() {
      ratingValue.textContent = currentRating;
      showFeedback(ratingMessages[currentRating]);
      highlightStars(currentRating);

      commentBoxWrapper.classList.toggle('show', currentRating > 0 && currentRating < 4);
      selectedRatingDiv.classList.add('show');

      ratingValue.classList.remove('low', 'medium', 'high');
      if (currentRating <= 2) ratingValue.classList.add('low');
      else if (currentRating === 3) ratingValue.classList.add('medium');
      else ratingValue.classList.add('high');

      renderExperienceChips(currentRating);
  }

  function updateProgress(percent) {
      progressBar.style.width = `${percent}%`;
  }

  function renderExperienceChips(rating) {
      let options;
      if (rating <= 2) options = experienceOptions.negative;
      else if (rating === 3) options = experienceOptions.neutral;
      else options = experienceOptions.positive;

      experienceChipsContainer.innerHTML = '';
      options.forEach(opt => {
          const chip = document.createElement('button');
          chip.className = 'experience-chip';
          chip.dataset.experience = opt.tag;
          chip.innerHTML = `<i class="fas ${opt.icon}"></i> ${opt.text}`;
          experienceChipsContainer.appendChild(chip);
      });
      experienceTitle.classList.add('show');
      experienceChipsContainer.classList.add('show');
  }

  experienceChipsContainer.addEventListener('click', function(e) {
      const clickedChip = e.target.closest('.experience-chip');
      if (clickedChip) {
          this.querySelectorAll('.experience-chip').forEach(c => c.classList.remove('selected'));
          clickedChip.classList.add('selected');
          selectedExperience = clickedChip.dataset.experience;
          updateProgress(75);
      }
  });

  // Button actions
  submitBtn.addEventListener('click', function() {
      if (currentRating === 0) {
          showFeedback("Please select a rating first!");
          this.classList.add('shake');
          setTimeout(() => this.classList.remove('shake'), 500);
          return;
      }

      this.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      this.innerHTML = '<i class="fas fa-check"></i> Submitted';
      
      createConfetti();
      
      setTimeout(() => {
          showToast('success', 'Thank you for your valuable feedback! 🌟');
          ratingBreakdown.classList.add('show');
          updateProgress(100);
          setTimeout(closeModal, 2000); // Close modal after a delay
      }, 800);
  });

  notNowBtn.addEventListener('click', function() {
      showToast('info', 'Okay, maybe next time!');
      closeModal();
  });

  function resetForm() {
      currentRating = 0;
      selectedExperience = '';
      ratingValue.textContent = '0';
      ratingFeedback.textContent = 'Tap stars to rate';
      stars.forEach(star => star.classList.remove('active'));
      experienceChipsContainer.innerHTML = '';
      submitBtn.style.background = 'var(--accent-primary)';
      submitBtn.innerHTML = 'Submit';
      commentBoxWrapper.classList.remove('show');
      ratingBreakdown.classList.remove('show');
      selectedRatingDiv.classList.remove('show');
      experienceTitle.classList.remove('show');
      experienceChipsContainer.classList.remove('show');
      updateProgress(0);
  }

  // Confetti effect
  function createConfetti() {
      const colors = ['var(--accent-warning)', 'var(--accent-danger)', 'var(--accent-success)', 'var(--accent-primary)', '#8b5cf6'];
      const confettiCount = 50;
      
      for (let i = 0; i < confettiCount; i++) {
          const confetti = document.createElement('div');
          confetti.className = 'confetti';
          confetti.style.left = Math.random() * 100 + 'vw';
          confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          confetti.style.width = Math.random() * 10 + 5 + 'px';
          confetti.style.height = Math.random() * 10 + 5 + 'px';
          confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
          document.body.appendChild(confetti);
          
          const animation = confetti.animate([
              { opacity: 1, transform: 'translateY(0) rotate(0deg)' },
              { opacity: 1, transform: `translateY(${Math.random() * 300 + 100}px) rotate(${Math.random() * 360}deg)` },
              { opacity: 0, transform: `translateY(${Math.random() * 300 + 400}px) rotate(${Math.random() * 720}deg)` }
          ], {
              duration: Math.random() * 2000 + 1500,
              easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)'
          });
          
          animation.onfinish = () => confetti.remove();
      }
  }

  // Initial setup
  ratingFeedback.classList.add('show');
  updateProgress(0);
  console.log("✅ Rating Modal Initialized.");
}