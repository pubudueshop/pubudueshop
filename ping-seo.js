const https = require('https');
const fs = require('fs');

const SITE_URL = "https://ichouse.lk/";
const KEY = "e8f4c1d6b2a048e9a5c372f1b4d6938a";

async function pingIndexNow() {
    console.log('🚀 Submitting URLs to IndexNow (Bing, Yandex, Seznam, Naver)...');
    
    let urlList = [SITE_URL, `${SITE_URL}sitemap.html`];
    
    if (fs.existsSync('sitemap.xml')) {
        const xml = fs.readFileSync('sitemap.xml', 'utf8');
        const locRegex = /<loc>(https:\/\/ichouse\.lk\/[^<]+)<\/loc>/g;
        let match;
        while ((match = locRegex.exec(xml)) !== null) {
            urlList.push(match[1]);
        }
    }
    
    // Deduplicate
    urlList = Array.from(new Set(urlList));
    const batch = urlList.slice(0, 1000);

    const payload = JSON.stringify({
        host: "ichouse.lk",
        key: KEY,
        keyLocation: `https://ichouse.lk/${KEY}.txt`,
        urlList: batch
    });

    const options = {
        hostname: 'api.indexnow.org',
        port: 443,
        path: '/indexnow',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            console.log(`📡 IndexNow Response: ${res.statusCode} ${res.statusMessage}`);
            if (res.statusCode === 200 || res.statusCode === 202) {
                console.log(`✅ Successfully submitted ${batch.length} URLs to search engine index!`);
            } else {
                console.log(`⚠️ Search engine response code: ${res.statusCode}`);
            }
            resolve();
        });
        req.on('error', (e) => {
            console.error('❌ IndexNow Error:', e.message);
            resolve();
        });
        req.write(payload);
        req.end();
    });
}

pingIndexNow();
