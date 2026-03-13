
// Telegram Config
const telegramBotToken = "8414799734:AAGlkgiK8faSvFATdvj7gvHfcJxIrdfwk54";
let telegramChatId = "7780866247";

// Check Data
const orderDataRaw = localStorage.getItem('mega_bundle_order');
const userDataRaw = localStorage.getItem('mega_bundle_user');

if (!orderDataRaw || !userDataRaw) {
    alert("Session expired! Redirecting to home.");
    window.location.href = 'index.html';
}

const orderData = JSON.parse(orderDataRaw);
const userData = JSON.parse(userDataRaw);

// Display Data
document.getElementById('amount-text').innerText = `₹${orderData.totalPrice}`;
document.getElementById('user-name-display').innerText = userData.name;



// Handle File Input Change
// Handle File Input Change
const fileInput = document.getElementById('screenshot-upload');
const fileNameDisplay = document.getElementById('file-name-display');
const finishBtn = document.getElementById('finish-btn');

// Disable button initially
finishBtn.disabled = true;
finishBtn.style.opacity = "0.5";
finishBtn.style.cursor = "not-allowed";
finishBtn.title = "Please upload screenshot first";

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        fileNameDisplay.textContent = `Selected: ${fileInput.files[0].name}`;
        fileNameDisplay.style.display = 'block';

        // Enable Button
        finishBtn.disabled = false;
        finishBtn.style.opacity = "1";
        finishBtn.style.cursor = "pointer";
        finishBtn.innerText = "PAYMENT DONE ✅ (Click to Submit)";
    }
});

// Handle Form Submission
document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (fileInput.files.length === 0) {
        alert("Please upload the payment screenshot!");
        return;
    }

    const btn = document.getElementById('finish-btn');
    btn.disabled = true;
    btn.innerText = "Sending Proof...";

    const file = fileInput.files[0];

    const caption = `
✅ **PAYMENT RECEIVED** ✅

👤 **User:** ${userData.name}
📞 **Phone:** ${userData.whatsapp}
📧 **Email:** ${userData.email}
💰 **Amount:** ₹${orderData.totalPrice}

_Please verify the screenshot and fulfill the order._
    `;

    // Send to Local Bot
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('caption', caption);
    formData.append('phone', userData.whatsapp); // Crucial for ID

    try {
        await fetch('http://localhost:5000/api/payment', {
            method: 'POST',
            body: formData
        });
    } catch (e) {
        console.warn("⚠️ Local Bot offline. Falling back to direct Telegram API.");

        // Fallback: Send directly to Telegram
        const fallbackCaption = caption + "\n\n⚠️ _(Sent while Bot was Offline)_";
        await sendTelegramPhoto(file, fallbackCaption);
    }

    // Show Success
    document.getElementById('payment-box').style.display = 'none';
    document.getElementById('success-box').style.display = 'block';

    // Clear Session (Optional, but good practice)
    // localStorage.removeItem('mega_bundle_order');
    // localStorage.removeItem('mega_bundle_user');
});

async function sendTelegramPhoto(file, caption) {
    // Construct Inline Keyboard with encoded data
    // Format: app_{phone}_{bundles} to support offline approvals
    // bundles joined by '.' to save space
    const bundleString = orderData.selectedIds.join('.');
    const keyboard = {
        inline_keyboard: [
            [
                { text: "Approve", callback_data: `app_${userData.whatsapp}_${bundleString}` },
                { text: "Reject", callback_data: `rej_${userData.whatsapp}` }
            ]
        ]
    };

    const formData = new FormData();
    formData.append('chat_id', telegramChatId);
    formData.append('photo', file);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    formData.append('reply_markup', JSON.stringify(keyboard));

    const url = `https://api.telegram.org/bot${telegramBotToken}/sendPhoto`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            console.error("Telegram Error:", await response.text());
            alert("Network error sending proof. But don't worry, we saved your order!");
        }
    } catch (error) {
        console.error("Network Error:", error);
    }
}
