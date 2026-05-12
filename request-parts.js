/**
 * request-parts.js
 * Logic for ichouse.lk/request-parts
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('parts-request-form');
    const photoInput = document.getElementById('part-photo');
    const previewContainer = document.getElementById('photo-preview-container');
    const previewImg = document.getElementById('photo-preview');
    const removePreviewBtn = document.getElementById('remove-photo');
    const successModal = document.getElementById('success-modal');

    // --- Photo Preview Logic ---
    if (photoInput) {
        photoInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    previewContainer.classList.remove('hidden');
                }
                reader.readAsDataURL(file);
            }
        });
    }

    if (removePreviewBtn) {
        removePreviewBtn.addEventListener('click', () => {
            photoInput.value = '';
            previewContainer.classList.add('hidden');
            previewImg.src = '';
        });
    }

    // --- Form Submission Logic ---
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Validate fields
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const whatsapp = document.getElementById('whatsapp').value;
            const email = document.getElementById('email').value;
            const partNumber = document.getElementById('part-number').value;
            const category = document.getElementById('category').value;
            const quantity = document.getElementById('quantity').value;
            const district = document.getElementById('district').value;
            const message = document.getElementById('message').value;

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
                // Redirect after a short delay
                setTimeout(() => {
                    window.open(waUrl, '_blank');
                }, 1500);
            } else {
                window.open(waUrl, '_blank');
            }
        });
    }
    
    // Close Success Modal
    const closeSuccessBtn = document.getElementById('close-success');
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', () => {
            successModal.classList.add('hidden');
            form.reset();
            previewContainer.classList.add('hidden');
        });
    }

    // Sticky Header Scroll Effect (matching index.html)
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('sticky-navbar', 'shadow-md');
        } else {
            navbar.classList.remove('sticky-navbar', 'shadow-md');
        }
    });
});
