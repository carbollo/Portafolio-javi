const express = require('express');
const path = require('path');
const app = express();
require('dotenv').config(); // Load environment variables

const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

// Use the PORT environment variable provided by Railway/Vercel
const PORT = process.env.PORT || 3000;

// Connect to MongoDB with Serverless Caching Pattern
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    try {
        console.log("Connecting to MongoDB...");
        const db = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Fail fast (5s) instead of waiting 30s
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        });

        console.log("MongoDB Connected Successfully");
        cachedDb = db;
        return db;
    } catch (err) {
        console.error("MongoDB Connection Logic Error:", err);
        throw err;
    }
}

// Global connection (starts on cold boot, reused if warm)
connectToDatabase();

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

// Generate Signature for Client-Side Upload (Bypasses Vercel 4.5MB limit)
app.get('/api/sign-upload', (req, res) => {
    try {
        if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME) {
            console.error("Missing Cloudinary Env Vars");
            return res.status(500).json({ error: 'Missing Cloudinary Configuration in Enironment Variables' });
        }

        const timestamp = Math.round((new Date).getTime() / 1000);
        const signature = cloudinary.utils.api_sign_request({
            timestamp: timestamp,
            folder: 'portfolio'
        }, process.env.CLOUDINARY_API_SECRET);

        res.json({
            signature,
            timestamp,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY
        });
    } catch (error) {
        console.error("Signature generation error:", error);
        res.status(500).json({ error: 'Failed to generate signature: ' + error.message });
    }
});

// Deprecated: Server-side upload (Kept just in case, but unused by new admin)
app.post('/api/upload', upload.array('files'), async (req, res) => {
    // ... existing logic if needed, or just specific error msg
    return res.status(400).json({ error: 'Please use client-side upload' });
});

app.get('/api/projects', async (req, res) => {
    try {
        await connectToDatabase(); // Ensure connection
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
        await connectToDatabase(); // Ensure connection
        const newProject = new Project({
            ...req.body,
            id: Date.now().toString() // Keep custom ID or use _id
        });

        await newProject.save();
        res.json({ success: true, project: newProject });
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).json({ error: 'Failed to save project: ' + err.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        await connectToDatabase(); // Ensure connection
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

// Explicit 404 for API routes to prevent HTML falling through
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Export for Vercel
module.exports = app;

// Start server only if run directly (Local Dev)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

