import { routeManager } from '../../main.js';
import { fetchMerchantById, fetchAllItems, fetchAllRatings, fetchUserById } from '../../utils/data-manager.js';
import { showToast } from '../../utils/toast.js';
import { createListCard, initCardHelper } from '../../templates/cards/card-helper.js';

import { buildCloudinaryUrl } from '../../api/cloudinary.js';
// --- SEPARATE MOCK DATA (simulating other collections) ---

// NEW: Updated mock posts to match the standard posts.json schema
const posts = [
    {
        meta: { postId: 'post1', type: 'standard', status: 'published', links: { merchantId: 'MRC-20251002-170604-402-FGHJ' } },
        content: {
            text: "Get ready for the wedding season! Our new bridal makeup collection is here. Featuring long-lasting foundations, vibrant lipsticks, and stunning eyeshadow palettes. Visit us to get your perfect bridal look! #BridalMakeup #WeddingSeason",
            media: [{ type: 'image', url: 'https://images.unsplash.com/photo-1616197511363-cf6a8335a511?q=80&w=800&auto=format&fit=crop', aspectRatio: '16:9' }]
        },
        engagement: { likes: 128, comments: 14, shares: 5, views: 2400 },
        poll: null,
        taggedProducts: ['ITM-PROD-1', 'ITM-PROD-2'],
        audit: { createdAt: "2025-10-05T11:00:00Z" },
        // For UI demo, we'll add comments here directly
        comments: [{ user: "Priya S.", text: "Wow, looks amazing! 😍" }]
    },
    {
        meta: { postId: 'post2', type: 'standard', status: 'published', links: { merchantId: 'MRC-20251002-170604-402-FGHJ' } },
        content: {
            text: "Keep your skin glowing this monsoon. Explore our range of waterproof kajal, matte lipsticks, and hydrating moisturizers. Special discounts available for a limited time!",
            media: [{ type: 'image', url: 'https://images.unsplash.com/photo-1590155943458-593c72351565?q=80&w=800&auto=format&fit=crop', aspectRatio: '16:9' }]
        },
        engagement: { likes: 76, comments: 5, shares: 2, views: 1800 },
        poll: null,
        taggedProducts: [],
        audit: { createdAt: "2025-10-01T18:00:00Z" },
        comments: []
    },
    {
        meta: { postId: 'post3', type: 'poll', status: 'published', links: { merchantId: 'MRC-20251002-170604-402-FGHJ' } },
        content: {
            text: "Don't miss out! Flat 15% off on all sringar items this weekend. Offer valid for in-store purchases only. Tag a friend who needs a shopping spree! #Sale #Beauty #Patna",
            media: []
        },
        engagement: { likes: 215, comments: 42, shares: 18, views: 5600 },
        poll: {
            question: "Which offer would you prefer next weekend?",
            options: [
                { id: 'opt1', text: "Buy 1 Get 1 on Cosmetics", votes: 120 },
                { id: 'opt2', text: "Flat 30% off on all items", votes: 250 },
                { id: 'opt3', text: "Free gift on purchase > ₹500", votes: 85 }
            ],
            totalVotes: 455,
            endsAt: "2025-10-12T23:59:59Z"
        },
        taggedProducts: [],
        audit: { createdAt: "2025-09-20T12:00:00Z" },
        comments: []
    }
];

// --- NEW HELPER FUNCTION ---
/**
 * Formats a number into a compact string with 'K' for thousands or 'M' for millions.
 * @param {number} num The number to format.
 * @returns {string} The formatted string.
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return String(num);
}

// --- RENDER FUNCTIONS ---
function renderProfile(merchantData) {
    const logoImg = document.getElementById('merchant-logo');
    const logoPlaceholder = logoImg.previousElementSibling;

    // Reset state before loading new image
    logoImg.style.display = 'block';
    logoPlaceholder.style.display = 'none';

    logoImg.src = merchantData.info.logo;
    logoImg.onerror = function () {
        this.style.display = 'none'; // Hide broken image
        logoPlaceholder.style.display = 'flex'; // Show placeholder icon
    };

    document.getElementById('cover-photo').src = merchantData.info.coverImage;
    document.getElementById('merchant-name').textContent = merchantData.info.name;
    document.getElementById('merchant-handle').textContent = merchantData.info.handle;
    document.getElementById('followers-count').textContent = formatNumber(merchantData.engagement?.followers || 0);
    document.getElementById('items-count').textContent = formatNumber(merchantData.engagement?.items || 0);

    // --- NEW: Show/Hide Verified Badge ---
    const verifiedBadge = document.getElementById('verified-badge');
    if (merchantData.meta.flags.isVerified) {
        verifiedBadge.style.display = 'inline-block';
    } else {
        verifiedBadge.style.display = 'none';
    }

    const bioElement = document.getElementById('merchant-bio');
    const bioWrapper = document.querySelector('.bio-wrapper');
    const fullText = merchantData.info.description;
    bioElement.textContent = fullText;

    const existingMoreLink = bioWrapper.querySelector('.read-more-bio');
    if (existingMoreLink) {
        existingMoreLink.remove();
    }

    // Check if the full text overflows the container.
    if (bioElement.scrollWidth > bioElement.clientWidth) {
        let words = fullText.split(' ');
        let truncatedText = '';

        // 1. Try to fit as many whole words as possible.
        for (let i = 0; i < words.length; i++) {
            // Test with the word, ellipsis, and the 'more' link for an accurate measurement.
            let testText = truncatedText + (truncatedText ? ' ' : '') + words[i] + '...more';
            bioElement.textContent = testText;

            if (bioElement.scrollWidth > bioElement.clientWidth) {
                break;
            }
            truncatedText += (truncatedText ? ' ' : '') + words[i];
        }

        // 2. If no words fit (i.e., the first word is too long), truncate that single word.
        if (!truncatedText && words.length > 0) {
            let longWord = words[0];
            while (longWord.length > 0) {
                bioElement.textContent = longWord + '...more';
                if (bioElement.scrollWidth <= bioElement.clientWidth) break;
                longWord = longWord.slice(0, -1); // Remove one character from the end.
            }
            truncatedText = longWord;
        }

        bioElement.textContent = truncatedText + '...';

        const readMoreSpan = document.createElement('span');
        readMoreSpan.textContent = 'more';
        readMoreSpan.className = 'read-more-bio';
        bioWrapper.appendChild(readMoreSpan);
        readMoreSpan.onclick = (e) => {
            e.preventDefault();
            const aboutTabButton = document.querySelector('.tab-link[data-tab="about"]');
            if (aboutTabButton) {
                aboutTabButton.click();
            }
        };
    }

    // --- FINAL FIX: Dynamically show/hide header social icons based on data ---
    const socialIconsContainer = document.querySelector('.profile-social-icons');
    const socialLinks = merchantData.social || {};

    socialIconsContainer.querySelectorAll('a').forEach(icon => {
        const socialNetwork = icon.title.toLowerCase();
        const url = socialLinks[socialNetwork]; // FIX: Directly use the link from the social object for all icons, including WhatsApp.

        if (url) {
            icon.href = url;
            icon.style.display = 'inline-block';
        } else {
            icon.style.display = 'none';
        }
    });
}

function renderHome(allItems, merchantId, cardConfig) {
    const container = document.querySelector('#home .item-list-container');
    // Show a few featured items from the merchant on the home tab
    const homeItems = allItems.filter(item => item.meta.links.merchantId === merchantId).slice(0, 4);

    container.innerHTML = ''; // Clear previous content
    if (homeItems.length === 0) {
        container.innerHTML = `<p style="text-align: center; padding: 20px; color: var(--text-secondary);">No featured items to display.</p>`;
        return;
    }
    homeItems.forEach(item => {
        const cardElement = createListCard(item, cardConfig);
        if (cardElement) {
            container.appendChild(cardElement);
        }
    });
}

function renderProducts(allItems, merchantId, cardConfig) {
    const container = document.querySelector('#products .item-list-container');
    // Filter for products of the current merchant
    const merchantProducts = allItems.filter(item => item.meta.links.merchantId === merchantId && item.meta.type === 'product');

    container.innerHTML = ''; // Clear previous content
    if (merchantProducts.length === 0) {
        container.innerHTML = `<p style="text-align: center; padding: 20px; color: var(--text-secondary);">This merchant has not listed any products yet.</p>`;
        return;
    }
    merchantProducts.forEach(item => {
        const cardElement = createListCard(item, cardConfig);
        if (cardElement) {
            container.appendChild(cardElement);
        }
    });
}

function renderServices(allItems, merchantId, cardConfig) {
    const container = document.querySelector('#services .item-list-container');
    // Filter for services of the current merchant
    const merchantServices = allItems.filter(item => item.meta.links.merchantId === merchantId && item.meta.type === 'service');

    container.innerHTML = ''; // Clear previous content
    if (merchantServices.length === 0) {
        container.innerHTML = `<p style="text-align: center; padding: 20px; color: var(--text-secondary);">This merchant has not listed any services yet.</p>`;
        return;
    }
    merchantServices.forEach(item => {
        const cardElement = createListCard(item, cardConfig);
        if (cardElement) {
            container.appendChild(cardElement);
        }
    });
}

function renderPosts(merchantData, currentUser) {
    const container = document.querySelector('#posts .posts-section');
    container.innerHTML = posts.map(post => {
        const postDescription = post.content.text;
        const postImage = post.content.media.find(m => m.type === 'image');
        // NEW: Check if description is long enough to need truncation
        const isLong = postDescription.length > 80; // A reasonable length for one line
        const descriptionHTML = isLong
            ? `<div class="post-description-wrapper"><p class="post-description post-description-truncated" data-full-text="${postDescription}">${postDescription}</p><span class="post-read-more">Read more</span></div>`
            : `<div class="post-description-wrapper"><p class="post-description">${postDescription}</p></div>`;

        // NEW: Conditionally render the poll
        let pollHTML = '';
        if (post.poll) {
            const pollOptionsHTML = post.poll.options.map(option => `
                    <div class="poll-option" data-post-id="${post.meta.postId}" data-option-id="${option.id}">
                        <span class="poll-option-text">${option.text}</span>
                    </div>
                `).join('');

            pollHTML = `
                <div class="post-poll-container">
                    <p class="poll-question">${post.poll.question}</p>
                    <div class="poll-options">${pollOptionsHTML}</div>
                    <div class="poll-footer"><span class="poll-total-votes">${post.poll.totalVotes} votes</span></div>
                </div>
                `;
        }

        // NEW: Conditionally render the image tag
        let imageHTML = '';
        if (postImage) {
            // NEW: Add product tag if products are tagged
            const productTagHTML = post.taggedProducts && post.taggedProducts.length > 0
                ? `<div class="post-product-tag"><i class="fas fa-shopping-bag"></i> View Products</div>`
                : '';
            imageHTML = `<div class="post-image-container"><img src="${postImage.url}" alt="Post image" class="post-image">${productTagHTML}</div>`;
        }

        // NEW: Conditionally render the comments section
        let commentsHTML = '';
        if (post.engagement && post.engagement.comments > 0) {
            const latestComment = post.comments[0];
            commentsHTML = `
                    <div class="post-comments-section">
                        <div class="view-all-comments">View all ${post.engagement.comments} comments</div>
                        ${latestComment ? `<p class="post-description"><strong>${latestComment.user}</strong> ${latestComment.text}</p>` : ''}
                    </div>
                `;
        }

        // --- FIX: Use current user's avatar for the comment box ---
        const userAvatarHTML = currentUser?.info?.avatar
            ? `<img src="${buildCloudinaryUrl(currentUser.info.avatar)}" alt="Your avatar" class="post-avatar">`
            : `<div class="post-avatar guest-avatar"><i class="fas fa-user-circle"></i></div>`;

        // NEW: Add comment input section
        const addCommentHTML = `
                <div class="post-comments-section comment-add-section">
                    ${userAvatarHTML}
                    <input type="text" class="comment-add-input" placeholder="Add a comment..." readonly />
                    <button class="comment-send-btn hidden"><i class="fas fa-paper-plane"></i></button>
                </div>
            `;

        return `
            <div class="post-card">
                <div class="post-header">
                    <img src="${merchantData.info.logo}" alt="${merchantData.info.name}" class="post-avatar">
                    <div class="post-author-info">
                        <span class="post-author-name">${merchantData.info.name}</span>
                        <span class="post-date">${new Date(post.audit.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="post-content">
                    ${descriptionHTML}
                </div>
                ${imageHTML}
                ${pollHTML}
                <div class="post-stats">
                    <div class="post-engagement-stats">
                        <span>${formatNumber(post.engagement?.likes || 0)} likes</span>
                    </div>
                    <span>${formatNumber(post.engagement?.views || 0)} views</span>
                </div>
                
                ${commentsHTML}
                <div class="post-actions">
                    <div class="post-main-actions">
                        <div class="post-action like-action" data-post-id="${post.meta.postId}"><i class="far fa-heart"></i><span>Like</span></div>
                        <div class="post-action"><i class="far fa-comment-alt"></i><span>Comment</span></div>
                        <div class="post-action"><i class="fas fa-share"></i><span>Share</span></div>
                    </div>
                    <div class="post-action save-action" data-post-id="${post.meta.postId}">
                        <i class="far fa-bookmark"></i>
                    </div>
                </div>
                ${addCommentHTML}
            </div>`;
    }).join('');
    // Add event listeners for the new like buttons
    addPostLikeListeners();
    // NEW: Add event listeners for the read more links
    addReadMoreListeners();
    // NEW: Add event listeners for poll options
    addPollListeners();
    // NEW: Add event listeners for save buttons
    addSavePostListeners();
    // NEW: Add event listeners for the new interactive comment input
    addCommentInputListeners();
}

async function renderCommunity(merchantData, allRatings) {
    const ratingSummaryContainer = document.querySelector('.community-rating-summary');
    const activityFeedContainer = document.getElementById('activity-feed-list');
    const rating = merchantData.engagement?.rating || 0;
    const reviews = merchantData.engagement?.reviews || 0;

    // Render Rating Summary
    const distribution = [
        (rating / 5) * 0.6 * reviews, (rating / 5) * 0.2 * reviews,
        (rating / 5) * 0.1 * reviews, (rating / 5) * 0.05 * reviews,
        (rating / 5) * 0.05 * reviews
    ];
    let barsHTML = '';
    for (let i = 5; i >= 1; i--) { // Loop from 5 down to 1
        const percentage = reviews > 0 ? (distribution[5 - i] / reviews) * 100 : 0;
        barsHTML += `
                <div class="rating-bar-row">
                    <span class="star-label">${i} star</span>
                    <div class="rating-bar-bg"><div class="rating-bar" style="width: ${percentage}%;"></div></div>
                </div>
            `;
    }
    ratingSummaryContainer.innerHTML = `
            
                <h4 class="section-title">Ratings & Reviews</h4>
                <div class="rating-summary-header">
                    <div class="avg-rating">${rating.toFixed(1)}</div>
                    <div>
                        <div class="stars" style="color: #facc15;">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}</div>
                        <div class="total-reviews">${reviews} reviews</div>
                    </div>
                </div>
                <div class="rating-bars-container">${barsHTML}</div>
            
        `;

    // Filter ratings for the current merchant
    const merchantRatings = allRatings.filter(r => r.meta.links.merchantId === merchantData.meta.merchantId);

    // Render Activity Feed (Reviews)
    if (merchantRatings.length > 0) {
        // Use Promise.all to fetch user data for all reviews concurrently
        const reviewPromises = merchantRatings.map(async (review) => {
            const user = await fetchUserById(review.meta.links.userId);
            const userName = user?.info?.fullName || 'Anonymous';
            const userAvatarUrl = user?.info?.avatar ? buildCloudinaryUrl(user.info.avatar) : null;
            // --- FIX: Safely access rating value to prevent TypeError ---
            const ratingValue = review.rating?.value || 0;
            const starsHTML = '★'.repeat(Math.round(ratingValue)) + '☆'.repeat(5 - Math.round(ratingValue));
            const reviewDate = new Date(review.meta.createdAt).toLocaleDateString();

            // --- FIX: Conditionally render avatar image or placeholder icon ---
            const avatarHTML = userAvatarUrl
                ? `<img src="${userAvatarUrl}" alt="${userName}" class="activity-avatar">`
                : `<div class="activity-avatar placeholder"><i class="fas fa-user-circle"></i></div>`;

            return `
                <div class="activity-card">
                    <div class="activity-header">
                        ${avatarHTML}
                        <div class="activity-user-info">
                            <div class="user-name">${userName}</div>
                            <div style="display: flex; align-items: center; flex-wrap: wrap;"><span class="activity-date">${reviewDate}</span><span class="activity-rating" style="color: #facc15;">${starsHTML}</span></div>
                        </div>
                    </div>
                    <p class="activity-comment">${review.content?.comment || ''}</p>
                </div>
            `;
        });
        const reviewsHtml = await Promise.all(reviewPromises);
        activityFeedContainer.innerHTML = reviewsHtml.join('');
    } else {
        activityFeedContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">No reviews yet.</p>';
    }

    // Render Active Members Section
    const activeMembersContainer = document.getElementById('active-members-list');
    const activeMembers = merchantData.community?.activeMembers || [];
    // --- FIX: Reverse stacking order of avatars using z-index ---
    const totalMembers = activeMembers.length;
    activeMembersContainer.innerHTML = activeMembers.map((member, index) => {
        const zIndex = totalMembers - index; // First avatar gets highest z-index
        return `<img src="${member.avatarUrl}" alt="${member.name}" class="active-member-avatar" title="${member.name}" style="z-index: ${zIndex};">`;
    }).join('');

    // NEW: Render Community Description
    const communityDescContainer = document.getElementById('community-description-content');
    communityDescContainer.textContent = merchantData.community?.description || 'Welcome to our community! Stay tuned for updates and offers.';

}

function renderAbout(merchantData) {
    document.getElementById('about-description').textContent = merchantData.info.description;

    const infoContainer = document.getElementById('contact-info-list');

    const establishmentDate = new Date(merchantData.info.establishedAt);
    const establishmentYear = establishmentDate.getFullYear();

    const primaryAddress = merchantData.addresses.find(a => a.isPrimary) || merchantData.addresses[0];
    const fullAddress = primaryAddress ? `${primaryAddress.street}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.zipCode}` : 'Address not available';

    const hours = merchantData.openingHours.note || 'Timings not available';

    // NEW: Social Links Rendering
    infoContainer.innerHTML = `
            <div class="info-item"><i class="fas fa-store-alt"></i><span>Established in ${establishmentYear}</span></div>
            <div class="info-item"><i class="fas fa-clock"></i><span>${hours}</span></div>
            <div class="info-item"><i class="fas fa-map-marker-alt"></i><span>${fullAddress}</span></div>
        `;

    // Render Social Links in their own card
    const socialLinksContainer = document.getElementById('social-links-list');
    const socialLinks = merchantData.social || {};

    let socialLinksHTML = '';
    // FIX: Conditionally render each link only if it exists in the data
    if (socialLinks.facebook) socialLinksHTML += `<div class="info-item" data-social="facebook"><i class="fab fa-facebook"></i><a href="${socialLinks.facebook}" target="_blank" rel="noopener noreferrer">${socialLinks.facebook}</a></div>`;
    if (socialLinks.instagram) socialLinksHTML += `<div class="info-item" data-social="instagram"><i class="fab fa-instagram"></i><a href="${socialLinks.instagram}" target="_blank" rel="noopener noreferrer">${socialLinks.instagram}</a></div>`;
    if (socialLinks.twitter) socialLinksHTML += `<div class="info-item" data-social="twitter"><i class="fab fa-twitter"></i><a href="${socialLinks.twitter}" target="_blank" rel="noopener noreferrer">${socialLinks.twitter}</a></div>`;
    if (socialLinks.youtube) socialLinksHTML += `<div class="info-item" data-social="youtube"><i class="fab fa-youtube"></i><a href="${socialLinks.youtube}" target="_blank" rel="noopener noreferrer">${socialLinks.youtube}</a></div>`;
    if (socialLinks.whatsapp) socialLinksHTML += `<div class="info-item" data-social="whatsapp"><i class="fab fa-whatsapp"></i><a href="${socialLinks.whatsapp}" target="_blank" rel="noopener noreferrer">${socialLinks.whatsapp}</a></div>`; // FIX: Add WhatsApp link rendering
    if (socialLinks.linkedin) socialLinksHTML += `<div class="info-item" data-social="linkedin"><i class="fab fa-linkedin"></i><a href="${socialLinks.linkedin}" target="_blank" rel="noopener noreferrer">${socialLinks.linkedin}</a></div>`;
    socialLinksContainer.innerHTML = socialLinksHTML || '<p>No social media links provided.</p>';
    const lastSocialItem = socialLinksContainer.querySelector('.info-item:last-child');
    if (lastSocialItem) lastSocialItem.style.marginBottom = '0';

    // Render Store Policies
    // This is now static as policies object was removed from new structure
    document.getElementById('store-policies-content').textContent = 'Returns accepted within 7 days of purchase with original receipt. Items must be in original condition.';

    // NEW: Render Payment & Delivery Info
    const paymentDeliveryContainer = document.getElementById('payment-delivery-info');
    const payment = merchantData.paymentOptions || {};
    const delivery = merchantData.deliveryInfo || {};
    // FIX: Remove inline padding, parent .about-card now handles it.
    // paymentDeliveryContainer.style.padding = '0 16px';
    let paymentDeliveryHTML = '';

    if (payment.acceptsCod) paymentDeliveryHTML += `<div class="info-item"><i class="fas fa-money-bill-wave"></i><span>Cash on Delivery (COD) available</span></div>`;
    if (payment.acceptsOnline && payment.acceptedGateways?.length > 0) {
        paymentDeliveryHTML += `<div class="info-item"><i class="fas fa-credit-card"></i><span>Accepts Online Payments (${payment.acceptedGateways.join(', ')})</span></div>`;
    }
    if (delivery.isAvailable) {
        paymentDeliveryHTML += `<div class="info-item"><i class="fas fa-shipping-fast"></i><span>Home delivery available up to ${delivery.deliveryRadiusKm}km</span></div>`;
        if (delivery.freeDeliveryThreshold > 0) {
            paymentDeliveryHTML += `<div class="info-item"><i class="fas fa-box-open"></i><span>Free delivery on orders over ₹${delivery.freeDeliveryThreshold}</span></div>`;
        }
    } else {
        paymentDeliveryHTML += `<div class="info-item"><i class="fas fa-store"></i><span>In-store pickup only</span></div>`;
    }
    paymentDeliveryContainer.innerHTML = paymentDeliveryHTML || '<p>Payment and delivery details not provided.</p>';

    // NEW: Render Legal Info
    const legalContainer = document.getElementById('legal-info-list');
    const legal = merchantData.legalInfo || {};
    // FIX: Remove inline padding, parent .about-card now handles it.
    // legalContainer.style.padding = '0 16px';
    let legalHTML = '';
    if (legal.ownerName) legalHTML += `<div class="info-item"><i class="fas fa-user-tie"></i><span>Owner: ${legal.ownerName}</span></div>`;
    if (legal.gstin) legalHTML += `<div class="info-item"><i class="fas fa-file-invoice-dollar"></i><span>GSTIN: ${legal.gstin}</span></div>`;
    legalContainer.innerHTML = legalHTML || '<p>Legal information not provided.</p>';

    // NEW: Render More Info
    const moreInfoContainer = document.getElementById('more-info-list');
    const joinDate = new Date(merchantData.meta.joinedAt);
    const formattedJoinDate = joinDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    // FIX: Remove inline padding, parent .about-card now handles it.
    // moreInfoContainer.style.padding = '0 16px';
    let moreInfoHTML = '';
    moreInfoHTML += `<div class="info-item"><i class="fas fa-calendar-check"></i><span>Joined on ${formattedJoinDate}</span></div>`;
    if (merchantData.meta.merchantId) {
        moreInfoHTML += `<div class="info-item"><i class="fas fa-id-card-alt"></i><span>ID: ${merchantData.meta.merchantId}</span></div>`;
    }
    moreInfoContainer.innerHTML = moreInfoHTML;
}

// --- HELPERS ---

/**
 * NEW: Adds click event listeners to poll options.
 */
function addPollListeners() {
    document.querySelectorAll('.poll-option').forEach(optionElement => {
        optionElement.addEventListener('click', function () {
            // Prevent re-voting
            if (this.classList.contains('voted-on')) return;

            const postId = this.dataset.postId;
            const chosenOptionId = this.dataset.optionId;
            const post = posts.find(p => p.meta.postId === postId);
            if (!post || !post.poll) return;

            const pollOptionsContainer = this.parentElement;

            // Mark all options in this poll as voted
            pollOptionsContainer.querySelectorAll('.poll-option').forEach(opt => {
                opt.classList.add('voted-on');
            });

            // Update UI to show results
            pollOptionsContainer.innerHTML = post.poll.options.map(option => {
                const percentage = post.poll.totalVotes > 0 ? ((option.votes / post.poll.totalVotes) * 100).toFixed(0) : 0;
                const isUserChoice = option.id === chosenOptionId;

                return `
                        <div class="poll-option voted-on ${isUserChoice ? 'user-choice' : ''}">
                            <div class="poll-option-result">
                                <span class="poll-option-text">${option.text}</span>
                                <span class="poll-option-percent">${percentage}%</span>
                            </div>
                            <div class="poll-progress-bar" style="width: ${percentage}%;"></div>
                        </div>
                    `;
            }).join('');

        }, { once: true }); // The listener will be removed after being invoked once
    });
}

/**
 * NEW: Adds click event listeners to post save/bookmark buttons.
 */
function addSavePostListeners() {
    document.querySelectorAll('.save-action').forEach(action => {
        action.addEventListener('click', function () {
            const bookmarkIcon = this.querySelector('.fa-bookmark');
            if (bookmarkIcon) {
                // Toggle classes for visual feedback
                bookmarkIcon.classList.toggle('far'); // Regular icon
                bookmarkIcon.classList.toggle('fas'); // Solid icon
                bookmarkIcon.classList.toggle('saved'); // Class for color
            }
        });
    });
}


/**
 * NEW: Adds click event listeners to post "Read more" links.
 */
function addReadMoreListeners() {
    document.querySelectorAll('.post-read-more').forEach(link => {
        link.addEventListener('click', function () {
            const wrapper = this.parentElement;
            const descriptionElement = wrapper.querySelector('.post-description');

            if (wrapper && descriptionElement) {
                // Expand the text
                descriptionElement.textContent = descriptionElement.dataset.fullText;
                descriptionElement.classList.remove('post-description-truncated');

                // Allow the wrapper to wrap text now
                wrapper.style.display = 'block';
                this.style.display = 'none';
            }
        });
    });
}

/**
 * Adds click event listeners to post like buttons for a visual-only toggle effect.
 */
function addPostLikeListeners() {
    document.querySelectorAll('.like-action').forEach(action => {
        action.addEventListener('click', function () {
            const heartIcon = this.querySelector('.fa-heart');
            if (heartIcon) {
                // Toggle classes for visual feedback without changing data
                heartIcon.classList.toggle('far'); // Regular icon
                heartIcon.classList.toggle('fas'); // Solid icon
                heartIcon.classList.toggle('liked'); // Class for red color
            }
        });
    });
}
/**
 * Enables horizontal scrolling on an element using the mouse wheel.
 * @param {HTMLElement} element The element to apply the behavior to.
 */
function enableHorizontalScroll(element) {
    if (!element) return;
    element.addEventListener('wheel', (e) => {
        // If there's horizontal overflow
        if (element.scrollWidth > element.clientWidth) {
            if (e.deltaY !== 0) {
                // Prevent the default vertical scroll and scroll horizontally instead
                e.preventDefault();
                element.scrollLeft += e.deltaY;
            }
        }
    });
}

/**
 * NEW: Adds click event listeners to the comment input fields.
 */
function addCommentInputListeners() {
    document.querySelectorAll('.comment-add-input').forEach(input => {
        input.addEventListener('click', function() {
            // Allow both guests and logged-in users to activate the comment field.
            this.readOnly = false;
            this.focus();
            const sendBtn = this.nextElementSibling;
            if (sendBtn && sendBtn.classList.contains('comment-send-btn')) {
                sendBtn.classList.remove('hidden');
            }
        });
    });

    document.querySelectorAll('.comment-send-btn').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent form submission if it's in a form
            const isGuest = !localStorage.getItem('currentUserId');
            const input = this.previousElementSibling;

            // --- FIX: Check for guest status on SEND, not on input click ---
            if (isGuest) {
                // Guide guest users to log in only when they try to send a comment.
                showToast('info', 'Please log in to comment.');
                // Redirect to login/signup page
                setTimeout(() => {
                    routeManager.switchView('guest', 'account/authentication');
                }, 1500);
            } else {
                // For logged-in users, show the placeholder message.
                showToast('info', 'This feature is not implemented');
                if (input) input.value = ''; // Clear input after "sending"
            }
        });
    });
}

/**
 * Enables click-and-drag horizontal scrolling on an element.
 * @param {HTMLElement} element The element to make draggable.
 */
function enableDragToScroll(element) {
    if (!element) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    element.addEventListener('mousedown', (e) => {
        isDown = true;
        element.classList.add('grabbing');
        startX = e.pageX - element.offsetLeft;
        scrollLeft = element.scrollLeft;
    });

    element.addEventListener('mouseleave', () => {
        isDown = false;
        element.classList.remove('grabbing');
    });

    element.addEventListener('mouseup', () => {
        isDown = false;
        element.classList.remove('grabbing');
    });

    element.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - element.offsetLeft;
        const walk = (x - startX) * 2; // The multiplier makes scrolling faster
        element.scrollLeft = scrollLeft - walk;
    });
}

let isInitialized = false;
let eventListeners = [];

export async function init(force = false) {
    if (isInitialized && !force) return;

    console.log("🚀 Initializing Merchant Profile View...");

    // Initialize the card helper to load templates
    await initCardHelper();

    // Get merchantId from the router
    const merchantId = routeManager.routeParams?.id;
    if (!merchantId) {
        showToast('error', 'Merchant ID not found.');
        // Optionally, redirect back to a safe page
        routeManager.switchView(localStorage.getItem('currentUserType') || 'guest', 'home');
        return;
    }

    // --- REFACTOR: Create a common card config similar to updates.js ---
    const cardConfig = {
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
                formatter: (price) => `₹${price ? price.toFixed(2) : 'N/A'}`
            },
            {
                key: 'pricing.mrp',
                selector: '.max-price',
                visible: (item) => item.pricing?.mrp > item.pricing?.sellingPrice,
                formatter: (mrp) => `₹${mrp.toFixed(2)}`
            },
            { key: 'analytics.rating', selector: '.stars', visible: true },
            { key: 'inventory.stockQty', selector: '.stock-status', visible: true },
        ],
        buttons: [
            { label: 'View Details', action: 'VIEW_DETAILS', class: 'btn-secondary', visible: true },
            { label: 'Add to Cart', action: 'ADD_TO_CART', class: 'btn-primary', visible: true },
            { label: 'Save for later', action: 'SAVE_FOR_LATER', class: 'btn-secondary', visible: true },
            { label: 'Share me', action: 'SHARE_ITEM', class: 'btn-secondary', visible: true }
        ],
        actionHandlers: {
            'VIEW_DETAILS': (item) => {
                sessionStorage.setItem('selectedItem', JSON.stringify(item));
                routeManager.switchView(localStorage.getItem('currentUserType') || 'guest', `item-details/${item.meta.itemId}`);
            },
            'ADD_TO_CART': (item) => showToast('success', `${item.info.name} added to cart!`),
            'SAVE_FOR_LATER': (item) => showToast('info', `${item.info.name} saved for later!`),
            'SHARE_ITEM': (item) => showToast('info', `Sharing ${item.info.name}`),
        }
    };
    try {
        // --- FIX: Fetch current user data to fix 'currentUser is not defined' error ---
        const currentUserId = localStorage.getItem('currentUserId');
        let currentUser = null;
        if (currentUserId) {
            currentUser = await fetchUserById(currentUserId);
        }

        // --- FIX: Use Promise.allSettled for more resilient data fetching ---
        const [merchantResult, allItemsResult, allRatingsResult] = await Promise.allSettled([
            fetchMerchantById(merchantId),
            fetchAllItems(),
            fetchAllRatings()
        ]);

        const merchant = merchantResult.status === 'fulfilled' ? merchantResult.value : null;
        if (!merchant) { // If the essential merchant data fails, we can't render the page.
            showToast('error', 'Merchant data could not be loaded.');
            return;
        }

        // --- FIX: Extract allItems and allRatings from the settled promises ---
        const allItems = allItemsResult.status === 'fulfilled' ? allItemsResult.value : [];
        const allRatings = allRatingsResult.status === 'fulfilled' ? allRatingsResult.value : [];

        // --- RENDER ALL SECTIONS WITH REAL DATA ---
        renderProfile(merchant);
        renderHome(allItems, merchant.meta.merchantId, cardConfig);
        renderProducts(allItems, merchant.meta.merchantId, cardConfig);
        renderServices(allItems, merchant.meta.merchantId, cardConfig);
        renderPosts(merchant, currentUser); // Pass currentUser to renderPosts
        renderAbout(merchant);
        await renderCommunity(merchant, allRatings); // This is async now

    } catch (error) {
        console.error("Error initializing merchant profile:", error);
        showToast('error', 'Failed to load merchant profile.');
    }

    // --- SETUP EVENT LISTENERS (only once) ---

    // --- REFACTOR: Setup event listeners only once ---
    if (!isInitialized) {
        function addManagedEventListener(element, type, listener) {
            element.addEventListener(type, listener);
            eventListeners.push({ element, type, listener });
        }

        const tabNavElement = document.querySelector('.tab-nav');
        enableHorizontalScroll(tabNavElement);
        enableDragToScroll(tabNavElement);

        const tabLinks = document.querySelectorAll('.tab-link');
        const tabContents = document.querySelectorAll('.tab-content');

        tabLinks.forEach(link => {
            addManagedEventListener(link, 'click', () => {
                const tabId = link.dataset.tab;

                tabLinks.forEach(l => l.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                link.classList.add('active');
                document.getElementById(tabId).classList.add('active');

                link.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            });
        });

        const followBtn = document.getElementById('profile-follow-btn');
        if (followBtn) {
            addManagedEventListener(followBtn, 'click', () => {
                const isFollowing = followBtn.classList.contains('primary');
                if (isFollowing) {
                    followBtn.classList.remove('primary');
                    followBtn.classList.add('secondary');
                    followBtn.innerHTML = '<i class="fas fa-user-plus"></i> Follow Me';
                } else {
                    followBtn.classList.remove('secondary');
                    followBtn.classList.add('primary');
                    followBtn.innerHTML = '<i class="fas fa-user-check"></i> Following';
                }
            });
        }

        const notificationBtn = document.getElementById('profile-notification-btn');
        if (notificationBtn) {
            addManagedEventListener(notificationBtn, 'click', () => {
                const icon = notificationBtn.querySelector('i');
                const isSubscribed = icon.classList.contains('fas');

                icon.classList.remove('bell-shake');
                void icon.offsetWidth;
                icon.classList.add('bell-shake');

                if (isSubscribed) {
                    icon.classList.remove('fas');
                    icon.classList.add('far');
                } else {
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                }
            });
        }
    }

    isInitialized = true;
}

export function cleanup() {
    console.log("Cleaning up merchant profile view listeners.");
    eventListeners.forEach(({ element, type, listener }) => {
        element.removeEventListener(type, listener);
    });
    eventListeners = [];
    isInitialized = false;
}