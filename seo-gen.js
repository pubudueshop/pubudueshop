const fs = require('fs');
const https = require('https');
const path = require('path');

// Configuration
const SITE_URL = "https://ichouse.lk/";
const PROJECT_ID = "pubudueshop-cde28";
const API_KEY = "AIzaSyDl9N6YmDJI9bhhdkeUQPUxWKxIhZhryus";
const LAST_MOD = new Date().toISOString().split('T')[0];

console.log("--- SEO & SSG GENERATOR ---");
console.log(`URL: ${SITE_URL}`);
console.log(`Project: ${PROJECT_ID}`);
console.log(`Date: ${LAST_MOD}`);
console.log("----------------------------");

function createSEOSlug(name) {
    if (!name) return "";
    return name
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-')
        .replace(/-+/g, '-')        // collapse multiple dashes
        .replace(/^-|-$/g, '')      // trim leading/trailing dashes
        .substring(0, 60)           // max 60 chars for clean URLs
        .replace(/-$/g, '');        // trim trailing dash after cut
}

// Render markdown-style description to HTML
function renderDesc(text) {
    if (!text) return '<p style="color:#94a3b8;">No description available.</p>';
    return '<p style="margin:0;">' + text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^## (.+)$/gm, '</p><h3 style="font-size:1.05rem;font-weight:700;color:#1e293b;margin:14px 0 6px;">$1</h3><p style="margin:0;">')
        .replace(/^# (.+)$/gm, '</p><h2 style="font-size:1.2rem;font-weight:800;color:#1e293b;margin:16px 0 8px;">$1</h2><p style="margin:0;">')
        .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700;color:#1e293b;">$1</strong>')
        .replace(/^---$/gm, '</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0;"><p style="margin:0;">')
        .replace(/^• (.+)$/gm, '</p><div style="display:flex;gap:8px;margin:4px 0;"><span style="color:#2563eb;font-weight:700;flex-shrink:0;">•</span><span>$1</span></div><p style="margin:0;">')
        .replace(/\n\n/g, '</p><p style="margin:8px 0;">')
        .replace(/\n/g, '<br>') + '</p>';
}

async function fetchProducts() {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/shop/inventory?key=${API_KEY}`;
    console.log("📡 Fetching inventory from Firebase...");
    
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 30000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.error("❌ Firebase Error:", res.statusCode, data.substring(0, 200));
                    resolve([]);
                    return;
                }
                try {
                    const json = JSON.parse(data);
                    if (json.fields && json.fields.products && json.fields.products.arrayValue) {
                        const rawProducts = json.fields.products.arrayValue.values || [];
                        console.log(`📦 Raw products in Firebase: ${rawProducts.length}`);
                        const products = rawProducts.map(p => {
                            const f = p.mapValue.fields;
                            // Parse images array
                            let images = [];
                            if (f.images && f.images.arrayValue && f.images.arrayValue.values) {
                                images = f.images.arrayValue.values.map(v => v.stringValue).filter(Boolean);
                            }
                            // Parse keywords
                            let keywords = [];
                            if (f.keywords && f.keywords.arrayValue && f.keywords.arrayValue.values) {
                                keywords = f.keywords.arrayValue.values.map(v => v.stringValue).filter(Boolean);
                            }
                            // Parse features
                            let features = [];
                            if (f.features && f.features.arrayValue && f.features.arrayValue.values) {
                                features = f.features.arrayValue.values.map(v => v.stringValue).filter(Boolean);
                            }
                            // Parse specs
                            let specs = {};
                            if (f.specs && f.specs.mapValue && f.specs.mapValue.fields) {
                                Object.entries(f.specs.mapValue.fields).forEach(([k, v]) => {
                                    specs[k] = v.stringValue || v.integerValue || '';
                                });
                            }

                            return {
                                id: (f.id ? (f.id.integerValue || f.id.stringValue) : ''),
                                title: f.title ? f.title.stringValue : '',
                                mainCategory: (f.mainCategory ? f.mainCategory.stringValue : 'General'),
                                subCategory: (f.subCategory ? f.subCategory.stringValue : ''),
                                description: (f.description ? f.description.stringValue : (f.longDescription ? f.longDescription.stringValue : '')),
                                price: (f.price ? (f.price.integerValue || f.price.doubleValue) : 0),
                                stock: (f.stock ? (f.stock.integerValue || 0) : 0),
                                brand: (f.brand ? f.brand.stringValue : ''),
                                modelNumber: (f.modelNumber ? f.modelNumber.stringValue : ''),
                                condition: (f.condition ? f.condition.stringValue : ''),
                                image: images[0] || (f.image ? f.image.stringValue : ''),
                                images: images,
                                keywords: keywords,
                                features: features,
                                specs: specs,
                                videoUrl: (f.videoUrl ? f.videoUrl.stringValue : '')
                            };
                        }).filter(p => p.id && p.title); // filter out empty entries
                        console.log(`✅ Extracted ${products.length} valid products.`);
                        // Log last 5 products to verify new ones are included
                        console.log("📋 Last 5 products:", products.slice(-5).map(p => `${p.id}: ${p.title.substring(0,40)}`).join('\n'));
                        resolve(products);
                    } else {
                        console.error("❌ No products array found in Firebase response");
                        console.log("Response keys:", Object.keys(json.fields || {}));
                        resolve([]);
                    }
                } catch (e) {
                    console.error("❌ JSON Parse Error:", e.message);
                    resolve([]);
                }
            });
        });
        req.on('timeout', () => { req.destroy(); console.error("❌ Request timeout"); resolve([]); });
        req.on('error', (err) => { console.error("❌ Request error:", err.message); resolve([]); });
    });
}

// ===== KEY FIX: Inject real SEO content into the HTML body =====
function injectProductContent(page, product, pageUrl) {
    const cleanTitle = (product.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rawDesc = product.description || '';
    const price = parseInt(product.price) || 0;
    const stockStatus = product.stock > 0 ? 'In Stock' : 'Out of Stock';
    const stockColor = product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    
    // Breadcrumb Logic
    const mainCat = product.mainCategory || 'General';
    const subCat = product.subCategory || '';
    const mainCatSlug = createSEOSlug(mainCat);
    const subCatSlug = subCat ? createSEOSlug(subCat) : '';
    
    const breadcrumbItems = [
        { name: "Home", item: SITE_URL },
        { name: mainCat, item: `${SITE_URL}${mainCatSlug}/` }
    ];
    if (subCat) {
        breadcrumbItems.push({ name: subCat, item: `${SITE_URL}${mainCatSlug}/${subCatSlug}/` });
    }
    breadcrumbItems.push({ name: product.title.length > 40 ? product.title.substring(0, 40) + '…' : product.title, item: pageUrl });

    const breadcrumbsHtml = breadcrumbItems.map((b, i) => `
        <li class="flex items-center">
            ${i > 0 ? '<svg class="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/></svg>' : ''}
            <a href="${b.item}" class="text-sm font-medium ${i === breadcrumbItems.length - 1 ? 'text-gray-500 cursor-default' : 'text-blue-600 hover:text-blue-700'}">${b.name}</a>
        </li>
    `).join('');

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbItems.map((b, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": b.name,
            "item": b.item
        }))
    };

    const productJsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.title,
        "image": product.images || [product.image],
        "description": rawDesc,
        "sku": product.modelNumber || `PE-${product.id}`,
        "brand": { "@type": "Brand", "name": product.brand || "Pubudu Electronics" },
        "offers": {
            "@type": "Offer",
            "url": pageUrl,
            "priceCurrency": "LKR",
            "price": price,
            "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": { "@type": "Organization", "name": "Pubudu Electronics" }
        }
    };

    const specsHtml = Object.entries(product.specs || {}).length > 0
        ? Object.entries(product.specs).map(([k, v], i) => `
            <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                <td class="px-4 py-3 text-sm font-semibold text-gray-700 border-b">${k}</td>
                <td class="px-4 py-3 text-sm text-gray-600 border-b">${v}</td>
            </tr>`).join('')
        : `<tr class="bg-white"><td class="px-4 py-3 text-sm font-semibold text-gray-700 border-b">Category</td><td class="px-4 py-3 text-sm text-gray-600 border-b">${subCat || mainCat}</td></tr>`;

    const seoBlock = `
<!-- ===== PRODUCT PAGE: hide homepage-only sections ===== -->
<style>
  body.standalone-product-page .about-section { display: none !important; }
</style>
<!-- ===== NEW PREMIUM PRODUCT LAYOUT ===== -->
<div class="bg-gray-50 min-h-screen font-['Inter',sans-serif] text-gray-900 pb-20 md:pb-0">
    <!-- Breadcrumbs -->
    <div class="max-w-7xl mx-auto px-4 py-4">
        <nav class="flex" aria-label="Breadcrumb">
            <ol class="inline-flex items-center space-x-1 md:space-x-3">
                ${breadcrumbsHtml}
            </ol>
        </nav>
    </div>

    <!-- Product Main Card -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="flex flex-col md:flex-row">
                <!-- Left: Image Col (40%) -->
                <div class="md:w-2/5 p-6 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col items-center">
                    <div class="w-full aspect-square relative bg-white border border-gray-100 rounded-lg overflow-hidden group" style="cursor:zoom-in;">
                        <img src="${product.image}" alt="${cleanTitle} - Buy in Sri Lanka | Pubudu Electronics" class="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" id="main-product-img" loading="eager" onclick="openZoom(this.src)">
                        <div class="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-600 shadow-sm border border-gray-200 md:block hidden">
                            <i class="fas fa-search-plus mr-1"></i> Click to Zoom
                        </div>
                    </div>
                    ${product.images && product.images.length > 1 ? `
                    <div class="flex gap-2 mt-4 overflow-x-auto pb-2 w-full scrollbar-hide">
                        ${product.images.map((img, idx) => `
                            <img src="${img}" alt="${cleanTitle} image ${idx + 1} - Pubudu Electronics Sri Lanka"
                                class="w-20 h-20 object-contain p-1 border-2 ${idx === 0 ? 'border-blue-500' : 'border-gray-100'} rounded-md cursor-pointer hover:border-blue-500 transition-colors bg-white flex-shrink-0"
                                onclick="switchProductImage(this, '${img}')"
                                loading="lazy">
                        `).join('')}
                    </div>` : ''}
                </div>

                <!-- Right: Info Col (60%) -->
                <div class="md:w-3/5 p-8 flex flex-col">
                    <!-- Stock Badge -->
                    <div class="mb-3">
                        <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${stockColor}">${stockStatus}</span>
                        ${subCat ? `<span class="ml-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">${subCat}</span>` : ''}
                    </div>

                    <!-- Title -->
                    <h1 class="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 leading-tight">${cleanTitle}</h1>

                    <!-- Price -->
                    <div class="text-3xl font-black text-red-600 mb-4">LKR ${price.toLocaleString()}</div>

                    <!-- Model / Brand -->
                    <div class="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
                        ${product.brand ? `<span class="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full"><i class="fas fa-tag mr-1"></i> ${product.brand}</span>` : ''}
                        ${product.modelNumber ? `<span class="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full"><i class="fas fa-barcode mr-1"></i> ${product.modelNumber}</span>` : ''}
                    </div>

                    <!-- SEO Keyword Tags -->
                    ${product.keywords && product.keywords.length > 0 ? `
                    <div class="flex flex-wrap gap-2 mb-6">
                        ${product.keywords.slice(0, 6).map(kw => `
                            <a href="/?search=${encodeURIComponent(kw)}" 
                               style="font-size:0.75rem;font-weight:600;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;padding:4px 10px;border-radius:20px;text-decoration:none;transition:all 0.2s;"
                               onmouseover="this.style.background='#2563eb';this.style.color='white'"
                               onmouseout="this.style.background='#eff6ff';this.style.color='#2563eb'">
                                ${kw}
                            </a>`).join('')}
                    </div>` : ''}

                    <!-- Quantity + Buttons -->
                    <div class="mt-auto flex flex-wrap items-end gap-4">
                        <div class="flex flex-col gap-2">
                            <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Quantity</span>
                            <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden h-12 bg-white">
                                <button onclick="if(window.changeQty) changeQty(-1)" class="w-10 h-full hover:bg-gray-50 transition-colors font-bold text-gray-500">-</button>
                                <span id="qty-readout" class="w-12 text-center font-bold text-gray-900 border-x border-gray-100 flex items-center justify-center">1</span>
                                <button onclick="if(window.changeQty) changeQty(1)" class="w-10 h-full hover:bg-gray-50 transition-colors font-bold text-gray-500">+</button>
                            </div>
                        </div>
                        <div class="flex-1 min-w-[200px] flex flex-col gap-2">
                            ${product.stock > 0 ? `
                            <button onclick="if(window.addToCart) addToCart('${product.id}', getSelectedQty())" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 active:scale-95">
                                <i class="fas fa-cart-plus"></i> Add to Cart
                            </button>
                            <button onclick="if(window.addToCart) { addToCart('${product.id}', getSelectedQty()); if(window.toggleCart) toggleCart(true); }" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-12 rounded-lg shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2 active:scale-95">
                                <i class="fab fa-whatsapp"></i> Buy via WhatsApp
                            </button>
                            ` : `
                            <button disabled class="w-full bg-gray-200 text-gray-500 font-bold h-12 rounded-lg cursor-not-allowed flex items-center justify-center gap-2">
                                <i class="fas fa-ban"></i> Out of Stock
                            </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Specs + Description -->
        <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
                    <i class="fas fa-list-ul text-blue-500"></i> Specifications
                </h2>
                <table class="w-full text-left">
                    <tbody>${specsHtml}</tbody>
                </table>
            </div>
            <div class="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
                    <i class="fas fa-star text-blue-500"></i> Product Description
                </h2>
                <div class="text-gray-600 leading-relaxed" style="line-height:1.8;">
                    ${renderDesc(product.longDescription || product.description || '')}
                </div>
            </div>
        </div>

        <!-- Similar Products (injected by JS at runtime) -->
        <div class="mt-8 mb-24" id="similar-products-section">
            <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
                <i class="fas fa-th-large text-blue-500"></i> Similar Products
            </h2>
            <div id="similar-products-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white rounded-xl border border-gray-100 h-48 animate-pulse"></div>
                <div class="bg-white rounded-xl border border-gray-100 h-48 animate-pulse"></div>
                <div class="bg-white rounded-xl border border-gray-100 h-48 animate-pulse"></div>
                <div class="bg-white rounded-xl border border-gray-100 h-48 animate-pulse"></div>
            </div>
        </div>
    </div>
</div>

<!-- Mobile Sticky Bottom Bar -->
<div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden flex gap-4 z-[2000] shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
    ${product.stock > 0 ? `
    <button onclick="if(window.addToCart) addToCart('${product.id}', getSelectedQty())" class="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 min-h-[48px]">
        <i class="fas fa-cart-plus"></i> Cart
    </button>
    <button onclick="if(window.addToCart) { addToCart('${product.id}', getSelectedQty()); if(window.toggleCart) toggleCart(true); }" class="flex-1 bg-green-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 min-h-[48px]">
        <i class="fab fa-whatsapp"></i> Buy
    </button>
    ` : `
    <button disabled class="flex-1 bg-gray-100 text-gray-400 font-bold py-3 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
        <i class="fas fa-ban"></i> Out of Stock
    </button>
    `}
</div>

<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
<script type="application/ld+json">${JSON.stringify(productJsonLd)}</script>
<script>
// Pre-load product data so cart works instantly without waiting for Firebase
window._currentModalProduct = {
    id: '${product.id}',
    title: ${JSON.stringify(product.title)},
    price: ${parseInt(product.price) || 0},
    stock: ${parseInt(product.stock) || 99},
    image: ${JSON.stringify(product.image || '')},
    mainCategory: ${JSON.stringify(product.mainCategory || '')},
    subCategory: ${JSON.stringify(product.subCategory || '')}
};
// Also push into products array once script.js loads
document.addEventListener('DOMContentLoaded', function() {
    if (typeof products !== 'undefined' && !products.find(function(p){ return p.id == window._currentModalProduct.id; })) {
        products.push(window._currentModalProduct);
    }
});

function getSelectedQty() {
    var el = document.getElementById('qty-readout');
    return el ? parseInt(el.textContent) || 1 : 1;
}

// ── Image Switch & Zoom ──────────────────────────────
function switchProductImage(thumb, src) {
    // Update main image
    var main = document.getElementById('main-product-img');
    if (main) main.src = src;
    // Update active thumbnail border
    var thumbs = thumb.parentElement.querySelectorAll('img');
    thumbs.forEach(function(t) {
        t.classList.remove('border-blue-500');
        t.classList.add('border-gray-100');
    });
    thumb.classList.remove('border-gray-100');
    thumb.classList.add('border-blue-500');
}

function openZoom(src) {
    var overlay = document.getElementById('zoom-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'zoom-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
        overlay.innerHTML = '<img id="zoom-img" style="max-width:92vw;max-height:92vh;object-fit:contain;border-radius:8px;box-shadow:0 25px 60px rgba(0,0,0,0.5);transition:transform 0.2s;" src=""><button onclick="closeZoom()" style="position:absolute;top:16px;right:20px;background:rgba(255,255,255,0.15);border:none;color:white;font-size:1.8rem;cursor:pointer;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">✕</button><div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.6);font-size:0.8rem;">Scroll to zoom • Click to close</div>';
        overlay.addEventListener('click', function(e) { if (e.target === overlay) closeZoom(); });
        document.body.appendChild(overlay);
        // Scroll to zoom
        overlay.addEventListener('wheel', function(e) {
            e.preventDefault();
            var img = document.getElementById('zoom-img');
            var scale = parseFloat(img.dataset.scale || 1);
            scale = Math.min(4, Math.max(1, scale + (e.deltaY < 0 ? 0.2 : -0.2)));
            img.dataset.scale = scale;
            img.style.transform = 'scale(' + scale + ')';
        });
    }
    document.getElementById('zoom-img').src = src;
    document.getElementById('zoom-img').dataset.scale = 1;
    document.getElementById('zoom-img').style.transform = 'scale(1)';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeZoom() {
    var overlay = document.getElementById('zoom-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}
// ── End Image Switch & Zoom ──────────────────────────
</script>
`;

    // Inject the SEO block after the navbar - use </nav> as the injection point
    const navEndRegex = /<\/nav>\s*<div class="sticky-search-mobile">[\s\S]*?<\/div>\s*<\/div>/;
    const navSimpleRegex = /<\/nav>/;
    if (page.match(navEndRegex)) {
        page = page.replace(navEndRegex, `</nav>\n${seoBlock}`);
    } else if (page.match(navSimpleRegex)) {
        page = page.replace(navSimpleRegex, `</nav>\n${seoBlock}`);
    } else {
        page = page.replace(/(<body[^>]*>)/, `$1\n${seoBlock}`);
    }
    return page;
}

function injectCategoryContent(page, cat, subCat, products, catUrl) {
    const categoryName = subCat ? `${subCat} - ${cat}` : cat;
    const categoryProducts = products.filter(p =>
        p.mainCategory === cat && (!subCat || p.subCategory === subCat)
    );

    const productListHtml = categoryProducts.slice(0, 20).map(p => {
        const slug = createSEOSlug(p.title);
        const mainCatSlug = createSEOSlug(p.mainCategory || 'General');
        const subCatSlug = p.subCategory ? createSEOSlug(p.subCategory) : '';
        const pUrlStr = subCatSlug ? `/${mainCatSlug}/${subCatSlug}/${slug}/` : `/${mainCatSlug}/${slug}/`;
        const cleanTitle = (p.title || '').replace(/</g, '&lt;');
        const price = parseInt(p.price) || 0;
        return `
        <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:white;">
            ${p.image ? `<a href="${pUrlStr}"><img src="${p.image}" alt="${cleanTitle} - Buy in Sri Lanka" style="width:100%;height:180px;object-fit:contain;background:#f8fafc;" loading="lazy"></a>` : ''}
            <div style="padding:0.75rem;">
                <a href="${pUrlStr}" style="font-weight:600;color:#0f172a;text-decoration:none;font-size:0.95rem;display:block;margin-bottom:0.25rem;">${cleanTitle}</a>
                <div style="color:#3b82f6;font-weight:700;">LKR ${price.toLocaleString()}</div>
                ${p.stock > 0 ? '<span style="font-size:0.75rem;color:#16a34a;font-weight:600;">✓ In Stock</span>' : '<span style="font-size:0.75rem;color:#dc2626;font-weight:600;">Out of Stock</span>'}
            </div>
        </div>`;
    }).join('');

    const seoBlock = `
<!-- ===== SSR-INJECTED CATEGORY CONTENT FOR SEO ===== -->
<div id="seo-category-content" style="max-width:1100px;margin:2rem auto;padding:1rem 1.5rem;font-family:'Outfit',sans-serif;">
    <nav style="font-size:0.85rem;color:#64748b;margin-bottom:1rem;">
        <a href="/" style="color:#3b82f6;text-decoration:none;">Home</a> &rsaquo;
        ${subCat ? `<a href="/${createSEOSlug(cat)}/" style="color:#3b82f6;text-decoration:none;">${cat}</a> &rsaquo; ${subCat}` : cat}
    </nav>
    <h1 style="font-size:1.8rem;font-weight:800;color:#0f172a;margin-bottom:0.5rem;">${categoryName}</h1>
    <p style="color:#64748b;margin-bottom:1.5rem;">Browse our collection of ${categoryName} components available in Sri Lanka with fast island-wide delivery.</p>
    ${categoryProducts.length > 0
        ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1.5rem;margin-bottom:2rem;">${productListHtml}</div>`
        : '<p style="color:#94a3b8;">Products loading...</p>'
    }
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0;">
    <p style="color:#64748b;font-size:0.85rem;">📦 Fast island-wide delivery | 📞 <a href="tel:+94789155130" style="color:#3b82f6;">+94 78 915 5130</a> | 🏪 Weliweriya, Gampaha</p>
</div>
<!-- ===== END SSR CATEGORY CONTENT ===== -->
`;
    // Inject category SEO block after nav
    const navEndRegex2 = /<\/nav>\s*<div class="sticky-search-mobile">[\s\S]*?<\/div>\s*<\/div>/;
    const navSimpleRegex2 = /<\/nav>/;
    if (page.match(navEndRegex2)) {
        page = page.replace(navEndRegex2, `</nav>\n${seoBlock}`);
    } else if (page.match(navSimpleRegex2)) {
        page = page.replace(navSimpleRegex2, `</nav>\n${seoBlock}`);
    } else {
        page = page.replace(/(<body[^>]*>)/, `$1\n${seoBlock}`);
    }
    return page;
}

// Fix all relative links in footer/nav to absolute paths
function fixLinks(page) {
    // Fix CSS and JS assets
    page = page.replace(/href="styles\.css"/g, 'href="/styles.css"');
    page = page.replace(/src="script\.js"/g, 'src="/script.js"');
    page = page.replace(/href="\/favicon\.png"/g, 'href="/favicon.png"');
    page = page.replace(/src="logo\.png"/g, 'src="/logo.png"');
    
    // Fix ALL relative anchor links to absolute paths
    const staticPages = ['delivery.html', 'faq.html', 'payment.html', 'privacy.html', 'return.html', 'terms.html', 'index.html'];
    staticPages.forEach(sp => {
        const regex = new RegExp(`href="${sp}"`, 'g');
        page = page.replace(regex, `href="/${sp}"`);
    });
    
    // Fix href="privacy.html" inside subdirectories (the broken link bug)
    // These are already caught above but double-ensure absolute
    page = page.replace(/href="(delivery|faq|payment|privacy|return|terms|index)\.html"/g, 'href="/$1.html"');
    
    return page;
}

function generateSitemap(productList, categoryUrls) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    // Homepage
    xml += `  <url>\n    <loc>${SITE_URL}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <priority>1.0</priority>\n  </url>\n`;

    // Static Pages
    const staticPages = ['delivery.html', 'faq.html', 'payment.html', 'privacy.html', 'return.html', 'terms.html'];
    staticPages.forEach(page => {
        xml += `  <url>\n    <loc>${SITE_URL}${page}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <priority>0.5</priority>\n  </url>\n`;
    });

    // Categories
    categoryUrls.forEach(url => {
        xml += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    // Products
    productList.forEach(prod => {
        if (prod.id && prod.title) {
            const slug = createSEOSlug(prod.title);
            const mainCatSlug = createSEOSlug(prod.mainCategory || 'General');
            const subCatSlug = prod.subCategory ? createSEOSlug(prod.subCategory) : '';
            const pUrlStr = subCatSlug ? `${SITE_URL}${mainCatSlug}/${subCatSlug}/${slug}/` : `${SITE_URL}${mainCatSlug}/${slug}/`;
            xml += `  <url>\n    <loc>${pUrlStr}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <priority>0.9</priority>\n  </url>\n`;
        }
    });

    xml += `</urlset>`;
    fs.writeFileSync('sitemap.xml', xml);
    console.log(`✅ sitemap.xml saved with ${productList.length} products + ${categoryUrls.length} category URLs!`);
}

function generateRobots() {
    const content = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}sitemap.xml
`;
    fs.writeFileSync('robots.txt', content);
    console.log('✅ robots.txt saved!');
}

async function run() {
    try {
        const products = await fetchProducts();
        generateRobots();

        const baseHtml = fs.readFileSync('index.html', 'utf8');
        const generatedBaseHtml = baseHtml.replace(/<!-- HOMEPAGE_CONTENT_START -->[\s\S]*?<!-- HOMEPAGE_CONTENT_END -->/, '');
        const urls = [];

        // Clean up old directories
        if (fs.existsSync('products')) fs.rmSync('products', { recursive: true, force: true });
        if (fs.existsSync('category')) fs.rmSync('category', { recursive: true, force: true });

        // 1. Generate Product Pages
        console.log("📁 Generating Product Pages with real content...");
        
        products.forEach(p => {
            if (!p.id || !p.title) return;
            const slug = createSEOSlug(p.title);
            const mainCatSlug = createSEOSlug(p.mainCategory || 'General');
            const subCatSlug = p.subCategory ? createSEOSlug(p.subCategory) : '';
            
            const pUrl = subCatSlug ? `${SITE_URL}${mainCatSlug}/${subCatSlug}/${slug}/` : `${SITE_URL}${mainCatSlug}/${slug}/`;
            const pDir = subCatSlug ? path.join(mainCatSlug, subCatSlug, slug) : path.join(mainCatSlug, slug);
            
            fs.mkdirSync(pDir, { recursive: true });

            const cleanTitle = (p.title || '').replace(/"/g, '&quot;');
            const rawDesc = p.description || "";
            const shortDesc = rawDesc.substring(0, 130).replace(/"/g, '&quot;');
            const seoDesc = `Buy ${cleanTitle} in Sri Lanka at Pubudu Electronics. ${shortDesc}`.substring(0, 160);
            
            let page = generatedBaseHtml;

            // Meta SEO
            page = page.replace(/<title>.*?<\/title>/s, `<title>${cleanTitle} | Pubudu Electronics</title>`);
            page = page.replace(/<meta name="description" content=".*?"/s, `<meta name="description" content="${seoDesc}"`);
            page = page.replace(/<link rel="canonical" href=".*?"/s, `<link rel="canonical" href="${pUrl}"`);
            
            // Keywords meta - product specific
            const productKeywords = [cleanTitle, p.mainCategory, p.subCategory, p.brand, p.modelNumber, 'Sri Lanka', 'buy Sri Lanka', 'Pubudu Electronics', 'electronic components Sri Lanka'].filter(Boolean).join(', ');
            page = page.replace(/<meta name="keywords" content=".*?"/s, `<meta name="keywords" content="${productKeywords}"`);
            
            // OG Tags
            page = page.replace(/property="og:url" content=".*?"/g, `property="og:url" content="${pUrl}"`);
            page = page.replace(/property="og:title" id="og-title" content=".*?"/g, `property="og:title" id="og-title" content="${cleanTitle} | Pubudu Electronics"`);
            page = page.replace(/property="og:description" id="og-desc" content=".*?"/g, `property="og:description" id="og-desc" content="${seoDesc}"`);
            page = page.replace(/property="og:image" id="og-image" content=".*?"/g, `property="og:image" id="og-image" content="${p.image}"`);
            
            // Twitter Tags
            page = page.replace(/name="twitter:url" content=".*?"/g, `name="twitter:url" content="${pUrl}"`);
            page = page.replace(/name="twitter:title" id="tw-title" content=".*?"/g, `name="twitter:title" id="tw-title" content="${cleanTitle} | Pubudu Electronics"`);
            page = page.replace(/name="twitter:description" id="tw-desc" content=".*?"/g, `name="twitter:description" id="tw-desc" content="${seoDesc}"`);
            page = page.replace(/name="twitter:image" id="tw-image" content=".*?"/g, `name="twitter:image" id="tw-image" content="${p.image}"`);

            // Fix Firebase defer issue - SDKs must load before script.js
            page = page.replace(/<script defer src="https:\/\/www\.gstatic\.com\/firebasejs/g, '<script src="https://www.gstatic.com/firebasejs');
            // Fix script.js defer - must be synchronous on product pages so buttons work immediately
            page = page.replace('<script defer src="/script.js">', '<script src="/script.js">');

            // Fix asset & footer links
            page = fixLinks(page);
            
            // Mark page for JS to auto-open product
            page = page.replace('<body', `<body class="standalone-product-page" data-product-id="${p.id}"`);

            // === INJECT REAL PRODUCT CONTENT (the key fix!) ===
            page = injectProductContent(page, p, pUrl);

            fs.writeFileSync(path.join(pDir, 'index.html'), page);
        });
        console.log(`✅ ${products.length} product pages generated with real content!`);

        // 2. Generate Category Pages
        console.log("📁 Generating Category Pages with real content...");
        const categoryMap = {};
        products.forEach(p => {
            if (!categoryMap[p.mainCategory]) categoryMap[p.mainCategory] = new Set();
            if (p.subCategory) categoryMap[p.mainCategory].add(p.subCategory);
        });

        Object.keys(categoryMap).forEach(cat => {
            const catSlug = createSEOSlug(cat);
            const catUrl = `${SITE_URL}${catSlug}/`;
            const catDir = catSlug;
            fs.mkdirSync(catDir, { recursive: true });
            urls.push(catUrl);

            let catPage = generatedBaseHtml;
            const catSeoTitle = `${cat} | Electronic Components Sri Lanka | Pubudu Electronics`;
            const catSeoDesc = `Shop original ${cat} in Sri Lanka at Pubudu Electronics. Best prices on premium electronic components. Island-wide delivery.`;
            catPage = catPage.replace(/<title>.*?<\/title>/s, `<title>${catSeoTitle}</title>`);
            catPage = catPage.replace(/<meta name="description" content=".*?"/s, `<meta name="description" content="${catSeoDesc}"`);
            catPage = catPage.replace(/<link rel="canonical" href=".*?"/s, `<link rel="canonical" href="${catUrl}"`);
            catPage = fixLinks(catPage);
            catPage = catPage.replace('<body', `<body data-category="${cat}"`);

            // === INJECT REAL CATEGORY CONTENT ===
            catPage = injectCategoryContent(catPage, cat, null, products, catUrl);

            fs.writeFileSync(path.join(catDir, 'index.html'), catPage);

            categoryMap[cat].forEach(sub => {
                const subSlug = createSEOSlug(sub);
                const subUrl = `${catUrl}${subSlug}/`;
                const subDir = path.join(catDir, subSlug);
                fs.mkdirSync(subDir, { recursive: true });
                urls.push(subUrl);

                let subPage = generatedBaseHtml;
                const subSeoTitle = `${sub} - ${cat} | Pubudu Electronics Sri Lanka`;
                const subSeoDesc = `Buy ${sub} (${cat}) in Sri Lanka. Premium quality electronic components with fast delivery. Trusted by engineers.`;
                subPage = subPage.replace(/<title>.*?<\/title>/s, `<title>${subSeoTitle}</title>`);
                subPage = subPage.replace(/<meta name="description" content=".*?"/s, `<meta name="description" content="${subSeoDesc}"`);
                subPage = subPage.replace(/<link rel="canonical" href=".*?"/s, `<link rel="canonical" href="${subUrl}"`);
                subPage = fixLinks(subPage);
                subPage = subPage.replace('<body', `<body data-category="${cat}" data-subcategory="${sub}"`);

                // === INJECT REAL SUBCATEGORY CONTENT ===
                subPage = injectCategoryContent(subPage, cat, sub, products, subUrl);

                fs.writeFileSync(path.join(subDir, 'index.html'), subPage);
            });
        });

        // Update index.html with static category links
        const staticLinksHtml = Object.keys(categoryMap).map(cat => `<a href="/${createSEOSlug(cat)}/">${cat}</a>`).join('\n');
        let newIndexHtml = baseHtml.replace(/<div id="seo-category-links"[^>]*>[\s\S]*?<\/div>/, `<div id="seo-category-links" style="display:none;">\n${staticLinksHtml}\n</div>`);
        fs.writeFileSync('index.html', newIndexHtml);

        generateSitemap(products, urls);
        console.log("✨ All tasks completed successfully!");
        console.log(`📊 Summary: ${products.length} product pages + ${urls.length} category pages generated`);
    } catch (e) {
        console.error("🚨 Critical failure:", e.message);
        process.exit(1);
    }
}

run();
