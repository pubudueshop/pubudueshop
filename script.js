// Category Structure (Initial defaults)
let categoryData = {
    "Power Adapters": ["12V Adapters", "24V Adapters", "5V Adapters", "Adjustable Power Supply", "Industrial Switching"],
    "Microcontrollers": ["Arduino Compatible", "ESP8266 Series", "ESP32 Series", "Raspberry Pi", "STM32 Boards"],
    "Sensors": ["Temperature & Humidity", "Motion Sensors", "Distance Sensors", "Gas Sensors", "Light & Sound"],
    "Modules": ["Relay Modules", "Bluetooth Modules", "WiFi Modules", "GPS Modules", "Motor Drivers", "Thermal Modules"],
};

// Start with an empty list
const baseProducts = [];

// Helper to generate full product list (returns empty now as user wants clean slate)
function generateProducts() {
    return [];
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

// Initialize Firebase if configure
function initFirebase() {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY" && typeof firebase !== 'undefined') {
        try {
            if (firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            console.log("Firebase Initialized");
            return true;
        } catch (e) {
            console.error("Firebase Init Error:", e);
            return false;
        }
    }
    return false;
}

// Load products from Cloud or Local
async function loadProducts() {
    const isCloud = initFirebase();
    await loadCategories(); // Load categories first

    // Try Cloud First
    if (isCloud && db) {
        try {
            const doc = await db.collection("shop").doc("inventory").get();
            if (doc.exists) {
                const cloudProducts = doc.data().products || [];
                // Mutate existing array to keep references alive
                products.length = 0;
                products.push(...cloudProducts);

                console.log("Loaded from Cloud", products.length);
                renderProducts(); // Re-render after async load
                if (window.renderAdminList) window.renderAdminList();

                // Update Local Backup
                localStorage.setItem('eshop_products', JSON.stringify(products));
                return;
            }
        } catch (e) {
            console.error("Cloud Load Error:", e);
            if (e.code === 'permission-denied') {
                console.warn("CRITICAL: Firestore Rules are blocking the public site. Please set Rules to: allow read: if true;");
            }
        }
    }

    // Fallback to LocalStorage
    const storedProducts = localStorage.getItem('eshop_products');
    if (storedProducts) {
        const localProducts = JSON.parse(storedProducts);
        products.length = 0;
        products.push(...localProducts);
        console.log("Loaded from LocalStorage");
    } else {
        const generated = generateProducts();
        products.length = 0;
        products.push(...generated);
        // DO NOT call saveProducts() here anymore. 
        // We don't want the public site to overwrite the cloud with empty data.
    }
    renderProducts();
    if (window.renderAdminList) window.renderAdminList();
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
const detailImage = document.getElementById('detail-image');
const detailThumbnails = document.getElementById('detail-thumbnails');
const detailTags = document.getElementById('detail-tags');
const detailCategory = document.getElementById('detail-category');
const detailTitle = document.getElementById('detail-title');
const detailPrice = document.getElementById('detail-price');
const detailDescription = document.getElementById('detail-description');
const detailLongDesc = document.getElementById('detail-long-desc');
const detailFeatures = document.getElementById('detail-features');
const detailSpecsBody = document.getElementById('detail-specs-body');
const detailVideoBtn = document.getElementById('detail-video-btn');
const detailBuyBtn = document.getElementById('detail-buy-btn');

// Update URL Parameters
function updateURL(mainCat, subCat) {
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

    window.history.pushState({}, '', url);
}

// Initialize Filters with URL Support
function initFilters() {
    filterContainer.innerHTML = '';

    // Get URL Params
    const urlParams = new URLSearchParams(window.location.search);
    const initialMain = urlParams.get('category') || 'all';
    const initialSub = urlParams.get('subcategory') || 'all';

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
        const selectedMain = e.target.value;
        populateSubCategories(selectedMain);
        renderProducts(selectedMain, 'all');
        updateURL(selectedMain, 'all');
    });

    subSelect.addEventListener('change', (e) => {
        renderProducts(mainSelect.value, e.target.value);
        updateURL(mainSelect.value, e.target.value);
    });

    filterContainer.appendChild(mainSelect);
    filterContainer.appendChild(subSelect);

    // Initial Render based on URL
    renderProducts(initialMain, initialSub);
}

// Render Products
function renderProducts(mainCat = 'all', subCat = 'all') {
    if (!productGrid) return;

    // Show loading state if products array exists but is empty and we haven't checked cloud yet?
    // Actually, just clear and render.
    productGrid.innerHTML = '';

    const filteredProducts = products.filter(p => {
        const matchMain = mainCat === 'all' || p.mainCategory === mainCat;
        const matchSub = subCat === 'all' || p.subCategory === subCat;
        return matchMain && matchSub;
    });

    if (filteredProducts.length === 0) {
        productGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; font-size: 1.2rem; color: var(--text-light);">No products found.</p>';
        return;
    }

    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = (e) => {
            if (!e.target.closest('button') && !e.target.closest('a')) {
                openProductDetails(product.id);
            }
        };

        // Stock Color Logic
        const stockColor = product.stock > 10 ? 'var(--secondary)' : 'var(--accent)';
        const stockText = product.stock > 0 ? `Available: ${product.stock}` : 'Out of Stock';

        card.innerHTML = `
            <div class="product-image-container">
                <span class="badge">${product.mainCategory}</span>
                <img src="${product.image}" alt="${product.title}" class="product-image">
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
                    <button class="btn-video" onclick="event.stopPropagation(); openProductDetails(${product.id})">
                         Details
                    </button>
                    <button class="btn-buy" onclick="event.stopPropagation(); contactSeller('${product.title}')">
                        <i class="fas fa-shopping-cart"></i> Buy
                    </button>
                </div>
            </div>
        `;
        productGrid.appendChild(card);
    });
}

// Open Product Details (Modal)
function openProductDetails(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    // Clear Previous Data
    detailImage.src = '';
    detailThumbnails.innerHTML = '';
    detailFeatures.innerHTML = '';
    detailSpecsBody.innerHTML = '';
    detailLongDesc.textContent = '';
    if (detailTags) detailTags.innerHTML = '';

    // Populate Data
    detailCategory.textContent = `${product.mainCategory} > ${product.subCategory}`;
    detailTitle.textContent = product.title;
    detailPrice.textContent = `LKR ${product.price.toLocaleString()}`;
    detailDescription.textContent = product.description;

    // Image & Thumbnails
    if (product.images && product.images.length > 0) {
        detailImage.src = product.images[0];
        product.images.forEach((imgUrl, index) => {
            const thumb = document.createElement('img');
            thumb.src = imgUrl;
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
    }

    // Long Description
    detailLongDesc.textContent = product.longDescription || product.description;

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
    }

    // Buttons
    detailVideoBtn.href = product.videoUrl;
    detailVideoBtn.style.display = product.videoUrl === '#' ? 'none' : 'flex';
    detailBuyBtn.onclick = () => contactSeller(product.title, product.price);

    // Show Modal
    productModalRoot.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

// Close Modal
function closeProductModal() {
    productModalRoot.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

// Close Product Details (Back to List)
backToProductsBtn.addEventListener('click', () => {
    productDetailsView.classList.add('hidden');
    productGrid.classList.remove('hidden');
    document.querySelector('.section-header').classList.remove('hidden');

    // Scroll back up to see filters
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
});

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
    window.history.pushState({}, '', url);

    // Reset View
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
    await loadProducts(); // Load from Cloud or Local first
    initFilters();

    // Modal Close Events
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeProductModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeProductModal);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && productModalRoot && !productModalRoot.classList.contains('hidden')) {
            closeProductModal();
        }
    });

    // Add Event Listeners for Home/Reset
    const navLogo = document.getElementById('nav-logo');
    if (navLogo) {
        navLogo.addEventListener('click', resetApp);
    }

    // Also bind to footer home link if present
    const footerHome = document.querySelector('.footer-links a[href="#"]');
    if (footerHome) {
        footerHome.addEventListener('click', resetApp);
    }
});
