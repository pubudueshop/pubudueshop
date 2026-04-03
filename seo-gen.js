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
                            return {
                                id: (f.id.integerValue || f.id.stringValue),
                                title: f.title.stringValue,
                                mainCategory: (f.mainCategory ? f.mainCategory.stringValue : 'General'),
                                subCategory: (f.subCategory ? f.subCategory.stringValue : ''),
                                description: (f.description ? f.description.stringValue : (f.longDescription ? f.longDescription.stringValue : '')),
                                price: (f.price ? (f.price.integerValue || f.price.doubleValue) : 0),
                                image: (f.image ? f.image.stringValue : (f.images && f.images.arrayValue.values ? f.images.arrayValue.values[0].stringValue : ''))
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
            xml += `  <url>\n    <loc>${SITE_URL}products/${slug}/</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <priority>0.7</priority>\n  </url>\n`;
        }
    });

    xml += `</urlset>`;
    fs.writeFileSync('sitemap.xml', xml);
    console.log(`✅ sitemap.xml saved!`);
}

function generateRobots() {
    const content = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}sitemap.xml
Crawl-delay: 10
`;
    fs.writeFileSync('robots.txt', content);
    console.log('✅ robots.txt saved!');
}

async function run() {
    try {
        const products = await fetchProducts();
        generateRobots();

        const baseHtml = fs.readFileSync('index.html', 'utf8');
        const urls = [];

        // Clean up old directories (optional, but good for CI)
        if (fs.existsSync('products')) fs.rmSync('products', { recursive: true, force: true });
        if (fs.existsSync('category')) fs.rmSync('category', { recursive: true, force: true });

        // 1. Generate Product Pages
        console.log("📁 Generating Product Pages...");
        fs.mkdirSync('products', { recursive: true });
        
        products.forEach(p => {
            const slug = getSlug(p.title, p.id);
            const pUrl = `${SITE_URL}products/${slug}/`;
            const pDir = path.join('products', slug);
            fs.mkdirSync(pDir, { recursive: true });

            const cleanTitle = p.title.replace(/"/g, '&quot;');
            const rawDesc = p.description || "";
            const shortDesc = rawDesc.substring(0, 130).replace(/"/g, '&quot;');
            const seoDesc = `Buy ${cleanTitle} in Sri Lanka at Pubudu Electronics. ${shortDesc}...`.substring(0, 160);
            
            let page = baseHtml;
            // SEO Injection
            page = page.replace(/<title>.*?<\/title>/s, `<title>${cleanTitle} | Pubudu Electronics</title>`);
            page = page.replace(/<meta name="description" content=".*?"/s, `<meta name="description" content="${seoDesc}"`);
            page = page.replace(/<link rel="canonical" href=".*?"/s, `<link rel="canonical" href="${pUrl}"`);
            
            // Social Media Tags
            page = page.replace(/property="og:url" content=".*?"/g, `property="og:url" content="${pUrl}"`);
            page = page.replace(/property="og:title" id="og-title" content=".*?"/g, `property="og:title" id="og-title" content="${cleanTitle} | Pubudu Electronics"`);
            page = page.replace(/property="og:description" id="og-desc" content=".*?"/g, `property="og:description" id="og-desc" content="${seoDesc}"`);
            page = page.replace(/property="og:image" id="og-image" content=".*?"/g, `property="og:image" id="og-image" content="${p.image}"`);
            
            // Twitter
            page = page.replace(/name="twitter:url" content=".*?"/g, `name="twitter:url" content="${pUrl}"`);
            page = page.replace(/name="twitter:title" id="tw-title" content=".*?"/g, `name="twitter:title" id="tw-title" content="${cleanTitle} | Pubudu Electronics"`);
            page = page.replace(/name="twitter:description" id="tw-desc" content=".*?"/g, `name="twitter:description" id="tw-desc" content="${seoDesc}"`);
            page = page.replace(/name="twitter:image" id="tw-image" content=".*?"/g, `name="twitter:image" id="tw-image" content="${p.image}"`);

            // Asset and Link paths fix (pointing to root)
            page = page.replace(/href="styles\.css"/g, 'href="/styles.css"');
            page = page.replace(/src="script\.js"/g, 'src="/script.js"');
            page = page.replace(/href="\/favicon\.png"/g, 'href="/favicon.png"');
            page = page.replace(/src="logo\.png"/g, 'src="/logo.png"');
            
            // Fix relative navigation links in footer/nav for subdirectories
            const staticPages = ['delivery.html', 'faq.html', 'payment.html', 'privacy.html', 'return.html', 'terms.html', 'index.html'];
            staticPages.forEach(sp => {
                const regex = new RegExp(`href="${sp}"`, 'g');
                page = page.replace(regex, `href="/${sp}"`);
            });

            // Set state for script.js to pick up
            page = page.replace('<body', `<body class="standalone-product-page" data-product-id="${p.id}"`);

            fs.writeFileSync(path.join(pDir, 'index.html'), page);
        });

        // 2. Generate Category Pages
        console.log("📁 Generating Category Pages...");
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
            catPage = catPage.replace(/href="styles\.css"/g, 'href="/styles.css"');
            catPage = catPage.replace(/src="script\.js"/g, 'src="/script.js"');
            catPage = catPage.replace('<body', `<body data-category="${cat}"`);
            
            fs.writeFileSync(path.join(catDir, 'index.html'), catPage);

            categoryMap[cat].forEach(sub => {
                const subSlug = getSlug(sub, "");
                const subUrl = `${catUrl}${subSlug}/`;
                const subDir = path.join(catDir, subSlug);
                fs.mkdirSync(subDir, { recursive: true });
                urls.push(subUrl);

                let subPage = baseHtml;
                const subSeoTitle = `${sub} - ${cat} | Pubudu Electronics Sri Lanka`;
                const subSeoDesc = `Buy ${sub} (${cat}) in Sri Lanka. Premium quality electronic components with fast delivery. Trusted by engineers since 2026.`;
                subPage = subPage.replace(/<title>.*?<\/title>/s, `<title>${subSeoTitle}</title>`);
                subPage = subPage.replace(/<meta name="description" content=".*?"/s, `<meta name="description" content="${subSeoDesc}"`);
                subPage = subPage.replace(/href="styles\.css"/g, 'href="/styles.css"');
                subPage = subPage.replace(/src="script\.js"/g, 'src="/script.js"');
                subPage = subPage.replace('<body', `<body data-category="${cat}" data-subcategory="${sub}"`);
                
                fs.writeFileSync(path.join(subDir, 'index.html'), subPage);
            });
        });

        generateSitemap(products, urls);
        console.log("✨ All tasks completed successfully!");
    } catch (e) {
        console.error("🚨 Critical failure:", e.message);
        process.exit(1);
    }
}

run();
