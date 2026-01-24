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

            // Helper to fix Drive links (duplicate helper, but safe scope)
            const fixUrl = (url) => {
                if (url && url.includes('drive.google.com') && (url.includes('/view') || url.includes('/preview'))) {
                    return url.replace(/\/file\/d\/(.+)\/(view|preview).*/, '/uc?export=view&id=$1');
                }
                return url;
            };

            const cleanThumb = fixUrl(p.thumbnail);

            card.className = 'project-card';
            card.innerHTML = `
                <img src="${cleanThumb}" alt="${p.title}" class="project-media">
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

                // Helper to fix Drive links
                const fixUrl = (url) => {
                    if (url.includes('drive.google.com') && (url.includes('/view') || url.includes('/preview'))) {
                        return url.replace(/\/file\/d\/(.+)\/(view|preview).*/, '/uc?export=view&id=$1');
                    }
                    return url;
                };

                const cleanThumb = fixUrl(p.thumbnail);

                cItem.className = 'carousel-item';
                cItem.innerHTML = `
                    <img src="${cleanThumb}">
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

            // Duplicate items to ensure we have enough for a smooth loop
            // We want at least 2 full screens worth of items

            let items = Array.from(carouselTrack.children);
            while (items.length < 10) { // Arbitrary safety number
                items.forEach(item => {
                    const clone = item.cloneNode(true);
                    carouselTrack.appendChild(clone);
                });
                items = Array.from(carouselTrack.children);
            }

            // Anime.js Continuous Scroll
            // We animate the 'transform' property from 0 to -50% (of total width)
            // But getting total width dynamically is tricky.
            // Better approach: Animate each item moving left.

            // Remove CSS Animation class if any
            carouselTrack.style.animation = 'none';
            carouselTrack.style.display = 'flex';
            carouselTrack.style.flexWrap = 'nowrap';

            // Calculate total width of one set (approx) or just animate the track
            // We will use a simple linear animation on the track

            // Wait for images to load slightly to get widths? 
            // Or just assume standard width.

            function startMarquee() {
                const trackWidth = carouselTrack.scrollWidth;
                // We scroll half the width (assuming we doubled content logic)
                // Actually, for perfect loop, we scroll until the first clone hits the start position.
                // Simplified: Scroll endlessly.

                // Anime.js doesn't have a built-in 'infinite marquee' easily without resetting.
                // We scroll X pixels then reset to 0 instantaneously.

                // Let's assume the first half of children matches the second half.
                // We scroll exactly half the scrollWidth.

                const distance = trackWidth / 2;

                anime({
                    targets: carouselTrack,
                    translateX: [0, -distance],
                    duration: 40000, // Speed control
                    easing: 'linear',
                    loop: true,
                    // Hover Pause Logic using Anime.js?
                    // Anime.js doesn't support 'pause on hover' natively easily on the instance.
                    // We can handle listeners manually.
                });

                // Add Elastic Hover Effect to Items
                const cards = carouselTrack.querySelectorAll('.carousel-item');
                cards.forEach(card => {
                    card.addEventListener('mouseenter', () => {
                        anime({
                            targets: card,
                            scale: 1.05,
                            duration: 800,
                            elasticity: 400
                        });
                        // Optional: Pause marquee?
                        // document.querySelector('.carousel-track').style.animationPlayState = 'paused'; 
                        // (Would work if using CSS, but we are using JS. 
                        // With Anime.js, pausing specific instance is harder if not stored globally.)
                    });

                    card.addEventListener('mouseleave', () => {
                        anime({
                            targets: card,
                            scale: 1,
                            duration: 600,
                            elasticity: 300
                        });
                    });
                });
            }

            // Give a moment for DOM to settle
            setTimeout(startMarquee, 100);
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

    // Select both grid cards and carousel items
    document.querySelectorAll('.project-card, .carousel-item').forEach(card => {
        card.addEventListener('click', () => {
            // Data might be in different places depending on structure, but we used hidden divs in both
            const title = card.querySelector('.project-title')?.textContent || card.querySelector('h4')?.textContent;
            const cat = card.querySelector('.project-cat')?.textContent || card.querySelector('p')?.textContent;

            // Prefer hidden data if available (Carousel has it hidden)
            const hiddenTitle = card.querySelector('.project-title')?.textContent;
            const hiddenCat = card.querySelector('.project-cat')?.textContent;

            const desc = card.querySelector('.project-desc').textContent;
            const galleryData = JSON.parse(card.querySelector('.project-gallery').textContent);

            modalTitle.textContent = hiddenTitle || title;
            modalCat.textContent = hiddenCat || cat;
            modalDesc.textContent = desc;

            // Render Gallery
            modalGallery.innerHTML = '';
            galleryData.forEach(url => {
                const div = document.createElement('div');
                div.className = 'gallery-item';

                // Video Detection
                if (url.includes('drive.google.com') && (url.includes('/view') || url.includes('/preview'))) {
                    // Convert Drive View to Preview (Embed)
                    const embedUrl = url.replace(/\/view.*/, '/preview');
                    div.innerHTML = `<iframe src="${embedUrl}" width="100%" height="400px" style="border:none;"></iframe>`;
                    div.classList.add('video-item');
                } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    // Basic YouTube support
                    let videoId = url.split('v=')[1];
                    const ampersandPosition = videoId ? videoId.indexOf('&') : -1;
                    if (ampersandPosition != -1) {
                        videoId = videoId.substring(0, ampersandPosition);
                    }
                    if (!videoId && url.includes('youtu.be')) {
                        videoId = url.split('/').pop();
                    }
                    div.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" width="100%" height="400px" style="border:none;"></iframe>`;
                    div.classList.add('video-item');
                } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
                    // Direct Video File
                    div.innerHTML = `<video controls src="${url}" width="100%"></video>`;
                    div.classList.add('video-item');
                } else {
                    // Standard Image
                    div.innerHTML = `<img src="${url}">`;
                }

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
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    setupContactModal();
});

function setupContactModal() {
    // 1. Inject Modal HTML if not exists
    if (!document.getElementById('contact-modal')) {
        const modalHTML = `
            <div id="contact-modal" class="project-modal" style="z-index: 250;">
                <button class="close-contact-modal close-modal">✕</button>
                <div class="modal-content" style="text-align: left;">
                    <div class="modal-header">
                        <h2 class="modal-title" style="text-align: center; margin-bottom: 3rem;">SOBRE MÍ</h2>
                        <div class="about-container">
                            
                            <!-- Bio Text & Links (Left) -->
                            <div class="about-text">
                                <div class="modal-desc">
                                    <p>Dejar atrás mis estudios y mi trabajo estable para dedicarme por completo a la fotografía fue la decisión más arriesgada y acertada de mi vida. Hoy, esa pasión se traduce en una mirada que no se conforma con lo convencional, buscando siempre la máxima expresión en la moda y los conciertos. Me muevo entre la elegancia de una editorial y la energía cruda del escenario, adaptando mi técnica a lo que cada historia necesita.</p>
                                    <p style="margin-top: 1rem;">Mi objetivo principal es que, al trabajar juntos, sientas la tranquilidad absoluta de que cualquier reto técnico o logístico estará bajo control. Me especializo en traducir visiones complejas en imágenes potentes, asegurando que el mensaje que quieres transmitir llegue al espectador con total claridad. No solo capturo momentos; gestiono cada detalle del proceso creativo para que tú solo tengas que preocuparte de disfrutar del resultado final.</p>
                                    <p style="margin-top: 1rem;">Soy ese perfil híbrido que combina la disciplina con una actitud disruptiva y cercana para romper los moldes establecidos. Si buscas una estética impecable y un fotógrafo que resuelva problemas de forma creativa, estoy listo para empezar.</p>
                                </div>
                                <!-- Email/Socials -->
                                <div class="contact-links" style="margin-top: 2rem;">
                                    <a href="mailto:Ljavi141@gmail.com" class="contact-btn">Email Me</a>
                                </div>
                            </div>

                            <!-- Profile Image (Right) -->
                            <div class="profile-img">
                                <img src="/images/javier-profile.jpg" alt="Javier">
                            </div>

                        </div>
                    </div>
                </div>
                <style>
                    /* Dynamic Styles for Contact Modal */
                    .about-container {
                        display: flex;
                        flex-direction: row;
                        align-items: flex-start;
                        gap: 4rem;
                        max-width: 1000px;
                        margin: 0 auto;
                    }

                    .about-text {
                        flex: 1;
                        font-family: 'Montserrat', sans-serif;
                        line-height: 1.8;
                        font-size: 0.95rem;
                        opacity: 0.9;
                    }

                    .profile-img {
                        flex: 0 0 350px; /* Fixed width for image column */
                        width: 350px;
                        height: auto;
                        overflow: hidden;
                    }

                    .profile-img img {
                        width: 100%;
                        height: auto;
                        display: block;
                        /* No border radius, original aspect ratio */
                    }

                    .contact-btn {
                        display: inline-block;
                        color: #fff;
                        text-decoration: none;
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 12px 30px;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        font-size: 0.8rem;
                        transition: all 0.3s ease;
                    }

                    .contact-btn:hover {
                        background: #fff;
                        color: #000;
                        border-color: #fff;
                    }

                    @media(max-width: 768px) {
                        .about-container {
                            flex-direction: column-reverse; /* Text top, Image bottom? Or Standard Column? Usually Image Top is better, but user asked for text left image right on desktop. Let's do Image Top on mobile. */
                            align-items: center;
                            gap: 2rem;
                            text-align: center;
                        }
                        
                        /* If we use column-reverse, image is at bottom. 
                           If we use column, image is at top (if we swap order).
                           Let's check the DOM structure: Text is first, Image is second.
                           So flex-direction: column -> Text Top, Image Bottom.
                           flex-direction: column-reverse -> Image Top, Text Bottom. (Standard mobile often has image first)
                        */
                         .about-container {
                            flex-direction: column-reverse; 
                         }

                        .profile-img {
                            width: 100%;
                            flex: none;
                            max-width: 400px;
                        }
                    }
                </style>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // 2. Logic
    const modal = document.getElementById('contact-modal');
    const closeBtn = modal.querySelector('.close-contact-modal');

    // Find Contact Link(s) - looking for the specific text "Contacto" in nav
    const contactLinks = Array.from(document.querySelectorAll('nav a')).filter(a => a.textContent.trim() === 'Contacto');

    contactLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            gsap.to(modal, { opacity: 1, duration: 0.5 });
            gsap.from(modal.querySelector('.modal-content'), { y: 50, opacity: 0, duration: 0.8, delay: 0.2, ease: "power3.out" });
        });
    });

    closeBtn.addEventListener('click', () => {
        gsap.to(modal, {
            opacity: 0, duration: 0.5, onComplete: () => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });
}
