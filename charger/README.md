# Pubudu Electronics - Website

This is your new website for selling electronic components. It is designed to be fast, simple, and easy to update.

## 🚀 How to Launch
1. **Double-click** the `index.html` file in this folder.
2. It will open in your web browser. That's it!

## 🛒 Adding New Products
To add or change products, you just need to edit one file:
1. Open `script.js` in a text editor (Notepad, VS Code, etc.).
2. Look for the `const products = [...]` section at the top.
3. Add a new item inside the brackets like this:
   ```javascript
   {
       id: 7, // unique number
       title: "New Item Name",
       category: "sensors", // category like: sensors, microcontrollers, modules
       price: 1500,
       image: "link-to-your-image.jpg", // or use a local file path like "images/my-item.jpg"
       description: "Description of the item...",
       videoUrl: "https://youtu.be/..." // Link to your video
   },
   ```
4. Save the file and refresh your browser.

## 📞 WhatsApp Orders
When people click "Buy Now", it will automatically open a WhatsApp chat with you.
**Important:** Update your phone number in `script.js`:
1. Open `script.js`.
2. Find: `const phoneNumber = "947XXXXXXXX";`
3. Change `947XXXXXXXX` to your actual WhatsApp number (e.g., `94712345678`).

## 🖼️ Using Your Own Images
1. Create a folder named `images` in this directory.
2. Put your product photos in there.
3. In `script.js`, change the `"image"` link to `"images/your-photo.jpg"`.

## 📹 Videos
Since this is a simple website, you cannot upload videos deeply into it without a server. The best way is to:
1. Upload your video to **YouTube** or **Google Drive**.
2. Copy the link.
3. Paste it into the `videoUrl` field in `script.js`.

Enjoy your new shop! 
