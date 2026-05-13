
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

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('parts-request-form');
    const successModal = document.getElementById('success-modal');

    // --- Form Submission Logic ---
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            
            // Set loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

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
