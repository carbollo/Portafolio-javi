// Main JavaScript - Deep Space Fly-Through & Locked Navigation

let currentSection = 0;
let isAnimating = false;

window.addEventListener('load', () => {
    document.body.classList.add('custom-cursor-active');

    // 1. Hide Loader
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 800);
    }

    // 2. Initialize 3D Star Background
    initThreeJS();

    // 3. Hero Animations
    initAnimations();

    // 4. Subtle Details (Shooting Stars)
    startShootingStars();

    // Initialize Cursor Trail
    initCursorTrail();

    // 5. Init Scroll Locking logic
    initScrollLock();

    // 6. Init Portal Expansion
    // 6. Init Portal Expansion
    initPortalExpansion();

    // 7. Handle Back/Forward Cache (Mobile Black Screen Fix)
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            // Force reload or clean up if restored from cache
            const clones = document.querySelectorAll('.portal-card[style*="fixed"]');
            clones.forEach(clone => clone.remove());

            const loader = document.getElementById('loader');
            if (loader) loader.style.display = 'none';

            document.body.classList.remove('no-scroll');

            // Reset original portals opacity
            const portals = document.querySelectorAll('.portal-card');
            portals.forEach(p => {
                const content = p.querySelectorAll('.portal-title, .portal-number, .portal-desc');
                gsap.to(content, { opacity: 1, duration: 0.2 });
            });

            // CRITICAL: Reset Main Container Opacity (it was faded out during exit)
            gsap.to('.app-container', { opacity: 1, duration: 0.2 });
        }
    });

    // Cleanup on simple load too, just in case
    const clones = document.querySelectorAll('.portal-card[style*="fixed"]');
    clones.forEach(clone => clone.remove());
});

// ===========================================
// Portal Expansion Animation
// ===========================================
function initPortalExpansion() {
    const portals = document.querySelectorAll('.portal-card');

    portals.forEach(portal => {
        portal.addEventListener('click', (e) => {
            e.preventDefault(); // Stop immediate navigation
            const href = portal.getAttribute('href');

            // 1. Create Clone
            const rect = portal.getBoundingClientRect();
            const clone = portal.cloneNode(true);

            // 2. Style Clone to match original Position
            clone.style.position = 'fixed';
            clone.style.top = rect.top + 'px';
            clone.style.left = rect.left + 'px';
            clone.style.width = rect.width + 'px';
            clone.style.height = rect.height + 'px';
            clone.style.zIndex = '99999';
            clone.style.transition = 'none'; // Disable CSS transition for GSAP control
            clone.style.margin = '0';

            // Hardware acceleration hints for mobile smoothness
            clone.style.transform = 'translateZ(0)';
            clone.style.backfaceVisibility = 'hidden';
            clone.style.willChange = 'top, left, width, height, opacity';

            document.body.appendChild(clone);

            // 3. Animate Expansion
            const cloneTitle = clone.querySelector('.portal-title');
            const cloneNumber = clone.querySelector('.portal-number');
            const cloneDesc = clone.querySelector('.portal-desc');

            // Fade out text/borders inside the clone immediately
            gsap.to([cloneTitle, cloneNumber, cloneDesc], {
                opacity: 0,
                scale: 0.9,
                duration: 0.4,
                ease: "power2.out"
            });

            // Also fade out the original card's content to prevent "jump"
            const originalContent = portal.querySelectorAll('.portal-title, .portal-number, .portal-desc');
            gsap.to(originalContent, {
                opacity: 0,
                duration: 0.4
            });

            gsap.to(clone, {
                top: 0,
                left: 0,
                width: '100vw',
                height: window.innerHeight, // Use explicit px height for mobile stability
                padding: '4rem',
                backgroundColor: '#000',
                borderRadius: 0,
                borderColor: 'rgba(255,255,255,0)', // Fade out border too
                duration: 1.0, // Slightly faster to feel more responsive
                ease: 'power4.inOut', // More dramatic ease for "fluidity"
                onComplete: () => {
                    window.location.href = href;
                }
            });

            // 4. Fade out everything else
            gsap.to('.app-container', { opacity: 0, duration: 0.5 });
        });
    });
}

// ===========================================
// Scroll Locking Logic (Hero <-> Portals)
// ===========================================
function initScrollLock() {
    // Disable Scroll Lock on Mobile (Native scroll is better)
    if (window.innerWidth <= 768) return;

    // Prevent default scroll behavior
    window.addEventListener('wheel', handleScroll, { passive: false });
    window.addEventListener('touchmove', (e) => {
        // Only prevent if not mobile (double check in case of resize)
        if (window.innerWidth > 768) e.preventDefault();
    }, { passive: false });

    // Handle Wheel
    function handleScroll(e) {
        e.preventDefault();
        if (isAnimating) return;

        const direction = e.deltaY > 0 ? 1 : -1;

        if (direction === 1 && currentSection === 0) {
            goToSection(1);
        } else if (direction === -1 && currentSection === 1) {
            goToSection(0);
        }
    }

    // Handle Keyboard
    window.addEventListener('keydown', (e) => {
        if (isAnimating) return;
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            if (currentSection === 0) goToSection(1);
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            if (currentSection === 1) goToSection(0);
        }
    });

    // Handle Resize
    window.addEventListener('resize', () => {
        // Adjust position if window size changes while in section 1
        if (currentSection === 1) {
            gsap.set('.app-container', { y: -window.innerHeight });
        }
    });
}

function goToSection(index) {
    isAnimating = true;
    currentSection = index;

    gsap.to('.app-container', {
        y: -window.innerHeight * index,
        duration: 1.5,
        ease: 'power3.inOut', // Silky smooth
        onComplete: () => {
            isAnimating = false;
        }
    });

    // Animate stars based on movement
    // e.g. accelerate during transition?
    // For now, let's keep it simple.

    // 2026 Update: Animate Scroll Hint Visibility
    if (index === 1) {
        // Going down -> Hide Hint
        gsap.to('.hero-scroll-hint', { opacity: 0, duration: 0.5, ease: "power2.out" });
    } else {
        // Going up -> Show Hint
        gsap.to('.hero-scroll-hint', { opacity: 0.5, duration: 0.8, delay: 0.5, ease: "power2.out" });
    }
}


// ===========================================
// Three.js Background (Deep Space Fly-Through)
// ===========================================
function initThreeJS() {
    const canvas = document.getElementById('webgl');
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0005); // Very subtle fog

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 0;
    camera.rotation.x = 0;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create star texture (Brighter, more solid core)
    function createStarTexture() {
        const c = document.createElement('canvas');
        c.width = 32; c.height = 32;
        const ctx = c.getContext('2d');

        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Solid white center
        gradient.addColorStop(0.4, 'rgba(220, 240, 255, 0.8)'); // Bright aura
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(16, 16, 16, 0, Math.PI * 2);
        ctx.fill();
        return new THREE.CanvasTexture(c);
    }

    // Deep Space Star System
    const starCount = 4000;
    const positions = new Float32Array(starCount * 3);
    const velocities = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 2000;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
        velocities[i] = 1 + Math.random(); // Higher base speed
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starTexture = createStarTexture();
    const material = new THREE.PointsMaterial({
        size: 2.5, // Large for visibility
        map: starTexture,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    // Mouse Interaction
    let targetX = 0;
    let targetY = 0;
    document.addEventListener('mousemove', (e) => {
        targetX = (e.clientX - window.innerWidth / 2) * 0.0005;
        targetY = (e.clientY - window.innerHeight / 2) * 0.0005;
    });

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        const posAttribute = geometry.attributes.position;
        const posArray = posAttribute.array;

        // Move stars towards camera (positive Z)
        for (let i = 0; i < starCount; i++) {
            let v = velocities[i] * 1.0; // Slower, deeper space feel
            posArray[i * 3 + 2] += v;

            if (posArray[i * 3 + 2] > 600) {
                posArray[i * 3 + 2] = -1400;
                posArray[i * 3] = (Math.random() - 0.5) * 2000;
                posArray[i * 3 + 1] = (Math.random() - 0.5) * 2000;
            }
        }
        posAttribute.needsUpdate = true;

        stars.rotation.x += (targetY - stars.rotation.x) * 0.05;
        stars.rotation.y += (targetX - stars.rotation.y) * 0.05;

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ===========================================
// Intro Animations
// ===========================================
function initAnimations() {
    // Hero Title Stagger
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        heroTitle.querySelectorAll('span').forEach(line => {
            if (!line.querySelector('.letter')) {
                line.innerHTML = line.textContent.replace(/\S/g, "<span class='letter'>$&</span>");
            }
        });

        anime.timeline({ loop: false })
            .add({
                targets: '.hero-title .letter',
                translateY: ["1.2em", 0],
                translateZ: 0,
                opacity: [0, 1],
                duration: 750,
                delay: (el, i) => 50 * i,
                easing: 'easeOutExpo'
            });
    }

    // Subtitle
    anime({
        targets: '.hero-subtitle',
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 1000,
        delay: 800,
        easing: 'easeOutExpo'
    });

    // Portal Cards Entrance
    anime({
        targets: '.portal-card',
        translateY: [50, 0],
        opacity: [0, 1],
        delay: anime.stagger(150, { start: 1000 }),
        duration: 800,
        easing: 'easeOutCubic'
    });

    // Footer
    anime({
        targets: '.main-footer',
        opacity: [0, 0.5],
        duration: 1000,
        delay: 2000,
        easing: 'easeOutQuad'
    });
}

// ===========================================
// Details (Shooting Stars & Cursor Trail)
// ===========================================

function startShootingStars() {
    function createShootingStar() {
        const star = document.createElement('div');
        star.classList.add('shooting-star');

        const angle = Math.random() * Math.PI * 2;
        const startRad = 50;
        const startX = window.innerWidth / 2 + Math.cos(angle) * startRad;
        const startY = window.innerHeight / 2 + Math.sin(angle) * startRad;

        star.style.left = startX + 'px';
        star.style.top = startY + 'px';
        const deg = angle * (180 / Math.PI);
        star.style.transform = `rotate(${deg}deg)`;

        document.body.appendChild(star);

        gsap.to(star, {
            x: Math.cos(angle) * 1000,
            y: Math.sin(angle) * 1000,
            opacity: 1,
            duration: 0.1,
            ease: 'power1.in',
            onComplete: () => {
                gsap.to(star, {
                    x: Math.cos(angle) * 1500,
                    y: Math.sin(angle) * 1500,
                    opacity: 0,
                    duration: 0.8,
                    ease: 'power2.out',
                    onComplete: () => star.remove()
                });
            }
        });
    }

    function scheduleNext() {
        const delay = 3000 + Math.random() * 4000;
        setTimeout(() => {
            createShootingStar();
            scheduleNext();
        }, delay);
    }
    setTimeout(scheduleNext, 2000);
}

// Custom Cursor & Trail
const cursor = document.querySelector('.cursor');
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
const trailDots = [];
const trailSize = 12;

function initCursorTrail() {
    const trailContainer = document.querySelector('.cursor-trail');
    if (trailContainer) {
        trailContainer.innerHTML = '';
        for (let i = 0; i < trailSize; i++) {
            const dot = document.createElement('div');
            dot.classList.add('cursor-dot');
            trailContainer.appendChild(dot);
            trailDots.push({
                el: dot,
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            });
        }
        animateTrail();
    }
}

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (cursor) {
        gsap.to(cursor, { x: mouseX, y: mouseY, duration: 0.1, ease: "power2.out" });
    }
});

function animateTrail() {
    let targetX = mouseX;
    let targetY = mouseY;

    trailDots.forEach((dot, index) => {
        const ease = 0.35 - (index * 0.02);
        dot.x += (targetX - dot.x) * ease;
        dot.y += (targetY - dot.y) * ease;
        targetX = dot.x;
        targetY = dot.y;

        dot.el.style.transform = `translate(${dot.x}px, ${dot.y}px) translate(-50%, -50%)`;

        const progress = index / trailSize;
        dot.el.style.opacity = 0.8 * (1 - progress);
        const scale = 1 - (progress * 0.8);
        dot.el.style.width = (6 * scale) + 'px';
        dot.el.style.height = (6 * scale) + 'px';
    });

    requestAnimationFrame(animateTrail);
}

document.querySelectorAll('a, .portal-card').forEach(el => {
    el.addEventListener('mouseenter', () => { if (cursor) cursor.style.transform = "translate(-50%, -50%) scale(2.5)"; });
    el.addEventListener('mouseleave', () => { if (cursor) cursor.style.transform = "translate(-50%, -50%) scale(1)"; });
});
