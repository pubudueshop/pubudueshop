
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
            const originalBtnText = submitBtn.innerHTML;
            
            // Set loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            localStorage.setItem(LAST_REQ_KEY, now.toString());

            // Get field values
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const whatsapp = document.getElementById('whatsapp').value;
            const email = document.getElementById('email').value;
            const partNumber = document.getElementById('part-number').value;
            const category = document.getElementById('category').value;
            const quantity = document.getElementById('quantity').value;
            const district = document.getElementById('district').value;
            const message = document.getElementById('message').value;

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

            try {
                // Save to Firebase
                await db.collection("requests").add(requestData);
                console.log("Request saved to database");

                // Construct WhatsApp Message
                const waPhone = "94789155130"; // Shop Number
                const waMessage = `*NEW PART REQUEST - ichouse.lk*%0A%0A` +
                    `*Customer:* ${name}%0A` +
                    `*Phone:* ${phone}%0A` +
                    `*WhatsApp:* ${whatsapp}%0A` +
                    `*District:* ${district}%0A%0A` +
                    `*Part Details:*%0A` +
                    `• Part No: ${partNumber}%0A` +
                    `• Category: ${category}%0A` +
                    `• Quantity: ${quantity}%0A%0A` +
                    `*Message:* ${message}%0A%0A` +
                    `_Sent via ichouse.lk Request Form_`;

                const waUrl = `https://wa.me/${waPhone}?text=${waMessage}`;

                // Show success notification
                if (successModal) {
                    successModal.classList.remove('hidden');
                    setTimeout(() => {
                        window.open(waUrl, '_blank');
                    }, 1500);
                } else {
                    window.open(waUrl, '_blank');
                }
            } catch (error) {
                console.error("Error saving request:", error);
                alert("Something went wrong. Please try again or contact us via WhatsApp.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
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
