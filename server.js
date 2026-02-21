const express = require('express');
const path = require('path');
const fs = require('fs');
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
    hidden: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', ProjectSchema);

app.use(express.json()); // Enable JSON body parsing (antes de rutas que usen body)

// Favicon: evitar 404 en logs del navegador
app.get('/favicon.ico', (req, res) => { res.status(204).end(); });
app.get('/favicon.png', (req, res) => { res.status(204).end(); });

// Comprobar que la API responde (para logs)
app.get('/api', (req, res) => { res.json({ ok: true }); });

app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(express.static(path.join(__dirname, 'dist')));

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
        await connectToDatabase();
        const category = req.query.category;
        const showHidden = req.query.showHidden === '1' || req.query.showHidden === 'true';
        let query = {};
        if (category) {
            query.category = { $regex: new RegExp(category, 'i') };
        }
        if (!showHidden) {
            query.hidden = { $ne: true };
        } else {
            query.hidden = true;
        }

        const projects = await Project.find(query).sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        await connectToDatabase();
        const newProject = new Project({
            ...req.body,
            id: Date.now().toString()
        });
        await newProject.save();
        res.json({ success: true, project: newProject });
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).json({ error: 'Failed to save project: ' + err.message });
    }
});

// Ocultar = borrar de la base de datos (el proyecto deja de verse en portafolio y en admin)
// Ocultar = BORRAR de la base de datos permanentemente (Hard Delete)
async function setProjectHidden(req, res) {
    try {
        await connectToDatabase();
        const id = (req.body && req.body.id != null ? String(req.body.id).trim() : '') || (req.query && req.query.id) || '';
        // El parámetro 'hidden' ya no importa tanto si el objetivo es siempre borrar cuando se llama a esta función con hidden=true
        // Pero mantenemos la lógica por si acaso se llama para 'desocultar' (aunque si se borra, no se puede desocultar)
        const hiddenParam = req.body && req.body.hidden !== undefined ? req.body.hidden : req.query.hidden;
        const shouldDelete = hiddenParam === true || hiddenParam === 'true' || hiddenParam === '1';

        if (!id) return res.status(400).json({ success: false, error: 'Falta el id' });

        const conditions = [{ id: id }];
        if (id.length === 24 && /^[a-f0-9A-F]{24}$/.test(id)) {
            try { conditions.push({ _id: new mongoose.Types.ObjectId(id) }); } catch (_) { }
        }
        const query = conditions.length > 1 ? { $or: conditions } : { id: id };

        if (shouldDelete) {
            console.log(`Intentando borrar proyecto con query: ${JSON.stringify(query)}`);
            const deleted = await Project.findOneAndDelete(query);
            if (!deleted) {
                console.log('No se encontró el proyecto para borrar');
                return res.status(404).json({ success: false, error: 'Proyecto no encontrado para eliminar' });
            }
            console.log('Proyecto borrado correctamente');
            return res.json({ success: true, deleted: true });
        }

        // Si por alguna razón se llama con hidden=false, intentamos recuperar (aunque si se borró antes, esto fallará)
        const doc = await Project.findOne(query);
        if (!doc) return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
        doc.hidden = false;
        await doc.save();
        res.json({ success: true, hidden: false });

    } catch (err) {
        console.error('SERVER ERROR in setProjectHidden:', err);
        // Devolvemos el error real para depurar
        res.status(500).json({ success: false, error: 'DB Error: ' + err.message });
    }
}



app.post('/api/projects/hide', setProjectHidden);
app.get('/api/projects/hide', setProjectHidden);
// Ruta en español por si el front llama aquí (y GET por compatibilidad)
app.get('/api/proyectos/ocultar', setProjectHidden);
app.post('/api/proyectos/ocultar', setProjectHidden);

// Profile (photo + bio) - editable without code changes
const profilePath = path.join(__dirname, 'data', 'profile.json');
const portalOrderPath = path.join(__dirname, 'data', 'portal-order.json');

function readJsonSafe(filePath, defaultVal) {
    try {
        if (!fs.existsSync(filePath)) return defaultVal;
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return defaultVal;
    }
}

app.get('/api/profile', (req, res) => {
    try {
        const defaultProfile = {
            profileImageUrl: '/images/javier-profile.jpg',
            bio: 'Dejar atrás mis estudios y mi trabajo estable para dedicarme por completo a la fotografía fue la decisión más arriesgada y acertada de mi vida. Hoy, esa pasión se traduce en una mirada que no se conforma con lo convencional, buscando siempre la máxima expresión en la moda y los conciertos. Me muevo entre la elegancia de una editorial y la energía cruda del escenario, adaptando mi técnica a lo que cada historia necesita.\n\nMi objetivo principal es que, al trabajar juntos, sientas la tranquilidad absoluta de que cualquier reto técnico o logístico estará bajo control. Me especializo en traducir visiones complejas en imágenes potentes, asegurando que el mensaje que quieres transmitir llegue al espectador con total claridad. No solo capturo momentos; gestiono cada detalle del proceso creativo para que tú solo tengas que preocuparte de disfrutar del resultado final.\n\nSoy ese perfil híbrido que combina la disciplina con una actitud disruptiva y cercana para romper los moldes establecidos. Si buscas una estética impecable y un fotógrafo que resuelva problemas de forma creativa, estoy listo para empezar.',
            email: 'Ljavi141@gmail.com'
        };
        const profile = readJsonSafe(profilePath, defaultProfile);
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

app.put('/api/profile', (req, res) => {
    try {
        const dir = path.dirname(profilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(profilePath, JSON.stringify(req.body, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save profile' });
    }
});

// Portal/feed order - so you can reorder categories on home
app.get('/api/portal-order', (req, res) => {
    try {
        const defaultOrder = ['Moda', 'Conciertos', 'Gastronomia', 'Creativo', 'Otros'];
        const order = readJsonSafe(portalOrderPath, defaultOrder);
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load portal order' });
    }
});

app.put('/api/portal-order', (req, res) => {
    try {
        const dir = path.dirname(portalOrderPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const order = Array.isArray(req.body) ? req.body : (req.body.order || []);
        fs.writeFileSync(portalOrderPath, JSON.stringify(order, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save portal order' });
    }
});

async function doDeleteProject(id) {
    const sid = (id != null ? String(id) : '').trim();
    if (!sid) return { status: 400, body: { success: false, error: 'Falta el id del proyecto' } };
    try {
        await connectToDatabase();
    } catch (e) {
        console.error('DB connection on delete:', e);
        return { status: 500, body: { success: false, error: 'Error de conexión' } };
    }
    const conditions = [{ id: sid }];
    if (sid.length === 24 && /^[a-f0-9A-F]{24}$/.test(sid)) {
        try {
            conditions.push({ _id: new mongoose.Types.ObjectId(sid) });
        } catch (_) { }
    }
    const result = await Project.findOneAndDelete(conditions.length > 1 ? { $or: conditions } : { id: sid });
    if (!result) return { status: 404, body: { success: false, error: 'Proyecto no encontrado' } };
    return { status: 200, body: { success: true } };
}

function handleDeleteRequest(req, res) {
    let id = '';
    try {
        if (req.query && req.query.id != null) id = req.query.id;
        if (!id && req.body && typeof req.body === 'object' && req.body.id != null) id = req.body.id;
    } catch (_) { }
    doDeleteProject(id).then(out => res.status(out.status).json(out.body));
}

app.get('/api/projects/delete', handleDeleteRequest);
app.post('/api/projects/delete', handleDeleteRequest);

app.delete('/api/projects/:id', async (req, res) => {
    const out = await doDeleteProject(req.params.id);
    res.status(out.status).json(out.body);
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

// Export for Vercel (y para que api/proyectos/ocultar.js pueda usar modelo y conexión)
module.exports = app;
app.Project = Project;
app.connectToDatabase = connectToDatabase;

// Start server only if run directly (Local Dev)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

