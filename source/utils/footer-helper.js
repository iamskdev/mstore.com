import { showToast } from './toast.js';

/**
 * Initializes all logic for a footer component embedded within a view.
 * This is the single entry point for making a footer interactive.
 * @param {HTMLElement} containerElement - The view element that contains the footer.
 * @param {string} role - The current user role ('guest', 'user', 'merchant', 'admin').
 */
export function initializeFooter(containerElement, role) {
    console.log('initializeFooter called for:', containerElement.id); // ADDED LOG
    const footerWrapper = containerElement.querySelector(".footer-wrapper");
    if (!footerWrapper) {
        console.warn(`Footer Helper: Could not find '.footer-wrapper' in`, containerElement);
        return;
    }

    // Add the footer-wrapper-active class to the container element (page-view-area)
    // This class is used by main.css to adjust the bottom padding of the page-view-area
    containerElement.classList.add('footer-wrapper-active');

    // --- 1. Set Correct Footer Content Visibility ---
    const appFooter = footerWrapper.querySelector('#app-footer');
    const merchantFooter = footerWrapper.querySelector('#merchant-footer');
    const adminFooter = footerWrapper.querySelector('#admin-footer');
    
    if (appFooter && merchantFooter && adminFooter) {
        // Hide all footer content sections first
        appFooter.classList.add('hidden');
        merchantFooter.classList.add('hidden');
        adminFooter.classList.add('hidden');
        
        if (role === 'merchant') {
            merchantFooter.classList.remove('hidden');
        } else if (role === 'admin') {
            adminFooter.classList.remove('hidden');
        } else {
            // Default to the main app footer for 'guest' and 'user'
            appFooter.classList.remove('hidden');
        }
    }

    // --- 2. Initialize Interactivity (Expand/Collapse, Scroll, etc.) ---
    // Prevent re-attaching listeners if already initialized.
    console.log('footerWrapper.dataset.initialized:', footerWrapper.dataset.initialized); // ADDED LOG
    if (footerWrapper.dataset.initialized === 'true') {
        console.log('Footer already initialized. Skipping.'); // ADDED LOG
        return;
    }

    // State flag to prevent actions during expand/collapse animations.
    let isAnimating = false;

    const compactBar = footerWrapper.querySelector('.footer-compact-bar');
    // NEW: Set a CSS variable for the compact footer height
    if (compactBar) {
        const compactFooterHeight = compactBar.offsetHeight;
        containerElement.style.setProperty('--compact-footer-height', `${compactFooterHeight}px`);

        // Set a CSS variable on the containerElement for the additional bottom offset
        containerElement.style.setProperty('--footer-bottom-offset', `${compactFooterHeight}px`);
    }
    const collapseTriggers = footerWrapper.querySelectorAll('.footer-collapse-trigger');

    // Function to expand the embedded footer
    const expandFooter = () => {
        if (footerWrapper.classList.contains('is-expanded') || isAnimating) return;
        isAnimating = true; // Lock actions
        footerWrapper.classList.add('is-expanded');

        // After adding the class, the footer's height changes. We need to wait for the next
        // animation frame for the browser to calculate the new layout before we can scroll to it.
        requestAnimationFrame(() => {
            // Get CSS variable values at the top of the function
        const headerHeightCSS = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
        const filterBarHeightCSS = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--filter-bar-height')) || 0;

        requestAnimationFrame(() => {
            const header = document.querySelector('.header-container');
            const filterBar = document.querySelector('#filter-bar'); // Updated selector

            let targetOffset = 0; // Initialize to 0

            if (filterBar && filterBar.offsetHeight > 0) { // If filter bar exists and is visible
                targetOffset = headerHeightCSS + filterBarHeightCSS;

            } else { // If filter bar is not present or not visible
                targetOffset = headerHeightCSS;

            }

            // Calculate the target scroll position. We want the top of the footer
            // to be just below the calculated offset.
            // Using getBoundingClientRect().top for more accurate viewport-relative position
            const currentFooterTopInViewport = footerWrapper.getBoundingClientRect().top;
            const targetScrollTop = containerElement.scrollTop + currentFooterTopInViewport - targetOffset;


            const maxScrollTop = containerElement.scrollHeight - containerElement.clientHeight;
            const finalScrollTop = Math.min(Math.max(0, targetScrollTop), maxScrollTop);

            containerElement.scrollTo({
                top: finalScrollTop,
                behavior: 'smooth'
            });
 
            setTimeout(() => {
                isAnimating = false;
            }, 700);
        });
    });
    };

    // Function to collapse the embedded footer
    const collapseFooter = () => {
        if (!footerWrapper.classList.contains('is-expanded') || isAnimating) return;
        isAnimating = true; // Lock actions
        footerWrapper.classList.remove('is-expanded');
        // Unlock after the CSS transition completes.
        setTimeout(() => { isAnimating = false; }, 500);
    };
    
    // Add event listener to the compact bar to expand the footer on click
    if (compactBar) {
        compactBar.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            expandFooter();
        });
    }
    // Add event listeners to all collapse triggers to collapse the footer on click
    if (collapseTriggers) {
        collapseTriggers.forEach(btn => btn.addEventListener('click', collapseFooter));
    }

    

    // --- Overscroll/Overswipe to Expand or Notify ----
    // This logic is attached once per footer instance to prevent duplicates.
    if (!footerWrapper.dataset.overscrollListenerAttached) {
        let touchStartY = 0;
        let isDragging = false;
        let toastShown = false; // Debounce flag for the toast

        // Helper to show the "end of content" toast and prevent spamming
        const showEndToast = () => {
            if (toastShown) return;
            showToast('info', "No more content to load.", 2000);
            toastShown = true;
            setTimeout(() => { toastShown = false; }, 2100); // Reset after toast disappears
        };

        // --- Touch/Swipe Logic ---
        const handleTouchStart = (e) => {
            // Only start tracking if the user is at the bottom of the scrollable content.
            const isAtBottom = containerElement.scrollHeight - containerElement.scrollTop - containerElement.clientHeight < 2;
            if (isAtBottom) {
                isDragging = true;
                touchStartY = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e) => {
            if (!isDragging || isAnimating) return;

            const currentY = e.touches[0].clientY;
            const deltaY = touchStartY - currentY; // Positive delta means swiping up

            if (deltaY > 50) { // User has swiped up with enough force
                e.preventDefault(); // Prevent page from bouncing
                if (footerWrapper.classList.contains('is-expanded')) {
                    // If footer is already expanded, show a toast.
                    showEndToast();
                } else {
                    // If footer is collapsed, expand it.
                    expandFooter();
                }
                isDragging = false; // Stop tracking for this gesture
            }
        };

        const handleTouchEnd = () => { isDragging = false; };

        // --- Mouse Wheel Logic ---
        const handleWheel = (e) => {
            if (isAnimating) return; // Prevent action during animation

            const isAtBottom = containerElement.scrollHeight - containerElement.scrollTop - containerElement.clientHeight < 1;
            if (!isAtBottom) return;

            // Check for a downward scroll (mouse wheel down)
            if (e.deltaY > 0) {
                e.preventDefault(); // Prevent page from bouncing
                if (footerWrapper.classList.contains('is-expanded')) {
                    // If footer is already expanded, show a toast.
                    showEndToast();
                } else {
                    // If footer is collapsed, expand it.
                    expandFooter();
                }
            }
        };

        containerElement.addEventListener('touchstart', handleTouchStart, { passive: true });
        containerElement.addEventListener('touchmove', handleTouchMove, { passive: false });
        containerElement.addEventListener('touchend', handleTouchEnd);
        containerElement.addEventListener('wheel', handleWheel, { passive: false });
        footerWrapper.dataset.overscrollListenerAttached = 'true';
    }

    // --- New Auto-collapse/Expand Logic on Scroll ---
    if (!footerWrapper.dataset.newScrollListenerAttached) {
        let lastScrollTop = containerElement.scrollTop;

        const handleNewScrollLogic = () => {
            const currentScrollTop = containerElement.scrollTop;
            const isExpanded = footerWrapper.classList.contains('is-expanded');
            const footerRect = footerWrapper.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            

            // Auto-Collapse Logic:
            // If expanded, and scrolling down, and footer is moving out of view and not animating
            if (isExpanded && currentScrollTop > lastScrollTop && !isAnimating && footerRect.top >= window.innerHeight) { // Scrolling down and entire expanded footer is out of view at the bottom

                    collapseFooter();

                }

            lastScrollTop = currentScrollTop;
        };

        containerElement.addEventListener('scroll', handleNewScrollLogic, { passive: true });
        footerWrapper.dataset.newScrollListenerAttached = 'true';
    }

    footerWrapper.dataset.initialized = 'true';
    console.log(`✅ Embedded Footer: Initialized inside #${containerElement.id}.`);
}