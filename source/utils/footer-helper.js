import { showToast } from './toast.js';

/**
 * Initializes all logic for a footer component embedded within a view.
 * This is the single entry point for making a footer interactive.
 * @param {HTMLElement} containerElement - The view element that contains the footer.
 * @param {string} role - The current user role ('guest', 'user', 'merchant', 'admin').
 */
export function initializeFooter(containerElement, role) {
    const footerWrapper = containerElement.querySelector(".footer-wrapper");
    if (!footerWrapper) {
        console.warn(`Footer Helper: Could not find '.footer-wrapper' in`, containerElement);
        return;
    }

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
    if (footerWrapper.dataset.initialized === 'true') {
        return;
    }

    // State flag to prevent actions during expand/collapse animations.
    let isAnimating = false;

    const compactBar = footerWrapper.querySelector('.footer-compact-bar');
    const collapseTriggers = footerWrapper.querySelectorAll('.footer-collapse-trigger');

    // Function to expand the embedded footer
    const expandFooter = () => {
        if (footerWrapper.classList.contains('is-expanded') || isAnimating) return;
        isAnimating = true; // Lock actions
        footerWrapper.classList.add('is-expanded');

        // After adding the class, the footer's height changes. We need to wait for the next
        // animation frame for the browser to calculate the new layout before we can scroll to it.
        requestAnimationFrame(() => {
            const header = document.querySelector('.header-container');
            const headerHeight = header?.offsetHeight || 0; // Get current header height

            // Calculate the target scroll position. We want the top of the footer
            // to be just below the header. `offsetTop` gives the position relative to the
            // scrollable container.
            const targetScrollTop = footerWrapper.offsetTop - headerHeight;

            // Ensure targetScrollTop is not negative, as we can't scroll above the top.
            // Also, ensure we don't scroll past the maximum scrollable height.
            const maxScrollTop = containerElement.scrollHeight - containerElement.clientHeight;
            const finalScrollTop = Math.min(Math.max(0, targetScrollTop), maxScrollTop);

            // Use `scrollTo` to move to the absolute calculated position within the view.
            // This is more reliable than `scrollBy` with viewport-relative calculations.
            // FIX: The scroll was using the raw `targetScrollTop`, which could be out of bounds.
            // Using `finalScrollTop` ensures we never try to scroll past the content's end.
            containerElement.scrollTo({
                top: finalScrollTop,
                behavior: 'smooth'
            });
 
            // Unlock after a safe delay that accounts for CSS transition (0.5s) and smooth scroll.
            setTimeout(() => {
                isAnimating = false;
            }, 700);
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

    // --- Auto-collapse on Scroll Up ---
    // This logic is attached once per footer instance to prevent duplicates.
    if (!footerWrapper.dataset.scrollListenerAttached) {
        let lastScrollTop = 0; // Variable to track the last scroll position

        const handleScrollCollapse = () => {
            // Check if the footer is expanded and if there's an animation in progress
            if (!footerWrapper.classList.contains('is-expanded') || isAnimating) {
                lastScrollTop = window.scrollY; // Update lastScrollTop even when not expanded
                return;
            }

            const currentScrollTop = window.scrollY; // Use window's scroll position

            // Only proceed if scrolling UP
            if (currentScrollTop > lastScrollTop) {
                lastScrollTop = currentScrollTop;
                return;
            }

            // If we reach here, the user is scrolling UP.
            // Collapse the footer only when its top edge is scrolled past the vertical midpoint of the viewport.
            const footerRect = footerWrapper.getBoundingClientRect();
            const viewportMidpoint = window.innerHeight / 2;

            // If the top of the footer is now below the middle of the screen, collapse it.
            if (footerRect.top > viewportMidpoint) {
                collapseFooter();
            }

            lastScrollTop = currentScrollTop;
        };

        window.addEventListener('scroll', handleScrollCollapse, { passive: true }); // FIX: Attach listener to the window
        footerWrapper.dataset.scrollListenerAttached = 'true';
    }

    // --- Overscroll/Overswipe to Expand or Notify ---
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

    footerWrapper.dataset.initialized = 'true';
    console.log(`✅ Embedded Footer: Initialized inside #${containerElement.id}.`);
}
