const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Use the PORT environment variable provided by Railway, or default to 3000 for local testing
const PORT = process.env.PORT || 3000;

// Ensure images directory exists
if (!fs.existsSync('images')) {
    fs.mkdirSync('images');
}

app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json()); // Enable JSON body parsing

// Data File Path
const DATA_FILE = path.join(__dirname, 'data', 'projects.json');

// Helper to read data
function getProjects() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

// Helper to save data
function saveProjects(projects) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
}

const multer = require('multer');
const sharp = require('sharp');
// fs already imported at top by express generator or previous steps

// Ensure images directory exists on startup
if (!fs.existsSync('images')) {
    fs.mkdirSync('images');
}

// Configure Multer (Memory Storage for Sharp processing)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// API Routes
app.post('/api/upload', upload.array('files'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    try {
        const processedPaths = [];

        for (const file of req.files) {
            // Generate unique filename
            const name = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${name}_${Date.now()}.webp`; // Convert to WebP for performance
            const outputPath = path.join('images', filename);

            // Process with Sharp
            // Resize to max 2500px width (better for retina), high quality
            await sharp(file.buffer)
                .resize(2500, null, { withoutEnlargement: true })
                .webp({ quality: 95, lossless: false }) // Very high quality
                .toFile(outputPath);

            // Path relative to root for frontend
            processedPaths.push(`images/${filename}`);
        }

        res.json({ paths: processedPaths });

    } catch (err) {
        console.error("Image processing error:", err);
        res.status(500).json({ error: 'Failed to process images' });
    }
});

app.get('/api/projects', (req, res) => {
    const category = req.query.category;
    let projects = getProjects();
    if (category) {
        projects = projects.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    res.json(projects);
});

app.post('/api/projects', (req, res) => {
    const newProject = req.body;
    const projects = getProjects();

    // Simple ID generation
    newProject.id = Date.now().toString();
    projects.push(newProject);

    saveProjects(projects);
    saveProjects(projects);
    res.json({ success: true, project: newProject });
});

app.delete('/api/projects/:id', (req, res) => {
    const id = req.params.id;
    let projects = getProjects();
    const initialLength = projects.length;

    // Filter out the project with the given ID
    projects = projects.filter(p => p.id !== id);

    if (projects.length === initialLength) {
        return res.status(404).json({ error: 'Project not found' });
    }

    saveProjects(projects);
    res.json({ success: true });
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
