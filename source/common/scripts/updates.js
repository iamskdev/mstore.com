// import { fetchAllItems, fetchAllMerchants } from '../../utils/data-manager.js';
import { showToast } from '../../utils/toast.js';

export function init(force = false) { // Add a 'force' parameter
    const view = document.getElementById('updates-view');
    // यह सुनिश्चित करता है कि लॉजिक दोबारा न चले
    if (view.dataset.initialized && !force) { // Check for the force flag
        return;
    }
    console.log('🚀 Initializing Updates View...');
    
    // --- डमी डेटा का उपयोग करें ---
    const merchants = [
        { 
          id: 1, 
          name: 'Internet Cafe', 
          avatar:'https://picsum.photos/seed/m1/200', 
          hasStory: true, 
          followedAt: new Date(Date.now() - 86400000 * 5), // Followed 5 days ago
          followers: '1.2K',
          stories:[
            { type:'img', src:'https://picsum.photos/seed/s11/1000/1600', duration: 5000 },
            { type:'img', src:'https://picsum.photos/seed/s12/1000/1600', duration: 5000 }
          ]
        },
        { 
          id: 2, 
          name: 'Anita Store', 
          avatar:'https://picsum.photos/seed/m2/200', 
          hasStory: true, 
          followedAt: new Date(Date.now() - 86400000 * 10), // Followed 10 days ago
          followers: '3.4K',
          stories:[
            { type:'img', src:'https://picsum.photos/seed/s21/1000/1600', duration: 5000 }
          ]
        },
        { 
          id: 3, 
          name: 'Ak Electrician', 
          avatar:'https://picsum.photos/seed/m3/200', 
          hasStory: false, 
          followedAt: new Date(Date.now() - 86400000 * 2), // Followed 2 days ago
          followers: '890',
          stories:[]
        },
        { 
          id: 4, 
          name: 'City Electrical', 
          avatar:'https://picsum.photos/seed/m4/200', 
          hasStory: true, 
          followedAt: new Date(Date.now() - 86400000 * 1), // Followed 1 day ago
          followers: '2.1K',
          stories:[
            { type:'img', src:'https://picsum.photos/seed/s41/1000/1600', duration: 5000 },
            { type:'img', src:'https://picsum.photos/seed/s42/1000/1600', duration: 5000 },
            { type:'img', src:'https://picsum.photos/seed/s43/1000/1600', duration: 5000 }
          ]
        },
        {
          id:5,
          name:'Quick Shop',
          avatar:'https://picsum.photos/seed/m5/200',
          hasStory:false,
          followedAt: new Date(Date.now() - 3600000), // Followed 1 hour ago
          followers: '1.5K',
          stories:[]
        },
        { 
          id: 6, 
          name: 'No Story User', 
          avatar: 'https://picsum.photos/seed/m6/200', 
          hasStory: false, 
          followedAt: new Date(Date.now() - 86400000 * 30), // Followed 30 days ago
          followers: '100',
          stories: []
        }
      ];
    
      const items = [
        {id:101, title:'Blue Jacket', price:'1299', img:'https://picsum.photos/seed/p1/800/600', merchantId:1, date: new Date(Date.now() - 86400000)},
        {id:102, title:'Sneakers', price:'1999', img:'https://picsum.photos/seed/p2/800/600', merchantId:2, date: new Date(Date.now() - 172800000)},
        {id:103, title:'Headphones', price:'899', img:'https://picsum.photos/seed/p3/800/600', merchantId:1, date: new Date(Date.now() - 259200000)},
        {id:104, title:'Notebook', price:'249', img:'https://picsum.photos/seed/p4/800/600', merchantId:3, date: new Date(Date.now() - 345600000)},
        {id:105, title:'Lamp', price:'499', img:'https://picsum.photos/seed/p5/800/600', merchantId:4, date: new Date(Date.now() - 432000000)},
        {id:106, title:'Bottle', price:'199', img:'https://picsum.photos/seed/p6/800/600', merchantId:2, date: new Date(Date.now() - 518400000)},
        {id:107, title:'Smart Watch', price:'3499', img:'https://picsum.photos/seed/p7/800/600', merchantId:1, date: new Date()},
        {id:108, title:'Wireless Earbuds', price:'1599', img:'https://picsum.photos/seed/p8/800/600', merchantId:4, date: new Date(Date.now() - 3600000)}, // 1 hour ago
        {id:109, title:'Backpack', price:'999', img:'https://picsum.photos/seed/p9/800/600', merchantId:5, date: new Date(Date.now() - 7200000)}, // 2 hours ago
        {id:110, title:'Coffee Mug', price:'349', img:'https://picsum.photos/seed/p10/800/600', merchantId:3, date: new Date(Date.now() - 86400000 * 3)},
        {id:111, title:'Desk Chair', price:'4999', img:'https://picsum.photos/seed/p11/800/600', merchantId:1, date: new Date(Date.now() - 86400000 * 4)},
        {id:112, title:'Sunglasses', price:'799', img:'https://picsum.photos/seed/p12/800/600', merchantId:2, date: new Date(Date.now() - 86400000 * 6)},
        {id:113, title:'Keyboard', price:'2199', img:'https://picsum.photos/seed/p13/800/600', merchantId:4, date: new Date(Date.now() - 86400000 * 7)},
        {id:114, title:'Mousepad', price:'499', img:'https://picsum.photos/seed/p14/800/600', merchantId:5, date: new Date(Date.now() - 86400000 * 8)},
      ];

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
    function renderStories() {
        storiesRow.innerHTML = '';

        // Add "My Status" element first
        const myStoryEl = document.createElement('div');
        myStoryEl.className = 'story-item my-story';
        myStoryEl.innerHTML = `
            <div class="avatar-wrap" role="button" tabindex="0" aria-label="Add to your story">
              <img class="story-avatar" src="./source/assets/logos/app-logo.png" alt="My Story" />
              <div class="add-story-btn"><i class="fas fa-plus-circle"></i></div>
            </div>
            <div class="avatar-name">My Status</div>
        `;
        myStoryEl.querySelector('.avatar-wrap').addEventListener('click', () => {
            // Future: open story creation UI
            alert('Add Story feature coming soon!');
        });
        storiesRow.appendChild(myStoryEl);

        const oneDayAgo = Date.now() - 86400000;

        const getScore = (merchant) => {
            let score = 0;
            if (merchant.hasStory) score += 1000;
            if (merchant.followedAt > oneDayAgo) score += 500;
            const hasNewItem = items.some(item => item.merchantId === merchant.id && new Date(item.date) > oneDayAgo);
            if (hasNewItem) score += 100;
            score += new Date(merchant.followedAt).getTime() / 1e9;
            return score;
        };

        const sortedMerchants = [...merchants].sort((a, b) => getScore(b) - getScore(a));
        storiesRow.setAttribute('data-rendered', 'true');

        sortedMerchants.forEach(m => {
            const wrap = document.createElement('div');
            wrap.className = 'story-item' + (m.hasStory ? ' has-story' : '');
            wrap.setAttribute('data-id', m.id);
            wrap.innerHTML = `
            <div class="avatar-wrap" role="button" tabindex="0">
              <img class="story-avatar" src="${m.avatar}" alt="${m.name}" />
            </div>
            <div class="avatar-name">${m.name}</div>
          `;
            storiesRow.appendChild(wrap);
        });
    }

    let currentPage = 1;
    const itemsPerPage = 6;
    let isLoading = false;
    let allItemsLoaded = false;
    let currentFilterState = { type: 'all', merchantId: null };

    // render feed (all items)
    function renderFeed(filterMerchantId = null, filterType = 'all', page = 1) {
        isLoading = true;
        let list = [...items];

        if (filterMerchantId) {
            list = list.filter(it => it.merchantId === filterMerchantId);
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

        list.sort((a, b) => new Date(b.date) - new Date(a.date));

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
        paginatedItems.forEach(it => {
            const c = document.createElement('div');
            // Use the new list-style card structure
            c.className = 'item-list-card'; // Changed class name
            c.dataset.itemId = it.id;
            c.innerHTML = `
                <div class="card-top">
                    <div class="card-info">
                        <p class="card-title">${it.title}</p>
                        <div class="price-container">
                            <span class="selling-price">₹${it.price}</span>
                        </div>
                    </div>
                    <div class="img-container">
                        <img src="${it.img}" alt="${it.title}" class="card-image" />
                    </div>
                </div>
            `;
            feedGrid.appendChild(c);
        });
        isLoading = false;
        feedLoader.classList.add('hidden');
    }

    function showMerchantPage(merchant) {
        currentMerchant = merchant;

        view.querySelectorAll('.story-item.active').forEach(el => el.classList.remove('active'));
        const storyEl = storiesRow.querySelector(`.story-item[data-id='${merchant.id}']`);
        if (storyEl) {
            storyEl.classList.add('active');
            if (merchant.hasStory) {
                storyEl.classList.add('viewed');
            }
        }

        renderMerchantFeed(merchant.id);

        merchantPage.style.display = 'flex';
        defaultFeed.style.display = 'none';
        segmentedControls.style.display = 'none';
        updatesContentWrapper.scrollTop = 0;
    }

    function renderMerchantFeed(merchantId) {
        merchantFeed.innerHTML = '';
        const related = items
            .filter(i => i.merchantId === merchantId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (related.length === 0) {
            merchantFeed.innerHTML = `<div style="color:var(--text-secondary);padding:8px;text-align:center">No products yet.</div>`;
        } else {
            related.forEach(it => {
                const c = document.createElement('div');
                // Use the new list-style card structure
                c.className = 'item-list-card'; // Changed class name
                c.dataset.itemId = it.id;
                c.innerHTML = `
                    <div class="card-top">
                        <div class="card-info">
                            <p class="card-title">${it.title}</p>
                            <div class="price-container">
                                <span class="selling-price">₹${it.price}</span>
                            </div>
                        </div>
                        <div class="img-container">
                            <img src="${it.img}" alt="${it.title}" class="card-image" />
                        </div>
                    </div>
                `;
                merchantFeed.appendChild(c);
            });
        }
    }

    function hideMerchantPage() {
        merchantPage.style.display = 'none';
        defaultFeed.style.display = '';
        segmentedControls.style.display = 'flex';
        const activeStory = storiesRow.querySelector('.story-item.active');
        if (activeStory) activeStory.classList.remove('active');
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

        // --- FIX: Restore the logic to add the 'active' class ---
        // 1. Remove 'active' from any previously selected story
        view.querySelectorAll('.story-item.active').forEach(el => el.classList.remove('active'));
        // 2. Find and add 'active' to the newly clicked story
        const storyEl = storiesRow.querySelector(`.story-item[data-id='${merchant.id}']`);
        if (storyEl) {
            storyEl.classList.add('active');
        }

        // Dispatch an event to notify top-nav to change its state
        window.dispatchEvent(new CustomEvent('viewStateOverride', {
            // --- FIX: Correctly set to secondary view state ---
            detail: {
                isSecondary: true,
                title: merchant.name
            }
        }));

        // --- FIX: Restore the logic to show the merchant page ---
        renderMerchantFeed(merchant.id);

        merchantPage.style.display = 'flex';
        defaultFeed.style.display = 'none';
        segmentedControls.style.display = 'none';
        updatesContentWrapper.scrollTop = 0;
    }

    function onAvatarClick(merchant) {
        showMerchantPage(merchant);
    }

    renderStories();
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

            if (currentMerchant) {
                hideMerchantPage();
            }

            const filterMap = {
                'filterAll': 'all',
                'filterToday': 'today',
                'filterPost': 'post',
                'filterOffers': 'offers',
                'filterPopular': 'all',
                'filterNew': 'all',
                'filterTemp1': 'all',
                'filterTemp2': 'all',
                'filterTemp3': 'all',
                'filterTemp4': 'all'
            };
            handleFilterClick(filterMap[id] || 'all');
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
            const m = merchants.find(x => String(x.id) === String(id));
            if (m) {
                showMerchantPage(m);
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