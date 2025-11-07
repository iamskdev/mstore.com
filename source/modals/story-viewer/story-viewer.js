import { fetchAllMerchants, fetchAllStories } from '../../utils/data-manager.js';
import { buildCloudinaryUrl } from '../../api/cloudinary.js';

  // State and Configuration
  const config = {
    autoNext: true,
    tapToPause: false,
    swipeNavigation: true,
    storyDuration: 5000,
    volume: 80,
    // Default values
    defaults: {
      autoNext: true,
      tapToPause: false,
      swipeNavigation: true,
      storyDuration: 5000,
      volume: 80
    }
  };
  
  // DOM elements (will be populated in init)
  let storyModal, slideArea, progressContainer, bottomBar, toggleRoleBtn, backBtn, menuBtn, dropdownMenu,
      fullscreenBtn, deleteBtn, configBtn, configModal, closeConfigBtn, autoNextCheckbox, tapToPauseCheckbox,
      swipeNavigationCheckbox, storyDurationInput, volumeControl, resetConfigBtn, insightsModal, closeInsightsBtn,
      insightsList, insightsHandle, insightsContent, gesturePrev, gestureNext, storyName, storyTime, insightsHeader;

  // State variables
  let isOwner = false;
  let currentStoryIndex = 0;
  let storyTimeout;
  let isPaused = false;
  let startX = 0;
  let currentX = 0;
  let touchStartTime = 0;
  let isInitialized = false;


  let currentMerchant = null;

  // Time ago function
  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const sec = Math.floor(diff/1000);
    if(sec < 60) return sec+"s ago";
    const min = Math.floor(sec/60);
    if(min < 60) return min+"m ago";
    const hr = Math.floor(min/60);
    if(hr < 24) return hr+"h ago";
    return Math.floor(hr/24)+"d ago";
  }

  // Show story
  function showStory(index) {
    if (!storyModal) return; // Guard against premature calls
    clearTimeout(storyTimeout);

    if (!currentMerchant || !currentMerchant.stories || currentMerchant.stories.length === 0) return;

    currentStoryIndex = index;
    const story = currentMerchant.stories[index];

    // --- NEW: Render based on the new layer-based schema ---
    slideArea.innerHTML = '';
    const backgroundLayer = story.content.layers.find(l => l.type === 'background');
    const textOverlayLayer = story.content.layers.find(l => l.type === 'text_overlay');

    if (backgroundLayer && backgroundLayer.mediaType === 'image') {
        const img = document.createElement('img');
        img.src = backgroundLayer.urls.original;
        img.alt = backgroundLayer.metadata?.altText || 'Story content';
        slideArea.appendChild(img);
    }

    if (textOverlayLayer) {
        const textDiv = document.createElement('div');
        textDiv.className = 'story-text-overlay'; // You'll need to style this class
        textDiv.textContent = textOverlayLayer.text;
        // Apply styles from JSON dynamically (optional for now)
        slideArea.appendChild(textDiv);
    }

    storyTime.textContent = timeAgo(story.audit.created.at);

    // Progress bars
    progressContainer.innerHTML = '';
    currentMerchant.stories.forEach((s, i) => {
      const bar = document.createElement('div');
      bar.className = 'progress-bar';
      bar.addEventListener('click', () => {
        if (i !== currentStoryIndex) {
          showStory(i);
        }
      });
      const fill = document.createElement('div');
      fill.className = 'progress-fill';
      if (i < index) fill.style.width = '100%';
      // --- FIX: Dynamically set transition duration for the current story's progress bar ---
      if (i === index && !isPaused) {
        const duration = story.content.layers.find(l => l.type === 'background')?.duration || config.storyDuration;
        setTimeout(() => {
          fill.style.transition = `width ${duration / 1000}s linear`;
          fill.style.width = '100%';
        }, 50); // Small delay to ensure transition is applied correctly
      }
      bar.appendChild(fill);
      progressContainer.appendChild(bar);
    });

    // Auto next if enabled
    if (config.autoNext && !isPaused) {
      // --- FIX: Use duration from the background layer ---
      const duration = backgroundLayer?.duration || config.storyDuration;
      storyTimeout = setTimeout(() => {
        if (index < currentMerchant.stories.length - 1) {
          showStory(index + 1);
        }
      }, duration);
    }

    renderBottom();
  }

  // Toggle pause/resume
  function togglePause() {
    if (!config.tapToPause) return;
    
    isPaused = !isPaused;
    const currentFill = progressContainer.children[currentStoryIndex].querySelector('.progress-fill');
    
    if (isPaused) {
      clearTimeout(storyTimeout);
      currentFill.style.animationPlayState = 'paused';
    } else {
      currentFill.style.animationPlayState = 'running';
      const duration = currentMerchant.stories[currentStoryIndex].content.layers.find(l=>l.type==='background')?.duration || config.storyDuration;
      const remaining = (1 - (currentFill.offsetWidth / currentFill.parentElement.offsetWidth)) * duration;
      storyTimeout = setTimeout(() => {
        if (currentStoryIndex < currentMerchant.stories.length - 1) {
          showStory(currentStoryIndex+1);
        }
      }, remaining);
    }
  }

  // Render bottom bar
  function renderBottom() {
    const story = currentMerchant.stories[currentStoryIndex];

    if (isOwner) {
      bottomBar.classList.add('owner-view');
      const views = story.analytics?.basic?.views || 0;
      // Use a layout similar to the viewer's footer for consistent size.
      bottomBar.innerHTML = `
        <div class="message-input-wrapper view-btn" style="cursor: pointer;">
            <div class="message-input owner-view-button">
                <i class="fas fa-eye"></i> <span>${views} Views</span>
            </div>
        </div>
      `;
      toggleRoleBtn.textContent = "Switch to Viewer";
      
      // Add event listeners for owner buttons
      bottomBar.querySelector('.view-btn').addEventListener('click', showInsights);

    } else {
      bottomBar.classList.remove('owner-view');
      const likes = story.analytics?.basic?.likes || 0; 
      const liked = story.isLikedByCurrentUser || false;
      const likeClass = liked ? 'liked' : '';
      const likeIconClass = liked ? 'fas fa-heart' : 'far fa-heart'; // --- FIX: Change icon class based on like state ---
      bottomBar.innerHTML = `
        <div class="left-content">
          <div class="story-stat like-btn ${likeClass}" title="Like story"><i class="${likeIconClass}"></i></div>
        </div>
        <div class="message-input-wrapper">
          <input type="text" class="message-input" placeholder="Send a message..." id="messageInput">
        </div>
        <div class="send-btn-wrapper">
           <button id="sendMessageBtn" class="send-btn" title="Send"><i class="fas fa-paper-plane"></i></button>
        </div>
        <div class="right-content">
        </div>
      `;
      toggleRoleBtn.textContent = "Switch to Owner";
      
      // Add event listeners for viewer buttons
      document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
      
      // Handle keyboard behavior
      const messageInput = document.getElementById('messageInput');
      const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      if (isMobile && window.visualViewport) {
        const onFocus = () => {
          // When input is focused, make the wrapper fixed to detach it from the layout
          bottomBar.classList.add('input-focused'); // Hides side buttons
        };

        const onBlur = () => {
          // A small delay helps prevent layout jumps on some devices
          setTimeout(() => {
            bottomBar.classList.remove('input-focused');
          }, 150);
        }; 

        const onViewportResize = () => {
          if (document.activeElement === messageInput) {
            const keyboardHeight = window.innerHeight - window.visualViewport.height;
            // This moves the entire bottom bar up with the keyboard
            bottomBar.style.transform = `translateY(-${keyboardHeight}px)`;
          } else {
            bottomBar.style.transform = 'translateY(0)';
          }
        };

        messageInput.addEventListener('focus', onFocus);
        messageInput.addEventListener('blur', onBlur);
        window.visualViewport.addEventListener('resize', onViewportResize);
      }

      // Like button functionality
      const likeBtn = bottomBar.querySelector('.like-btn');
      likeBtn.addEventListener('click', ()=>{
        // --- FIX: Toggle story-specific like state and update count ---
        story.isLikedByCurrentUser = !story.isLikedByCurrentUser;
        story.analytics.basic.likes = (story.analytics.basic.likes || 0) + (story.isLikedByCurrentUser ? 1 : -1);
        
        renderBottom();
      });
    }
  }

  // Show insights modal
  function showInsights() {
    const story = currentMerchant.stories[currentStoryIndex];
    insightsHeader.querySelector('.insights-title').textContent = `Story Insights - ${story.analytics?.basic?.views || 0} Views`;

    // This is mock data for now, as we don't have real viewer data yet.
    const viewers = []; 
    const likerIds = new Set([]);

    insightsList.innerHTML = '';
    if (viewers.length === 0) {
      insightsList.innerHTML = `<div style="text-align: center; padding: 20px; color: #bbb;">No views yet</div>`;
    } else {
      viewers.forEach(viewer => {
        const hasLiked = likerIds.has(viewer.id);
        const itemEl = document.createElement('div');
        itemEl.className = 'insight-item';
        itemEl.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${viewer.dp}" alt="${viewer.name}" class="insight-avatar">
            <div class="insight-info">
              <div class="insight-name">${viewer.name}</div>
              <div class="insight-time">${timeAgo(viewer.time)}</div>
            </div>
          </div>
          ${hasLiked ? '<i class="fas fa-heart insight-like-icon"></i>' : ''}
        `;
        insightsList.appendChild(itemEl);
      });
    }

    insightsModal.classList.add('show');
  }

  // Hide insights modal
  function hideInsights() {
    insightsModal.classList.remove('show');
  }

  // Delete story
  function deleteStory() {
    if (confirm('Are you sure you want to delete this story?')) {
      currentMerchant.stories.splice(currentStoryIndex, 1);
      if (currentMerchant.stories.length === 0) {
        // Close modal if no stories left
        closeStoryModal();
      } else if (currentStoryIndex >= currentMerchant.stories.length) {
        // If we deleted the last story, go to previous
        showStory(currentMerchant.stories.length - 1);
      } else {
        // Otherwise, stay on current index
        showStory(currentStoryIndex);
      }
    }
  }

  function sendMessage() {
    alert('Opening message dialog...');
    // In a real app, this would open a message dialog
  }

  // Close story modal
  function closeStoryModal() {
    clearTimeout(storyTimeout);
    storyModal.style.display = 'none';
  }

  // Apply configuration
  function applyConfig() {
    config.autoNext = autoNextCheckbox.checked;
    config.tapToPause = tapToPauseCheckbox.checked;
    config.swipeNavigation = swipeNavigationCheckbox.checked; // storyDuration is now per-story
    config.volume = parseInt(volumeControl.value);
    
    // Restart current story with new settings
    if (!isPaused) {
      showStory(currentStoryIndex);
    }
  }

  // Reset configuration to defaults
  function resetConfig() {
    autoNextCheckbox.checked = config.defaults.autoNext;
    tapToPauseCheckbox.checked = config.defaults.tapToPause;
    swipeNavigationCheckbox.checked = config.defaults.swipeNavigation;
    storyDurationInput.value = config.defaults.storyDuration / 1000; // This is now a default, not a global override
    volumeControl.value = config.defaults.volume;
    applyConfig();
  }

  // Touch event handlers for gestures
  function handleTouchStart(e) {
    if (!config.swipeNavigation) return;
    
    startX = e.touches[0].clientX;
    currentX = startX;
    touchStartTime = 0;
  }

  function handleTouchMove(e) {
    if (!config.swipeNavigation) return;
    
    currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    // Show gesture indicators
    if (diff > 50 && currentStoryIndex > 0 && currentMerchant.stories.length > 1) {
      gesturePrev.style.display = 'block';
    } else if (diff < -50 && currentStoryIndex < currentMerchant.stories.length - 1) {
      gestureNext.style.display = 'block';
    } else {
      gesturePrev.style.display = 'none';
      gestureNext.style.display = 'none';
    }
  }

  function handleTouchEnd(e) {
    if (!config.swipeNavigation) return;
    
    gesturePrev.style.display = 'none';
    gestureNext.style.display = 'none';
    
    const diff = currentX - startX;
    const timeDiff = Date.now() - touchStartTime;
    
    // Only register as a swipe if it was quick and significant
    if (timeDiff < 300 && Math.abs(diff) > 50) {
      if (diff > 0 && currentStoryIndex > 0) {
        // Swipe right - previous story
        showStory(currentStoryIndex - 1);
      } else if (diff < 0 && currentStoryIndex < currentMerchant.stories.length - 1) {
        // Swipe left - next story
        showStory(currentStoryIndex + 1);
      }
    }
  }

  // Go to merchant page
  function goToMerchantPage() {
    alert('Redirecting to merchant page...');
    // In a real app, this would navigate to the merchant's page
  }

  // --- Fullscreen Logic ---
  function toggleFullscreen() {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      // --- FIX: Request fullscreen but ask the browser to keep navigation UI visible ---
      if (elem.requestFullscreen) {
        const options = { navigationUI: "show" };
        elem.requestFullscreen(options).catch(err => {
          console.warn(`Could not enable fullscreen with navigationUI: ${err.message}. Falling back.`);
          // Fallback for browsers that don't support the option
          elem.requestFullscreen().catch(fallbackErr => {
            alert(`Error enabling full-screen mode: ${fallbackErr.message}`);
          });
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  function handleFullscreenChange() {
    const icon = fullscreenBtn.querySelector('i');
    if (document.fullscreenElement) {
      icon.classList.replace('fa-expand', 'fa-compress');
    } else {
      icon.classList.replace('fa-compress', 'fa-expand');
    }
  }

  // --- NEW CSS STYLES ---
  // Inject styles to handle keyboard behavior without modifying the main <style> tag
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
    /* When input is focused, hide the like button with a transition */
    .bottom-bar.input-focused .left-content {
      flex-basis: 0;
      width: 0;
      opacity: 0; /* Add margin: 0 and padding: 0 to fully collapse */
      overflow: hidden;
      transition: all 0.2s ease-out;
    }
  `;
  document.head.appendChild(styleSheet);

  let insightsTouchStartY = 0;
  let insightsTouchCurrentY = 0;
  let insightsIsDragging = false;

  function startDrag(clientY) {
    insightsTouchStartY = clientY;
    insightsIsDragging = true;
    insightsContent.style.transition = 'none'; // Disable transition while dragging
  }

  function onDrag(clientY) {
    if (!insightsIsDragging) return;
    insightsTouchCurrentY = clientY;
    const diffY = insightsTouchCurrentY - insightsTouchStartY;

    // Only allow dragging down
    if (diffY > 0) {
      insightsContent.style.transform = `translateY(${diffY}px)`;

      // Calculate opacity for the handle: fades out as it's dragged down
      const fadeThreshold = 50; // Start fading after 50px drag
      const maxFadeDistance = 100; // Fully faded after 100px drag
      let handleOpacity = 1;
      if (diffY > fadeThreshold) {
        handleOpacity = 1 - Math.min(1, (diffY - fadeThreshold) / maxFadeDistance);
      }
      insightsHandle.style.opacity = handleOpacity;
    }
  }

  function endDrag() {
    if (!insightsIsDragging) return;
    insightsIsDragging = false;
    insightsContent.style.transition = 'transform 0.3s ease-out'; // Re-enable transition

    const dragDistance = insightsTouchCurrentY - insightsTouchStartY;
    const contentHeight = insightsContent.offsetHeight;

    // If dragged more than 30% of its height, close it
    if (dragDistance > contentHeight * 0.3 && dragDistance > 0) {
      hideInsights();
      // Reset transform after transition ends
      setTimeout(() => {
        insightsContent.style.transform = 'translateY(100%)';
        insightsHandle.style.opacity = 1; // Reset handle opacity for next open
      }, 300);
    } else {
      // Otherwise, snap it back to the open position
      insightsContent.style.transform = 'translateY(0)';
      insightsHandle.style.opacity = 1; // Reset handle opacity
    }
    insightsTouchStartY = 0;
    insightsTouchCurrentY = 0;
  }

  // --- Fullscreen Height Fix for Mobile Browsers ---
  // Sets the height of the viewer to the actual inner height of the window,
  // This function will be called after the HTML is loaded.
  // avoiding issues with mobile browser UI (address bars).
  function setViewerHeight() {
    // If the viewer is not even in the DOM, exit.
    if (!document.querySelector('.story-viewer-content')) return;
    // Only run this logic if not in fullscreen mode to avoid conflicts.
    if (document.fullscreenElement) return;

    const viewerContent = document.querySelector('.story-viewer-content');
    if (viewerContent) {
      // We use JS to set the height as a fallback for browsers that don't support 'dvh'.
      viewerContent.style.height = `${window.innerHeight}px`;
    }
  }

  function initializeDOM() {
    storyModal = document.getElementById('storyModal');
    slideArea = document.getElementById('slideArea');
    progressContainer = document.getElementById('progressContainer');
    bottomBar = document.getElementById('bottomBar');
    toggleRoleBtn = document.getElementById('toggleRoleBtn');
    backBtn = document.getElementById('backBtn');
    menuBtn = document.getElementById('menuBtn');
    dropdownMenu = document.getElementById('dropdownMenu');
    fullscreenBtn = document.getElementById('fullscreenBtn');
    deleteBtn = document.getElementById('deleteBtn');
    configBtn = document.getElementById('configBtn');
    configModal = document.getElementById('configModal');
    closeConfigBtn = document.getElementById('closeConfigBtn');
    autoNextCheckbox = document.getElementById('autoNextCheckbox');
    tapToPauseCheckbox = document.getElementById('tapToPauseCheckbox');
    swipeNavigationCheckbox = document.getElementById('swipeNavigationCheckbox');
    storyDurationInput = document.getElementById('storyDuration');
    volumeControl = document.getElementById('volumeControl');
    resetConfigBtn = document.getElementById('resetConfigBtn');
    insightsModal = document.getElementById('insightsModal');
    closeInsightsBtn = document.getElementById('closeInsightsBtn');
    insightsList = document.getElementById('insightsList');
    insightsHandle = document.querySelector('.insights-handle');
    insightsContent = document.querySelector('.insights-content');
    gesturePrev = document.querySelector('.gesture-prev');
    gestureNext = document.querySelector('.gesture-next');
    storyName = document.getElementById('storyName');
    storyTime = document.getElementById('storyTime');
    insightsHeader = document.querySelector('.insights-header'); // FIX: Initialize insightsHeader
  }

  function initializeApp() {
    if (isInitialized) return;

    initializeDOM();
    
    // Set height on initial load and on resize (e.g., orientation change)
    window.addEventListener('resize', setViewerHeight, { passive: true });
    setViewerHeight(); // Set initial height


    // Show fullscreen button only if in browser and API is supported
    if (fullscreenBtn) {
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      if (!isInStandaloneMode && document.documentElement.requestFullscreen) {
        fullscreenBtn.style.display = 'flex';
        document.addEventListener('fullscreenchange', handleFullscreenChange);
      }
    }

    // --- FIX: Move all event listeners inside initializeApp to ensure DOM elements exist ---
    // Event listeners
    toggleRoleBtn.addEventListener('click', ()=>{
      isOwner = !isOwner;
      deleteBtn.style.display = isOwner ? 'block' : 'none';
      renderBottom();
    });

    backBtn.addEventListener('click', closeStoryModal);

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    });

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      if (dropdownMenu.classList.contains('show')) {
        dropdownMenu.classList.remove('show');
      }
    });

    configBtn.addEventListener('click', () => {
      configModal.classList.add('show');
      dropdownMenu.classList.remove('show');
    });

    closeConfigBtn.addEventListener('click', () => {
      configModal.classList.remove('show');
    });

    closeInsightsBtn.addEventListener('click', () => {
      hideInsights();
    });

    // Config event listeners
    autoNextCheckbox.addEventListener('change', applyConfig);
    tapToPauseCheckbox.addEventListener('change', applyConfig);
    swipeNavigationCheckbox.addEventListener('change', applyConfig);
    storyDurationInput.addEventListener('change', applyConfig);
    volumeControl.addEventListener('input', applyConfig);
    resetConfigBtn.addEventListener('click', resetConfig);

    // --- Insights Modal Drag-to-Close Logic ---
    // Touch Events
    insightsContent.addEventListener('touchstart', (e) => {
      startDrag(e.touches[0].clientY);
    });
    insightsContent.addEventListener('touchmove', (e) => {
      onDrag(e.touches[0].clientY);
    }, { passive: false }); // passive: false to allow preventDefault
    insightsContent.addEventListener('touchend', endDrag);

    // Mouse Events
    insightsContent.addEventListener('mousedown', (e) => {
      // Prevent text selection while dragging
      if (e.target === insightsHandle || e.target === insightsHeader) {
        e.preventDefault();
        startDrag(e.clientY);
      }
    });
    // Listen on document to catch mouse movements outside the modal content
    document.addEventListener('mousemove', (e) => {
      onDrag(e.clientY);
    });
    document.addEventListener('mouseup', endDrag);

    // Touch events for gestures
    slideArea.addEventListener('touchstart', handleTouchStart);
    slideArea.addEventListener('touchmove', handleTouchMove);
    slideArea.addEventListener('touchend', handleTouchEnd);

    // Keyboard navigation
    // Tap to pause/resume
    slideArea.addEventListener('click', (e) => {
      if (e.target === slideArea || e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
        togglePause();
      }
    });

    // Prevent dropdown from closing when clicking inside it
    dropdownMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    deleteBtn.addEventListener('click', () => {
      deleteStory();
    }); // FIX: Added closing parenthesis and semicolon
    isInitialized = true;
  }

  // Main entry point
  export async function init() {
    // This function can be used for pre-loading or other setup.
    // The main logic is now in open().
    console.log("Story viewer initialized.");
  }

  // --- NEW: Function to open the story viewer for a specific merchant ---
  export async function open(merchantId) {
    // Check if the modal is already in the DOM
    if (!document.getElementById('storyModal')) {
      // If not, fetch and inject it first
      try {
        const response = await fetch('./source/modals/story-viewer/story-viewer.html');
        const html = await response.text();
        document.body.insertAdjacentHTML('beforeend', html);
      } catch (error) {
        console.error('Failed to load story viewer HTML:', error);
        return; // Stop if HTML fails to load
      }
    }

    // --- FIX: Always re-initialize DOM elements to ensure they are available ---
    initializeApp();

    // --- Find the merchant and their stories ---
    // --- FIX: Use the real merchant data instead of the mock data ---
    const [allMerchants, allStories] = await Promise.all([
        fetchAllMerchants(),
        fetchAllStories()
    ]);

    const realMerchant = allMerchants.find(m => m.meta.merchantId === merchantId);
    const storyCollection = allStories.find(s => s.meta.links.merchantId === merchantId);

    if (!realMerchant || !storyCollection || !storyCollection.stories || storyCollection.stories.length === 0) {
        console.error(`Could not find merchant or stories for ID: ${merchantId}`);
        return;
    }

    currentMerchant = { ...realMerchant.info, stories: storyCollection.stories };

    // Update UI with merchant data
    storyName.textContent = currentMerchant.name;
    storyModal.querySelector('.story-viewer-avatar').src = buildCloudinaryUrl(currentMerchant.logo); // Use real logo

    // Show the modal and start the first story
    storyModal.style.display = 'flex';
    
    isPaused = false;
    showStory(0);
  }