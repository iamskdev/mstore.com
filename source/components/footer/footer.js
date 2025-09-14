import { showToast } from '../../utils/toast.js';

/**
 * Fetches the footer HTML content.
 * @returns {Promise<string>} The HTML content of the footer.
 */
export async function getFooterHtml() {
    try {
        const footerResponse = await fetch('./source/components/footer/footer.html');
        if (!footerResponse.ok) throw new Error('Footer HTML not found');
        return await footerResponse.text();
    } catch (e) {
        console.error(`Error fetching footer HTML:`, e);
        return ''; // Return empty string on error
    }
}


/**
 * Initializes all logic for a footer component embedded within a view.
 * This is the single entry point for making a footer interactive.
 * @param {HTMLElement} containerElement - The view element that contains the footer.
 * @param {string} role - The current user role ('guest', 'user', 'merchant', 'admin').
 */
export function initializeFooter(mainContentElement, role) {
    console.log('initializeFooter called for:', mainContentElement.id, 'with role:', role); // ADDED LOG
    const footerWrapper = mainContentElement.querySelector(".footer-wrapper");
    if (!footerWrapper) {
        console.warn(`Footer Helper: Could not find '.footer-wrapper' in`, mainContentElement.id);
        return;
    }

    // Ensure the footer starts collapsed
    footerWrapper.classList.remove('is-expanded');

    // Add the footer-wrapper-active class to the mainContentElement element (page-view-area)
    // This class is used by main.css to adjust the bottom padding of the page-view-area
    mainContentElement.classList.add('footer-wrapper-active');

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

    // Helper to handle transition end and reset isAnimating
    const onTransitionEnd = () => {
        footerWrapper.removeEventListener('transitionend', onTransitionEnd);
        isAnimating = false;
    };

    const compactBar = footerWrapper.querySelector('.footer-compact-bar');
    // NEW: Set a CSS variable for the compact footer height
    if (compactBar) {
        const compactFooterHeight = compactBar.offsetHeight;
        mainContentElement.style.setProperty('--compact-footer-height', `${compactFooterHeight}px`);

        // Set a CSS variable on the mainContentElement for the additional bottom offset
        mainContentElement.style.setProperty('--footer-bottom-offset', `${compactFooterHeight}px`);
    } else {
        console.warn('Footer Helper: Could not find .footer-compact-bar in', containerElement.id);
    }
    const collapseTriggers = footerWrapper.querySelectorAll('.footer-collapse-trigger');

    // Function to expand the embedded footer
    const expandFooter = () => {
        if (footerWrapper.classList.contains('is-expanded') || isAnimating) {
            return;
        }
        isAnimating = true; // Lock actions
        footerWrapper.classList.add('is-expanded');

        // After adding the class, the footer's height changes. We need to wait for the next
        // animation frame for the browser to calculate the new layout before we can scroll to it.
        requestAnimationFrame(() => {
            // A second rAF to ensure all layout changes from CSS variables have been applied.
            requestAnimationFrame(() => {
                // The most robust way to calculate the scroll position.
                // It directly measures the current positions of the footer and the scroll container,
                // avoiding any timing issues with CSS variable updates.

                // The most robust way to calculate the scroll position.
                // It directly measures the current positions of the footer and the scroll container,
                // avoiding any timing issues with CSS variable updates.

                const topNav = document.querySelector('.top-nav'); // Assuming .top-nav is the selector for your top navigation
                let targetScrollPosition = 0;

                if (topNav) {
                    const topNavRect = topNav.getBoundingClientRect();
                    const containerRect = containerElement.getBoundingClientRect();
                    // Calculate the scroll position to bring the bottom of the topNav to the top of the viewport
                    // relative to the scrollable container.
                    targetScrollPosition = (topNavRect.bottom - containerRect.top) + containerElement.scrollTop;
                } else {
                    // Fallback to scrolling to the footer if top nav not found
                    targetScrollPosition = footerWrapper.offsetTop;
                }

                // Ensure we don't scroll past the boundaries.
                const maxScrollTop = containerElement.scrollHeight - containerElement.clientHeight;
                const finalScrollTop = Math.min(Math.max(0, targetScrollPosition), maxScrollTop);

                    console.log({
                    targetScrollPosition,
                    maxScrollTop,
                    finalScrollTop
                });

                containerElement.scrollTo({
                    top: finalScrollTop,
                    behavior: 'smooth'
                });
                footerWrapper.addEventListener('transitionend', onTransitionEnd);
            });
        });
    };

    // Function to collapse the embedded footer
    const collapseFooter = () => {
        if (!footerWrapper.classList.contains('is-expanded')) {
            isAnimating = false; // Ensure isAnimating is reset if somehow stuck
            return;
        }
        isAnimating = true; // Lock actions
        footerWrapper.classList.remove('is-expanded');
        footerWrapper.addEventListener('transitionend', onTransitionEnd);
    };
    
    // Add event listener to the compact bar to expand the footer on click
    if (compactBar) {
        compactBar.addEventListener('click', (e) => {
            if (e.target.closest('a')) {
                return;
            }
            expandFooter();
        });
    } else {
    }
    if (collapseTriggers && collapseTriggers.length > 0) {
        collapseTriggers.forEach(btn => btn.addEventListener('click', (e) => {
            collapseFooter();
        }));
    } else {
        console.warn('Footer Helper: Could not find .footer-collapse-trigger in', containerElement.id);
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

        const handleTouchEnd = () => { 
            isDragging = false; 
        };

        // --- Mouse Wheel Logic ---
        const handleWheel = (e) => {
            if (isAnimating) return; // Prevent action during animation

            const isAtBottom = containerElement.scrollHeight - containerElement.scrollTop - containerElement.clientHeight < 1;
            if (!isAtBottom) return;

            // Check for a downward scroll (mouse wheel down)
            // Changed to deltaY < -20 (scrolling UP) to trigger expansion.
            // This feels more natural, like trying to scroll past the end of the content.
            if (e.deltaY < -20) { // User is scrolling UP at the bottom
                e.preventDefault(); // Prevent page from bouncing
                if (footerWrapper.classList.contains('is-expanded')) {
                    // If footer is already expanded, show a toast.
                    showEndToast();
                } else {
                    // If footer is collapsed, expand it. This is the "overscroll" action.
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
            const isAtBottom = containerElement.scrollHeight - containerElement.scrollTop - containerElement.clientHeight < 1;


            // Auto-Collapse Logic:
            // If the footer is expanded, and the user scrolls UP (away from the footer),
            // and the footer is no longer at the bottom of the scroll container, collapse it.
            const scrollUpAmount = lastScrollTop - currentScrollTop;
            const isScrollingUp = scrollUpAmount > 0;
            const isFooterVisible = footerRect.top < containerElement.clientHeight; // Check if any part of the footer is visible
            if (isExpanded && isScrollingUp && !isAnimating && scrollUpAmount > 20) { // Scrolling UP by a significant amount
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