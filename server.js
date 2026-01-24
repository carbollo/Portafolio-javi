const express = require('express');
const path = require('path');
const app = express();
require('dotenv').config(); // Load environment variables

const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

// Use the PORT environment variable provided by Railway/Vercel
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Define Mongoose Schema
const ProjectSchema = new mongoose.Schema({
    id: String,
    title: String,
    category: String,
    description: String,
    thumbnail: String,
    gallery: [String],
    createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', ProjectSchema);

app.use('/images', express.static(path.join(__dirname, 'public/images'))); // Serve static images (like profile)
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json()); // Enable JSON body parsing

const multer = require('multer');
const sharp = require('sharp');

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// API Routes
app.post('/api/upload', upload.array('files'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    try {
        const processedUrls = [];

        for (const file of req.files) {
            // Upload to Cloudinary using stream
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'portfolio', resource_type: 'auto' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );

                // Use Sharp to optimize before upload (optional but good for performance)
                sharp(file.buffer)
                    .resize(2500, null, { withoutEnlargement: true })
                    .webp({ quality: 90 })
                    .toBuffer()
                    .then(buffer => {
                        uploadStream.end(buffer);
                    })
                    .catch(reject);
            });

            processedUrls.push(result.secure_url);
        }

        res.json({ paths: processedUrls });

    } catch (err) {
        console.error("Image processing error:", err);
        res.status(500).json({ error: 'Failed to process images' });
    }
});

app.get('/api/projects', async (req, res) => {
    try {
        const category = req.query.category;
        let query = {};
        if (category) {
            query.category = { $regex: new RegExp(category, 'i') }; // Case-insensitive
        }

        const projects = await Project.find(query).sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const newProject = new Project({
            ...req.body,
            id: Date.now().toString() // Keep custom ID or use _id
        });

        await newProject.save();
        res.json({ success: true, project: newProject });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save project' });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const result = await Project.findOneAndDelete({ id: id });

        if (!result) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Admin Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'admin.html'));
});

// Route for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Handle clean URLs (e.g., /restauracion -> serves restauracion.html)
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.includes('.')) return next(); // If it has an extension (like .css), skip this handler

    const filePath = path.join(__dirname, 'dist', `${page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            next(); // If file doesn't exist, go to 404 or next handler
        }
    });
});

// Export for Vercel
module.exports = app;

// Start server only if run directly (Local Dev)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

