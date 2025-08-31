document.addEventListener('DOMContentLoaded', function() {
    // Wishlist functionality
    const wishlistButtons = document.querySelectorAll('.wishlist-btn');

    wishlistButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const icon = this.querySelector('i');
        if (icon.classList.contains('far')) {
          icon.classList.replace('far', 'fas');
          this.classList.add('active');
        } else {
          icon.classList.replace('fas', 'far');
          this.classList.remove('active');
        }
      });
    });

    // Add to cart functionality
    const addToCartButtons = document.querySelectorAll('.add-to-cart:not(:disabled)');

    addToCartButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fas fa-check"></i> Added';

        setTimeout(() => {
          this.innerHTML = originalText;
        }, 2000);
      });
    });

    // Image fallback for broken images
    document.querySelectorAll('.card-img').forEach(img => {
      img.addEventListener('error', function() {
        this.onerror = null; // Prevent infinite loop
        this.style.display = 'none'; // Hide the broken image

        const wrapper = this.closest('.card-image-wrapper');
        if (wrapper) {
          // Create a fallback container
          const fallbackDiv = document.createElement('div');
          fallbackDiv.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: var(--bg-tertiary); /* Use the existing background */
            color: var(--text-secondary);
            font-size: 0.8rem;
            text-align: center;
          `;

          // Add icon
          const icon = document.createElement('i');
          icon.classList.add('fas', 'fa-image');
          icon.style.fontSize = '2rem';
          icon.style.marginBottom = '0.5rem';
          fallbackDiv.appendChild(icon);

          // Add text
          const text = document.createElement('span');
          text.textContent = 'Image Not Available';
          fallbackDiv.appendChild(text);

          wrapper.appendChild(fallbackDiv);
        }
      });
    });

    // Filter buttons functionality (from demo-card.html, might not be needed in a single card component)
    // Keeping it for now as per user's request to copy code.
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(button => {
      button.addEventListener('click', function() {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
      });
    });
  });

export function initializeCardInteractions(containerElement) {
  // Re-run the DOMContentLoaded logic for elements within the containerElement
  // This function will be called by home.js after cards are rendered.

  // Wishlist functionality
  const wishlistButtons = containerElement.querySelectorAll('.wishlist-btn');
  wishlistButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      const icon = this.querySelector('i');
      if (icon.classList.contains('far')) {
        icon.classList.replace('far', 'fas');
        this.classList.add('active');
      } else {
        icon.classList.replace('fas', 'far');
        this.classList.remove('active');
      }
    });
  });

  // Add to cart functionality
  const addToCartButtons = containerElement.querySelectorAll('.add-to-cart:not(:disabled)');
  addToCartButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      const originalText = this.innerHTML;
      this.innerHTML = '<i class="fas fa-check"></i> Added';

      setTimeout(() => {
        this.innerHTML = originalText;
      }, 2000);
    });
  });

  // Image fallback for broken images
  containerElement.querySelectorAll('.card-img').forEach(img => {
    img.addEventListener('error', function() {
      this.onerror = null; // Prevent infinite loop
      this.style.display = 'none'; // Hide the broken image

      const wrapper = this.closest('.card-image-wrapper');
      if (wrapper) {
        // Create a fallback container
        const fallbackDiv = document.createElement('div');
        fallbackDiv.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-tertiary); /* Use the existing background */
          color: var(--text-secondary);
          font-size: 0.8rem;
          text-align: center;
        `;

        // Add icon
        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-image');
        icon.style.fontSize = '2rem';
        icon.style.marginBottom = '0.5rem';
        fallbackDiv.appendChild(icon);

        // Add text
        const text = document.createElement('span');
        text.textContent = 'Image Not Available';
        fallbackDiv.appendChild(text);

        wrapper.appendChild(fallbackDiv);
      }
    });
  });

  // Filter buttons functionality (from demo-card.html, might not be needed in a single card component)
  // Keeping it for now as per user's request to copy code.
  const filterButtons = containerElement.querySelectorAll('.filter-btn');

  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
    });
  });
}