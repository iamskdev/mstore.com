/**
 * @file Manages the internal logic for the feedback modal component.
 * This script should be self-contained and only handle events within the modal.
 */

export function initFeedbackModal() {
  const modal = document.getElementById('feedback-modal');
  
  // The controller (item-details.js) is responsible for showing the modal.
  // This script only handles what happens *inside* it.
  if (!modal) {
    console.error("Feedback modal element not found in the DOM.");
    return;
  }

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
      const searchInput = selectWrapper.querySelector('.custom-select-search');

      trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          // Close other open selects
          document.querySelectorAll('.custom-select-wrapper.open').forEach(openSelect => {
              if (openSelect.id !== wrapperId) {
                  openSelect.classList.remove('open');
              }
          });
          selectWrapper.classList.toggle('open');
          // Focus the search input when dropdown opens
          if (selectWrapper.classList.contains('open') && searchInput) {
            setTimeout(() => searchInput.focus(), 0);
          }
      });

      options.addEventListener('click', (e) => {
          const option = e.target.closest('.custom-option');
          if (option) {
              if (wrapperId === 'country-code-select') {
                triggerSpan.textContent = option.dataset.value;
              } else {
                triggerSpan.textContent = option.textContent;
              }
              trigger.dataset.value = option.dataset.value;

              const currentSelected = options.querySelector('.custom-option.selected');
              if (currentSelected) currentSelected.classList.remove('selected');
              option.classList.add('selected');
              selectWrapper.classList.remove('open');
          }
      });
      
      const initialSelected = options.querySelector('.custom-option.selected');
      if(initialSelected) {
          trigger.dataset.value = initialSelected.dataset.value;
          if (wrapperId !== 'country-code-select') {
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

  window.addEventListener('click', (e) => {
    document.querySelectorAll('.custom-select-wrapper.open').forEach(openSelect => {
        if (!openSelect.contains(e.target)) {
            openSelect.classList.remove('open');
        }
    });
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
      // TODO: Replace with a more sophisticated UI element in the new component
      alert("Please enter your feedback message.");
      return;
    }

    console.log("✅ Feedback Submitted:", {
      type: feedbackType, message: feedbackMessage, phone: fullPhoneNumber, item: itemName
    });
    // TODO: Yahan par data ko Firebase mein save karne ka logic aayega.

    closeModal();
    // TODO: Replace with a more sophisticated UI element in the new component
    alert("Feedback submitted successfully");
  });
}