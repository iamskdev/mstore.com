const products = [
  {
    id: 1,
    name: "Wireless Bluetooth Headphones",
    price: 899,
    oldPrice: 1499,
    discount: "40% off",
    qty: 1,
    rating: 4.2,
    stock: "In stock",
    img: "../localstore/images/default-product.jpg"
  },
  {
    id: 2,
    name: "Stainless Steel Water Bottle 1L",
    price: 250,
    oldPrice: 499,
    discount: "50% off",
    qty: 1,
    rating: 4.0,
    stock: "In stock",
    img: "../localstore/images/default-product.jpg"
  },
  {
    id: 3,
    name: "Portable USB Mini Fan",
    price: 399,
    oldPrice: 799,
    discount: "50% off",
    qty: 1,
    rating: 3.8,
    stock: "Only 5 left",
    img: "../localstore/images/default-product.jpg"
  },
  {
    id: 4,
    name: "Classic Leather Wallet for Men",
    price: 699,
    oldPrice: 1299,
    discount: "46% off",
    qty: 1,
    rating: 4.4,
    stock: "In stock",
    img: "../localstore/images/default-product.jpg"
  },
  {
    id: 5,
    name: "Casual Cotton T-Shirt",
    price: 349,
    oldPrice: 699,
    discount: "50% off",
    qty: 1,
    rating: 4.1,
    stock: "In stock",
    img: "../localstore/images/default-product.jpg"
  },
  {
    id: 6,
    name: "Non-stick Frying Pan 24cm",
    price: 560,
    oldPrice: 999,
    discount: "44% off",
    qty: 1,
    rating: 3.9,
    stock: "Only 3 left",
    img: "../localstore/images/default-product.jpg"
  },
  {
    id: 7,
    name: "Rechargeable LED Torch",
    price: 480,
    oldPrice: 850,
    discount: "43% off",
    qty: 1,
    rating: 4.3,
    stock: "In stock",
    img: "../localstore/images/default-product.jpg"
  },
  {
    id: 8,
    name: "Yoga Mat with Carry Strap",
    price: 750,
    oldPrice: 1299,
    discount: "42% off",
    qty: 1,
    rating: 4.5,
    stock: "Only 1 left",
    img: "../localstore/images/default-product.jpg"
  },
  {
    id: 9,
    name: "Gaming Mouse RGB Lighting",
    price: 1200,
    oldPrice: 1999,
    discount: "40% off",
    qty: 1,
    rating: 4.6,
    stock: "In stock",
    img: "../localstore/images/default-product.jpg"
  },
  {
    id: 10,
    name: "Digital Kitchen Weighing Scale",
    price: 599,
    oldPrice: 1099,
    discount: "45% off",
    qty: 1,
    rating: 4.2,
    stock: "Only 4 left",
    img: "../localstore/images/default-product.jpg"
  }
];

const services = [
  {
    id: 1,
    name: "Chartered Accountant (Tax Filing & GST)",
    price: 2499,
    oldPrice: 3999,
    discount: "38% off",
    qty: 1, // Added qty
    rating: 4.7,
    stock: "Available",
    img: "../localstore/images/default-service.jpg"
  },
  {
    id: 2,
    name: "Digital Marketing Service (SEO & Ads)",
    price: 5999,
    oldPrice: 9999,
    discount: "40% off",
    qty: 1, // Added qty
    rating: 4.6,
    stock: "Available",
    img: "../localstore/images/default-service.jpg"
  },
  {
    id: 3,
    name: "Graphic Design & Branding",
    price: 2999,
    oldPrice: 4999,
    discount: "42% off",
    qty: 1, // Added qty
    rating: 4.5,
    stock: "Available",
    img: "../localstore/images/default-service.jpg"
  },
  {
    id: 4,
    name: "Web Development (Business Website)",
    price: 9999,
    oldPrice: 14999,
    discount: "33% off",
    qty: 1, // Added qty
    rating: 4.8,
    stock: "Available",
    img: "../localstore/images/default-service.jpg"
  },
  {
    id: 5,
    name: "Mobile App Development",
    price: 14999,
    oldPrice: 24999,
    discount: "40% off",
    qty: 1, // Added qty
    rating: 4.7,
    stock: "Available",
    img: "../localstore/images/default-service.jpg"
  },
  {
    id: 6,
    name: "Legal Consultancy (Contracts & Compliance)",
    price: 3499,
    oldPrice: 5999,
    discount: "41% off",
    qty: 1, // Added qty
    rating: 4.4,
    stock: "Available",
    img: "../localstore/images/default-service.jpg"
  },
  {
    id: 7,
    name: "Content Writing & Copywriting",
    price: 1999,
    oldPrice: 3499,
    discount: "43% off",
    qty: 1, // Added qty
    rating: 4.5,
    stock: "Available",
    img: "../localstore/images/default-service.jpg"
  },
  {
    id: 8,
    name: "IT Support & Networking",
    price: 4999,
    oldPrice: 7999,
    discount: "37% off",
    qty: 1, // Added qty
    rating: 4.6,
    stock: "Available",
    img: "../localstore/images/default-service.jpg"
  },
  {
    id: 9,
    name: "Architecture & Interior Design",
    price: 12999,
    oldPrice: 19999,
    discount: "35% off",
    qty: 1, // Added qty
    rating: 4.7,
    stock: "Available",
    img: "../localstore/images/default-service.jpg"
  },
  {
    id: 10,
    name: "Business Consultancy & Startup Advisory",
    price: 6999,
    oldPrice: 11999,
    discount: "42% off",
    qty: 1, // Added qty
    rating: 4.8,
    stock: "Available",
    img: "../localstore/images/default-service.jpg"
  }
];

    let activeTab = "products";

    // ⭐ Render Stars Function
    function renderStars(rating) {
      let fullStars = Math.floor(rating);
      let halfStar = rating % 1 >= 0.5;
      let starsHtml = "";

      for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
          starsHtml += `<span class="filled">★</span>`;
        } else if (i === fullStars + 1 && halfStar) {
          starsHtml += `<span class="half">★</span>`;
        } else {
          starsHtml += `<span>★</span>`;
        }
      }
      return `<div class="stars">${starsHtml} <small>(${rating.toFixed(1)})</small></div>`;
    }
    function rendercard() {
    console.log("rendercard called");
      const productsPanel = document.getElementById("products-tab-panel");
      const servicesPanel = document.getElementById("services-tab-panel");
      productsPanel.innerHTML = ""; // Clear both panels
      servicesPanel.innerHTML = ""; // Clear both panels
      let total = 0;

      let data = activeTab === "products" ? products : services;

      const cartItemTemplate = document.getElementById('cart-item-template');

      data.forEach(item => {
        total += item.price * item.qty;

        let stockStatusClass = '';
        let stockIconClass = '';
        let stockStatusText = '';

        if (item.stock.toLowerCase().includes('in stock')) {
          stockStatusClass = 'in';
          stockIconClass = 'fas fa-check-circle';
          stockStatusText = 'In Stock';
        } else if (item.stock.toLowerCase().includes('only') || item.stock.toLowerCase().includes('left')) {
            stockStatusClass = 'in';
            stockIconClass = 'fas fa-exclamation-circle';
            stockStatusText = item.stock;
        } else if (item.stock.toLowerCase().includes('available')) {
            stockStatusClass = 'in';
            stockIconClass = 'fas fa-check-circle';
            stockStatusText = 'Available';
        }
        else {
          stockStatusClass = 'out';
          stockIconClass = 'fas fa-times-circle';
          stockStatusText = 'Out of Stock';
        }

        const actionButtonText = activeTab === 'services' ? 'Book Now' : 'Buy now';

        const cardItem = document.importNode(cartItemTemplate.content, true);

        cardItem.querySelector('.card-title').textContent = item.name;
        cardItem.querySelector('.card-price').textContent = `₹${item.price * item.qty}`;
        cardItem.querySelector('.card-old-price').textContent = `₹${item.oldPrice}`;
        cardItem.querySelector('.card-discount').textContent = item.discount;
        cardItem.querySelector('.stars').innerHTML = renderStars(item.rating);
        cardItem.querySelector('.stars small').textContent = `(${item.rating.toFixed(1)})`;
        
        const stockStatusElement = cardItem.querySelector('.stock-status');
        stockStatusElement.classList.add(stockStatusClass);
        stockStatusElement.querySelector('i').className = stockIconClass;
        stockStatusElement.lastChild.textContent = ` ${stockStatusText}`;

        cardItem.querySelector('.card-item-body img').src = item.img;
        cardItem.querySelector('.card-item-body img').alt = item.name;

        cardItem.querySelector('.action-button').textContent = actionButtonText;

        const quantityOrDateSelectorContainer = cardItem.querySelector('.quantity-or-date-selector');
        if (activeTab === 'services') {
            quantityOrDateSelectorContainer.innerHTML = `<label class="date-selector">
                 <i class="fas fa-calendar-alt"></i>
                 <span id="date-text-${item.id}">${item.selectedDate || 'Select Date'}</span>
                 <input type="date" id="date-input-${item.id}" onchange="updateDate(${item.id}, this.value)">
               </label>`;
        } else {
            quantityOrDateSelectorContainer.innerHTML = `<label>Quantity: 
                <select onchange="updateQty(${item.id}, this.value)">
                  ${[1,2,3,4,5].map(q => `<option value="${q}" ${q==item.qty?"selected":""}>${q}</option>`).join("")}
                </select>
              </label>`;
        }

        cardItem.querySelector('.remove-item-button').onclick = () => removeItem(item.id);

        if (activeTab === "products") {
            productsPanel.appendChild(cardItem);
        } else {
            servicesPanel.appendChild(cardItem);
        }
      });

      document.getElementById("cardTotal").innerText = total;
      console.log(`Total price updated to: ${total}`);

      const orderButton = document.querySelector('.btn-order');
      if (activeTab === 'services') {
        orderButton.innerText = 'Book Now';
      } else {
        orderButton.innerText = 'Place Order';
      }
    }

    window.updateQty = function(id, qty) {
      console.log(`updateQty called for id: ${id}, qty: ${qty}`);
      let data = activeTab === "products" ? products : services;
      let item = data.find(i => i.id === id);
      if (item) {
        item.qty = parseInt(qty);
        console.log(`Item ${id} new quantity: ${item.qty}`);
      }
      rendercard();
    }

    window.updateDate = function(id, dateValue) {
      if (activeTab === "services") {
        let item = services.find(i => i.id === id);
        if (item) {
          item.selectedDate = dateValue;
          document.getElementById(`date-text-${id}`).textContent = dateValue || 'Select Date';
        }
      }
    }

    window.removeItem = function(id) {
      if (activeTab === "products") {
        products = products.filter(i => i.id !== id);
      } else {
        services = services.filter(i => i.id !== id);
      }
      rendercard();
    }

    window.switchTab = function(tab) {
      console.log(`switchTab called, new tab: ${tab}`);
      activeTab = tab;
      document.getElementById("tabProducts").classList.remove("active");
      document.getElementById("tabServices").classList.remove("active");
      document.getElementById("products-tab-panel").classList.remove("active");
      document.getElementById("services-tab-panel").classList.remove("active");

      if(tab === "products") {
        document.getElementById("tabProducts").classList.add("active");
        document.getElementById("products-tab-panel").classList.add("active");
      } else {
        document.getElementById("tabServices").classList.add("active");
        document.getElementById("services-tab-panel").classList.add("active");
      }
      rendercard();
    }

    rendercard();