// ✅ FIX: missing function
function downloadInvoice() {
    window.print();
}

// ✅ FIX: missing function
function sendOrderWhatsApp() {
    const message = "Hello, I want to confirm my order.";
    const phone = "94789155130";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// ✅ FIX: modal quantity function
function updateModalQty(delta) {
    modalQty += delta;
    if (modalQty < 1) modalQty = 1;

    const el = document.getElementById('modal-qty-value');
    if (el) el.textContent = modalQty;
}
// Category Structure (Initial defaults)
let categoryData = {
    "Microcontrollers": ["Arduino Compatible", "ESP8266 Series", "ESP32 Series", "Raspberry Pi", "STM32 Boards"],
    "Modules": ["Relay Modules", "Bluetooth Modules", "WiFi Modules", "GPS Modules", "Motor Drivers"],
    "Power & Volt": ["12V Adapters", "24V Adapters", "5V Adapters", "Adjustable Power Supply", "Transformers"],
    "Passive Components": ["Resistors", "Capacitors", "Inductors", "Potentiometers", "Diodes"],
    "Sensors": ["Temperature & Humidity", "Motion Sensors", "Distance Sensors", "Gas Sensors"],
};

const categoryIcons = {
    "Microcontrollers": "fas fa-microchip",
    "Modules": "fas fa-cube",
    "Power & Volt": "fas fa-plug",
    "Passive Components": "fas fa-project-diagram",
    "Sensors": "fas fa-broadcast-tower"
};

// Start with an empty list
const baseProducts = [];


// Global Category Management
async function saveCategories() {
    if (db) {
        try {
            await db.collection("shop").doc("categories").set({
                data: categoryData,
                lastUpdated: new Date()
            });
            console.log("Categories saved to Cloud");
        } catch (e) {
            console.error("Category Save Error:", e);
        }
    }
    localStorage.setItem('eshop_categories', JSON.stringify(categoryData));
}

async function loadCategories() {
    // 1. Local Fallback First
    const stored = localStorage.getItem('eshop_categories');
    if (stored) {
        const localData = JSON.parse(stored);
        Object.keys(categoryData).forEach(key => delete categoryData[key]);
        Object.assign(categoryData, localData);
        if (window.populateCategoryUI) window.populateCategoryUI();
    }

    // 2. Real-time Cloud Sync
    if (db) {
        db.collection("shop").doc("categories").onSnapshot((doc) => {
            if (doc.exists) {
                const newData = doc.data().data || {};
                // Only update if data actually changed to avoid flickers
                if (JSON.stringify(newData) !== JSON.stringify(categoryData)) {
                    Object.keys(categoryData).forEach(key => delete categoryData[key]);
                    Object.assign(categoryData, newData);
                    console.log("Categories updated from Cloud (Live)");
                    localStorage.setItem('eshop_categories', JSON.stringify(categoryData));
                    
                    // Refresh UI components that use category data
                    if (typeof initFilters === 'function') initFilters();
                    if (typeof renderProducts === 'function') renderProducts();
                    if (typeof renderHomeGrid === 'function') renderHomeGrid();
                    if (window.populateCategoryUI) window.populateCategoryUI();
                }
            }
        }, (err) => console.error("Category Sync Error:", err));
    }
}

// Product Data Management
let products = [];
let db = null;
const defaultDocumentTitle = "Pubudu Electronics | Premium Electronic Components in Sri Lanka";
const defaultMetaDescription = "Premium electronic components in Sri Lanka. Shop Arduino, sensors, and modules at the best prices. Fast island-wide delivery. Trusted by makers and engineers.";

// FIREBASE CONFIGURATION (REPLACE WITH YOUR OWN FROM FIREBASE CONSOLE)
// 1. Go to console.firebase.google.com
// 2. Create a project
// 3. Register a web app
// 4. Copy the "firebaseConfig" object here
const firebaseConfig = {
    apiKey: "AIzaSyDl9N6YmDJI9bhhdkeUQPUxWKxIhZhryus",
    authDomain: "pubudueshop-cde28.firebaseapp.com",
    projectId: "pubudueshop-cde28",
    storageBucket: "pubudueshop-cde28.firebasestorage.app",
    messagingSenderId: "12742630809",
    appId: "1:12742630809:web:68eab94d5c8b4257784708"
};
window.firebaseConfig = firebaseConfig; // Export for other scripts

const SITE_URL = "https://ichouse.lk/";

// Initialize Firebase if configure
function initFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        customerAuth = firebase.auth(); // ← assign auth
        console.log("Firebase Initialized Successfully");
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
    }
}
// Load products - UPDATED for speed (Local First, then Cloud)
function createSEOSlug(name) {
    if (!name) return "";
    return name
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60)
        .replace(/-$/g, '');
}

// Guard flag: prevents double-render from LocalStorage + Firebase firing simultaneously
let initialRenderDone = false;

async function loadProducts() {
    // 1. Try to load from LocalStorage immediately for speed
    const storedProducts = localStorage.getItem('eshop_products');
    if (storedProducts) {
        const localProducts = JSON.parse(storedProducts);
        products.length = 0;
        products.push(...localProducts);
        renderHomeGrid();
        renderProducts();
        if (window.renderAdminList) window.renderAdminList();
        initialRenderDone = true;
        renderSimilarProducts(); // ← render similar products from cache
    }

    // 2. Real-time Sync from Firebase
    if (db) {
        db.collection("shop").doc("inventory").onSnapshot((doc) => {
            if (doc.exists) {
                const cloudProducts = doc.data().products || [];
                
                // Update local array and storage
                products.length = 0;
                products.push(...cloudProducts);
                localStorage.setItem('eshop_products', JSON.stringify(products));

                // Refresh UI
                renderHomeGrid();
                renderProducts();
                if (window.renderAdminList) window.renderAdminList();
                initialRenderDone = true;
                renderSimilarProducts(); // ← render similar products from Firebase
                console.log("Products synced from Firebase:", products.length);
            } else {
                console.warn("No inventory document found in Firestore!");
            }
        }, (err) => {
            console.error("Firestore Sync Error:", err);
        });
    } else {
        console.error("Database (db) is not initialized. Cannot load products.");
    }
}

// Save products to Cloud and Local
async function saveProducts() {
    // 1. Save Local (Instant)
    localStorage.setItem('eshop_products', JSON.stringify(products));

    // 2. Save Cloud (Async)
    if (db) {
        try {
            await db.collection("shop").doc("inventory").set({
                products: products,
                lastUpdated: new Date()
            });
            console.log("Saved to Cloud");
            if (window.renderAdminList) window.renderAdminList();
        } catch (e) {
            console.error("Cloud Save Error:", e);
            alert("Error saving to cloud. Check console.");
        }
    }
}

// Export for Admin
window.products = products;
window.saveProducts = saveProducts;
window.loadProducts = loadProducts;
window.categoryData = categoryData;
window.saveCategories = saveCategories;
window.loadCategories = loadCategories;

const cartBtn = document.getElementById("cart-btn");
const cartBtnTop = document.getElementById("cart-btn-top");

if (cartBtn) cartBtn.addEventListener("click", () => toggleCart(true));
if (cartBtnTop) cartBtnTop.addEventListener("click", () => toggleCart(true));

// DOM Elements
const productGrid = document.getElementById('product-grid');
const filterContainer = document.querySelector('.filter-controls');
const productModalRoot = document.getElementById('product-modal-root');
const modalCloseBtn = document.getElementById('modal-close');
const modalOverlay = document.getElementById('modal-overlay');
const productDetailsView = document.getElementById('product-details-view');

// Detail Elements
let detailImage = document.getElementById('detail-image');
const detailThumbnails = document.getElementById('detail-thumbnails');
const detailTags = document.getElementById('detail-tags');
const detailCategory = document.getElementById('detail-category');
const detailTitle = document.getElementById('detail-title');
const detailPrice = document.getElementById('detail-price');
const detailDescription = document.getElementById('detail-description');
const detailFeatures = document.getElementById('detail-features');
const detailSpecsBody = document.getElementById('detail-specs-body');
const detailVideoBtn = document.getElementById('detail-video-btn');
const detailAddCartBtn = document.getElementById('detail-add-cart-btn');
const detailBuyBtn = document.getElementById('detail-buy-btn');
const mainSearchInput = document.getElementById('main-search-input');
const mainCategorySearch = document.getElementById('main-category-search');
const mainSearchBtn = document.getElementById('main-search-btn');

// Auth & Cart State
let customerAuth = null;
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('eshop_cart')) || [];
let favorites = [];
let userDeliveryDetails = {};
let showingFavorites = false;
let modalQty = 1;
let currentModalProductId = null;

// --- Authentication Logic ---
function initCustomerAuth() {
    if (!customerAuth) {
        console.warn("Auth not initialized yet");
        return;
    }
    customerAuth.onAuthStateChanged(async (user) => {
        currentUser = user;
        const loginBtn = document.getElementById('customer-login-btn');
        const userProfile = document.getElementById('user-profile');
        const userAvatar = document.getElementById('user-avatar');

        if (user) {
            console.log("User logged in:", user.email);
            if (loginBtn) loginBtn.classList.add('hidden');
            if (userProfile) userProfile.classList.remove('hidden');
            if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/40';

            // Load persist user data (Favorites & Details)
            await loadUserData(user.uid);
            renderProducts(); // Re-render to show favorite hearts
        } else {
            console.log("User logged out");
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (userProfile) userProfile.classList.add('hidden');
            favorites = [];
            userDeliveryDetails = {};
            showingFavorites = false;
            renderProducts();
        }
    });
}

async function loadUserData(uid) {
    if (!db) return;
    try {
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            favorites = userData.favorites || [];
            userDeliveryDetails = userData.details || {};

            // Auto-fill form if needed
            if (userDeliveryDetails.name) {
                const fields = {
                    'cust-name': userDeliveryDetails.name,
                    'cust-address': userDeliveryDetails.address,
                    'cust-district': userDeliveryDetails.district,
                    'cust-city': userDeliveryDetails.city,
                    'cust-phone1': userDeliveryDetails.phone1,
                    'cust-phone2': userDeliveryDetails.phone2
                };
                for (const [id, value] of Object.entries(fields)) {
                    const el = document.getElementById(id);
                    if (el) el.value = value || '';
                }
            }
        }
    } catch (e) {
        console.error("Load User Data Error:", e);
    }
}

async function saveUserData() {
    if (!currentUser || !db) return;
    try {
        await db.collection("users").doc(currentUser.uid).set({
            favorites: favorites,
            details: userDeliveryDetails,
            lastSeen: new Date()
        }, { merge: true });
        console.log("User data saved to Cloud");
    } catch (e) {
        console.error("Save User Data Error:", e);
    }
}

async function handleLogin() {
    if (!customerAuth) {
        alert("Authentication system is still loading. Please wait a second.");
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await customerAuth.signInWithPopup(provider);
    } catch (error) {
        console.error("Login Error:", error);
        alert("Failed to login. Please try again.");
    }
}

function handleLogout() {
    if (customerAuth) customerAuth.signOut();
}

// --- Cart & Favorites Logic ---
function toggleFavorite(productId) {
    if (!currentUser) {
        alert("Please login with Gmail to use favorites.");
        handleLogin();
        return;
    }
    const index = favorites.findIndex(id => id == productId);
    if (index === -1) {
        favorites.push(productId);
        showToast("Added to favorites");
    } else {
        favorites.splice(index, 1);
        showToast("Removed from favorites");
    }
    saveUserData();
    renderProducts();

    // Update modal heart if open
    const modalBtn = document.getElementById('modal-fav-btn');
    if (modalBtn) {
        const isFav = favorites.some(id => id == productId);
        modalBtn.classList.toggle('active', isFav);
        modalBtn.innerHTML = isFav
            ? '<i class="fas fa-heart"></i> Favorited'
            : '<i class="far fa-heart"></i> Favorite';
    }
}

function addToCart(productId, quantity = 1) {
    let product = products.find(p => p.id == productId);
    
    // Fallback logic
    if (!product && window._currentModalProduct && window._currentModalProduct.id == productId) {
        product = window._currentModalProduct;
        if (!products.find(p => p.id == productId)) products.push(product);
    }
    if (!product && window._currentModalProduct) {
        product = window._currentModalProduct;
        if (!products.find(p => p.id == product.id)) products.push(product);
    }
    
    if (!product) {
        showToast("Product data not ready.");
        return;
    }

    // Get selected variations from UI if available
    const selectedVariations = {};
    const varSelectors = document.querySelectorAll('.variation-select');
    varSelectors.forEach(select => {
        selectedVariations[select.dataset.name] = select.value;
    });
    
    const comboId = Object.keys(selectedVariations).length > 0 
        ? Object.entries(selectedVariations).map(([k, v]) => `${k}:${v}`).join('|')
        : '';
        
    const cartItemId = comboId ? `${product.id}_${comboId}` : String(product.id);
    
    // Determine variation-specific price and stock
    const details = (product.variationDetails && comboId) ? product.variationDetails[comboId] : null;
    const itemPrice = (details && details.price !== undefined) ? details.price : product.price;
    const itemStock = (details && details.stock !== undefined) ? details.stock : product.stock;

    if (itemStock <= 0) {
        showToast("Sorry, this variation is out of stock", "error");
        return;
    }

    const existingItem = cart.find(item => (item.cartItemId || item.id) == cartItemId);
    const cartQty = existingItem ? existingItem.quantity : 0;
    
    if (cartQty + quantity > itemStock) {
        const available = itemStock - cartQty;
        if (available > 0) {
            showToast(`You can only add ${available} more (Stock: ${itemStock})`, "error");
        } else {
            showToast(`Maximum stock reached for this variation`, "error");
        }
        return;
    }

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            cartItemId: cartItemId,
            title: product.title,
            price: itemPrice,
            image: product.image,
            quantity: quantity,
            selectedVariations: Object.keys(selectedVariations).length > 0 ? selectedVariations : null,
            comboId: comboId
        });
    }

    saveCart();
    updateCartUI();
    showToast(`Added ${quantity} x ${product.title} to cart`);
    toggleCart(true);
}

function updateModalQty(delta) {
    if (!currentModalProductId) return;

    const product = products.find(p => p.id == currentModalProductId);
    if (!product) return;

    // Get current variation stock
    const selectedVariations = {};
    const varSelectors = document.querySelectorAll('.variation-select');
    varSelectors.forEach(select => {
        selectedVariations[select.dataset.name] = select.value;
    });
    const comboId = Object.entries(selectedVariations).map(([k, v]) => `${k}:${v}`).join('|');
    const details = product.variationDetails ? product.variationDetails[comboId] : null;
    const currentStock = (details && details.stock !== undefined) ? details.stock : product.stock;

    const cartItemId = comboId ? `${product.id}_${comboId}` : String(product.id);
    const existingItem = cart.find(item => (item.cartItemId || item.id) == cartItemId);
    const cartQty = existingItem ? existingItem.quantity : 0;
    const maxAllowed = currentStock - cartQty;
    
    modalQty += delta;
    if (modalQty < 1) modalQty = 1;
    
    if (modalQty > maxAllowed) {
        modalQty = maxAllowed > 0 ? maxAllowed : 1;
        if (maxAllowed > 0 && delta > 0) {
            showToast(`You can only select up to ${maxAllowed} units based on stock.`);
        } else if (maxAllowed <= 0 && delta > 0) {
            showToast(`All available stock (${currentStock}) is already in your cart.`);
        }
    }
    
    const qtyValueDisplay = document.getElementById('modal-qty-value');
    if (qtyValueDisplay) qtyValueDisplay.textContent = modalQty;
}

function quickShare(productId, btnElement) {
    const shareUrl = new URL(window.location.origin + window.location.pathname);
    shareUrl.searchParams.set('product', productId);
    const finalUrl = shareUrl.toString();

    navigator.clipboard.writeText(finalUrl).then(() => {
        const originalIcon = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-check"></i>';
        btnElement.style.color = "var(--secondary)";
        showToast("Product link copied!");
        setTimeout(() => {
            btnElement.innerHTML = originalIcon;
            btnElement.style.color = "";
        }, 2000);
    }).catch(err => {
        console.error("Quick share failed:", err);
        alert("Copy link: " + finalUrl);
    });
}

function removeFromCart(cartItemId) {
    cart = cart.filter(item => (item.cartItemId || item.id) != cartItemId);
    saveCart();
    updateCartUI();
}

function updateQuantity(cartItemId, delta) {
    const item = cart.find(i => (i.cartItemId || i.id) == cartItemId);
    if (!item) return;

    const product = products.find(p => p.id == item.id);
    if (item) {
        // Determine stock for this variation
        const details = (product && product.variationDetails && item.comboId) ? product.variationDetails[item.comboId] : null;
        const itemStock = (details && details.stock !== undefined) ? details.stock : (product ? product.stock : 999);

        if (delta > 0 && item.quantity + delta > itemStock) {
            showToast(`Maximum stock reached for this variation`, "error");
            return;
        }
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(cartItemId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

function saveCart() {
    localStorage.setItem('eshop_cart', JSON.stringify(cart));
}

function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
}

function updateCartUI() {
    const cartBadge = document.getElementById('cart-badge');
    const cartBadgeMobile = document.getElementById('cart-badge-mobile');
    const cartItemsList = document.getElementById('cart-items');
    const cartTotalAmount = document.getElementById('cart-total-amount');

    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const SHIPPING_FEE = 500;
    const grandTotal = totalPrice + SHIPPING_FEE;

    if (cartBadge) cartBadge.textContent = totalQty;
    if (cartBadgeMobile) cartBadgeMobile.textContent = totalQty;
    if (cartTotalAmount) cartTotalAmount.textContent = `LKR ${grandTotal.toLocaleString()}`;
    const cartSubtotal = document.getElementById('cart-subtotal-amount');
    if (cartSubtotal) cartSubtotal.textContent = `LKR ${totalPrice.toLocaleString()}`;

    if (cartItemsList) {
        cartItemsList.innerHTML = cart.length === 0
            ? '<p style="text-align: center; color: var(--text-light); padding: 2rem;">Your cart is empty.</p>'
            : cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.title}" class="cart-item-img">
                    <div class="cart-item-info">
                        <h4 class="cart-item-title">${item.title}</h4>
                        ${item.selectedVariations ? `
                            <div class="cart-item-variations">
                                ${Object.entries(item.selectedVariations).map(([name, val]) => `
                                    <span><strong>${name}:</strong> ${val}</span>
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="cart-item-price">LKR ${item.price.toLocaleString()}</div>
                        <div class="cart-item-controls">
                            <button class="qty-btn" onclick="updateQuantity('${item.cartItemId || item.id}', -1)">-</button>
                            <span>${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQuantity('${item.cartItemId || item.id}', 1)">+</button>
                            <button class="qty-btn" style="margin-left: auto; color: #ef4444;" onclick="removeFromCart('${item.cartItemId || item.id}')">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
    }
}

function showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
        background: #1e293b; color: white; padding: 0.8rem 1.5rem;
        border-radius: 50px; z-index: 10001; font-weight: 600;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        animation: slideUp 0.3s ease-out;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Export functions to window
function toggleCart(show) {
    let cartDrawer = document.getElementById('cart-drawer');
    if (!cartDrawer) return;

    // Always ensure cart-drawer is a direct child of body
    // so it's never trapped inside a hidden parent element
    if (cartDrawer.parentElement !== document.body) {
        document.body.appendChild(cartDrawer);
    }

    if (show) {
        updateCartUI();
        cartDrawer.classList.remove('hidden');
        const cartMainView = document.getElementById('cart-main-view');
        const checkoutStep = document.getElementById('checkout-step');
        if (cartMainView) cartMainView.classList.remove('hidden');
        if (checkoutStep) checkoutStep.classList.add('hidden');
    } else {
        cartDrawer.classList.add('hidden');
    }
}

function openCart() {
    toggleCart(true);
}

function changeQty(delta) {
    const qtyValue = document.getElementById('qty-readout') || document.getElementById('modal-qty-value');
    if (!qtyValue) return;
    
    let current = parseInt(qtyValue.textContent) || 1;
    current += delta;
    if (current < 1) current = 1;
    
    const bodyId = document.body.dataset.productId || currentModalProductId;
    if (bodyId && typeof products !== 'undefined') {
        const product = products.find(p => p.id == bodyId);
        if (product) {
            // Get variation stock if in modal
            let stock = product.stock;
            const varSelectors = document.querySelectorAll('.variation-select');
            if (varSelectors.length > 0) {
                const selectedVariations = {};
                varSelectors.forEach(select => { selectedVariations[select.dataset.name] = select.value; });
                const comboId = Object.entries(selectedVariations).map(([k, v]) => `${k}:${v}`).join('|');
                const details = product.variationDetails ? product.variationDetails[comboId] : null;
                if (details && details.stock !== undefined) stock = details.stock;
            }

            if (current > stock) {
                showToast(`Only ${stock} items available`, "error");
                current = stock > 0 ? stock : 1;
            }
        }
    }
    
    qtyValue.textContent = current;
    if (qtyValue.id === 'modal-qty-value') modalQty = current;
}

function getSelectedQty() {
    const qtyValue = document.getElementById('qty-readout') || document.getElementById('modal-qty-value');
    return qtyValue ? parseInt(qtyValue.textContent) || 1 : 1;
}

// Export functions to window
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.openCart = openCart;
window.openProductDetails = openProductDetails;
window.changeQty = changeQty;
window.getSelectedQty = getSelectedQty;

// --- Invoice & Order Logic ---
function openInvoice(customerData) {
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const invoiceModal = document.getElementById('invoice-modal');
    const invoiceDate = document.getElementById('invoice-date');
    const invoiceIdText = document.getElementById('invoice-id');
    const invoiceUserName = document.getElementById('invoice-user-name');
    const invoiceUserAddress = document.getElementById('invoice-user-address');
    const invoiceUserCityDistrict = document.getElementById('invoice-user-city-district');
    const invoiceUserPhone = document.getElementById('invoice-user-phone');
    const invoiceItems = document.getElementById('invoice-items');
    const invoiceSubtotal = document.getElementById('invoice-subtotal');
    const invoiceTotal = document.getElementById('invoice-total');

    const date = new Date();
    const invoiceId = `PE-${Math.floor(Math.random() * 90000) + 10000}`;

    invoiceDate.textContent = `Date: ${date.toLocaleDateString()}`;
    invoiceIdText.textContent = `Invoice ID: #${invoiceId}`;

    // Fill Customer Data
    invoiceUserName.textContent = customerData.name;
    invoiceUserAddress.textContent = customerData.address;
    invoiceUserCityDistrict.textContent = `${customerData.city}, ${customerData.district}`;
    invoiceUserPhone.textContent = `Phone: ${customerData.phone1}${customerData.phone2 ? ' / ' + customerData.phone2 : ''}`;

    invoiceItems.innerHTML = cart.map(item => `
        <tr>
            <td>
                ${item.title}
                ${item.selectedVariations ? `
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                        ${Object.entries(item.selectedVariations).map(([name, val]) => `${name}: ${val}`).join(' | ')}
                    </div>
                ` : ''}
            </td>
            <td>${item.quantity}</td>
            <td>LKR ${item.price.toLocaleString()}</td>
            <td>LKR ${(item.price * item.quantity).toLocaleString()}</td>
        </tr>
    `).join('');

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const SHIPPING_FEE = 500;
    const grandTotal = subtotal + SHIPPING_FEE;
    invoiceSubtotal.textContent = `LKR ${subtotal.toLocaleString()}`;
    // Add shipping row to invoice table
    const shippingRow = `
        <tr style="background:#f8fafc;">
            <td colspan="3" style="padding:8px 10px;font-size:11px;color:#64748b;border-bottom:1px solid #e2e8f0;">Shipping & Handling Fee</td>
            <td style="padding:8px 10px;font-size:11px;font-weight:600;border-bottom:1px solid #e2e8f0;text-align:right;">LKR 500</td>
        </tr>`;
    document.getElementById('invoice-items').innerHTML += shippingRow;
    invoiceTotal.textContent = `LKR ${grandTotal.toLocaleString()}`;

    // Store current customer data for WhatsApp
    window.currentCheckoutData = customerData;
    window.currentInvoiceId = invoiceId;

    invoiceModal.classList.remove('hidden');
    document.getElementById('cart-drawer').classList.add('hidden');
}

function closeInvoice() {
    document.getElementById('invoice-modal').classList.add('hidden');
}

function sendOrderViaWhatsApp() {
    const phone = "94789155130";
    const data = window.currentCheckoutData;
    const invId = window.currentInvoiceId;
    if (!data) return;

    let message = `*NEW ORDER FROM PUBUDU ELECTRONICS*\n`;
    message += `----------------------------\n`;
    message += `*Invoice ID:* #${invId}\n`;
    message += `----------------------------\n`;
    message += `*CUSTOMER DETAILS:*\n`;
    message += `👤 *Name:* ${data.name}\n`;
    message += `🏠 *Address:* ${data.address}\n`;
    message += `📍 *City:* ${data.city}\n`;
    message += `🗺️ *District:* ${data.district}\n`;
    message += `📞 *Phone 1:* ${data.phone1}\n`;
    if (data.phone2) message += `📞 *Phone 2:* ${data.phone2}\n`;
    message += `----------------------------\n`;
    message += `*ORDER ITEMS:*\n`;

    cart.forEach(item => {
        let itemLabel = item.title;
        if (item.selectedVariations) {
            const varString = Object.entries(item.selectedVariations).map(([name, val]) => `${name}: ${val}`).join(', ');
            itemLabel += ` (${varString})`;
        }
        message += `• ${itemLabel} x ${item.quantity} = LKR ${(item.price * item.quantity).toLocaleString()}\n`;
    });

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 500;
    message += `----------------------------\n`;
    message += `🛒 *Subtotal: LKR ${total.toLocaleString()}*\n`;
    message += `🚚 *Shipping & Handling: LKR ${shipping.toLocaleString()}*\n`;
    message += `----------------------------\n`;
    message += `💰 *TOTAL AMOUNT: LKR ${(total + shipping).toLocaleString()}*\n`;
    message += `----------------------------\n`;
    message += `Please confirm my order. Thank you!`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function downloadInvoicePDF() {
    const invId = window.currentInvoiceId || 'inv';
    const btn = document.getElementById('download-pdf');
    const data = window.currentCheckoutData;

    if (!data) { alert("No invoice data found."); return; }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    btn.disabled = true;

    try {
        // A4: 210mm x 297mm
        const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const W = 210, H = 297;
        const ml = 15, mr = 15, mt = 15; // margins
        const cw = W - ml - mr; // content width = 180mm
        const date = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
        const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const SHIPPING = 500;
        const grandTotal = subtotal + SHIPPING;

        let y = mt;

        // ── HEADER ──────────────────────────────────────────────
        // Company name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(37, 99, 235);
        doc.text('Pubudu Electronics', ml, y);

        // INVOICE title (right)
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', W - mr, y, { align: 'right' });

        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Premium Electronic Components', ml, y);
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(`Invoice ID: #${invId}`, W - mr, y, { align: 'right' });

        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Weliweriya, Gampaha, Sri Lanka', ml, y);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Date: ${date}`, W - mr, y, { align: 'right' });

        y += 4;
        doc.text('Tel: +94 78 915 5130  |  ichouse.lk', ml, y);

        y += 5;
        // Blue divider line
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.8);
        doc.line(ml, y, W - mr, y);

        y += 8;

        // ── BILL TO ──────────────────────────────────────────────
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(ml, y, cw, 30, 2, 2, 'FD');

        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('BILL TO', ml + 5, y);

        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text(data.name || '', ml + 5, y);

        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(data.address || '', ml + 5, y);

        y += 4.5;
        doc.text(`${data.city || ''}, ${data.district || ''}`, ml + 5, y);

        y += 4.5;
        doc.text(`Phone: ${data.phone1 || ''}${data.phone2 ? ' / ' + data.phone2 : ''}`, ml + 5, y);

        y += 10;

        // ── TABLE ────────────────────────────────────────────────
        const colW = [10, 95, 15, 30, 30]; // #, Description, Qty, Unit Price, Total
        const colX = [ml, ml+10, ml+105, ml+120, ml+150];
        const rowH = 8;

        // Table header
        doc.setFillColor(37, 99, 235);
        doc.rect(ml, y, cw, 9, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('#', colX[0] + 2, y + 6);
        doc.text('Item Description', colX[1], y + 6);
        doc.text('Qty', colX[2] + 7, y + 6, { align: 'center' });
        doc.text('Unit Price', colX[3] + 15, y + 6, { align: 'right' });
        doc.text('Total', colX[4] + 15, y + 6, { align: 'right' });

        y += 9;

        // Table rows
        cart.forEach((item, i) => {
            // Auto page break
            if (y + rowH > H - 40) {
                doc.addPage();
                y = mt;
                // Repeat header on new page
                doc.setFillColor(37, 99, 235);
                doc.rect(ml, y, cw, 9, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(255, 255, 255);
                doc.text('#', colX[0] + 2, y + 6);
                doc.text('Item Description', colX[1], y + 6);
                doc.text('Qty', colX[2] + 7, y + 6, { align: 'center' });
                doc.text('Unit Price', colX[3] + 15, y + 6, { align: 'right' });
                doc.text('Total', colX[4] + 15, y + 6, { align: 'right' });
                y += 9;
            }

            // Row background
            doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
            doc.rect(ml, y, cw, rowH, 'F');

            // Row border
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.line(ml, y + rowH, W - mr, y + rowH);

            // Row text
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.text(String(i + 1), colX[0] + 2, y + 5.5);

            // Title & Variations
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            const titleMaxW = 90;
            let itemTitle = item.title || '';
            const titleLines = doc.splitTextToSize(itemTitle, titleMaxW);
            doc.text(titleLines[0], colX[1], y + 4.5);

            if (item.selectedVariations) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(100, 116, 139);
                const varString = Object.entries(item.selectedVariations).map(([name, val]) => `${name}: ${val}`).join(' | ');
                doc.text(varString, colX[1], y + 7.5);
            }

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(String(item.quantity), colX[2] + 7, y + 5.5, { align: 'center' });
            doc.text(`LKR ${item.price.toLocaleString()}`, colX[3] + 15, y + 5.5, { align: 'right' });
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`LKR ${(item.price * item.quantity).toLocaleString()}`, colX[4] + 15, y + 5.5, { align: 'right' });

            y += rowH;
        });

        y += 6;

        // ── SHIPPING ROW ─────────────────────────────────────────
        if (y + rowH > H - 40) { doc.addPage(); y = mt; }
        doc.setFillColor(248, 250, 252);
        doc.rect(ml, y, cw, rowH, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(ml, y + rowH, W - mr, y + rowH);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('', colX[0] + 2, y + 5.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Shipping & Handling Fee', colX[1], y + 5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`LKR ${SHIPPING.toLocaleString()}`, colX[4] + 15, y + 5.5, { align: 'right' });
        y += rowH + 6;

        // ── TOTAL ────────────────────────────────────────────────
        if (y + 14 > H - 35) { doc.addPage(); y = mt; }

        const totalBoxX = W - mr - 65;
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(totalBoxX, y, 65, 12, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text('TOTAL', totalBoxX + 5, y + 8);
        doc.setFontSize(12);
        doc.text(`LKR ${grandTotal.toLocaleString()}`, totalBoxX + 63, y + 8, { align: 'right' });

        y += 18;

        // ── FOOTER ───────────────────────────────────────────────
        if (y + 16 > H - 10) { doc.addPage(); y = mt; }
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(ml, y, W - mr, y);
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(37, 99, 235);
        doc.text('Thank you for choosing Pubudu Electronics!', W / 2, y, { align: 'center' });
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Weliweriya, Gampaha, Sri Lanka  |  +94 78 915 5130  |  ichouse.lk', W / 2, y, { align: 'center' });
        y += 4;
        doc.text('This is a computer-generated invoice. No signature required.', W / 2, y, { align: 'center' });

        doc.save(`Pubudu_Electronics_Invoice_${invId}.pdf`);

    } catch(err) {
        console.error("PDF Error:", err);
        alert("Could not generate PDF. Please try again.");
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}


// --- Zoom Feature Logic ---
function initZoom() {
    const container = document.getElementById('zoom-container');
    const img = document.getElementById('detail-image');

    if (!container || !img) return;

    // Desktop Zoom: Track mouse movement
    container.addEventListener('mousemove', (e) => {
        if (window.innerWidth <= 768) return; // Skip on mobile

        const { left, top, width, height } = container.getBoundingClientRect();
        const x = ((e.pageX - left - window.scrollX) / width) * 100;
        const y = ((e.pageY - top - window.scrollY) / height) * 100;

        img.style.transformOrigin = `${x}% ${y}%`;
    });

    container.addEventListener('mouseleave', () => {
        img.style.transformOrigin = 'center center';
    });

    // Mobile Zoom: Disabled
    container.onclick = null;
}

// Update URL Parameters
function updateURL(mainCat, subCat, productId, searchQuery) {
    const url = new URL(window.location);
    if (mainCat && mainCat !== 'all') {
        url.searchParams.set('category', mainCat);
    } else {
        url.searchParams.delete('category');
    }

    if (subCat && subCat !== 'all') {
        url.searchParams.set('subcategory', subCat);
    } else {
        url.searchParams.delete('subcategory');
    }

    if (productId) {
        url.searchParams.set('product', productId);
    } else {
        url.searchParams.delete('product');
    }

    if (searchQuery) {
        url.searchParams.set('search', searchQuery);
    } else {
        url.searchParams.delete('search');
    }

    window.history.pushState({}, '', url);
}

// Initialize Filters with URL Support
// skipInitialRender: pass true when called right after loadProducts() to avoid a redundant render
function initFilters(skipInitialRender = false) {
    // Don't clear innerHTML as it removes the search bar
    const existingMain = document.getElementById('category-filter');
    const existingSub = document.getElementById('subcategory-filter');
    if (existingMain) existingMain.remove();
    if (existingSub) existingSub.remove();

    // Get URL Params or Pre-rendered Window Globals or Path Slugs or History State
    const urlParams = new URLSearchParams(window.location.search);
    const historyState = window.history.state || {};
    let initialMain = historyState.category || window.initialCategory || urlParams.get('category') || 'all';
    let initialSub = historyState.subcategory || window.initialSubCategory || urlParams.get('subcategory') || 'all';
    const initialSearch = urlParams.get('search') || '';
    const viewMode = urlParams.get('view');

    // Extract from Path if applicable (e.g. /category/microcontrollers/arduino-compatible/)
    if (initialMain === 'all' && window.location.pathname.includes('/category/')) {
        const parts = window.location.pathname.split('/').filter(p => p);
        const catIdx = parts.indexOf('category');
        if (catIdx !== -1) {
            const mainSlug = parts[catIdx + 1];
            const subSlug = parts[catIdx + 2];
            
            // Map slugs back to Names
            Object.keys(categoryData).forEach(cat => {
                if (createSEOSlug(cat) === mainSlug) {
                    initialMain = cat;
                    if (subSlug) {
                        categoryData[cat].forEach(sub => {
                            if (createSEOSlug(sub) === subSlug) initialSub = sub;
                        });
                    }
                }
            });
        }
    }

    // Sidebar Category Injection for SEO & Navigation
    const sidebarNav = document.getElementById('sidebar-categories');
    if (sidebarNav) {
        let sidebarHtml = `<a href="${SITE_URL}" class="sidebar-link ${initialMain === 'all' ? 'active' : ''}" onclick="filterByCategory('all', 'all', event)">
            <i class="fas fa-th-large"></i> All Components
        </a>`;

        Object.keys(categoryData).forEach(cat => {
            const isActive = cat === initialMain;
            const catSlug = createSEOSlug(cat);
            sidebarHtml += `<a href="${SITE_URL}${catSlug}/" class="sidebar-link ${isActive ? 'active' : ''}" onclick="filterByCategory('${cat}', 'all', event)">
                <i class="fas fa-chevron-right" style="font-size: 0.7rem;"></i> ${cat}
            </a>`;
            
            if (isActive) {
                sidebarHtml += `<div class="sub-sidebar-nav">`;
                categoryData[cat].forEach(sub => {
                    const isSubActive = sub === initialSub;
                    const subSlug = createSEOSlug(sub);
                    sidebarHtml += `<a href="${SITE_URL}${catSlug}/${subSlug}/" class="sub-sidebar-link ${isSubActive ? 'active' : ''}" onclick="filterByCategory('${cat}', '${sub}', event)">
                        ${sub}
                    </a>`;
                });
                sidebarHtml += `</div>`;
            }
        });
        sidebarNav.innerHTML = sidebarHtml;
    }

    // Main Category Select
    const mainSelect = document.createElement('select');
    mainSelect.id = 'category-filter';
    mainSelect.className = 'filter-select';
    mainSelect.innerHTML = '<option value="all">All Categories</option>';
    Object.keys(categoryData).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (cat === initialMain) option.selected = true;
        mainSelect.appendChild(option);
    });

    // Sub Category Select
    const subSelect = document.createElement('select');
    subSelect.id = 'subcategory-filter';
    subSelect.className = 'filter-select';

    // Function to populate sub-categories
    const populateSubCategories = (mainCategory) => {
        subSelect.innerHTML = '<option value="all">All Sub-Categories</option>';
        if (mainCategory !== 'all' && categoryData[mainCategory]) {
            categoryData[mainCategory].forEach(sub => {
                const option = document.createElement('option');
                option.value = sub;
                option.textContent = sub;
                if (sub === initialSub) option.selected = true;
                subSelect.appendChild(option);
            });
            subSelect.disabled = false;
        } else {
            subSelect.disabled = true;
        }
    };

    // Initial Population
    populateSubCategories(initialMain);

    // Event Listeners
    mainSelect.addEventListener('change', (e) => {
        showAllProducts();
        const selectedMain = e.target.value;
        populateSubCategories(selectedMain);
        renderProducts(selectedMain, 'all');
        updateURL(selectedMain, 'all');
    });

    subSelect.addEventListener('change', (e) => {
        showAllProducts();
        renderProducts(mainSelect.value, e.target.value);
        updateURL(mainSelect.value, e.target.value);
    });

    filterContainer.appendChild(mainSelect);
    filterContainer.appendChild(subSelect);

    // Initial Render based on URL
    if (initialMain !== 'all' || initialSub !== 'all' || initialSearch !== '' || viewMode === 'products') {
        const prodSection = document.getElementById('products');
        if (prodSection) prodSection.classList.remove('hidden-on-home');

        // Only call renderProducts if we weren't asked to skip (avoids triple-render on startup)
        if (!skipInitialRender) {
            renderProducts(initialMain, initialSub, initialSearch);
        }
        
        // Hide hero and featured if shop is being viewed
        const hero = document.querySelector('.hero');
        const featured = document.getElementById('home-featured');
        if (hero) hero.style.display = 'none';
        if (featured) featured.style.display = 'none';
    } else {
        // Just hide the products section on homepage by default
        const prodSection = document.getElementById('products');
        if (prodSection) prodSection.classList.add('hidden-on-home');
    }
    renderCategoryNavigator();
}

function renderCategoryNavigator() {
    const nav = document.getElementById('category-navigator');
    const subNav = document.getElementById('subcategory-navigator');
    const mainSelect = document.getElementById('category-filter');
    const subSelect = document.getElementById('subcategory-filter');
    
    if (!nav || !mainSelect) return;

    const activeMain = mainSelect.value;
    const activeSub = subSelect ? subSelect.value : 'all';
    
    let html = '';
    Object.keys(categoryData).forEach(cat => {
        const icon = categoryIcons[cat] || 'fas fa-th';
        const isActive = cat === activeMain;
        const catSlug = createSEOSlug(cat);
        html += `
            <a href="${SITE_URL}category/${catSlug}/" class="category-card ${isActive ? 'active' : ''}" onclick="filterByCategory('${cat}', 'all', event)">
                <i class="${icon}"></i>
                <h3>${cat}</h3>
            </a>
        `;
    });
    nav.innerHTML = html;

    if (subNav) {
        if (activeMain !== 'all' && categoryData[activeMain]) {
            subNav.classList.remove('hidden');
            const catSlug = createSEOSlug(activeMain);
            let subHtml = `<a href="${SITE_URL}category/${catSlug}/" class="subcategory-pill ${activeSub === 'all' ? 'active' : ''}" onclick="filterByCategory('${activeMain}', 'all', event)">All ${activeMain}</a>`;
            categoryData[activeMain].forEach(sub => {
                const isSubActive = sub === activeSub;
                const subSlug = createSEOSlug(sub);
                subHtml += `<a href="${SITE_URL}category/${catSlug}/${subSlug}/" class="subcategory-pill ${isSubActive ? 'active' : ''}" onclick="filterByCategory('${activeMain}', '${sub}', event)">${sub}</a>`;
            });
            subNav.innerHTML = subHtml;
        } else {
            subNav.classList.add('hidden');
        }
    }
}

function toggleCategoryNav(cat) {
    const mainSelect = document.getElementById('category-filter');
    if (!mainSelect) return;

    const prodSection = document.getElementById('products');
    if (prodSection) prodSection.classList.remove('hidden-on-home');
    
    if (mainSelect.value === cat) {
        filterByCategory('all', 'all');
    } else {
        filterByCategory(cat, 'all');
    }
}

function showAllProducts(query = null) {
    const prodSection = document.getElementById('products');
    
    // If we're not on the homepage (where #products exists), navigate there with query
    if (!prodSection) {
        let redirectUrl = '/';
        if (query) redirectUrl += `?search=${encodeURIComponent(query)}`;
        window.location.href = redirectUrl;
        return;
    }

    prodSection.classList.remove('hidden-on-home');
    
    const hero = document.querySelector('.hero');
    const featured = document.getElementById('home-featured');
    const about = document.getElementById('about');
    if (hero) hero.style.display = 'none';
    if (featured) featured.style.display = 'none';
    if (about) about.style.display = 'none'; // hide about section when showing products
    
    // Reset filters to show everything including categories
    if (window.renderProducts) {
        renderProducts('all', 'all');
        const SITE_URL = window.SITE_URL || '/';
        window.history.pushState({ category: 'all', subcategory: 'all' }, '', SITE_URL);
    }
    
    // Scroll to products section
    setTimeout(() => {
        const productsSection = document.getElementById('products');
        if (productsSection) window.scrollTo({ top: productsSection.offsetTop - 80, behavior: 'smooth' });
    }, 100);
}

window.toggleCategoryNav = toggleCategoryNav;
window.showAllProducts = showAllProducts;


// Global filter helper for sidebar
function filterByCategory(main, sub, event) {
    if (event) event.preventDefault();
    
    // Update URL Params or Path for SEO
    if (main !== 'all') {
        const mainSlug = createSEOSlug(main);
        const subSlug = sub !== 'all' ? createSEOSlug(sub) : "";
        const newPath = sub !== 'all' ? `/${mainSlug}/${subSlug}/` : `/${mainSlug}/`;
        
        // Push state with the clean SEO path
        window.history.pushState({ category: main, subcategory: sub }, '', newPath);
    } else {
        window.history.pushState({ category: 'all', subcategory: 'all' }, '', '/');
    }
    
    // Re-initialize filters to update UI and render products
    initFilters();
    renderCategoryNavigator();
    
    // Smooth scroll to catalog
    const productsSection = document.getElementById('products');
    if (productsSection) {
        window.scrollTo({ top: productsSection.offsetTop - 100, behavior: 'smooth' });
    }
}

window.filterByCategory = filterByCategory;

// Show Error to User
function showStatus(msg, isError = false) {
    if (!productGrid) return;
    productGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 2rem; background: ${isError ? '#fee2e2' : '#f1f5f9'}; border-radius: 12px; border: 1px solid ${isError ? '#ef4444' : '#cbd5e1'};">
            <p style="color: ${isError ? '#b91c1c' : '#475569'}; font-weight: 600;">${msg}</p>
            ${isError ? '<button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #b91c1c; color: white; border: none; border-radius: 6px; cursor: pointer;">Retry Connection</button>' : ''}
        </div>
    `;
}


let homeGridRendered = false;
let homeGridSelectedProducts = [];

// ── Similar Products renderer (called after products load) ──
function renderSimilarProducts() {
    const grid = document.getElementById('similar-products-grid');
    if (!grid || !window._currentModalProduct) return;
    if (grid.querySelector('.product-card')) return; // already rendered

    const cur = window._currentModalProduct;

    function _rand(arr, n) { return arr.sort(() => 0.5 - Math.random()).slice(0, n); }

    const needed = 4;
    let result = [];

    // Step 1: same subcategory
    result = _rand(products.filter(p => String(p.id) !== String(cur.id) && p.subCategory === cur.subCategory), needed);

    // Step 2: fill from main category
    if (result.length < needed) {
        const ids = new Set(result.map(p => String(p.id)));
        result = result.concat(_rand(products.filter(p => String(p.id) !== String(cur.id) && p.mainCategory === cur.mainCategory && !ids.has(String(p.id))), needed - result.length));
    }

    // Step 3: random fill
    if (result.length < needed) {
        const ids = new Set(result.map(p => String(p.id)));
        result = result.concat(_rand(products.filter(p => String(p.id) !== String(cur.id) && !ids.has(String(p.id))), needed - result.length));
    }

    if (result.length === 0) {
        const sec = document.getElementById('similar-products-section');
        if (sec) sec.style.display = 'none';
        return;
    }

    grid.innerHTML = result.map(p => {
        const s = (p.title||'').toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
        const m = (p.mainCategory||'').toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
        const c = (p.subCategory||'').toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
        const url = c ? `/${m}/${c}/${s}/` : `/${m}/${s}/`;
        const inStock = (parseInt(p.stock)||0) > 0;
        return `<div class="product-card" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;display:flex;flex-direction:column;">
            <a href="${url}"><div style="aspect-ratio:1;background:#f8fafc;padding:12px;display:flex;align-items:center;justify-content:center;">
            <img src="${p.image||''}" alt="${(p.title||'').replace(/"/g,"'")}" style="width:100%;height:100%;object-fit:contain;" loading="lazy">
            </div></a>
            <div style="padding:10px;display:flex;flex-direction:column;flex:1;">
            <h3 style="font-size:13px;font-weight:600;color:#1e293b;margin:0 0 6px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${p.title||''}</h3>
            <p style="color:#dc2626;font-weight:700;font-size:13px;margin:0 0 8px;">LKR ${(parseInt(p.price)||0).toLocaleString()}</p>
            <div style="margin-top:auto;display:flex;gap:6px;">
                <a href="${url}" style="flex:1;text-align:center;background:#f1f5f9;color:#1e293b;border-radius:8px;padding:6px;font-size:12px;font-weight:600;text-decoration:none;">View Item</a>
                ${inStock ? `<button onclick="if(window.addToCart)addToCart('${p.id}',1)" style="flex:1;background:#2563eb;color:#fff;border:none;border-radius:8px;padding:6px;font-size:12px;font-weight:700;cursor:pointer;">Add to Cart</button>` : `<span style="flex:1;text-align:center;font-size:12px;color:#ef4444;padding:6px;">Out of Stock</span>`}
            </div></div></div>`;
    }).join('');
}
window.renderSimilarProducts = renderSimilarProducts;
// ── End Similar Products renderer ──────────────────────────

function renderHomeGrid() {
    const homeGrid = document.getElementById('home-product-grid');
    if (!homeGrid) return;

    if (products.length === 0) {
        homeGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; font-size: 1.2rem; color: var(--text-light); padding: 2rem;">No products found.</p>';
        return;
    }

    if (!homeGridRendered) {
        const recentIds = JSON.parse(localStorage.getItem('recent_products') || '[]');
        let usedIds = new Set();
        homeGridSelectedProducts = [];

        // 1. Recently Viewed (max 4)
        for (const id of recentIds) {
            if (homeGridSelectedProducts.length >= 4) break;
            const p = products.find(prod => prod.id == id);
            if (p && !usedIds.has(p.id)) {
                homeGridSelectedProducts.push(p);
                usedIds.add(p.id);
            }
        }

        // 2. Newly Added (max 4, Sort by ID desc)
        const sortedByNew = [...products].sort((a, b) => b.id - a.id);
        let newCount = 0;
        for (const p of sortedByNew) {
            if (newCount >= 4) break;
            if (!usedIds.has(p.id)) {
                homeGridSelectedProducts.push(p);
                usedIds.add(p.id);
                newCount++;
            }
        }

        // 3. Random Fill for remaining slots
        let remaining = products.filter(p => !usedIds.has(p.id));
        remaining.sort(() => 0.5 - Math.random());
        for (const p of remaining) {
            if (homeGridSelectedProducts.length >= 8) break;
            homeGridSelectedProducts.push(p);
            usedIds.add(p.id);
        }

        homeGridSelectedProducts = homeGridSelectedProducts.slice(0, 12);
        homeGridRendered = true;
    }

    const html = homeGridSelectedProducts.map(product => {
        const isOutOfStock = product.stock <= 0;
        const isFav = favorites.some(id => id == product.id);
        const productUrl = `${SITE_URL}${createSEOSlug(product.mainCategory)}/${product.subCategory ? createSEOSlug(product.subCategory) + '/' : ''}${createSEOSlug(product.title)}/`;

        return `
            <div class="product-card">
                <button class="btn-fav ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${product.id}')" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>
                ${isOutOfStock ? '<span class="card-badge-out">Out of Stock</span>' : '<span class="card-badge-in">In Stock</span>'}
                <a href="${productUrl}" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;flex:1;">
                    <div class="product-image-container">
                        <img src="${product.image}" alt="${product.title}" class="product-image" loading="lazy">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.title}</h3>
                        <div class="product-price">LKR ${product.price.toLocaleString()}</div>
                    </div>
                </a>
                <div style="padding:0 0.85rem 0.85rem;">
                    ${isOutOfStock
                        ? `<button class="btn-details" style="background:#94a3b8;cursor:not-allowed;" disabled><i class="fas fa-ban"></i> Out of Stock</button>`
                        : `<button class="btn-details" onclick="event.stopPropagation(); addToCart('${product.id}', 1)"><i class="fas fa-cart-plus"></i> Add to Cart</button>`
                    }
                </div>
            </div>
        `;
    }).join('');


    homeGrid.innerHTML = html;
}

function trackRecentProduct(id) {
    let recent = JSON.parse(localStorage.getItem('recent_products') || '[]');
    recent = recent.filter(pId => pId != id);
    recent.unshift(id);
    if (recent.length > 12) recent.pop();
    localStorage.setItem('recent_products', JSON.stringify(recent));
}

// Pagination state
let currentLimit = 12;
const DEFAULT_LIMIT_DESKTOP = 12;
const DEFAULT_LIMIT_MOBILE = 8;

// Optimized Render Products
function renderProducts(mainCat = 'all', subCat = 'all', searchQuery = '', resetLimit = true) {
    if (!productGrid) return;
    
    if (resetLimit) {
        currentLimit = window.innerWidth < 768 ? DEFAULT_LIMIT_MOBILE : DEFAULT_LIMIT_DESKTOP;
    }


    if (products.length === 0) {
        productGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; font-size: 1.2rem; color: var(--text-light); padding: 2rem;">No products found in database.</p>';
        return;
    }

    const filteredProducts = products.filter(p => {
        const matchMain = mainCat === 'all' || p.mainCategory === mainCat;
        const matchSub = subCat === 'all' || p.subCategory === subCat;
        const matchFav = !showingFavorites || favorites.includes(p.id);

        let matchSearch = true;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const inTitle = p.title.toLowerCase().includes(q);
            const inCategory = p.mainCategory.toLowerCase().includes(q) || p.subCategory.toLowerCase().includes(q);
            const inKeywords = p.keywords ? p.keywords.some(k => k.toLowerCase().includes(q)) : false;
            matchSearch = inTitle || inCategory || inKeywords;
        }

        return matchMain && matchSub && matchSearch && matchFav;
    });

    // Priority: Add Time (Newest First)
    filteredProducts.sort((a, b) => b.id - a.id);

    if (filteredProducts.length === 0) {
        productGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; font-size: 1.2rem; color: var(--text-light); padding: 2rem;">${showingFavorites ? 'No favorites yet.' : 'No products found.'}</p>`;
        const loadMoreContainer = document.getElementById('load-more-container');
        if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
        return;
    }

    // Apply Pagination Limit
    const displayedProducts = filteredProducts.slice(0, currentLimit);
    const hasMore = filteredProducts.length > currentLimit;

    // Show/Hide Load More Button
    const loadMoreContainer = document.getElementById('load-more-container');
    if (loadMoreContainer) {
        if (hasMore) {
            loadMoreContainer.classList.remove('hidden');
        } else {
            loadMoreContainer.classList.add('hidden');
        }
    }


    const html = displayedProducts.map(product => {
        const isOutOfStock = product.stock <= 0;
        const isFav = favorites.some(id => id == product.id);
        const productUrl = `${SITE_URL}${createSEOSlug(product.mainCategory)}/${product.subCategory ? createSEOSlug(product.subCategory) + '/' : ''}${createSEOSlug(product.title)}/`;

        return `
            <div class="product-card">
                <button class="btn-fav ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${product.id}')" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>
                ${isOutOfStock ? '<span class="card-badge-out">Out of Stock</span>' : '<span class="card-badge-in">In Stock</span>'}
                <a href="${productUrl}" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;flex:1;">
                    <div class="product-image-container">
                        <img src="${product.image}" alt="${product.title}" class="product-image" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300?text=Parts'">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.title}</h3>
                        <div class="product-price">LKR ${product.price.toLocaleString()}</div>
                    </div>
                </a>
                <div style="padding:0 0.85rem 0.85rem;">
                    ${isOutOfStock
                        ? `<button class="btn-details" style="background:#94a3b8;cursor:not-allowed;" disabled><i class="fas fa-ban"></i> Out of Stock</button>`
                        : `<button class="btn-details" onclick="event.stopPropagation(); addToCart('${product.id}', 1)"><i class="fas fa-cart-plus"></i> Add to Cart</button>`
                    }
                </div>
            </div>
        `;
    }).join('');

    productGrid.innerHTML = html;
}

// Load More Handler
function handleLoadMore() {
    const mainSelect = document.getElementById('category-filter');
    const subSelect = document.getElementById('subcategory-filter');
    const searchValue = document.getElementById('main-search-input')?.value || '';
    
    const increment = window.innerWidth < 768 ? 4 : 8;
    currentLimit += increment;
    
    renderProducts(
        mainSelect?.value || 'all', 
        subSelect?.value || 'all', 
        searchValue, 
        false // Do not reset limit
    );
}

// Add event listener for Load More button
document.addEventListener('DOMContentLoaded', () => {
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', handleLoadMore);
    }
});


// Open Product Details (Modal)
function openProductDetails(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;

    // Cache for addToCart fallback on standalone pages
    window._currentModalProduct = product;

    // Track for homepage recently viewed grid
    trackRecentProduct(product.id);

    // Clear Previous Data
    detailImage.src = '';
    detailThumbnails.innerHTML = '';
    detailFeatures.innerHTML = '';
    detailSpecsBody.innerHTML = '';
    if (detailDescription) detailDescription.textContent = '';
    if (detailTags) detailTags.innerHTML = '';

    // Populate Data
    // Injected: Create Breadcrumb slugs
    const createSlug = (name) => (name || "").toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
    const mainSlug = createSlug(product.mainCategory);
    const subSlug = product.subCategory ? createSlug(product.subCategory) : '';

    // Populate Breadcrumbs
    const modalBreadcrumbs = document.getElementById('modal-breadcrumbs');
    if (modalBreadcrumbs) {
        const breadcrumbData = [
            { name: 'Home', link: '/' },
            { name: product.mainCategory, link: `/${mainSlug}/` }
        ];
        if (product.subCategory) {
            breadcrumbData.push({ name: product.subCategory, link: `/${mainSlug}/${subSlug}/` });
        }
        
        modalBreadcrumbs.innerHTML = breadcrumbData.map((b, i) => `
            <li class="flex items-center">
                <a href="${b.link}" class="text-gray-400 hover:text-blue-600 transition-colors">${b.name}</a>
                <span class="mx-2 text-gray-300">/</span>
            </li>
        `).join('') + `<li class="text-blue-600 font-bold truncate max-w-[150px]">${product.title}</li>`;
    }

    // Populate Data
    detailTitle.textContent = product.title;
    detailPrice.textContent = `LKR ${product.price.toLocaleString()}`;
    
    const detailPriceOld = document.getElementById('detail-price-old');
    if (detailPriceOld) {
        detailPriceOld.textContent = `LKR ${(product.price * 1.15).toLocaleString()}`;
    }

    // Stock Badge
    const stockBadge = document.getElementById('detail-stock-badge');
    if (stockBadge) {
        const isOutOfStock = product.stock <= 0;
        stockBadge.textContent = isOutOfStock ? 'Out of Stock' : 'In Stock';
        stockBadge.className = isOutOfStock 
            ? 'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-700'
            : 'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700';
    }

    // Model Number Display
    const modelDisplay = document.getElementById('detail-model-display');
    if (modelDisplay) {
        const modelSpan = modelDisplay.querySelector('span span');
        if (product.modelNumber) {
            if (modelSpan) modelSpan.textContent = product.modelNumber;
            modelDisplay.classList.remove('hidden');
        } else {
            modelDisplay.classList.add('hidden');
        }
    }

    // Images & Zoom
    if (product.images && product.images.length > 0) {
        detailImage.src = product.images[0];
        detailThumbnails.innerHTML = product.images.map((imgUrl, index) => `
            <img src="${imgUrl}" 
                 class="w-20 h-20 object-contain p-2 border-2 ${index === 0 ? 'border-blue-500' : 'border-gray-100'} rounded-lg cursor-pointer hover:border-blue-400 transition-all bg-white flex-shrink-0 thumbnail-item" 
                 onclick="changeModalImage(this, '${imgUrl}')"
                 loading="lazy">
        `).join('');
    } else {
        detailImage.src = product.image;
        detailThumbnails.innerHTML = '';
    }

    // Description
    if (detailDescription) {
        detailDescription.innerHTML = product.longDescription || product.description;
    }

    // Variations
    let variationsContainer = document.getElementById('detail-variations');
    if (!variationsContainer) {
        variationsContainer = document.createElement('div');
        variationsContainer.id = 'detail-variations';
        variationsContainer.className = 'flex flex-col gap-4 mb-6';
        if (detailDescription) {
            detailDescription.parentNode.insertBefore(variationsContainer, detailDescription.nextSibling);
        }
    }
    variationsContainer.innerHTML = '';

    if (product.variations && product.variations.length > 0) {
        variationsContainer.innerHTML = product.variations.map(v => `
            <div class="variation-group flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">${v.name}</label>
                <select class="variation-select w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium text-gray-700" data-name="${v.name}" onchange="updateVariationInfo()">
                    ${v.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
            </div>
        `).join('');
        
        // Update price/stock based on first variation selection
        setTimeout(() => updateVariationInfo(), 10);
    }

    // Features
    if (detailFeatures) {
        if (product.features && product.features.length > 0) {
            detailFeatures.innerHTML = product.features.map(f => `
                <li class="flex items-center gap-2">
                    <i class="fas fa-check-circle text-green-500 text-xs"></i>
                    <span>${f}</span>
                </li>
            `).join('');
        } else {
            detailFeatures.innerHTML = `
                <li class="flex items-center gap-2">
                    <i class="fas fa-check-circle text-green-500 text-xs"></i>
                    <span>Authentic Component</span>
                </li>
                <li class="flex items-center gap-2">
                    <i class="fas fa-check-circle text-green-500 text-xs"></i>
                    <span>Tested for Quality</span>
                </li>
            `;
        }
    }

    // Specs
    if (detailSpecsBody) {
        const specs = product.specs || {};
        const entries = Object.entries(specs);
        if (entries.length > 0) {
            detailSpecsBody.innerHTML = entries.map(([key, value], i) => `
                <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}">
                    <td class="px-4 py-3 font-bold text-gray-700 border-b border-gray-100">${key}</td>
                    <td class="px-4 py-3 text-gray-600 border-b border-gray-100">${value}</td>
                </tr>
            `).join('');
        } else {
            detailSpecsBody.innerHTML = `
                <tr>
                    <td class="px-4 py-3 font-bold text-gray-700 border-b border-gray-100">Category</td>
                    <td class="px-4 py-3 text-gray-600 border-b border-gray-100">${product.mainCategory}</td>
                </tr>
            `;
        }
    }

    // Reset Modal Qty
    currentModalProductId = product.id;
    modalQty = 1;
    const qtyValueDisplay = document.getElementById('modal-qty-value');
    if (qtyValueDisplay) qtyValueDisplay.textContent = modalQty;

    // CTA Handlers
    const isOutOfStock = product.stock <= 0;
    detailAddCartBtn.onclick = () => {
        if (isOutOfStock) return;
        addToCart(product.id, modalQty);
    };
    detailBuyBtn.onclick = () => {
        if (isOutOfStock) return;
        addToCart(product.id, modalQty);
        document.getElementById('cart-drawer').classList.remove('hidden');
    };

    // UI for Out of Stock in Modal
    if (isOutOfStock) {
        detailAddCartBtn.classList.add('opacity-50', 'cursor-not-allowed', 'grayscale');
        detailAddCartBtn.innerHTML = '<i class="fas fa-times-circle"></i> Out of Stock';
        detailBuyBtn.classList.add('hidden');
    } else {
        detailAddCartBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'grayscale');
        detailAddCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        detailBuyBtn.classList.remove('hidden');
    }

    const modalFavBtn = document.getElementById('modal-fav-btn');
    if (modalFavBtn) {
        const isFav = favorites.some(id => id == product.id);
        modalFavBtn.classList.toggle('text-pink-500', isFav);
        modalFavBtn.classList.toggle('bg-pink-50', isFav);
        modalFavBtn.innerHTML = isFav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        modalFavBtn.onclick = () => toggleFavorite(product.id);
    }

    // --- Share Feature Logic ---
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const fbShareBtn = document.getElementById('fb-share-btn');

    // Generate a clean direct URL
    const shareUrl = new URL(window.location.origin + window.location.pathname);
    shareUrl.searchParams.set('product', product.id);
    const finalUrl = shareUrl.toString();

    if (copyLinkBtn) {
        copyLinkBtn.onclick = () => {
            navigator.clipboard.writeText(finalUrl).then(() => {
                const originalText = copyLinkBtn.innerHTML;
                copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyLinkBtn.style.borderColor = "var(--secondary)";
                setTimeout(() => {
                    copyLinkBtn.innerHTML = originalText;
                    copyLinkBtn.style.borderColor = "";
                }, 2000);
            }).catch(err => {
                console.error("Copy failed:", err);
                alert("Link: " + finalUrl);
            });
        };
    }

    if (fbShareBtn) {
        fbShareBtn.onclick = () => {
            const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(finalUrl)}`;
            window.open(fbUrl, '_blank', 'width=600,height=400');
        };
    }

    // --- Dynamic WhatsApp Link ---
    updateWhatsAppMessage(product.title);

    // --- NEW: Mobile Action Bar ---
    const mobileAddBtn = document.getElementById('mobile-add-cart-btn');
    const mobileBuyBtn = document.getElementById('mobile-buy-btn');
    const zoomContainer = document.getElementById('zoom-container');

    if (mobileAddBtn) {
        mobileAddBtn.onclick = () => addToCart(product.id, modalQty);
    }
    if (mobileBuyBtn) {
        mobileBuyBtn.onclick = () => {
            addToCart(product.id, modalQty);
            closeProductDetails();
            toggleCart(true);
        };
    }

    // SEO: Update document title, meta description, and inject JSON-LD
    document.title = `${product.title} | Pubudu Electronics`;

    // Update Meta Tags
    const metaTags = {
        'description': product.description || product.longDescription,
        'og:title': `${product.title} | Pubudu Electronics`,
        'og:description': product.description || product.longDescription,
        'og:url': finalUrl,
        'og:image': product.image
    };

    for (const [name, content] of Object.entries(metaTags)) {
        let tag = document.querySelector(`meta[property="${name}"]`) || document.querySelector(`meta[name="${name}"]`);
        if (tag) tag.setAttribute('content', content);
    }

    // Update URL — only on home/category pages, not on standalone product pages
    if (!document.body.classList.contains('standalone-product-page')) {
        updateURL(product.mainCategory, product.subCategory, product.id);
    }
    
    // 🔥 NEW: Trigger rendering the similar products feature inside the modal 
    renderRelatedProducts(product);

    // Show Modal
    productModalRoot.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function updateVariationInfo() {
    if (!currentModalProductId) return;
    const product = products.find(p => p.id == currentModalProductId);
    if (!product) return;

    const selectedVariations = {};
    const varSelectors = document.querySelectorAll('.variation-select');
    varSelectors.forEach(select => {
        selectedVariations[select.dataset.name] = select.value;
    });

    const comboId = Object.entries(selectedVariations).map(([k, v]) => `${k}:${v}`).join('|');
    const details = product.variationDetails ? product.variationDetails[comboId] : null;

    const currentPrice = (details && details.price !== undefined) ? details.price : product.price;
    const currentStock = (details && details.stock !== undefined) ? details.stock : product.stock;

    // Update Price Display
    if (detailPrice) detailPrice.textContent = `LKR ${currentPrice.toLocaleString()}`;
    const detailPriceOld = document.getElementById('detail-price-old');
    if (detailPriceOld) {
        detailPriceOld.textContent = `LKR ${(currentPrice * 1.15).toLocaleString()}`;
    }

    // Update Stock Badge
    const stockBadge = document.getElementById('detail-stock-badge');
    if (stockBadge) {
        const isOutOfStock = currentStock <= 0;
        stockBadge.textContent = isOutOfStock ? 'Out of Stock' : 'In Stock';
        stockBadge.className = isOutOfStock 
            ? 'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-700'
            : 'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700';
    }

    // Update Button States
    const isOutOfStock = currentStock <= 0;
    if (isOutOfStock) {
        detailAddCartBtn.classList.add('opacity-50', 'cursor-not-allowed', 'grayscale');
        detailAddCartBtn.innerHTML = '<i class="fas fa-times-circle"></i> Out of Stock';
        detailBuyBtn.classList.add('hidden');
    } else {
        detailAddCartBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'grayscale');
        detailAddCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        detailBuyBtn.classList.remove('hidden');
    }

    // Update modalQty if it exceeds current stock
    if (modalQty > currentStock && currentStock > 0) {
        modalQty = currentStock;
        const qtyValueDisplay = document.getElementById('modal-qty-value');
        if (qtyValueDisplay) qtyValueDisplay.textContent = modalQty;
    }
}
window.updateVariationInfo = updateVariationInfo;

// Global helper for modal image changes
function changeModalImage(thumb, url) {
    const mainImg = document.getElementById('detail-image');
    if (mainImg) {
        mainImg.src = url;
        // Update active state of thumbnails
        document.querySelectorAll('.thumbnail-item').forEach(img => {
            img.classList.remove('border-blue-500');
            img.classList.add('border-gray-100');
        });
        thumb.classList.remove('border-gray-100');
        thumb.classList.add('border-blue-500');
        
        // Reset zoom on image change
        const container = document.getElementById('zoom-container');
        if (container) container.classList.remove('is-zoomed');
    }
}

// Mobile Touch-to-Zoom logic
document.addEventListener('click', (e) => {
    const zoomContainer = e.target.closest('#zoom-container');
    if (zoomContainer && window.innerWidth < 1024) {
        zoomContainer.classList.toggle('is-zoomed');
    }
});

// Sticky Header Logic (Sync Desktop & Mobile)
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const mobileSearch = document.querySelector('.sticky-search-mobile');
    const scrollY = window.scrollY;

    if (scrollY > 150) {
        if (navbar) navbar.classList.add('sticky-navbar');
        if (mobileSearch && window.innerWidth < 768) mobileSearch.style.display = 'block';
    } else {
        if (navbar) navbar.classList.remove('sticky-navbar');
        if (mobileSearch) mobileSearch.style.display = 'none';
    }
});

// Function to render related products dynamically inside the Modal
function renderRelatedProducts(currentProduct) {
    const section = document.getElementById('related-products-section');
    const list = document.getElementById('related-products-list');

    if (!section || !list) return;

    // Find up to 4 products in the same category, excluding the current one
    const related = products
        .filter(p => p.id !== currentProduct.id && (p.mainCategory === currentProduct.mainCategory || p.subCategory === currentProduct.subCategory))
        .sort(() => 0.5 - Math.random()) // Randomize for variety
        .slice(0, 4);

    // If no related products, hide the section
    if (related.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    list.innerHTML = related.map(p => {
        const productUrl = `${SITE_URL}${createSEOSlug(p.mainCategory)}/${p.subCategory ? createSEOSlug(p.subCategory) + '/' : ''}${createSEOSlug(p.title)}/`;
        // Since we are inside the modal, clicking a similar item should just reload the modal cleanly
        return `
            <div class="border border-gray-100 rounded-lg p-3 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center bg-white group"
                 onclick="event.preventDefault(); openProductDetails('${p.id}'); document.getElementById('product-details-view').scrollTo({top: 0, behavior: 'smooth'});">
                <a href="${productUrl}" class="w-full aspect-square mb-3 block relative overflow-hidden rounded bg-gray-50 flex items-center justify-center p-2" onclick="event.preventDefault();">
                    <img src="${p.image}" alt="${p.title}" class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" loading="lazy" onerror="this.src='https://via.placeholder.com/150?text=Parts'">
                </a>
                <div class="text-left w-full">
                    <h4 class="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug w-full mb-1" title="${p.title}">${p.title}</h4>
                    <span class="text-sm font-black text-[#D32F2F]">LKR ${p.price.toLocaleString()}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Close Modal
function closeProductModal() {
    productModalRoot.classList.add('hidden');
    document.body.classList.remove('modal-open');
    document.body.classList.remove('is-viewing-product');

    // Reset Title and URL
    document.title = defaultDocumentTitle;
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.content = defaultMetaDescription;
    }

    const urlParams = new URLSearchParams(window.location.search);
    updateURL(urlParams.get('category'), urlParams.get('subcategory'), null);

    // Remove temporary product JSON-LD
    const oldScript = document.getElementById('product-json-ld');
    if (oldScript) oldScript.remove();

    // Reset Zoom State
    const zoomContainer = document.getElementById('zoom-container');
    const zoomImg = document.getElementById('detail-image');
    if (zoomContainer) zoomContainer.classList.remove('mobile-zoomed');
    if (zoomImg) zoomImg.style.transformOrigin = 'center center';

    // Reset WhatsApp Message
    updateURL(urlParams.get('category'), urlParams.get('subcategory'), null);
    updateWhatsAppMessage();

    // Stop video playing by clearing the iframe
    const videoPreviewContainer = document.getElementById('detail-video-preview');
    if (videoPreviewContainer) {
        videoPreviewContainer.innerHTML = '';
        videoPreviewContainer.style.display = 'none';
    }

    // Show SEO block again if it exists
    const seoBlock = document.getElementById('seo-product-content');
    if (seoBlock) seoBlock.style.display = 'block';
}


// Reset App State (Home Click)
function resetApp(e) {
    if (e) e.preventDefault();

    // Reset Filters
    const mainSelect = document.getElementById('category-filter');
    const subSelect = document.getElementById('subcategory-filter');

    if (mainSelect) mainSelect.value = 'all';
    if (subSelect) {
        subSelect.innerHTML = '<option value="all">All Sub-Categories</option>';
        subSelect.value = 'all';
        subSelect.disabled = true;
    }

    // Clear URL params
    const url = new URL(window.location);
    url.searchParams.delete('category');
    url.searchParams.delete('subcategory');
    url.searchParams.delete('product');
    url.searchParams.delete('search');
    window.history.pushState({}, '', url);

    // Clear Search Input
    const searchInput = document.getElementById('product-search');
    const clearBtn = document.getElementById('clear-search');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');

    // Reset View
    const homeFeatured = document.getElementById('home-featured');
    if (homeFeatured) homeFeatured.classList.remove('hidden');
    const productsSection = document.getElementById('products');
    // if (productsSection) productsSection.classList.add('hidden');

    closeProductModal();
    renderProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// WhatsApp Business Integration
function contactSeller(title, price) {
    const phone = "94789155130";
    const message = `Hi! I'm interested in buying: ${title} (LKR ${price}). Is it available?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function updateWhatsAppMessage(productTitle = null) {
    const whatsappLink = document.getElementById('whatsapp-link');
    if (!whatsappLink) return;

    const phone = "94789155130";
    let message = "Hi! I have a question about the electronic components at ichouse.lk";
    
    if (productTitle) {
        message = `Hi! I'm interested in the ${productTitle}. Can I get more technical details?`;
    }

    whatsappLink.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// Initial Render
document.addEventListener('DOMContentLoaded', async () => {
    // Update Copyright Year
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Move cart-drawer and invoice-modal to body so they're never trapped inside hidden parents
    ['cart-drawer', 'invoice-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentElement !== document.body) {
            document.body.appendChild(el);
        }
    });

    // Initialize Firebase FIRST before anything else
    initFirebase();

    // If we are on the admin page, skip the customer-facing initializations
    if (document.getElementById('admin-page')) {
        await loadCategories();
        await loadProducts();
        return;
    }

    // Load categories
    await loadCategories();

    // 1. Add Event Listeners Immediately (Non-Firebase)
    try {
        // Modal Close Events
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeProductModal);
        if (modalOverlay) modalOverlay.addEventListener('click', closeProductModal);

        // Auth Listeners
        const customerLoginBtn = document.getElementById('customer-login-btn');
        const customerLogoutBtn = document.getElementById('customer-logout-btn');
        if (customerLoginBtn) customerLoginBtn.addEventListener('click', handleLogin);
        if (customerLogoutBtn) customerLogoutBtn.addEventListener('click', handleLogout);

        // Cart Drawer Listeners
        const cartBtn = document.getElementById('cart-btn');
        const cartBtnTop = document.getElementById('cart-btn-top');
        const closeCartBtn = document.getElementById('close-cart');
        const cartOverlay = document.getElementById('cart-overlay');

        if (cartBtn) cartBtn.addEventListener('click', () => toggleCart(true));
        if (cartBtnTop) cartBtnTop.addEventListener('click', () => toggleCart(true));
        if (closeCartBtn) closeCartBtn.addEventListener('click', () => toggleCart(false));
        if (cartOverlay) cartOverlay.addEventListener('click', () => toggleCart(false));

        const checkoutBtn = document.getElementById('checkout-btn');
        const checkoutStep = document.getElementById('checkout-step');
        const cartMainView = document.getElementById('cart-main-view');
        const checkoutForm = document.getElementById('checkout-form');
        const backToCartBtn = document.getElementById('back-to-cart');

        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                cartMainView.classList.add('hidden');
                checkoutStep.classList.remove('hidden');
            });
        }

        if (backToCartBtn) {
            backToCartBtn.addEventListener('click', () => {
                checkoutStep.classList.add('hidden');
                cartMainView.classList.remove('hidden');
            });
        }

        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const customerData = {
                    name: document.getElementById('cust-name').value,
                    address: document.getElementById('cust-address').value,
                    district: document.getElementById('cust-district').value,
                    city: document.getElementById('cust-city').value,
                    phone1: document.getElementById('cust-phone1').value,
                    phone2: document.getElementById('cust-phone2').value
                };

                // Save user details for next time
                if (currentUser) {
                    userDeliveryDetails = customerData;
                    saveUserData();
                }

                openInvoice(customerData);
            });
        }

        const navFavBtn = document.getElementById('nav-fav-btn');
        if (navFavBtn) {
            navFavBtn.addEventListener('click', () => {
                showingFavorites = !showingFavorites;
                navFavBtn.classList.toggle('active', showingFavorites);
                renderProducts();
            });
        }

        const closeInvoiceBtn = document.getElementById('close-invoice');
        const sendWhatsappBtn = document.getElementById('send-whatsapp-invoice');
        const downloadPdfBtn = document.getElementById('download-pdf');
        const editInvoiceBtn = document.getElementById('edit-invoice-details');

        if (closeInvoiceBtn) closeInvoiceBtn.addEventListener('click', closeInvoice);
        if (sendWhatsappBtn) sendWhatsappBtn.addEventListener('click', sendOrderViaWhatsApp);
        if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', downloadInvoicePDF);
        if (editInvoiceBtn) {
            editInvoiceBtn.addEventListener('click', () => {
                document.getElementById('invoice-modal').classList.add('hidden');
                document.getElementById('cart-drawer').classList.remove('hidden');
                document.getElementById('checkout-step').classList.remove('hidden');
                document.getElementById('cart-main-view').classList.add('hidden');
            });
        }

        // Modal Quantity Listeners
        const modalQtyMinus = document.getElementById('modal-qty-minus');
        const modalQtyPlus = document.getElementById('modal-qty-plus');
        if (modalQtyMinus) modalQtyMinus.addEventListener('click', () => updateModalQty(-1));
        if (modalQtyPlus) modalQtyPlus.addEventListener('click', () => updateModalQty(1));

        // Initialize Cart UI
        updateCartUI();

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (productModalRoot && !productModalRoot.classList.contains('hidden')) closeProductModal();
                if (cartDrawer && !cartDrawer.classList.contains('hidden')) cartDrawer.classList.add('hidden');
                if (document.getElementById('invoice-modal') && !document.getElementById('invoice-modal').classList.contains('hidden')) closeInvoice();
            }
        });

        // Logo is now unclickable span
        const navLogo = document.getElementById('nav-logo');

        // WhatsApp Navbar Button Explicit Handler
        const navContactBtn = document.getElementById('nav-contact-btn');
        if (navContactBtn) {
            navContactBtn.addEventListener('click', (e) => {
                console.log("Contact button clicked");
            });
        }

        // Mobile Menu Logic
        const menuToggle = document.getElementById('menu-toggle');
        const menuClose = document.getElementById('menu-close');
        const navLinks = document.getElementById('nav-links');
        const navOverlay = document.getElementById('nav-overlay');

        const openMenu = () => {
            if (navLinks) navLinks.classList.add('active');
            if (navOverlay) navOverlay.classList.add('active');
            document.body.classList.add('modal-open');
        };

        const closeMenu = () => {
            if (navLinks) navLinks.classList.remove('active');
            if (navOverlay) navOverlay.classList.remove('active');
            document.body.classList.remove('modal-open');
        };

        if (menuToggle) menuToggle.addEventListener('click', openMenu);
        if (menuClose) menuClose.addEventListener('click', closeMenu);
        if (navOverlay) navOverlay.addEventListener('click', closeMenu);

        // Close menu on link click
        if (navLinks) {
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', closeMenu);
            });
        }

        // Also bind to footer home link if present
        const footerHome = document.querySelector('.footer-links a[href="#"]');
        if (footerHome) {
            footerHome.addEventListener('click', resetApp);
        }

        // 2. Load Data and Firebase (Async)
        await loadProducts(); // Load from Cloud or Local first
        if (filterContainer) {
            initFilters(true);
        }


        // Sync hero search with URL on load
        const urlParams = new URLSearchParams(window.location.search);
        const initialSearch = urlParams.get('search') || '';
        const heroSearch = document.getElementById('hero-product-search');
        if (heroSearch) heroSearch.value = initialSearch;

        // Deep Link Check / SEO Redirect Middleware: Open product if ID in URL
        const productId = urlParams.get('product');
        if (productId) {
            const p = products.find(prod => prod.id == productId);
            if (p) {
                const subCatSlug = p.subCategory ? createSEOSlug(p.subCategory) + '/' : '';
                const newUrl = `/${createSEOSlug(p.mainCategory || 'General')}/${subCatSlug}${createSEOSlug(p.title)}/`;
                if (window.location.pathname !== newUrl) {
                    console.log("SEO Redirect: Moving from ?product= to slug logic", newUrl);
                    window.location.replace(newUrl);
                    return; // Stop execution on this old URL
                }
            } else {
                openProductDetails(parseInt(productId));
            }
        } else if (urlParams.get('category') || urlParams.get('subcategory') || initialSearch) {
             // Scroll to results if landing on a filtered page
             setTimeout(() => {
                const productsSection = document.getElementById('products');
                if (productsSection) window.scrollTo({ top: productsSection.offsetTop - 80, behavior: 'smooth' });
            }, 300);
        }

        // Initialize Auth after products/firebase ready
        initCustomerAuth();

        // Initialize Image Zoom
        initZoom();

        // If on a product page (MPA), wire up buttons immediately using _currentModalProduct
        const bodyProductId = document.body.dataset.productId;
        if (bodyProductId && window._currentModalProduct) {
            // Wire detail-add-cart-btn and mobile-add-cart-btn immediately (no Firebase needed)
            const pid = window._currentModalProduct.id;
            const detailAddCartBtn = document.getElementById('detail-add-cart-btn');
            const mobileAddCartBtn = document.getElementById('mobile-add-cart-btn');
            const detailBuyBtn = document.getElementById('detail-buy-btn');
            const mobileBuyBtn = document.getElementById('mobile-buy-btn');
            if (detailAddCartBtn) detailAddCartBtn.onclick = () => addToCart(pid, getSelectedQty());
            if (mobileAddCartBtn) mobileAddCartBtn.onclick = () => addToCart(pid, getSelectedQty());
            if (detailBuyBtn) detailBuyBtn.onclick = () => { addToCart(pid, getSelectedQty()); toggleCart(true); };
            if (mobileBuyBtn) mobileBuyBtn.onclick = () => { addToCart(pid, getSelectedQty()); toggleCart(true); };
            // Also try openProductDetails after Firebase loads (for full modal data)
            openProductDetails(parseInt(bodyProductId));
        } else if (bodyProductId) {
            openProductDetails(parseInt(bodyProductId));
        } else if (window.location.pathname.includes('/products/')) {
            const pathParts = window.location.pathname.split('/').filter(p => p);
            const slug = pathParts[pathParts.indexOf('products') + 1];
            if (slug) {
                const idMatch = slug.match(/-(\d+)$/);
                if (idMatch) {
                    const id = idMatch[1];
                    // On product detail page, we should ensure the modal content for that product is visible
                    // since our script.js still uses the "modal" div as the product detail view.
                    openProductDetails(id);
                }
            }
        }

        // Initialize Modern Search Bar
        if (mainCategorySearch) {
            // Populate categories
            Object.keys(categoryData).forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                mainCategorySearch.appendChild(opt);
            });
        }

        if (mainSearchBtn) {
            mainSearchBtn.onclick = () => {
                const query = mainSearchInput.value.trim();
                const cat = mainCategorySearch.value;
                handleSearch(query, cat);
            };
        }

        if (mainSearchInput) {
            mainSearchInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    const query = mainSearchInput.value.trim();
                    const cat = mainCategorySearch.value;
                    handleSearch(query, cat);
                }
            };
        }

        const mobileSearchInput = document.getElementById('mobile-search-input');
        const stickySearchMobile = document.querySelector('.sticky-search-mobile');

        if (mobileSearchInput) {
            mobileSearchInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    const query = mobileSearchInput.value.trim();
                    handleSearch(query, 'all');
                }
            };
            
            // Also search on input for quicker mobile experience
            let searchTimeout;
            mobileSearchInput.oninput = () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const query = mobileSearchInput.value.trim();
                    if (query.length > 2 || query.length === 0) {
                        handleSearch(query, 'all');
                    }
                }, 500);
            };
        }

        // Show/Hide sticky search on scroll
        window.onscroll = () => {
            if (window.innerWidth <= 768) {
                const hero = document.querySelector('.hero');
                if (hero) {
                    const heroBottom = hero.offsetTop + hero.offsetHeight;
                    if (window.pageYOffset > heroBottom - 100) {
                        stickySearchMobile.style.display = 'block';
                    } else {
                        stickySearchMobile.style.display = 'none';
                    }
                }
            }
        };

        function handleSearch(query, category) {
            // If empty query — just show all products with categories, scroll to products
            if (!query || query.trim() === '') {
                showAllProducts(null);
                return;
            }

            // Show products section and hide hero/featured
            showAllProducts(query);
            
            // Call existing renderProducts with (mainCat, subCat, searchQuery)
            renderProducts(category, 'all', query);
            
            // Update URL to reflect search
            updateURL(category, 'all', null, query);
            
            // On mobile: scroll to product grid directly (skip sidebar)
            // On desktop: scroll to products section
            setTimeout(() => {
                const isMobile = window.innerWidth <= 992;
                const target = isMobile
                    ? document.getElementById('product-grid')
                    : document.getElementById('products');
                if (target) {
                    window.scrollTo({
                        top: target.getBoundingClientRect().top + window.scrollY - 70,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }

    } catch (err) {
        console.error("App Crash:", err);
        if (typeof showToast === 'function') {
            showToast("Website error. Please check console.", "error");
        }
    }
});