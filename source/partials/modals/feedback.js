/**
 * @file Manages the internal logic for the feedback modal component.
 * This script should be self-contained and only handle events within the modal.
 */
import { showToast } from '../../utils/toast.js';
import { firestore } from '../../firebase/firebase-config.js';
import { generateId } from '../../utils/idGenerator.js';
import { AuthService } from '../../firebase/auth/auth.js';

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


export function initFeedbackModal(modal) {
  // The controller (item-details.js) is responsible for showing the modal.
  // This script only handles what happens *inside* it. If the modal doesn't exist, we exit gracefully.
  if (!modal) {
    console.error("Feedback modal element not found in the DOM. Ensure loadFeedbackModal() was called.");
    return;
  }

  // FIX: The backdrop is now inside the modal, so we query it from there.
  // This removes the need to add it to index.html.
  const backdrop = modal.querySelector('#custom-select-backdrop');
  if (!backdrop) console.warn("Feedback Modal: Backdrop element with ID 'custom-select-backdrop' not found inside the modal.");
  const closeBtn = modal.querySelector('#modal-close-btn');
  const cancelBtn = modal.querySelector('#modal-cancel-btn');
  const submitBtn = modal.querySelector('#modal-submit-btn');
  const countrySelectWrapper = modal.querySelector('#country-code-select');
  const typeSelectWrapper = modal.querySelector('#type-select');

  // --- NEW: Get elements for conditional display ---
  const phoneGroup = modal.querySelector('.phone-group');
  const attachmentGroup = modal.querySelector('.attachment-group');
  const attachmentTrigger = modal.querySelector('#feedback-attachment-trigger');
  const attachmentInput = modal.querySelector('#feedback-attachment-input');
  const attachmentListContainer = modal.querySelector('#feedback-attachment-list');
  const attachmentIcon = modal.querySelector('#feedback-attachment-icon'); // The clickable icon
  const attachmentPromptText = modal.querySelector('.attachment-prompt-text'); // The "Attach files" text
  const singleFileDisplay = modal.querySelector('.single-file-display');
  const singleFileName = modal.querySelector('.single-file-name');
  let attachedFiles = []; // Array to manage selected files

  /**
   * Updates the modal UI based on the user's authentication state.
   * This is now an async function to ensure AuthService is ready.
   */
  async function updateUserSpecificUI() {
    // Wait for a brief moment to ensure the auth state is settled.
    await new Promise(resolve => setTimeout(resolve, 0));
    const isLoggedIn = AuthService.isLoggedIn();

    if (isLoggedIn) {
      phoneGroup.style.display = 'none';
      attachmentGroup.style.display = 'block';
    } else {
      phoneGroup.style.display = 'block';
      attachmentGroup.style.display = 'none';
    }
    console.log(`Feedback Modal UI Updated. Is Logged In: ${isLoggedIn}`);
  }

  // Call this function once to set the initial state
  updateUserSpecificUI();

  // Also listen for auth state changes to update the UI if the user logs in/out
  // while the app is running (though less likely for a modal).
  window.addEventListener('authStateChanged', () => {
    console.log("Feedback Modal: Auth state changed, updating UI.");
    updateUserSpecificUI();
  });

  // --- NEW: Attachment Logic ---
  // FIX: The icon is always clickable to add files.
  attachmentIcon.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent this click from bubbling up to the attachmentTrigger
    attachmentInput.click();
  });

  // NEW FEATURE: If no files are attached, the entire box is clickable.
  attachmentTrigger.addEventListener('click', () => {
    if (attachedFiles.length === 0) {
      attachmentInput.click();
    }
  });

  /**
   * NEW: Truncates the middle of a filename if it's too long.
   * e.g., "a_very_long_filename_for_testing.jpg" -> "a_very_long_...ing.jpg"
   * @param {string} filename The full filename.
   * @param {number} maxLength The maximum desired length before truncation.
   * @returns {string} The formatted filename.
   */
  function formatFilename(filename, maxLength = 25) {
    if (filename.length <= maxLength) {
      return filename;
    }

    // FIX: Handle filenames with or without extensions more robustly.
    const lastDotIndex = filename.lastIndexOf('.');
    // Consider it an extension only if a dot exists and it's not the first character.
    const hasExtension = lastDotIndex > 0 && filename.length - lastDotIndex <= 5;

    const extension = hasExtension ? filename.substring(lastDotIndex) : '';
    const nameWithoutExt = hasExtension ? filename.substring(0, lastDotIndex) : filename;

    const charsToShow = maxLength - extension.length - 3; // 3 for "..."

    // FIX: Allocate more characters to the beginning of the filename for better readability.
    const frontChars = Math.max(5, Math.floor(charsToShow * 1.0)); // Show at least 5 chars at front
    const backChars = Math.max(2, charsToShow - frontChars); // Show at least 2 chars at back
    return `${nameWithoutExt.substring(0, frontChars)}...${nameWithoutExt.substring(nameWithoutExt.length - backChars)}${extension}`;
  }

  /**
   * Renders the UI for attached files based on their count.
   */
  function renderAttachedFiles() {
    // FIX: Clear only the pill list, not the single file display.
    attachmentListContainer.innerHTML = '';

    if (attachedFiles.length === 0) {
      attachmentTrigger.classList.add('is-empty'); // Add class for hover effect
      attachmentPromptText.style.display = 'block';
      singleFileDisplay.style.display = 'none';
      attachmentListContainer.style.display = 'none';
    } else if (attachedFiles.length === 1) {
      // Only one file: show it inside the box.
      attachmentTrigger.classList.remove('is-empty'); // Remove class
      const file = attachedFiles[0];
      const formattedName = formatFilename(file.name, 30); // Longer max length for single view
      singleFileName.textContent = formattedName; // FIX: Just show the filename text
      attachmentPromptText.style.display = 'none';
      singleFileDisplay.style.display = 'flex';
      attachmentListContainer.style.display = 'none';
    } else {
      // Multiple files: show the first one inside the box, and the rest as pills.
      attachmentTrigger.classList.remove('is-empty'); // Remove class
      const firstFile = attachedFiles[0];
      const firstFormattedName = formatFilename(firstFile.name, 30);
      singleFileName.textContent = firstFormattedName; // FIX: Just show the filename text
      attachmentPromptText.style.display = 'none';
      singleFileDisplay.style.display = 'flex';

      // Render pills for the rest of the files (from the second file onwards).
      const filesForPills = attachedFiles.slice(1);
      attachmentListContainer.style.display = 'flex';
      filesForPills.forEach((file, index) => {
        const formattedName = formatFilename(file.name, 25); // Shorter max length for pills
        const pill = document.createElement('div');
        pill.className = 'attachment-pill';
        // The data-index must be the original index in the `attachedFiles` array.
        pill.innerHTML = `<i class="fas fa-paperclip"></i><span>${formattedName}</span><i class="fas fa-times remove-file-btn" data-index="${index + 1}"></i>`; // FIX: Add paperclip icon to pill
        attachmentListContainer.appendChild(pill);
      });
    }
  }

  attachmentInput.addEventListener('change', () => {
    // Add new files to our managed array, avoiding duplicates
    for (const newFile of attachmentInput.files) {
      if (!attachedFiles.some(existingFile => existingFile.name === newFile.name)) {
        attachedFiles.push(newFile);
      }
    }
    renderAttachedFiles();
    // Clear the input value so the 'change' event fires even if the same file is selected again after removal
    attachmentInput.value = '';
  });

  // Use event delegation on the parent group to handle all remove clicks
  attachmentGroup.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-file-btn')) {
      // If it's the single file view, the index is always 0
      const indexToRemove = e.target.dataset.index ? parseInt(e.target.dataset.index, 10) : 0;
      
      // Remove the file from our managed array
      attachedFiles.splice(indexToRemove, 1);
      
      // Re-render the UI
      renderAttachedFiles();
    }
  });


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
      // --- REFACTOR: Dynamically handle the text node ---
      // Instead of relying on a pre-existing <span>, we create and manage a text node.
      // This makes the HTML cleaner.
      const arrowDiv = trigger.querySelector('.arrow');
      const textNode = document.createTextNode('');
      trigger.insertBefore(textNode, arrowDiv);
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
                textNode.textContent = option.dataset.value;
              } else {
                textNode.textContent = option.textContent;
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
          if (isCountrySelect) {
            textNode.textContent = initialSelected.dataset.value;
          } else {
            textNode.textContent = initialSelected.textContent;
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

  // --- Submit Logic ---
  submitBtn.addEventListener('click', async () => { // Make the function async
    const typeTrigger = document.querySelector('#type-select .custom-select-trigger');
    const feedbackType = typeTrigger ? typeTrigger.dataset.value : 'other';
    const feedbackMessage = document.getElementById('feedback-message-textarea').value.trim();

    const countryCodeTrigger = document.querySelector('#country-code-select .custom-select-trigger');
    let fullPhoneNumber = "Not Provided";

    // Only get phone number if the user is a guest
    if (!AuthService.isLoggedIn()) {
      const countryCode = countryCodeTrigger ? countryCodeTrigger.dataset.value : '+91';
      const phoneInput = document.getElementById('feedback-contact-number').value.trim();
      if (phoneInput) {
        fullPhoneNumber = `${countryCode}${phoneInput}`;
      }
    }
    const urlParams = new URLSearchParams(window.location.search);
    const itemName = decodeURIComponent(urlParams.get('name'));

    // 1. Validation
    if (!feedbackMessage) {
      // FIX: Use the global custom alert for validation.
      window.showCustomAlert({
        title: 'Message Required',
        message: 'Please enter your feedback or suggestion before submitting.'
      });
      return;
    }

    // 2. Set loading state on the button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
      if (!firestore) {
        throw new Error("Firestore is not initialized.");
      }

      const feedbackId = generateId('FDB');
      const feedbackRef = firestore.collection('feedbacks').doc(feedbackId);

      const isLoggedIn = AuthService.isLoggedIn();
      const userId = isLoggedIn ? localStorage.getItem('currentUserId') : null;
      const role = isLoggedIn ? localStorage.getItem('currentUserType') : 'guest';
      const merchantId = (role === 'merchant') ? localStorage.getItem('currentMerchantId') : null;

      // 3. Build the feedback document based on your schema
      const newFeedbackDoc = {
        meta: {
          feedbackId: feedbackId,
          type: "feedback",
          version: 1.0,
          flags: { reviewed: false, resolved: false, archived: false, guest: !isLoggedIn },
          // NEW: Add links object for consistency with rating schema
          links: {
            userId: userId,
            merchantId: merchantId
          }
        },
        // NEW: Updated submitter object to match new schema
        submitter: {
          id: role === 'merchant' ? merchantId : userId,
          role: role,
          submittedAt: new Date().toISOString()
        },
        details: {
          subject: itemName || "General Feedback",
          message: feedbackMessage,
          category: feedbackType,
          sentiment: "neutral",
          attachments: [],
          phone: fullPhoneNumber
        },
        lifecycle: {
          status: "pending",
          milestones: {
            reviewedAt: null,
            resolvedAt: null,
            archivedAt: null
          },
          history: [] // History starts empty. The first entry will be when an admin reviews it.
        }
      };

      // 4. Save the document to Firestore
      await feedbackRef.set(newFeedbackDoc);

      console.log(`✅ Feedback submitted successfully with ID: ${feedbackId}`);
      closeModal();
      showToast('success', 'Thank you! Your feedback has been submitted.');

    } catch (error) {
      console.error("❌ Error submitting feedback:", error);
      showToast('error', 'Could not submit feedback. Please try again.');
    } finally {
      // 5. Reset button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit';
      // --- NEW: Reset form fields after submission ---
      document.getElementById('feedback-message-textarea').value = '';
      document.getElementById('feedback-contact-number').value = '';
      attachedFiles = []; // Clear the managed files array
      renderAttachedFiles(); // Clear the UI
    }
  });
}