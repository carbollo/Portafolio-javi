document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();

        // Sort by newest
        projects.reverse();

        // Map categories to their latest project thumbnail
        const categoryImages = {};

        // Allowed categories matching the HTML hrefs/data-text
        const categories = ['Moda', 'Conciertos', 'Gastronomia', 'Creativo', 'Otros'];

        // Helper to fix Drive links (Shared logic)
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

        // Apply to Portals
        const portals = document.querySelectorAll('.portal-card');
        portals.forEach(portal => {
            // Get category name from the title text inside
            const title = portal.querySelector('.portal-title').textContent.trim();
            // Or fallback to href logic if titles are styled differently
            // We use the exact string match from our array above.

            // Normalize slightly to match keys (e.g. "GASTRONOMIA" -> "Gastronomia")
            // Helper to Title Case
            const key = categories.find(c => c.toUpperCase() === title.toUpperCase());

            if (key && categoryImages[key]) {
                // Set CSS variable for hover effect
                portal.style.setProperty('--hover-bg', `url('${categoryImages[key]}')`);
            }
        });

    } catch (e) {
        console.error('Error loading home backgrounds:', e);
    }
});
