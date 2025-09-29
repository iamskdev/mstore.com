/**
 * @file Manages the internal logic for the feedback modal component.
 * This script should be self-contained and only handle events within the modal.
 */
import { showToast } from '../../utils/toast.js';

/**
 * Fetches the feedback modal HTML and inserts it into the DOM.
 * This function should be called first to ensure the modal HTML is present in the document.
 * @returns {Promise<HTMLElement>} A promise that resolves with the feedback modal element.
 */
export async function loadFeedbackModal() {
  try {
    // Adjust the path if your web server serves files from a different root
    const response = await fetch('./source/partials/modals/feedback.html');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const htmlContent = await response.text();

    // Create a temporary div to parse the HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    // Extract the modal element
    const modalElement = tempDiv.querySelector('#feedback-modal');
    if (!modalElement) {
      throw new Error('Feedback modal element not found in feedback.html');
    }

    // Extract and append styles if they are embedded in the HTML
    // It's generally better to have styles in a separate CSS file,
    // but if embedded, this will add them.
    const styleElement = tempDiv.querySelector('style');
    if (styleElement) {
      document.head.appendChild(styleElement);
    }

    // Append the modal to the body or a specific container
    document.body.appendChild(modalElement);

    return modalElement;

  } catch (error) {
    console.error('Error loading feedback modal:', error);
    throw error;
  }
}


export function initFeedbackModal() {
  const modal = document.getElementById('feedback-modal');

  // The controller (item-details.js) is responsible for showing the modal.
  // This script only handles what happens *inside* it.
  if (!modal) {
    console.error("Feedback modal element not found in the DOM. Ensure loadFeedbackModal() was called.");
    return;
  }

  const backdrop = document.getElementById('custom-select-backdrop');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const submitBtn = document.getElementById('modal-submit-btn');
  const countrySelectWrapper = document.getElementById('country-code-select');
  const typeSelectWrapper = document.getElementById('type-select');

  const closeModal = () => modal.style.display = 'none';

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  // --- Custom Select Logic ---
  function setupCustomSelect(wrapperId) {
    const selectWrapper = document.getElementById(wrapperId);
    if (!selectWrapper) return;

      const trigger = selectWrapper.querySelector('.custom-select-trigger');
      const options = selectWrapper.querySelector('.custom-options');
      const triggerSpan = trigger.querySelector('span');
      // Backdrop is now defined outside and passed or accessed globally
      const searchInput = selectWrapper.querySelector('.custom-select-search');
      const isCountrySelect = (wrapperId === 'country-code-select');
      const countrySelectCloseBtn = selectWrapper.querySelector('#country-select-close-btn'); // Only exists for country select

      const closeThisSelect = () => {
        selectWrapper.classList.remove('open');
        if (isCountrySelect && backdrop) {
          backdrop.style.opacity = '0';
          setTimeout(() => backdrop.style.display = 'none', 200);
        }
      };

      trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          // Close other open selects
          document.querySelectorAll('.custom-select-wrapper.open').forEach(openSelect => {
              if (openSelect.id !== wrapperId) {
                  openSelect.classList.remove('open');
                  // If the other open select was the country select, hide its backdrop
                  if (openSelect.id === 'country-code-select' && backdrop) {
                    backdrop.style.opacity = '0';
                    setTimeout(() => backdrop.style.display = 'none', 200);
                  }
              }
          });
          selectWrapper.classList.toggle('open');

          // Show/Hide backdrop only for the country select
          if (isCountrySelect && backdrop) {
            if (selectWrapper.classList.contains('open')) {
              backdrop.style.display = 'block';
              setTimeout(() => backdrop.style.opacity = '1', 10);
            } else {
              backdrop.style.opacity = '0';
              setTimeout(() => backdrop.style.display = 'none', 200);
            }
          }

          // Focus the search input when dropdown opens
          if (selectWrapper.classList.contains('open') && searchInput) {
            setTimeout(() => searchInput.focus(), 0);
          }
      });
      
      // Listener for the country select's internal close button
      if (countrySelectCloseBtn) {
        countrySelectCloseBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent trigger from re-opening it
          closeThisSelect();
        });
      }

      options.addEventListener('click', (e) => {
          const option = e.target.closest('.custom-option');
          if (option) {
              if (isCountrySelect) {
                triggerSpan.textContent = option.dataset.value;
              } else {
                triggerSpan.textContent = option.textContent;
              }
              trigger.dataset.value = option.dataset.value;

              const currentSelected = options.querySelector('.custom-option.selected');
              if (currentSelected) currentSelected.classList.remove('selected');
              option.classList.add('selected');
              closeThisSelect(); // Use the new helper function
          }
      });

      const initialSelected = options.querySelector('.custom-option.selected');
      if(initialSelected) {
          trigger.dataset.value = initialSelected.dataset.value;
          if (!isCountrySelect) { // Only update text for type select, country select already has it
            triggerSpan.textContent = initialSelected.textContent;
          }
      }

      // Search functionality
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const searchTerm = e.target.value.toLowerCase();
          const allOptions = options.querySelectorAll('.custom-option');
          allOptions.forEach(option => {
            const optionText = option.textContent.toLowerCase();
            if (optionText.includes(searchTerm)) {
              option.style.display = '';
            } else {
              option.style.display = 'none';
            }
          });
        });
      }
    }

  setupCustomSelect('country-code-select');
  setupCustomSelect('type-select');

  // --- NEW: Add listener to backdrop to close the select ---
  // This listener should only close the country-code-select if it's open.
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      const countrySelect = document.getElementById('country-code-select');
      if (countrySelect && countrySelect.classList.contains('open')) {
        countrySelect.classList.remove('open');
        backdrop.style.opacity = '0';
        setTimeout(() => backdrop.style.display = 'none', 200);
      }
    });
  }

  // Global click listener to close any open custom select when clicking outside
  window.addEventListener('click', (e) => {
    document.querySelectorAll('.custom-select-wrapper.open').forEach(openSelect => {
      // Check if the click target is outside the current open select wrapper
      if (!openSelect.contains(e.target)) {
        openSelect.classList.remove('open');
        // If the closed select was the country select, hide its backdrop
        if (openSelect.id === 'country-code-select' && backdrop) {
          backdrop.style.opacity = '0';
          setTimeout(() => backdrop.style.display = 'none', 200);
        }
      } // Closing brace for the if (!openSelect.contains(e.target))
    }); // Closing brace for the forEach callback
  });

  // FIX: Apply this js
  document.addEventListener('click', function(e) {
    const feedbackModal = document.getElementById('feedback-modal');
    const countryCodeSelect = document.querySelector('#country-code-select');

    // Main modal close buttons
    if (e.target && (e.target.id === 'modal-close-btn' || e.target.id === 'modal-cancel-btn')) {
      if (feedbackModal) {
        feedbackModal.style.display = 'none';
      }
    }
  });

  // --- Submit Logic ---
  submitBtn.addEventListener('click', () => {
    const typeTrigger = document.querySelector('#type-select .custom-select-trigger');
    const feedbackType = typeTrigger ? typeTrigger.dataset.value : 'other';
    const feedbackMessage = document.getElementById('feedback-message-textarea').value.trim();

    const countryCodeTrigger = document.querySelector('#country-code-select .custom-select-trigger');
    const countryCode = countryCodeTrigger ? countryCodeTrigger.dataset.value : '+91';
    const phoneInput = document.getElementById('feedback-contact-number').value.trim();
    const fullPhoneNumber = phoneInput ? `${countryCode}${phoneInput}` : "Not Provided";

    const urlParams = new URLSearchParams(window.location.search);
    const itemName = decodeURIComponent(urlParams.get('name'));

    if (!feedbackMessage) {
      // FIX: Use the global custom alert for validation.
      window.showCustomAlert({
        title: 'Message Required',
        message: 'Please enter your feedback or suggestion before submitting.'
      });
      return;
    }

    console.log("✅ Feedback Submitted:", {
      type: feedbackType, message: feedbackMessage, phone: fullPhoneNumber, item: itemName
    });
    // TODO: Yahan par data ko Firebase mein save karne ka logic aayega.

    closeModal();
    // FIX: Use a non-blocking toast notification for success.
    showToast('success', 'Feedback has been submitted.');
  });
}