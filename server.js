const express = require('express');
const path = require('path');
const app = express();

// Use the PORT environment variable provided by Railway, or default to 3000 for local testing
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory, but excluding the HTML files to avoid duplicate content if possible, 
// though express.static usually serves if exact match found.
// We keep express.static for CSS, JS, Images.
app.use(express.static(path.join(__dirname, '')));

// Route for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle clean URLs (e.g., /restauracion -> serves restauracion.html)
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.includes('.')) return next(); // If it has an extension (like .css), skip this handler

    const filePath = path.join(__dirname, `${page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            next(); // If file doesn't exist, go to 404 or next handler
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
