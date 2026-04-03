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

function getSlug(title, id) {
    if (!title) return id || "";
    let slug = title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '-');
    if (slug.length > 50) slug = slug.substring(0, 50).replace(/-$/, '');
    return id ? `${slug}-${id}` : slug;
}

async function fetchProducts() {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/shop/inventory?key=${API_KEY}`;
    console.log("📡 Fetching inventory from Firebase...");
    
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 15000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.error("❌ Firebase Error:", data);
                    resolve([]);
                    return;
                }
                try {
                    const json = JSON.parse(data);
                    if (json.fields && json.fields.products && json.fields.products.arrayValue) {
                        const rawProducts = json.fields.products.arrayValue.values || [];
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
                        });
                        console.log(`✅ Extracted ${products.length} products.`);
                        resolve(products);
                    } else {
                        resolve([]);
                    }
                } catch (e) {
                    console.error("❌ JSON Parse Error:", e.message);
                    resolve([]);
                }
            });
        });
        req.on('error', (err) => reject(err));
    });
}

// ===== KEY FIX: Inject real SEO content into the HTML body =====
function injectProductContent(page, product, pageUrl) {
    const cleanTitle = (product.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rawDesc = product.description || '';
    const shortDesc = rawDesc.substring(0, 130).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const seoDesc = `Buy ${cleanTitle} in Sri Lanka at Pubudu Electronics. ${shortDesc}`.substring(0, 160);
    const price = parseInt(product.price) || 0;
    const stockText = product.stock > 0 ? 'In Stock' : 'Out of Stock';
    const stockColor = product.stock > 0 ? '#16a34a' : '#dc2626';
    const allImages = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
    const mainImage = allImages[0] || '';

    // Build features HTML
    const featuresHtml = (product.features && product.features.length > 0)
        ? product.features.map(f => `<li>✓ ${f.replace(/</g, '&lt;')}</li>`).join('')
        : '<li>✓ Quality Tested Component</li><li>✓ Fast Island-wide Delivery</li>';

    // Build specs HTML
    const specsHtml = Object.keys(product.specs || {}).length > 0
        ? Object.entries(product.specs).map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${v}</td></tr>`).join('')
        : `
            ${product.modelNumber ? `<tr><td><strong>Model</strong></td><td>${product.modelNumber}</td></tr>` : ''}
            ${product.brand ? `<tr><td><strong>Brand</strong></td><td>${product.brand}</td></tr>` : ''}
            ${product.condition ? `<tr><td><strong>Condition</strong></td><td>${product.condition}</td></tr>` : ''}
            <tr><td><strong>Category</strong></td><td>${product.subCategory || product.mainCategory}</td></tr>
        `;

    // Build keywords/tags HTML
    const tagsHtml = (product.keywords && product.keywords.length > 0)
        ? product.keywords.slice(0, 8).map(k => `<span style="display:inline-block;background:#f1f5f9;padding:3px 10px;margin:3px;border-radius:20px;font-size:0.8rem;color:#475569;">${k}</span>`).join('')
        : '';

    // Build image thumbnails
    const thumbsHtml = allImages.slice(0, 5).map((img, i) =>
        `<img src="${img}" alt="${cleanTitle} image ${i + 1}" style="width:70px;height:70px;object-fit:contain;border:2px solid ${i === 0 ? '#3b82f6' : '#e2e8f0'};border-radius:8px;cursor:pointer;background:#f8fafc;" loading="lazy">`
    ).join('');

    // JSON-LD structured data
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.title,
        "image": allImages.length > 0 ? allImages : [mainImage],
        "description": rawDesc || seoDesc,
        "sku": product.modelNumber || `PE-${product.id}`,
        "brand": { "@type": "Brand", "name": product.brand || "Pubudu Electronics" },
        "offers": {
            "@type": "Offer",
            "url": pageUrl,
            "priceCurrency": "LKR",
            "price": price,
            "priceValidUntil": "2026-12-31",
            "itemCondition": (product.condition === 'Used' || product.condition === 'for parts') ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
            "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": { "@type": "Organization", "name": "Pubudu Electronics" }
        }
    };

    // The SEO content block injected BEFORE the JS loads - Google reads this!
    const seoBlock = `
<!-- ===== SSR-INJECTED PRODUCT CONTENT FOR SEO ===== -->
<div id="seo-product-content" style="max-width:1000px;margin:2rem auto;padding:1rem 1.5rem;font-family:'Outfit',sans-serif;">
    <nav style="font-size:0.85rem;color:#64748b;margin-bottom:1rem;">
        <a href="/" style="color:#3b82f6;text-decoration:none;">Home</a> &rsaquo;
        <a href="/category/${getSlug(product.mainCategory, '')}/" style="color:#3b82f6;text-decoration:none;">${product.mainCategory}</a>
        ${product.subCategory ? `&rsaquo; <a href="/category/${getSlug(product.mainCategory, '')}/${getSlug(product.subCategory, '')}/" style="color:#3b82f6;text-decoration:none;">${product.subCategory}</a>` : ''}
        &rsaquo; ${cleanTitle}
    </nav>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:start;">
        <div>
            ${mainImage ? `<img src="${mainImage}" alt="${cleanTitle}" style="width:100%;max-height:400px;object-fit:contain;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;" loading="eager">` : ''}
            ${thumbsHtml ? `<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">${thumbsHtml}</div>` : ''}
        </div>
        <div>
            <p style="color:#64748b;font-size:0.9rem;margin:0 0 0.5rem;">${product.mainCategory}${product.subCategory ? ' › ' + product.subCategory : ''}</p>
            <h1 style="font-size:1.6rem;font-weight:700;color:#0f172a;margin:0 0 0.75rem;line-height:1.3;">${cleanTitle}</h1>
            <div style="font-size:1.8rem;font-weight:800;color:#3b82f6;margin-bottom:0.75rem;">LKR ${price.toLocaleString()}</div>
            ${product.modelNumber ? `<p style="font-size:0.9rem;color:#64748b;margin-bottom:0.5rem;">Model: <strong>${product.modelNumber}</strong></p>` : ''}
            <span style="display:inline-block;background:${stockColor};color:white;padding:4px 12px;border-radius:20px;font-size:0.8rem;font-weight:600;margin-bottom:1rem;">${stockText}</span>
            ${product.condition ? `<span style="display:inline-block;background:#f1f5f9;color:#475569;padding:4px 12px;border-radius:20px;font-size:0.8rem;font-weight:600;margin-bottom:1rem;margin-left:8px;">${product.condition}</span>` : ''}
            <p style="color:#334155;line-height:1.7;margin-bottom:1.5rem;">${rawDesc.replace(/</g, '&lt;').replace(/>/g, '&gt;') || seoDesc}</p>
            ${tagsHtml ? `<div style="margin-bottom:1rem;">${tagsHtml}</div>` : ''}
            <a href="https://wa.me/94789155130?text=Hi! I want to buy: ${encodeURIComponent(product.title)} (LKR ${price}). Is it available?" style="display:inline-flex;align-items:center;gap:8px;background:#25d366;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:1rem;" target="_blank">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                Order via WhatsApp
            </a>
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:2rem;">
        <div>
            <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:0.75rem;color:#0f172a;">Features</h2>
            <ul style="list-style:none;padding:0;margin:0;color:#334155;line-height:2;">${featuresHtml}</ul>
        </div>
        <div>
            <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:0.75rem;color:#0f172a;">Specifications</h2>
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                <tbody>${specsHtml}</tbody>
            </table>
        </div>
    </div>
    <hr style="margin:2rem 0;border:none;border-top:1px solid #e2e8f0;">
    <p style="color:#64748b;font-size:0.85rem;">📦 Fast island-wide delivery available. 📞 Call/WhatsApp: <a href="tel:+94789155130" style="color:#3b82f6;">+94 78 915 5130</a></p>
</div>
<!-- ===== END SSR PRODUCT CONTENT ===== -->
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
`;

    // Inject the SEO block right after <body ...>
    page = page.replace(/(<body[^>]*>)/, `$1\n${seoBlock}`);
    return page;
}

function injectCategoryContent(page, cat, subCat, products, catUrl) {
    const categoryName = subCat ? `${subCat} - ${cat}` : cat;
    const categoryProducts = products.filter(p =>
        p.mainCategory === cat && (!subCat || p.subCategory === subCat)
    );

    const productListHtml = categoryProducts.slice(0, 20).map(p => {
        const slug = getSlug(p.title, p.id);
        const cleanTitle = (p.title || '').replace(/</g, '&lt;');
        const price = parseInt(p.price) || 0;
        return `
        <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:white;">
            ${p.image ? `<a href="/products/${slug}/?product=${p.id}"><img src="${p.image}" alt="${cleanTitle}" style="width:100%;height:180px;object-fit:contain;background:#f8fafc;" loading="lazy"></a>` : ''}
            <div style="padding:0.75rem;">
                <a href="/products/${slug}/?product=${p.id}" style="font-weight:600;color:#0f172a;text-decoration:none;font-size:0.95rem;display:block;margin-bottom:0.25rem;">${cleanTitle}</a>
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
        ${subCat ? `<a href="/category/${getSlug(cat, '')}/" style="color:#3b82f6;text-decoration:none;">${cat}</a> &rsaquo; ${subCat}` : cat}
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
    page = page.replace(/(<body[^>]*>)/, `$1\n${seoBlock}`);
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
            const slug = getSlug(prod.title, prod.id);
            xml += `  <url>\n    <loc>${SITE_URL}products/${slug}/</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <priority>0.9</priority>\n  </url>\n`;
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
Crawl-delay: 1
`;
    fs.writeFileSync('robots.txt', content);
    console.log('✅ robots.txt saved! (Crawl-delay reduced to 1)');
}

async function run() {
    try {
        const products = await fetchProducts();
        generateRobots();

        const baseHtml = fs.readFileSync('index.html', 'utf8');
        const urls = [];

        // Clean up old directories
        if (fs.existsSync('products')) fs.rmSync('products', { recursive: true, force: true });
        if (fs.existsSync('category')) fs.rmSync('category', { recursive: true, force: true });

        // 1. Generate Product Pages
        console.log("📁 Generating Product Pages with real content...");
        fs.mkdirSync('products', { recursive: true });
        
        products.forEach(p => {
            if (!p.id || !p.title) return;
            const slug = getSlug(p.title, p.id);
            const pUrl = `${SITE_URL}products/${slug}/`;
            const pDir = path.join('products', slug);
            fs.mkdirSync(pDir, { recursive: true });

            const cleanTitle = (p.title || '').replace(/"/g, '&quot;');
            const rawDesc = p.description || "";
            const shortDesc = rawDesc.substring(0, 130).replace(/"/g, '&quot;');
            const seoDesc = `Buy ${cleanTitle} in Sri Lanka at Pubudu Electronics. ${shortDesc}`.substring(0, 160);
            
            let page = baseHtml;

            // Meta SEO
            page = page.replace(/<title>.*?<\/title>/s, `<title>${cleanTitle} | Pubudu Electronics</title>`);
            page = page.replace(/<meta name="description" content=".*?"/s, `<meta name="description" content="${seoDesc}"`);
            page = page.replace(/<link rel="canonical" href=".*?"/s, `<link rel="canonical" href="${pUrl}"`);
            
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

        fs.mkdirSync('category', { recursive: true });

        Object.keys(categoryMap).forEach(cat => {
            const catSlug = getSlug(cat, "");
            const catUrl = `${SITE_URL}category/${catSlug}/`;
            const catDir = path.join('category', catSlug);
            fs.mkdirSync(catDir, { recursive: true });
            urls.push(catUrl);

            let catPage = baseHtml;
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
                const subSlug = getSlug(sub, "");
                const subUrl = `${catUrl}${subSlug}/`;
                const subDir = path.join(catDir, subSlug);
                fs.mkdirSync(subDir, { recursive: true });
                urls.push(subUrl);

                let subPage = baseHtml;
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

        generateSitemap(products, urls);
        console.log("✨ All tasks completed successfully!");
        console.log(`📊 Summary: ${products.length} product pages + ${urls.length} category pages generated`);
    } catch (e) {
        console.error("🚨 Critical failure:", e.message);
        process.exit(1);
    }
}

run();
