import { fetchAllItems, fetchAllMerchants, fetchAllStories, fetchUserById, fetchMerchantById } from '../../utils/data-manager.js';
import { showToast } from '../../utils/toast.js';
import * as storyViewer from '../../modals/story-viewer/story-viewer.js';
import { createListCard, initCardHelper } from '../../templates/cards/card-helper.js';

export async function init(force = false) { // Make function async
    const view = document.getElementById('updates-view');
    // यह सुनिश्चित करता है कि लॉजिक दोबारा न चले
    if (view.dataset.initialized && !force) { // Check for the force flag
        return;
    }
    console.log('🚀 Initializing Updates View...');

    // --- NEW: Initialize the card helper to load templates ---
    await initCardHelper();

    // --- FIX: Fetch data individually to prevent a single failure from blocking the entire view ---
    let merchants = [], items = [], stories = [];
    try {
        // Fetch essential data. If these fail, we might want to show a bigger error.
        [merchants, items] = await Promise.all([
            fetchAllMerchants(),
            fetchAllItems()
        ]);
    } catch (error) {
        console.error("🚨 Critical error fetching merchants or items:", error);
        // Optionally, show a full-page error message here
        return; // Stop execution if essential data fails
    }

    try {
        // Fetch stories separately. If it fails, the rest of the page can still render.
        stories = await fetchAllStories();
    } catch (error) {
        console.error("⚠️ Error fetching stories, but continuing with feed rendering:", error);
        showToast('error', 'Could not load stories.');
        stories = []; // Default to an empty array so the rest of the code doesn't break
    }

    // DOM refs
    const updatesContainer = view.querySelector('.updates-container');
    const storiesRow = view.querySelector('#storiesRow');
    const feedGrid = view.querySelector('#feedGrid');
    const merchantPage = view.querySelector('#merchantPage');
    const merchantFeed = view.querySelector('#merchantFeed');
    const defaultFeed = view.querySelector('#defaultFeed');
    const updatesContentWrapper = view.querySelector('#updatesContentWrapper');
    const segmentedControls = view.querySelector('.segmented-controls');
    const feedLoader = view.querySelector('#feed-loader');

    // state
    let currentMerchant = null;

    // render stories
    async function renderStories() {
        storiesRow.innerHTML = '';

        // --- FIX: Conditionally show "My Status" only for merchants ---
        const currentUserRole = localStorage.getItem('currentUserType');
        const currentUserId = localStorage.getItem('currentUserId');
        let selfMerchantId = null; // To store the logged-in merchant's ID

        if (currentUserRole === 'merchant' && currentUserId) {
            const user = await fetchUserById(currentUserId);
            const merchantId = user?.meta?.links?.merchantId;
            selfMerchantId = merchantId; // Store the ID for filtering later
            if (merchantId) {
                const selfMerchant = await fetchMerchantById(merchantId);
                const avatarUrl = selfMerchant?.meta?.info?.logo || './source/assets/logos/app-logo.png';

                const myStoryEl = document.createElement('div');
                myStoryEl.className = 'story-item my-story';
                myStoryEl.setAttribute('data-id', merchantId); // Add data-id for selection
                myStoryEl.innerHTML = `
                    <div class="avatar-wrap" role="button" tabindex="0" aria-label="Add to your story">
                      <img class="story-avatar" src="${avatarUrl}" alt="My Story" />
                      <div class="add-story-btn"><i class="fas fa-plus-circle"></i></div>
                    </div>
                    <div class="avatar-name">My Status</div>
                `;
                // --- FIX: Separate click events for plus button and the rest of the circle ---
                myStoryEl.querySelector('.add-story-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent the parent click event from firing
                    alert('Add Story feature coming soon!');
                });

                myStoryEl.querySelector('.avatar-wrap').addEventListener('click', (e) => {
                    showMerchantPage(selfMerchant);
                });

                storiesRow.appendChild(myStoryEl);
            }
        }

        const oneDayAgo = Date.now() - 86400000;

        const getScore = (merchant) => {
            let score = 0;
            // --- FIX: Check for stories from the fetched stories data ---
            const hasStory = stories.some(storyCollection => 
                storyCollection.meta.links.merchantId === merchant.meta.merchantId &&
                storyCollection.stories?.some(s => s.status === 'active')
            );
            if (hasStory) score += 1000;

            const hasNewItem = items.some(item => item.meta.links.merchantId === merchant.meta.merchantId && new Date(item.meta.createdOn) > oneDayAgo);
            if (hasNewItem) score += 100;
            // score += new Date(merchant.followedAt).getTime() / 1e9; // Skipping
            return score;
        };

        let sortedMerchants = [...merchants].sort((a, b) => getScore(b) - getScore(a));

        // --- FIX: Filter out the logged-in merchant from the story list ---
        if (selfMerchantId) {
            sortedMerchants = sortedMerchants.filter(m => m.meta.merchantId !== selfMerchantId);
        }

        storiesRow.setAttribute('data-rendered', 'true');

        sortedMerchants.forEach(m => {
            // --- FIX: Use correct data structure from merchants.json (meta.info) ---
            const wrap = document.createElement('div');
            // --- FIX: Check for stories from the fetched stories data ---
            const hasStory = stories.some(storyCollection => 
                storyCollection.meta.links.merchantId === m.meta.merchantId &&
                storyCollection.stories?.some(s => s.status === 'active')
            );

            wrap.className = 'story-item' + (hasStory ? ' has-story' : '');
            wrap.setAttribute('data-id', m.meta.merchantId);
            wrap.innerHTML = `
            <div class="avatar-wrap" role="button" tabindex="0">
              <img class="story-avatar" src="${m.meta.info.logo}" alt="${m.meta.info.name}" />
            </div>
            <div class="avatar-name">${m.meta.info.name}</div>
          `;
            storiesRow.appendChild(wrap);
        });
    }

    let currentPage = 1;
    const itemsPerPage = 6;
    let isLoading = false;
    let allItemsLoaded = false;
    let currentFilterState = { type: 'all', merchantId: null };

    // --- REFACTOR: Create a single common card config to be used everywhere ---
    const commonCardConfig = {
        fields: [
            { key: 'info.name', selector: '.card-title', visible: true },
            {
                key: 'media.thumbnail',
                selector: '.card-image',
                type: 'image',
                default: './localstore/images/default-product.jpg'
            },
            {
                key: 'pricing.sellingPrice',
                selector: '.selling-price',
                visible: true,
                formatter: (price) => `₹${price.toFixed(2)}`
            },
            {
                key: 'pricing.mrp',
                selector: '.max-price',
                visible: (item) => item.pricing.mrp > item.pricing.sellingPrice,
                formatter: (mrp) => `₹${mrp.toFixed(2)}`
            },
            {
                key: 'pricing.mrp',
                selector: '.card-discount',
                visible: (item) => item.pricing && item.pricing.mrp > item.pricing.sellingPrice,
                formatter: (mrp, item) => {
                    const discount = ((item.pricing.mrp - item.pricing.sellingPrice) / item.pricing.mrp) * 100;
                    return `${Math.round(discount)}% off`;
                }
            },
            { key: 'analytics.rating', selector: '.stars', visible: true },
            { key: 'stock.status', selector: '.stock-status', visible: true },
            { selector: '.card-note', visible: false },
            { selector: '.cost-price', visible: false },
        ],
        buttons: [
            { label: 'View Details', action: 'VIEW_DETAILS', class: 'btn-secondary', visible: true },
            { label: 'Add to Cart', action: 'ADD_TO_CART', class: 'btn-primary', visible: true },
            { label: 'Save for later', action: 'SAVE_FOR_LATER', class: 'btn-secondary', visible: true },
            { label: 'Share me', action: 'SHARE_ITEM', class: 'btn-secondary', visible: true }
        ],
        actionHandlers: {
            'VIEW_DETAILS': (item) => showToast('info', `Viewing details for ${item.info.name}`),
            'ADD_TO_CART': (item) => showToast('success', `${item.info.name} added to cart!`),
            'SAVE_FOR_LATER': (item) => showToast('info', `${item.info.name} saved for later!`),
            'SHARE_ITEM': (item) => showToast('info', `Sharing ${item.info.name}`),
        }
    };

    // render feed (all items)
    function renderFeed(filterMerchantId = null, filterType = 'all', page = 1) {
        isLoading = true;
        let list = [...items];

        if (filterMerchantId) {
            list = list.filter(it => it.meta.links.merchantId === filterMerchantId);
        }

        if (filterType === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            list = list.filter(it => new Date(it.date) >= today);
        } else if (filterType === 'offers') { // For demo, items with price ending in 99 are offers
            list = list.filter(it => String(it.price).endsWith('99'));
        } else if (filterType === 'post') {
            list = list.filter(it => it.id > 105);
        }

        // --- NEW: Add filtering for 'product' and 'service' types ---
        if (filterType === 'product' || filterType === 'service') {
            list = list.filter(it => it.meta.type === filterType);
        }

        list.sort((a, b) => new Date(b.meta.createdOn) - new Date(a.meta.createdOn));

        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = list.slice(startIndex, endIndex);

        if (page === 1) {
            feedGrid.innerHTML = '';
            allItemsLoaded = false;
        }

        if (paginatedItems.length < itemsPerPage) {
            allItemsLoaded = true;
        }

        if (list.length === 0) {
            feedGrid.innerHTML = `<div style="color:var(--text-secondary);padding:20px;text-align:center">No items found</div>`;
            return;
        }
        
        // --- FIX: Add the card creation logic back into the renderFeed function ---
        paginatedItems.forEach(it => {
            const cardElement = createListCard(it, commonCardConfig);
            if (cardElement) {
                feedGrid.appendChild(cardElement);
            }
        });
    }

    function renderMerchantFeed(merchantId, filterType = 'all') {
        merchantFeed.innerHTML = '';
        let related = items
            .filter(i => i.meta.links.merchantId === merchantId)
            .sort((a, b) => new Date(b.meta.createdOn) - new Date(a.meta.createdOn));
        
        // --- FIX: Add filtering logic within the merchant's item list ---
        if (filterType === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            related = related.filter(it => new Date(it.meta.createdOn) >= today);
        } else if (filterType === 'product' || filterType === 'service' || filterType === 'post' || filterType === 'offers') {
            // Note: 'post' and 'offers' logic might need refinement based on actual data structure
            related = related.filter(it => it.meta.type === filterType);
        }
        
        if (related.length === 0) {
            merchantFeed.innerHTML = `<div style="color:var(--text-secondary);padding:20px;text-align:center">No products yet.</div>`;
        } else {
            // --- REFACTOR: Use the common config for consistency ---
            related.forEach(it => {
                const cardElement = createListCard(it, commonCardConfig);
                if (cardElement) {
                    merchantFeed.appendChild(cardElement);
                }
            });
        }
    }

    function hideMerchantPage() {
        merchantPage.style.display = 'none';
        defaultFeed.style.display = '';

        // --- FIX: Remove active state from story avatar when closing merchant page ---
        // This ensures the blue 'active' ring is removed when navigating back.
        const activeStory = storiesRow.querySelector('.story-item.active');
        if (activeStory) {
            activeStory.classList.remove('active');
        }
        // Also remove active state from the "My Status" story if it was active
        const myStoryActive = storiesRow.querySelector('.my-story.active');
        if (myStoryActive) {
            myStoryActive.classList.remove('active');
        }
        currentMerchant = null;

        // Dispatch an event to notify top-nav to revert to its original state
        window.dispatchEvent(new CustomEvent('viewStateOverride', {
            detail: {
                isSecondary: false,
                title: null // Title is not needed when reverting
            }
        }));
    }

    function showMerchantPage(merchant) {
        currentMerchant = merchant;

        // --- FIX: Add active & viewed states to story avatars on click ---
        // This provides visual feedback to the user about which merchant they are viewing.
        document.querySelectorAll('.story-item.active').forEach(el => el.classList.remove('active'));
        const storyEl = storiesRow.querySelector(`.story-item[data-id='${merchant.meta.merchantId}']`);
        if (storyEl) {
            storyEl.classList.add('active');
            // Check if the merchant has a story to mark it as 'viewed'
            const hasStory = stories.some(storyCollection =>
                storyCollection.meta.links.merchantId === merchant.meta.merchantId &&
                storyCollection.stories?.some(s => s.status === 'active')
            );
            if (hasStory) {
                storyEl.classList.add('viewed');
            }
        }

        // --- FIX: Restore the call to render the merchant's items ---
        renderMerchantFeed(merchant.meta.merchantId); 

        merchantPage.style.display = 'flex';
        defaultFeed.style.display = 'none';
        // segmentedControls.style.display = 'none'; // Allow filters to be visible
        updatesContentWrapper.scrollTop = 0;

        // --- FIX: Dispatch the event AFTER all other UI changes are complete ---
        // This prevents a race condition where the top-nav tries to update before the view is ready.
        window.dispatchEvent(new CustomEvent('viewStateOverride', {
            detail: {
                isSecondary: true,
                title: merchant.meta.info.name
            }
        }));
    }

    function onAvatarClick(merchant) {
        showMerchantPage(merchant);
    }

    await renderStories();
    renderFeed();

    function enableHorizontalScroll(element) {
        if (!element) return;
        element.addEventListener('wheel', (e) => {
            if (element.scrollWidth > element.clientWidth) {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    element.scrollLeft += e.deltaY;
                }
            }
        });
    }
    enableHorizontalScroll(storiesRow);
    enableHorizontalScroll(segmentedControls);

    function handleFilterClick(filterType) {
        currentPage = 1;
        currentFilterState.type = filterType;
        currentFilterState.merchantId = null;
        renderFeed(null, filterType, currentPage);
    }

    view.querySelectorAll('.segmented-controls button').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.id;

            // Handle settings button separately as it doesn't change the filter
            if (id === 'filterSettings') {
                showToast('info', 'Filter settings coming soon!');
                return;
            }

            view.querySelectorAll('.segmented-controls button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // --- FIX: Moved filterMap definition to the top of the handler for correct scope ---
            const filterMap = {
                'filterAll': 'all',
                'filterToday': 'today',
                'filterPost': 'post',
                'filterOffers': 'offers',
                'filterProduct': 'product',
                'filterService': 'service'
            };
            const filterType = filterMap[id] || 'all';

            if (currentMerchant) { // If on a merchant page, filter its feed
                renderMerchantFeed(currentMerchant.meta.merchantId, filterType);
                return; // Stop further execution
            }

            handleFilterClick(filterType);
        });
    });

    updatesContentWrapper.addEventListener('scroll', () => {
        if (defaultFeed.style.display === 'none' || isLoading || allItemsLoaded) return;

        if (updatesContentWrapper.scrollTop + updatesContentWrapper.clientHeight >= updatesContentWrapper.scrollHeight - 100) {
            feedLoader.classList.remove('hidden');
            currentPage++;
            renderFeed(currentFilterState.merchantId, currentFilterState.type, currentPage);
        }
    });

    storiesRow.addEventListener('click', (e) => {
        if (storiesRow.getAttribute('data-rendered') !== 'true') return;

        const storyWrap = e.target.closest('.story-item');
        if (!storyWrap) return;

        const id = storyWrap.getAttribute('data-id');
        if (id) {
            const m = merchants.find(x => String(x.meta.merchantId) === String(id));
            if (m) {
                // --- FIX: Check for stories from the fetched stories data ---
                const hasStory = stories.some(storyCollection => 
                    storyCollection.meta.links.merchantId === m.meta.merchantId &&
                    storyCollection.stories?.some(s => s.status === 'active')
                );

                if (hasStory) {
                    // --- FIX: Show merchant page BEFORE opening story viewer ---
                    showMerchantPage(m);
                    storyViewer.open(m.meta.merchantId); // Open story viewer
                } else {
                    showMerchantPage(m); // Fallback to merchant page
                }
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideMerchantPage();
        }
    });

    updatesContainer.addEventListener('dblclick', () => {
        hideMerchantPage();
    });

    // --- NEW: Listen for the manual back button press from top-nav ---
    // This is the correct way to handle the "fake" navigation back action.
    window.addEventListener('handleManualBack', () => {
        // Only act if the merchant page is currently visible.
        if (merchantPage.style.display === 'flex') {
            hideMerchantPage();
        }
    });

    // व्यू को इनिशियलाइज़ के रूप में मार्क करें
    view.dataset.initialized = 'true';
}

export function cleanup() {
    console.log('🧹 Cleaning up Updates View...');
    // भविष्य में यदि आवश्यक हो तो यहां इवेंट लिसनर्स हटा दें

    // --- FIX: Reset the initialization state ---
    // This is crucial. When the user navigates away, we remove the 'initialized' flag.
    // This ensures that when they navigate back, the init() function will run again
    // and re-render all the dynamic dummy content.
    const view = document.getElementById('updates-view');
    if (view) {
        delete view.dataset.initialized;
    }
}