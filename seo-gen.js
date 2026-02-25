const fs = require('fs');

// Configuration
const SITE_URL = "https://ichouse.lk/";
const LAST_MOD = new Date().toISOString().split('T')[0];

// Categories from script.js (hardcoded as fallback or extracted)
const categories = [
    "Power Adapters",
    "Microcontrollers",
    "Sensors",
    "Modules"
];

// In a real scenario, you'd fetch this from Firestore
// But for this script, we can provide a way to inject data or manual entries
const products = [
    // This script should be run after fetching products or by connecting to Firebase
];

function generateSitemap(productList = []) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. Main Page
    xml += `  <url>\n    <loc>${SITE_URL}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <priority>1.0</priority>\n  </url>\n`;

    // 2. Category Pages
    categories.forEach(cat => {
        xml += `  <url>\n    <loc>${SITE_URL}?category=${encodeURIComponent(cat)}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    // 3. Product Pages
    productList.forEach(prod => {
        xml += `  <url>\n    <loc>${SITE_URL}?product=${prod.id}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <priority>0.7</priority>\n  </url>\n`;
    });

    xml += `</urlset>`;

    fs.writeFileSync('sitemap.xml', xml);
    console.log('✅ sitemap.xml generated successfully!');
}

function generateRobots() {
    const content = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}sitemap.xml

# Slow down crawl rate for heavy bots
Crawl-delay: 10
`;
    fs.writeFileSync('robots.txt', content);
    console.log('✅ robots.txt generated successfully!');
}

// Run
generateRobots();
// Note: To generate product links, you need to pass the product list
generateSitemap(); 
