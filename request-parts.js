
const firebaseConfig = {
    apiKey: "AIzaSyDl9N6YmDJI9bhhdkeUQPUxWKxIhZhryus",
    authDomain: "pubudueshop-cde28.firebaseapp.com",
    projectId: "pubudueshop-cde28",
    storageBucket: "pubudueshop-cde28.firebasestorage.app",
    messagingSenderId: "12742630809",
    appId: "1:12742630809:web:68eab94d5c8b4257784708"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
    // Ensure the user is authenticated anonymously so they can write to Firestore
    auth.signInAnonymously().catch(error => {
        console.error("Auth failed:", error);
    });

    const form = document.getElementById('parts-request-form');

    const successModal = document.getElementById('success-modal');

    // --- Form Submission Logic ---
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Rate Limiting Check: Prevent spam requests (30 seconds cooldown)
            const LAST_REQ_KEY = 'last_part_request_timestamp';
            const lastReqTime = localStorage.getItem(LAST_REQ_KEY);
            const now = Date.now();
            if (lastReqTime && (now - parseInt(lastReqTime, 10)) < 30000) {
                const remaining = Math.ceil((30000 - (now - parseInt(lastReqTime, 10))) / 1000);
                alert(`Please wait ${remaining} seconds before submitting another part request.`);
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Send Request via WhatsApp';

            // Set loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing...';
            }
            localStorage.setItem(LAST_REQ_KEY, now.toString());

            // Get field values
            const name = (document.getElementById('name')?.value || '').trim();
            const phone = (document.getElementById('phone')?.value || '').trim();
            const whatsapp = (document.getElementById('whatsapp')?.value || '').trim();
            const email = (document.getElementById('email')?.value || '').trim();
            const partNumber = (document.getElementById('part-number')?.value || '').trim();
            const category = (document.getElementById('category')?.value || '').trim();
            const quantity = (document.getElementById('quantity')?.value || '1').trim();
            const district = (document.getElementById('district')?.value || '').trim();
            const message = (document.getElementById('message')?.value || '').trim();

            const requestData = {
                name,
                phone,
                whatsapp,
                email,
                partNumber,
                category,
                quantity,
                district,
                message,
                status: 'Pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Construct WhatsApp Message
            const waPhone = "94789155130"; // Shop Number
            const waText = 
                `*NEW PART REQUEST - ichouse.lk*\n\n` +
                `*Customer:* ${name}\n` +
                `*Phone:* ${phone}\n` +
                (whatsapp ? `*WhatsApp:* ${whatsapp}\n` : '') +
                (email ? `*Email:* ${email}\n` : '') +
                `*District:* ${district}\n\n` +
                `*Part Details:*\n` +
                `• Part No: ${partNumber}\n` +
                `• Category: ${category}\n` +
                `• Quantity: ${quantity}\n` +
                (message ? `\n*Message:* ${message}\n\n` : '\n') +
                `_Sent via ichouse.lk Request Form_`;

            const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`;

            try {
                // Ensure auth if not ready
                if (!auth.currentUser) {
                    await auth.signInAnonymously().catch(() => {});
                }

                // Save to Firebase (with timeout fallback so user is never blocked)
                await Promise.race([
                    db.collection("requests").add(requestData),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 4000))
                ]).catch(err => {
                    console.warn("Could not save part request to database:", err);
                });
                console.log("Request processed");

                // Send Email Notification to Shop Owner in background
                sendPartRequestEmail(requestData).catch(e => console.warn("Email notify failed:", e));

                // Update WhatsApp link in success modal
                const modalWaLink = document.getElementById('modal-wa-link');
                if (modalWaLink) {
                    modalWaLink.href = waUrl;
                }

                // Show success notification & trigger WhatsApp
                if (successModal) {
                    successModal.classList.remove('hidden');
                    setTimeout(() => {
                        window.open(waUrl, '_blank');
                    }, 800);
                } else {
                    window.open(waUrl, '_blank');
                }
            } catch (error) {
                console.error("Error processing request:", error);
                // Even on error, allow user to continue to WhatsApp
                window.open(waUrl, '_blank');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        });
    }
    
    // Close Success Modal
    const closeSuccessBtn = document.getElementById('close-success');
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', () => {
            successModal.classList.add('hidden');
            form.reset();
        });
    }

    // Sticky Header Scroll Effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('sticky-navbar', 'shadow-md');
            } else {
                navbar.classList.remove('sticky-navbar', 'shadow-md');
            }
        }
    });
});

// --- Send Email Notification to Shop Owner ---
async function sendPartRequestEmail(data) {
    const WEB3_ACCESS_KEY = "b4d1e7b0-2eb0-4ca6-b5de-9e5d5c8a5c67";
    try {
        await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                access_key: WEB3_ACCESS_KEY,
                subject: `🔧 New Part Request - ${data.partNumber || data.category || 'Component'}`,
                from_name: "Pubudu Electronics Web",
                "Customer Name": data.name || "N/A",
                "Phone Number": data.phone || "N/A",
                "WhatsApp Number": data.whatsapp || "Not provided",
                "Email Address": data.email || "Not provided",
                "Part Number / Name": data.partNumber || "Not specified",
                "Category": data.category || "General",
                "Quantity Required": data.quantity || 1,
                "District": data.district || "N/A",
                "Message / Notes": data.message || "None",
                "Submission Time": new Date().toLocaleString("en-GB", { timeZone: "Asia/Colombo" })
            })
        });
    } catch (e) {
        console.warn("Failed to send part request email notification:", e);
    }
}
