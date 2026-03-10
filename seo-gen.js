const fs = require('fs');
const https = require('https');

// Configuration
const SITE_URL = "https://ichouse.lk/";
const PROJECT_ID = "pubudueshop-cde28";
const API_KEY = "AIzaSyDl9N6YmDJI9bhhdkeUQPUxWKxIhZhryus";
const LAST_MOD = new Date().toISOString().split('T')[0];

console.log("--- SEO GENERATOR CONFIG ---");
console.log(`URL: ${SITE_URL}`);
console.log(`Project: ${PROJECT_ID}`);
console.log(`Date: ${LAST_MOD}`);
console.log("----------------------------");

async function fetchProducts() {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/shop/inventory?key=${API_KEY}`;

    console.log("📡 Fetching products from Firebase...");
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 10000 }, (res) => {
            let data = '';
            console.log(`📡 Status Code: ${res.statusCode}`);

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
                            const fields = p.mapValue.fields;
                            return {
                                id: fields.id.integerValue || fields.id.stringValue,
                                mainCategory: fields.mainCategory ? fields.mainCategory.stringValue : 'General'
                            };
                        });
                        console.log(`✅ Extracted ${products.length} products.`);
                        resolve(products);
                    } else {
                        console.log("⚠️ No products found in inventory document.");
                        resolve([]);
                    }
                } catch (e) {
                    console.error("❌ JSON Parse Error:", e.message);
                    resolve([]);
                }
            });
        });

        req.on('error', (err) => {
            console.error("❌ Network Error:", err.message);
            reject(err);
        });

        req.on('timeout', () => {
            req.destroy();
            console.error("❌ Request timed out after 10s");
            reject(new Error("Timeout"));
        });
    });
}

function generateSitemap(productList = []) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    xml += `  <url>\n    <loc>${SITE_URL}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <priority>1.0</priority>\n  </url>\n`;

    const categories = [...new Set(productList.map(p => p.mainCategory))];
    categories.forEach(cat => {
        if (cat) {
            xml += `  <url>\n    <loc>${SITE_URL}?category=${encodeURIComponent(cat)}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <priority>0.8</priority>\n  </url>\n`;
        }
    });

    productList.forEach(prod => {
        if (prod.id) {
            xml += `  <url>\n    <loc>${SITE_URL}?product=${prod.id}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <priority>0.7</priority>\n  </url>\n`;
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
        generateSitemap(products);
        console.log("✨ Done!");
    } catch (e) {
        console.error("🚨 Critical failure:", e.message);
    }
}

run();
