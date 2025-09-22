/**
 * @file Manages the internal logic for the feedback modal component.
 * This script should be self-contained and only handle events within the modal.
 */

/**
 * Fetches the feedback modal HTML and inserts it into the DOM.
 * This function should be called first to ensure the modal HTML is present in the document.
 * @returns {Promise<HTMLElement>} A promise that resolves with the feedback modal element.
 */
export async function loadFeedbackModal() {
  try {
    // Adjust the path if your web server serves files from a different root
    const response = await fetch('/source/partials/modals/feedback.html');
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

// How to use these functions:
// 1. Call loadFeedbackModal() to fetch and insert the HTML into the DOM.
// 2. Once the promise from loadFeedbackModal() resolves, call initFeedbackModal()
//    to attach all the event listeners and set up the modal's functionality.
//
// Example in your main application logic (e.g., in item-details.js or main.js):
// import { loadFeedbackModal, initFeedbackModal } from './partials/modals/feedback.js';
//
// async function setupApp() {
//   await loadFeedbackModal(); // Load the HTML first
//   initFeedbackModal();       // Then initialize its logic
//   // Now you can show/hide the modal as needed, e.g., when a button is clicked
//   // document.getElementById('some-button-to-open-modal').style.display = 'flex';
// }
//
// // Call the initialization function when the DOM is ready
// document.addEventListener('DOMContentLoaded', setupApp);
