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

app.use(express.static(path.join(__dirname, '')));
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

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images/');
    },
    filename: (req, file, cb) => {
        // Keep original extension
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize filename
        cb(null, `${name}_${Date.now()}${ext}`);
    }
});
const upload = multer({ storage: storage });

// API Routes
app.post('/api/upload', upload.array('files'), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    // Return paths relative to server root (e.g., 'images/file.jpg')
    const filePaths = req.files.map(f => f.path.replace(/\\/g, '/'));
    res.json({ paths: filePaths });
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
    res.json({ success: true, project: newProject });
});

// Admin Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

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
