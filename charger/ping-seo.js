const SITE_URL = "https://ichouse.lk/";
const SITEMAP_URL = SITE_URL + "sitemap.xml";

async function pingGoogle() {
    const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    try {
        const res = await fetch(url);
        console.log(`Ping Google: ${res.status === 200 ? 'SUCCESS' : 'FAILED'}`);
    } catch (e) {
        console.error('Error pinging Google:', e.message);
    }
}

async function pingBing() {
    const url = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    try {
        const res = await fetch(url);
        console.log(`Ping Bing: ${res.status === 200 ? 'SUCCESS' : 'FAILED'}`);
    } catch (e) {
        console.error('Error pinging Bing:', e.message);
    }
}

console.log('🚀 Notifying search engines about sitemap update...');
pingGoogle();
pingBing();
