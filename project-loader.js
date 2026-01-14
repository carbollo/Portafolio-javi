async function loadProjects() {
    // Determine category from page title or URL
    const pageCategory = document.querySelector('.page-title').textContent.trim();
    const cleanCategory = pageCategory.split(' ')[0]; // Handle cases like "Restauracion (CHECK)" if any left

    console.log("Loading projects for:", cleanCategory);

    try {
        const response = await fetch(`/api/projects?category=${cleanCategory}`);
        const projects = await response.json();

        // Sort: Newest first (assuming pushed in chronological order, so just reverse)
        projects.reverse();

        const grid = document.querySelector('.grid-container');
        const carouselTrack = document.querySelector('.carousel-track');

        grid.innerHTML = '';
        if (carouselTrack) carouselTrack.innerHTML = '';

        projects.forEach((p, index) => {
            // Grid Card (Show ALL projects)
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <img src="${p.thumbnail}" alt="${p.title}" class="project-media">
                <div class="project-info">
                    <h3 class="project-title">${p.title}</h3>
                    <p class="project-cat">${p.category}</p>
                    <div style="display:none" class="project-desc">${p.description || ''}</div>
                    <div style="display:none" class="project-gallery">${JSON.stringify(p.gallery || [])}</div>
                </div>
            `;
            grid.appendChild(card);
        });

        // Carousel Items (Limit to Top 5 Newest)
        if (carouselTrack) {
            const carouselProjects = projects.slice(0, 5);

            carouselProjects.forEach(p => {
                const cItem = document.createElement('div');
                cItem.className = 'carousel-item';
                cItem.innerHTML = `
                    <img src="${p.thumbnail}">
                    <div class="carousel-info">
                        <h4>${p.title}</h4>
                        <p>${p.category}</p>
                    </div>
                    <!-- Hidden data for modal reuse -->
                    <div style="display:none" class="project-title">${p.title}</div>
                    <div style="display:none" class="project-cat">${p.category}</div>
                    <div style="display:none" class="project-desc">${p.description || ''}</div>
                    <div style="display:none" class="project-gallery">${JSON.stringify(p.gallery || [])}</div>
                `;
                carouselTrack.appendChild(cItem);
            });

            // Setup Infinite Scroll (Cloning) - Only if we have items
            if (carouselProjects.length > 0) {
                const originalItems = Array.from(carouselTrack.children);
                originalItems.forEach(item => {
                    const clone = item.cloneNode(true);
                    carouselTrack.appendChild(clone);
                });
            }
        }

        // Re-attach Modal Listeners
        attachModalListeners();

        // Re-run entrance animation
        gsap.from(".project-card", { y: 100, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out", delay: 0.2 });

    } catch (err) {
        console.error("Error loading projects:", err);
    }
}

function attachModalListeners() {
    const modal = document.querySelector('.project-modal');
    const modalTitle = document.querySelector('.modal-title');
    const modalCat = document.querySelector('.modal-cat');
    const modalDesc = document.querySelector('.modal-desc p');
    const modalGallery = document.querySelector('.modal-gallery');

    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => {
            const title = card.querySelector('.project-title').textContent;
            const cat = card.querySelector('.project-cat').textContent;
            const desc = card.querySelector('.project-desc').textContent;
            const galleryData = JSON.parse(card.querySelector('.project-gallery').textContent);

            modalTitle.textContent = title;
            modalCat.textContent = cat;
            modalDesc.textContent = desc;

            // Render Gallery
            modalGallery.innerHTML = '';
            galleryData.forEach(imgUrl => {
                const div = document.createElement('div');
                div.className = 'gallery-item';
                div.innerHTML = `<img src="${imgUrl}">`;
                modalGallery.appendChild(div);
            });
            // Add thumbnail as first image if gallery empty? 
            if (galleryData.length === 0) {
                const thumb = card.querySelector('img').src;
                modalGallery.innerHTML = `<div class="gallery-item wide"><img src="${thumb}"></div>`;
            }

            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            gsap.to(modal, { opacity: 1, duration: 0.5 });
            gsap.from(".modal-content", { y: 50, opacity: 0, duration: 0.8, delay: 0.2, ease: "power3.out" });
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', loadProjects);
