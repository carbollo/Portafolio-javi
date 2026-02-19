document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Portal order: apply your saved order so feeds appear as you organized them
        const orderRes = await fetch('/api/portal-order');
        const order = orderRes.ok ? await orderRes.json() : ['Moda', 'Conciertos', 'Gastronomia', 'Creativo', 'Otros'];
        const container = document.querySelector('.portals-container');
        if (container && Array.isArray(order) && order.length) {
            const cards = Array.from(document.querySelectorAll('.portal-card'));
            const sorted = order
                .map(name => cards.find(c => (c.getAttribute('href') || '').toLowerCase() === name.toLowerCase()))
                .filter(Boolean);
            sorted.forEach(card => container.appendChild(card));
        }

        const response = await fetch('/api/projects');
        const projects = await response.json();
        // API already returns newest first (createdAt -1), so first match = newest = "última" por categoría

        // Map categories to their latest (newest) project thumbnail for portal covers
        const categoryImages = {};
        const categories = ['Moda', 'Conciertos', 'Gastronomia', 'Creativo', 'Otros'];

        const fixUrl = (url) => {
            if (url && url.includes('drive.google.com') && (url.includes('/view') || url.includes('/preview'))) {
                return url.replace(/\/file\/d\/(.+)\/(view|preview).*/, '/uc?export=view&id=$1');
            }
            return url;
        };

        categories.forEach(cat => {
            const project = projects.find(p => p.category === cat);
            if (project && project.thumbnail) {
                categoryImages[cat] = fixUrl(project.thumbnail);
            }
        });

        const portals = document.querySelectorAll('.portal-card');
        portals.forEach(portal => {
            const title = portal.querySelector('.portal-title').textContent.trim();
            const key = categories.find(c => c.toUpperCase() === title.toUpperCase());
            if (key && categoryImages[key]) {
                portal.style.setProperty('--hover-bg', `url('${categoryImages[key]}')`);
            }
        });
    } catch (e) {
        console.error('Error loading home backgrounds:', e);
    }
});
