// Category Structure (Initial defaults)
let categoryData = {
    "Power Adapters": ["12V Adapters", "24V Adapters", "5V Adapters", "Adjustable Power Supply", "Industrial Switching"],
    "Microcontrollers": ["Arduino Compatible", "ESP8266 Series", "ESP32 Series", "Raspberry Pi", "STM32 Boards"],
    "Sensors": ["Temperature & Humidity", "Motion Sensors", "Distance Sensors", "Gas Sensors", "Light & Sound"],
    "Modules": ["Relay Modules", "Bluetooth Modules", "WiFi Modules", "GPS Modules", "Motor Drivers", "Thermal Modules"],
};

// Start with an empty list
const baseProducts = [];

// Helper to generate sample product list for fallback
function generateProducts() {
    return [
        {
            id: 1,
            title: "12V 2A Power Adapter",
            mainCategory: "Power Adapters",
            subCategory: "12V Adapters",
            price: 1250,
            stock: 45,
            image: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=800",
            description: "High-quality 12V 2A power adapter for electronics projects.",
            longDescription: "Standard 12V DC power adapter, 2A output. Ideal for microcontrollers, LED strips, and other DC projects.",
            keywords: ["power", "adapter", "12v"],
            features: ["Overload protection", "Stable voltage output", "Brand New Condition"],
            specs: { "Brand": "Generic", "Model": "N/A", "Condition": "Brand New", "Input": "100-240V AC", "Output": "12V 2A DC" },
            videoUrl: "#",
            images: [
                "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=800",
                "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=800",
                "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=800"
            ]
        },
        {
            id: 2,
            title: "Arduino Uno R3 Compatible",
            mainCategory: "Microcontrollers",
            subCategory: "Arduino Compatible",
            price: 2450,
            stock: 20,
            image: "https://images.unsplash.com/photo-1553406830-ef2513450d76?w=800",
            description: "The classic microcontroller for makers and beginners.",
            longDescription: "Compatible with Arduino Uno R3. A great starting point for learning electronics and coding.",
            keywords: ["arduino", "uno", "microcontroller"],
            features: ["Easy to program", "Wide compatibility", "Brand New Condition"],
            specs: { "Brand": "Arduino", "Model": "R3", "Condition": "Brand New", "MCU": "ATmega328P", "Voltage": "5V" },
            videoUrl: "https://www.youtube.com/watch?v=d8nK7F67Y60",
            images: [
                "https://images.unsplash.com/photo-1553406830-ef2513450d76?w=800",
                "https://images.unsplash.com/photo-1553406830-ef2513450d76?w=800",
                "https://images.unsplash.com/photo-1553406830-ef2513450d76?w=800"
            ]
        }
    ];
}

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
    // Try Cloud First
    if (db) {
        try {
            const doc = await db.collection("shop").doc("categories").get();
            if (doc.exists) {
                const newData = doc.data().data || {};
                // Clear and update categoryData without re-assigning
                Object.keys(categoryData).forEach(key => delete categoryData[key]);
                Object.assign(categoryData, newData);
                console.log("Categories loaded from Cloud");
                return;
            }
        } catch (e) {
            console.error("Cloud Category Load Error:", e);
        }
    }

    // Fallback to Local
    const stored = localStorage.getItem('eshop_categories');
    if (stored) {
        categoryData = JSON.parse(stored);
    }
}

// Product Data Management
let products = [];
let db = null;
const defaultDocumentTitle = "Pubudu Electronics | Premium Electronic Components in Sri Lanka";
const defaultMetaDescription = "Buy high-quality electronic components in Sri Lanka. Wide range of Arduino, ESP32, sensors, power adapters, and modules at affordable prices. Fast delivery island-wide.";

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

const SITE_URL = "https://ichouse.lk/";

// Initialize Firebase if configure
function initFirebase() {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY" && typeof firebase !== 'undefined') {
        try {
            if (firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            customerAuth = firebase.auth();
            console.log("Firebase & Auth Initialized");
            return true;
        } catch (e) {
            console.error("Firebase Init Error:", e);
            return false;
        }
    }
    return false;
}

// Load products - UPDATED for speed (Local First, then Cloud)
async function loadProducts() {
    // 1. Try to load from LocalStorage immediately for instant UI
    const storedProducts = localStorage.getItem('eshop_products');
    if (storedProducts) {
        const localProducts = JSON.parse(storedProducts);
        products.length = 0;
        products.push(...localProducts);
        console.log("Instant Load: LocalStorage", products.length);
        renderHomeGrid();
        renderProducts(); // Render immediately!
        if (window.renderAdminList) window.renderAdminList();
    }

    // 2. Initialize Firebase in background
    const isCloud = initFirebase();
    await loadCategories();

    // 3. Update from Cloud if available
    if (isCloud && db) {
        try {
            const doc = await db.collection("shop").doc("inventory").get();
            if (doc.exists) {
                const cloudProducts = doc.data().products || [];

                // Compare with local - only re-render if changed
                if (JSON.stringify(cloudProducts) !== JSON.stringify(products)) {
                    products.length = 0;
                    products.push(...cloudProducts);
                    console.log("Cloud Update: Sync completed", products.length);
                    renderHomeGrid();
                    renderProducts();
                    if (window.renderAdminList) window.renderAdminList();
                    localStorage.setItem('eshop_products', JSON.stringify(products));
                }
                return;
            }
        } catch (e) {
            console.error("Cloud Sync Error:", e);
        }
    }

    // 4. Default if nothing found anywhere
    if (products.length === 0) {
        const generated = generateProducts();
        products.push(...generated);
        renderHomeGrid();
        renderProducts();
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

// Initialize - loadProducts is called in the DOMContentLoaded listener at the bottom of file

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

// Auth & Cart State
let customerAuth = null;
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('eshop_cart')) || [];
let favorites = [];
let userDeliveryDetails = {};
let showingFavorites = false;
let modalQty = 1;

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
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id == productId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            quantity: quantity
        });
    }

    saveCart();
    updateCartUI();
    showToast(`Added ${quantity} x ${product.title} to cart`);
}

function updateModalQty(delta) {
    modalQty += delta;
    if (modalQty < 1) modalQty = 1;
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

function removeFromCart(productId) {
    cart = cart.filter(item => item.id != productId);
    saveCart();
    updateCartUI();
}

function updateQuantity(productId, delta) {
    const item = cart.find(i => i.id == productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(productId);
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
    const cartItemsList = document.getElementById('cart-items');
    const cartTotalAmount = document.getElementById('cart-total-amount');

    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (cartBadge) cartBadge.textContent = totalQty;
    if (cartTotalAmount) cartTotalAmount.textContent = `LKR ${totalPrice.toLocaleString()}`;

    if (cartItemsList) {
        cartItemsList.innerHTML = cart.length === 0
            ? '<p style="text-align: center; color: var(--text-light); padding: 2rem;">Your cart is empty.</p>'
            : cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.title}" class="cart-item-img">
                    <div class="cart-item-info">
                        <h4 class="cart-item-title">${item.title}</h4>
                        <div class="cart-item-price">LKR ${item.price.toLocaleString()}</div>
                        <div class="cart-item-controls">
                            <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                            <span>${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                            <button class="qty-btn" style="margin-left: auto; color: #ef4444;" onclick="removeFromCart(${item.id})">
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
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;

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
            <td>${item.title}</td>
            <td>${item.quantity}</td>
            <td>LKR ${item.price.toLocaleString()}</td>
            <td>LKR ${(item.price * item.quantity).toLocaleString()}</td>
        </tr>
    `).join('');

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    invoiceSubtotal.textContent = `LKR ${subtotal.toLocaleString()}`;
    invoiceTotal.textContent = `LKR ${subtotal.toLocaleString()}`;

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
        message += `• ${item.title} x ${item.quantity} = LKR ${(item.price * item.quantity).toLocaleString()}\n`;
    });

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `----------------------------\n`;
    message += `*TOTAL AMOUNT: LKR ${total.toLocaleString()}*\n`;
    message += `----------------------------\n`;
    message += `Please confirm my order. Thank you!`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function downloadInvoicePDF() {
    const element = document.getElementById('invoice-paper');
    const invId = window.currentInvoiceId || 'inv';
    const btn = document.getElementById('download-pdf');

    if (!element) return;
    if (typeof html2pdf === 'undefined') {
        alert("The PDF library is still loading. Please wait or refresh the page.");
        return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    btn.disabled = true;

    // Temporarily remove overflow so html2canvas captures the FULL content, not just what's visible
    const originalOverflow = element.style.overflow;
    const originalMaxHeight = element.style.maxHeight;
    const originalHeight = element.style.height;
    element.style.overflow = 'visible';
    element.style.maxHeight = 'none';
    element.style.height = 'auto';

    const opt = {
        margin: [10, 10, 10, 10], // mm
        filename: `Pubudu_Electronics_Invoice_${invId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            scrollY: 0,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        // Restore original styles
        element.style.overflow = originalOverflow;
        element.style.maxHeight = originalMaxHeight;
        element.style.height = originalHeight;
        btn.innerHTML = originalText;
        btn.disabled = false;
    }).catch(err => {
        // Restore original styles even on error
        element.style.overflow = originalOverflow;
        element.style.maxHeight = originalMaxHeight;
        element.style.height = originalHeight;
        console.error("PDF Error:", err);
        btn.innerHTML = originalText;
        btn.disabled = false;
        alert("Could not generate PDF. Please use the Print option instead.");
    });
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
function initFilters() {
    // Don't clear innerHTML as it removes the search bar
    const existingMain = document.getElementById('category-filter');
    const existingSub = document.getElementById('subcategory-filter');
    if (existingMain) existingMain.remove();
    if (existingSub) existingSub.remove();

    // Get URL Params
    const urlParams = new URLSearchParams(window.location.search);
    const initialMain = urlParams.get('category') || 'all';
    const initialSub = urlParams.get('subcategory') || 'all';
    const initialSearch = urlParams.get('search') || '';

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

    // Search Logic
    const searchInput = document.getElementById('product-search');
    const clearBtn = document.getElementById('clear-search');

    if (searchInput) {
        searchInput.value = initialSearch;
        if (clearBtn) clearBtn.classList.toggle('hidden', initialSearch.length === 0);

        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (clearBtn) {
                clearBtn.classList.toggle('hidden', query.length === 0);
            }

            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (query.length > 0) showAllProducts();
                renderProducts(mainSelect.value, subSelect.value, query);
                updateURL(mainSelect.value, subSelect.value, null, query);
            }, 300); // 300ms Debounce
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.classList.add('hidden');
            showAllProducts();
            renderProducts(mainSelect.value, subSelect.value, '');
            updateURL(mainSelect.value, subSelect.value, null, '');
        });
    }

    // Initial Render based on URL
    if (initialMain !== 'all' || initialSub !== 'all' || initialSearch !== '') {
        showAllProducts();
    }
    renderProducts(initialMain, initialSub, initialSearch);
}

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

function showAllProducts() {
    const homeFeatured = document.getElementById('home-featured');
    if (homeFeatured) homeFeatured.classList.add('hidden');

    const productsSection = document.getElementById('products');
    if (productsSection) {
        productsSection.classList.remove('hidden');
    }
}

let homeGridRendered = false;
let homeGridSelectedProducts = [];

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
            if (homeGridSelectedProducts.length >= 12) break;
            homeGridSelectedProducts.push(p);
            usedIds.add(p.id);
        }

        homeGridSelectedProducts = homeGridSelectedProducts.slice(0, 12);
        homeGridRendered = true;
    }

    const html = homeGridSelectedProducts.map(product => {
        const stockColor = product.stock > 10 ? 'var(--secondary)' : 'var(--accent)';
        const stockText = product.stock > 0 ? `Available: ${product.stock}` : 'Out of Stock';
        const isFav = favorites.some(id => id == product.id);

        return `
            <div class="product-card" onclick="openProductDetails('${product.id}')">
                <button class="btn-fav ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${product.id}')" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <div class="product-image-container">
                    <span class="badge">${product.mainCategory}</span>
                    <img src="${product.image}" alt="${product.title}" class="product-image" 
                         loading="lazy" decoding="async" 
                         onerror="this.src='https://via.placeholder.com/300x300?text=Image+Not+Found'">
                </div>
                <div class="product-info">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                        <span class="product-category">${product.subCategory}</span>
                        <span style="font-size: 0.8rem; font-weight: 600; color: ${stockColor};">
                            <i class="fas fa-cubes"></i> ${stockText}
                        </span>
                    </div>
                    <div style="width: 100%; background: #e2e8f0; height: 4px; border-radius: 2px; margin-bottom: 0.5rem; overflow: hidden;">
                        <div style="width: ${Math.min(product.stock, 100)}%; background: ${stockColor}; height: 100%; border-radius: 2px;"></div>
                    </div>
                    <h3 class="product-title">${product.title}</h3>
                    <div class="product-price">LKR ${product.price.toLocaleString()}</div>
                    <div class="product-actions">
                        <button class="btn-video" onclick="event.stopPropagation(); addToCart('${product.id}')">
                             Add to Cart
                        </button>
                        <button class="btn-buy" onclick="event.stopPropagation(); addToCart('${product.id}'); document.getElementById('cart-drawer').classList.remove('hidden');">
                             Buy Now
                        </button>
                    </div>
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

// Optimized Render Products
function renderProducts(mainCat = 'all', subCat = 'all', searchQuery = '') {
    if (!productGrid) return;

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
        return;
    }

    // Build entire HTML string once to minimize Reflows/Repaints
    const html = filteredProducts.map(product => {
        const stockColor = product.stock > 10 ? 'var(--secondary)' : 'var(--accent)';
        const stockText = product.stock > 0 ? `Available: ${product.stock}` : 'Out of Stock';
        const isFav = favorites.some(id => id == product.id);

        return `
            <div class="product-card" onclick="openProductDetails('${product.id}')">
                <button class="btn-fav ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${product.id}')" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <div class="product-image-container">
                    <span class="badge">${product.mainCategory}</span>
                    <img src="${product.image}" alt="${product.title}" class="product-image" 
                         loading="lazy" decoding="async" 
                         onerror="this.src='https://via.placeholder.com/300x300?text=Image+Not+Found'">
                </div>
                <div class="product-info">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                        <span class="product-category">${product.subCategory}</span>
                        <span style="font-size: 0.8rem; font-weight: 600; color: ${stockColor};">
                            <i class="fas fa-cubes"></i> ${stockText}
                        </span>
                    </div>
                    <div style="width: 100%; background: #e2e8f0; height: 4px; border-radius: 2px; margin-bottom: 0.5rem; overflow: hidden;">
                        <div style="width: ${Math.min(product.stock, 100)}%; background: ${stockColor}; height: 100%; border-radius: 2px;"></div>
                    </div>
                    <h3 class="product-title">${product.title}</h3>
                    <div class="product-price">LKR ${product.price.toLocaleString()}</div>
                    <div class="product-actions">
                        <button class="btn-video" onclick="event.stopPropagation(); addToCart('${product.id}')">
                             Add to Cart
                        </button>
                        <button class="btn-buy" onclick="event.stopPropagation(); addToCart('${product.id}'); document.getElementById('cart-drawer').classList.remove('hidden');">
                             Buy Now
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    productGrid.innerHTML = html;
}

// Open Product Details (Modal)
function openProductDetails(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;

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
    detailCategory.textContent = `${product.mainCategory} > ${product.subCategory}`;
    detailTitle.textContent = product.title;
    detailPrice.textContent = `LKR ${product.price.toLocaleString()}`;

    // Model Number Display
    const modelDisplay = document.getElementById('detail-model-display');
    if (modelDisplay) {
        if (product.modelNumber) {
            modelDisplay.textContent = `Model: ${product.modelNumber}`;
            modelDisplay.style.display = 'block';
        } else {
            modelDisplay.style.display = 'none';
        }
    }

    // Image & Thumbnails
    if (product.images && product.images.length > 0) {
        detailImage.src = product.images[0];
        product.images.forEach((imgUrl, index) => {
            const thumb = document.createElement('img');
            thumb.src = imgUrl;
            thumb.loading = "lazy";
            thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            thumb.onclick = () => {
                detailImage.src = imgUrl;
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            detailThumbnails.appendChild(thumb);
        });
    } else {
        detailImage.src = product.image;
        detailImage.loading = "lazy";
    }

    // Product Description (Under Title)
    if (detailDescription) {
        detailDescription.innerHTML = product.longDescription || product.description;
    }

    // Keywords/Tags
    if (detailTags && product.keywords) {
        detailTags.innerHTML = product.keywords.map(k => `<span class="tag">${k}</span>`).join('');
        detailTags.classList.remove('hidden');
    }

    // Features
    if (product.features && product.features.length > 0) {
        product.features.forEach(feature => {
            const li = document.createElement('li');
            li.textContent = feature;
            detailFeatures.appendChild(li);
        });
    } else {
        detailFeatures.innerHTML = '<li>Quality Tested</li><li>Available in Stock</li>';
    }

    // Specs
    if (product.specs) {
        for (const [key, value] of Object.entries(product.specs)) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${key}</td><td>${value}</td>`;
            detailSpecsBody.appendChild(tr);
        }
        detailVideoBtn.href = product.videoUrl;
        detailVideoBtn.style.display = product.videoUrl === '#' ? 'none' : 'flex';

        // Reset Modal Qty
        modalQty = 1;
        const qtyValueDisplay = document.getElementById('modal-qty-value');
        if (qtyValueDisplay) qtyValueDisplay.textContent = modalQty;

        detailAddCartBtn.onclick = () => {
            addToCart(product.id, modalQty);
        };
        detailBuyBtn.onclick = () => {
            addToCart(product.id, modalQty);
            document.getElementById('cart-drawer').classList.remove('hidden');
        };

        const modalFavBtn = document.getElementById('modal-fav-btn');
        if (modalFavBtn) {
            const isFav = favorites.some(id => id == product.id);
            modalFavBtn.classList.toggle('active', isFav);
            modalFavBtn.innerHTML = isFav
                ? '<i class="fas fa-heart"></i> Favorited'
                : '<i class="far fa-heart"></i> Favorite';
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

        // --- NEW: Mobile Action Bar & Swiping ---
        const mobileAddBtn = document.getElementById('mobile-add-cart-btn');
        const mobileBuyBtn = document.getElementById('mobile-buy-btn');
        const zoomContainer = document.getElementById('zoom-container');

        if (mobileAddBtn) {
            mobileAddBtn.onclick = () => addToCart(product.id, parseInt(modalQtyValue.textContent));
        }
        if (mobileBuyBtn) {
            mobileBuyBtn.onclick = () => {
                addToCart(product.id, parseInt(modalQtyValue.textContent));
                closeProductDetails();
                toggleCart(true);
            };
        }

        // Swipe interaction for mobile images
        let touchStartX = 0;
        let touchEndX = 0;

        if (zoomContainer) {
            // Remove existing to prevent clones if any
            const newContainer = zoomContainer.cloneNode(true);
            zoomContainer.parentNode.replaceChild(newContainer, zoomContainer);

            // Re-assign references after clone
            detailImage = newContainer.querySelector('#detail-image');

            newContainer.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            newContainer.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                const threshold = 50;

                if (!product.images || product.images.length <= 1) return;

                const currentIndex = product.images.indexOf(detailImage.src);

                if (touchEndX < touchStartX - threshold) {
                    // Next
                    const nextIdx = (currentIndex + 1) % product.images.length;
                    detailImage.src = product.images[nextIdx];
                    updateThumbnails(nextIdx);
                } else if (touchEndX > touchStartX + threshold) {
                    // Prev
                    const prevIdx = (currentIndex - 1 + product.images.length) % product.images.length;
                    detailImage.src = product.images[prevIdx];
                    updateThumbnails(prevIdx);
                }
            }, { passive: true });
        }

        function updateThumbnails(idx) {
            document.querySelectorAll('.thumbnail').forEach((t, i) => {
                t.classList.toggle('active', i === idx);
            });
        }

        // SEO: Update document title, meta description, and inject JSON-LD
        document.title = `${product.title} | Pubudu Electronics`;

        // Update Canonical
        let canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.setAttribute('href', finalUrl);

        // Update Meta Tags for SEO/Social
        const metaTags = {
            'description': product.description || product.longDescription,
            'og:title': `${product.title} | Pubudu Electronics`,
            'og:description': product.description || product.longDescription,
            'og:url': finalUrl,
            'og:image': product.image,
            'twitter:title': `${product.title} | Pubudu Electronics`,
            'twitter:description': product.description || product.longDescription,
            'twitter:url': finalUrl,
            'twitter:image': product.image
        };

        for (const [name, content] of Object.entries(metaTags)) {
            let tag = name.startsWith('og:') || name.startsWith('twitter:')
                ? document.querySelector(`meta[property="${name}"]`) || document.querySelector(`meta[name="${name}"]`)
                : document.querySelector(`meta[name="${name}"]`);

            if (tag) {
                tag.setAttribute('content', content);
            }
        }

        // --- JSON-LD Structered Data (Product Schema) ---
        const productSchema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.title,
            "image": product.images && product.images.length > 0 ? product.images : [product.image],
            "description": product.description || product.longDescription,
            "sku": product.modelNumber || `PE-${product.id}`,
            "brand": {
                "@type": "Brand",
                "name": product.specs && product.specs.Brand ? product.specs.Brand : "Pubudu Electronics"
            },
            "offers": {
                "@type": "Offer",
                "url": finalUrl,
                "priceCurrency": "LKR",
                "price": product.price,
                "priceValidUntil": "2026-12-31",
                "itemCondition": product.specs && product.specs.Condition === 'Used' ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
                "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "seller": {
                    "@type": "Organization",
                    "name": "Pubudu Electronics"
                }
            }
        };
        const scriptJsonLd = document.getElementById('product-structured-data');
        if (scriptJsonLd) scriptJsonLd.textContent = JSON.stringify(productSchema);

        // --- Internal Linking: Related Products ---
        renderRelatedProducts(product);

        // Update URL to include product ID
        updateURL(product.mainCategory, product.subCategory, product.id);

        // Show Modal
        productModalRoot.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }
}

// Function to render related products for internal linking
function renderRelatedProducts(currentProduct) {
    const relatedContainer = document.getElementById('related-products-list');
    if (!relatedContainer) {
        // Create container if it doesn't exist (optional, or assuming it's in HTML)
        const specsContainer = document.querySelector('.detail-specs-container');
        if (specsContainer) {
            const heading = document.createElement('h3');
            heading.textContent = "Related Components";
            heading.style.marginTop = "2rem";
            const list = document.createElement('div');
            list.id = "related-products-list";
            list.className = "related-products-grid";
            specsContainer.appendChild(heading);
            specsContainer.appendChild(list);
        }
    }

    const related = products
        .filter(p => p.id !== currentProduct.id && p.mainCategory === currentProduct.mainCategory)
        .slice(0, 4);

    const container = document.getElementById('related-products-list');
    if (container) {
        container.innerHTML = related.map(p => `
            <div class="related-item" onclick="openProductDetails(${p.id})">
                <img src="${p.image}" alt="${p.title}" loading="lazy">
                <div class="related-info">
                    <h4>${p.title}</h4>
                    <span>LKR ${p.price.toLocaleString()}</span>
                </div>
            </div>
        `).join('');
    }
}

// Close Modal
function closeProductModal() {
    productModalRoot.classList.add('hidden');
    document.body.classList.remove('modal-open');

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
    if (productsSection) productsSection.classList.add('hidden');

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

// Initial Render
document.addEventListener('DOMContentLoaded', async () => {
    // Update Copyright Year
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // If we are on the admin page, skip the customer-facing initializations
    if (document.getElementById('admin-page')) {
        await loadProducts();
        return;
    }

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
        const closeCartBtn = document.getElementById('close-cart');
        const cartOverlay = document.getElementById('cart-overlay');
        const cartDrawer = document.getElementById('cart-drawer');

        if (cartBtn) cartBtn.addEventListener('click', () => {
            updateCartUI();
            cartDrawer.classList.remove('hidden');
        });
        if (closeCartBtn) closeCartBtn.addEventListener('click', () => cartDrawer.classList.add('hidden'));
        if (cartOverlay) cartOverlay.addEventListener('click', () => cartDrawer.classList.add('hidden'));

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

        // Add Event Listeners for Home/Reset
        const navLogo = document.getElementById('nav-logo');
        if (navLogo) {
            navLogo.addEventListener('click', resetApp);
        }

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
            initFilters();
        }

        // Deep Link Check: Open product if ID in URL
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('product');
        if (productId) {
            openProductDetails(parseInt(productId));
        }

        // Initialize Auth after products/firebase ready
        initCustomerAuth();

        // Initialize Image Zoom
        initZoom();

    } catch (err) {
        console.error("App Crash:", err);
        showStatus("Website error. Please contact admin.", true);
    }
});
