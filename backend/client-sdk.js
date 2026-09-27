/**
 * Pubudu Electronics (ichouse.lk) - Storefront Integration Client SDK
 * Drop this script into any page on your website to connect directly with your live inventory!
 */
(function(window) {
  // Update this to your deployed backend API URL (e.g. https://api.ichouse.lk or Render/Railway URL)
  const API_BASE_URL = window.PUBUDU_API_URL || 'http://localhost:5000';

  const PubuduStore = {
    baseUrl: API_BASE_URL,

    /**
     * Get all products with live stock from inventory
     */
    async getProducts(options = {}) {
      const { inStockOnly = false, category = '', search = '' } = options;
      const params = new URLSearchParams();
      if (inStockOnly) params.append('inStockOnly', 'true');
      if (category) params.append('category', category);
      if (search) params.append('search', search);

      const res = await fetch(`${this.baseUrl}/api/products?${params.toString()}`);
      return await res.json();
    },

    /**
     * Check real-time stock for a single product ID
     */
    async checkStock(productId) {
      const res = await fetch(`${this.baseUrl}/api/products/${productId}`);
      const data = await res.json();
      if (data.success && data.product) {
        return {
          exists: true,
          inStock: data.product.isInStock,
          availableStock: data.product.availableStock,
          price: data.product.sellPrice || data.product.buyPrice,
          name: data.product.name
        };
      }
      return { exists: false, inStock: false, availableStock: 0 };
    },

    /**
     * Automatically update an HTML element with live stock status badge
     * Usage: PubuduStore.renderStockBadge('#stock-badge-1', 'FIRESTORE_ITEM_ID');
     */
    async renderStockBadge(selector, productId) {
      const el = document.querySelector(selector);
      if (!el) return;

      el.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem;"><i class="fa-solid fa-spinner fa-spin"></i> Checking stock...</span>';

      try {
        const stockInfo = await this.checkStock(productId);
        if (!stockInfo.exists) {
          el.innerHTML = '<span style="color:#ef4444; font-size:0.8rem;">Unavailable</span>';
          return;
        }

        if (stockInfo.inStock) {
          el.innerHTML = `
            <span style="display:inline-flex; align-items:center; gap:5px; background:rgba(16,185,129,0.15); color:#10b981; padding:3px 8px; border-radius:6px; font-weight:600; font-size:0.8rem;">
              <span style="width:6px; height:6px; border-radius:50%; background:#10b981;"></span>
              In Stock (${stockInfo.availableStock} available)
            </span>
          `;
        } else {
          el.innerHTML = `
            <span style="display:inline-flex; align-items:center; gap:5px; background:rgba(239,68,68,0.15); color:#ef4444; padding:3px 8px; border-radius:6px; font-weight:600; font-size:0.8rem;">
              <span style="width:6px; height:6px; border-radius:50%; background:#ef4444;"></span>
              Out of Stock
            </span>
          `;
        }
      } catch (err) {
        el.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem;">Live Stock Ready</span>';
      }
    },

    /**
     * Submit an order from website checkout
     * Automatically deducts stock and records sale in your Inventory Manager!
     */
    async placeOrder(orderData) {
      const res = await fetch(`${this.baseUrl}/api/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      return await res.json();
    }
  };

  window.PubuduStore = PubuduStore;
})(window);
