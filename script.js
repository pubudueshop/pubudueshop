// Category Structure
const categoryData = {
    "Power Adapters": ["12V Adapters", "24V Adapters", "5V Adapters", "Adjustable Power Supply", "Industrial Switching"],
    "Microcontrollers": ["Arduino Compatible", "ESP8266 Series", "ESP32 Series", "Raspberry Pi", "STM32 Boards"],
    "Sensors": ["Temperature & Humidity", "Motion Sensors", "Distance Sensors", "Gas Sensors", "Light & Sound"],
    "Modules": ["Relay Modules", "Bluetooth Modules", "WiFi Modules", "GPS Modules", "Motor Drivers", "Thermal Modules"],
    "Displays": ["OLED Displays", "LCD Screens", "E-Ink / E-Paper", "TFT Touch Screens", "7-Segment Displays"],
    "Components": ["Resistors & Potentiometers", "Capacitors", "Transistors & MOSFETs", "Diodes & Rectifiers", "LEDs & Lighting"],
    "Connectors": ["USB Connectors", "JST & Molex", "Terminal Blocks", "Pin Headers", "Audio/Video"],
    "Cables & Wire": ["Jumper Wires", "USB Cables", "Ribbon Cables", "Power Cables", "Network Cables"],
    "Soldering Gear": ["Soldering Irons", "Solder Wire", "Flux & Paste", "Stations", "Accessories"],
    "Batteries": ["Li-Ion Cells", "Li-Po Packs", "Battery Holders", "BMS Boards", "Chargers"]
};

// Start with a base of real products, then generate fillers to populate the categories
const baseProducts = [
    {
        id: 7,
        title: "XH-W3001 Digital Temperature Controller",
        mainCategory: "Modules",
        subCategory: "Thermal Modules",
        price: 750,
        stock: 100,
        image: "https://res.cloudinary.com/dqwdov5ab/image/upload/v1770872153/3001_3_cyvyxl.png",
        images: [
            "https://res.cloudinary.com/dqwdov5ab/image/upload/v1770872153/3001_3_cyvyxl.png",
            "https://res.cloudinary.com/dqwdov5ab/image/upload/v1770872153/3001_5_nql6w5.png",
            "https://res.cloudinary.com/dqwdov5ab/image/upload/v1770872153/3001_2_vcnff6.png",
            "https://res.cloudinary.com/dqwdov5ab/image/upload/v1770872153/3001_1_nqvsrd.png",
            "https://res.cloudinary.com/dqwdov5ab/image/upload/v1770872152/3001_6_uexgjl.png"
        ],
        description: "High quality automatic thermostat controller used to control temperature in incubators, freezers, and aquariums.",
        longDescription: "The XH-W3001 Digital Temperature Controller Module is a high quality automatic thermostat controller. It automatically turns ON/OFF your load according to temperature using its built-in sensor probe. Ideal for chicken egg incubators, aquarium heater control, water heater thermostats, and many DIY projects.",
        features: [
            "Model: XH-W3001",
            "Supply Voltage: 12V / 24V / 220V Options",
            "Temperature Range: -50°C to +110°C",
            "Control Accuracy: ±0.1°C",
            "Sensor: NTC 10K Waterproof Probe",
            "Output: Max 10A Load",
            "Automatic Heating & Cooling Mode",
            "Digital LED Display"
        ],
        specs: {
            "Model": "XH-W3001",
            "Voltage": "12V/24V/220V",
            "Output Type": "Direct Output",
            "Max Capacity": "10A",
            "Temp Range": "-50°C ~ 110°C",
            "Size": "60 x 45 x 31 mm"
        },
        videoUrl: "#"
    },
    {
        id: 1,
        title: "Power Adapter 12V 3A",
        mainCategory: "Power Adapters",
        subCategory: "12V Adapters",
        price: 1000,
        stock: 50,
        image: "https://placehold.co/400x300?text=12V+Power+Adapter",
        description: "High-quality 12V 3A power adapter suitable for CCTV cameras.",
        longDescription: "This reliable 12V 3A power adapter is designed to provide stable power for your electronic devices. Features over-voltage protection.",
        features: ["Input: 100-240V AC", "Output: 12V DC 3A", "5.5mm x 2.5mm connector", "Short-circuit protection"],
        specs: { "Input Voltage": "100-240V AC", "Output Voltage": "12V DC", "Output Current": "3A" },
        videoUrl: "https://www.youtube.com/watch?v=nL34zDTPk3w"
    },
    {
        id: 2,
        title: "ESP8266 WiFi Module",
        mainCategory: "Microcontrollers",
        subCategory: "ESP8266 Series",
        price: 1250,
        stock: 120,
        image: "https://placehold.co/400x300?text=ESP8266+WiFi",
        description: "Low-cost Wi-Fi microchip with full TCP/IP stack.",
        longDescription: "The ESP8266 offers a complete and self-contained Wi-Fi networking solution.",
        features: ["802.11 b/g/n", "Integrated 32-bit CPU", "Integrated TCP/IP stack"],
        specs: { "Voltage": "3.3V", "WiFi": "802.11 b/g/n", "Flash": "4MB" },
        videoUrl: "#"
    },
    {
        id: 3,
        title: "Ultrasonic Sensor HC-SR04",
        mainCategory: "Sensors",
        subCategory: "Distance Sensors",
        price: 450,
        stock: 75,
        image: "https://placehold.co/400x300?text=Ultrasonic+Sensor",
        description: "2cm - 400cm non-contact measurement functionality.",
        features: ["Power Supply: +5V DC", "Ranging: 2cm – 400cm"],
        specs: { "Voltage": "5V", "Range": "2cm-400cm" },
        videoUrl: "#"
    },
    {
        id: 4,
        title: "OLED Display 0.96\"",
        mainCategory: "Displays",
        subCategory: "OLED Displays",
        price: 1800,
        stock: 30,
        image: "https://placehold.co/400x300?text=OLED+Display",
        description: "128x64 pixel resolution, I2C interface.",
        features: ["SSD1306 Driver", "128x64 Pixels", "I2C Interface"],
        specs: { "Size": "0.96 inch", "Resolution": "128x64", "Interface": "I2C" },
        videoUrl: "#"
    }
];

// Helper to generate full product list
function generateProducts() {
    let allProducts = [...baseProducts];
    let idCounter = 100;

    for (const [main, subs] of Object.entries(categoryData)) {
        subs.forEach(sub => {
            // Check if we already have a product for this subcategory
            const exists = allProducts.some(p => p.mainCategory === main && p.subCategory === sub);
            if (!exists) {
                // Create a placeholder product
                allProducts.push({
                    id: idCounter++,
                    title: `${sub} Generic Item`,
                    mainCategory: main,
                    subCategory: sub,
                    price: Math.floor(Math.random() * 5000) + 500,
                    stock: Math.floor(Math.random() * 100),
                    image: `https://placehold.co/400x300?text=${encodeURIComponent(sub)}`,
                    description: `Standard ${sub} component for your projects.`,
                    longDescription: `This is a high-quality product under the ${sub} category. Perfect for hobbyists and professionals.`,
                    features: ["High Reliability", "Durable Build", "Standard Specs"],
                    specs: { "Category": sub, "Main Type": main },
                    videoUrl: "#"
                });
            }
        });
    }
    return allProducts;
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
    if (firebaseConfig.apiKey !== "AIzaSyDl9N6YmDJI9bhhdkeUQPUxWKxIhZhryus" && typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
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

    // Try Cloud First
    if (isCloud && db) {
        try {
            const doc = await db.collection("shop").doc("inventory").get();
            if (doc.exists) {
                products = doc.data().products || [];
                console.log("Loaded from Cloud");
                renderProducts(); // Re-render after async load

                // Update Local Backup
                localStorage.setItem('eshop_products', JSON.stringify(products));
                return;
            }
        } catch (e) {
            console.error("Cloud Load Error:", e);
        }
    }

    // Fallback to LocalStorage
    const storedProducts = localStorage.getItem('eshop_products');
    if (storedProducts) {
        products = JSON.parse(storedProducts);
        console.log("Loaded from LocalStorage");
    } else {
        products = generateProducts();
        saveProducts(); // Save defaults
    }
    renderProducts();
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

// Initialize - loadProducts is called in the DOMContentLoaded listener at the bottom of file

// DOM Elements
const productGrid = document.getElementById('product-grid');
const filterContainer = document.querySelector('.filter-controls');
const productDetailsView = document.getElementById('product-details-view');
const backToProductsBtn = document.getElementById('back-to-products');

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

// Open Product Details
function openProductDetails(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    // Populate Data
    detailCategory.textContent = `${product.mainCategory} > ${product.subCategory}`;
    detailTitle.textContent = product.title;
    detailPrice.textContent = `LKR ${product.price.toLocaleString()}`;
    detailDescription.textContent = product.description;

    // Image & Thumbnails
    detailThumbnails.innerHTML = ''; // Clear previous thumbnails
    if (product.images && product.images.length > 0) {
        detailImage.src = product.images[0];

        product.images.forEach((imgUrl, index) => {
            const thumb = document.createElement('img');
            thumb.src = imgUrl;
            thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            thumb.onclick = () => {
                detailImage.src = imgUrl;
                // Update active state
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

    // Keywords/Tags Display
    if (detailTags) {
        if (product.keywords && product.keywords.length > 0) {
            detailTags.innerHTML = product.keywords.map(k => `<span class="tag">${k}</span>`).join('');
            detailTags.classList.remove('hidden');
        } else {
            detailTags.classList.add('hidden');
        }
    }

    // Features
    detailFeatures.innerHTML = '';
    if (product.features && product.features.length > 0) {
        product.features.forEach(feature => {
            const li = document.createElement('li');
            li.textContent = feature;
            detailFeatures.appendChild(li);
        });
    } else {
        detailFeatures.innerHTML = '<li>No specific features listed.</li>';
    }

    // Specs
    detailSpecsBody.innerHTML = '';
    if (product.specs) {
        for (const [key, value] of Object.entries(product.specs)) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${key}</td><td>${value}</td>`;
            detailSpecsBody.appendChild(tr);
        }
    } else {
        detailSpecsBody.innerHTML = '<tr><td colspan="2">No specifications available.</td></tr>';
    }

    // Buttons
    detailVideoBtn.href = product.videoUrl;
    detailBuyBtn.onclick = () => contactSeller(product.title);

    // Show View
    productGrid.classList.add('hidden');
    document.querySelector('.section-header').classList.add('hidden'); // Hide filters too
    productDetailsView.classList.remove('hidden');

    document.getElementById('product-details-view').scrollIntoView({ behavior: 'smooth' });
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
    productDetailsView.classList.add('hidden');
    productGrid.classList.remove('hidden');
    document.querySelector('.section-header').classList.remove('hidden');

    renderProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ...

// Initial Render
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts(); // Load from Cloud or Local first
    initFilters();

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
