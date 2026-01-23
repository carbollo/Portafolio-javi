async function f(){const m=document.querySelector(".page-title").textContent.trim().split(" ")[0];console.log("Loading projects for:",m);try{const r=await(await fetch(`/api/projects?category=${m}`)).json();r.reverse();const d=document.querySelector(".grid-container"),e=document.querySelector(".carousel-track");if(d.innerHTML="",e&&(e.innerHTML=""),r.forEach((a,i)=>{const n=document.createElement("div"),y=(t=>t&&t.includes("drive.google.com")&&(t.includes("/view")||t.includes("/preview"))?t.replace(/\/file\/d\/(.+)\/(view|preview).*/,"/uc?export=view&id=$1"):t)(a.thumbnail);n.className="project-card",n.innerHTML=`
                <img src="${y}" alt="${a.title}" class="project-media">
                <div class="project-info">
                    <h3 class="project-title">${a.title}</h3>
                    <p class="project-cat">${a.category}</p>
                    <div style="display:none" class="project-desc">${a.description||""}</div>
                    <div style="display:none" class="project-gallery">${JSON.stringify(a.gallery||[])}</div>
                </div>
            `,d.appendChild(n)}),e){const a=r.slice(0,5);a.forEach(i=>{const n=document.createElement("div"),y=(t=>t.includes("drive.google.com")&&(t.includes("/view")||t.includes("/preview"))?t.replace(/\/file\/d\/(.+)\/(view|preview).*/,"/uc?export=view&id=$1"):t)(i.thumbnail);n.className="carousel-item",n.innerHTML=`
                    <img src="${y}">
                    <div class="carousel-info">
                        <h4>${i.title}</h4>
                        <p>${i.category}</p>
                    </div>
                    <!-- Hidden data for modal reuse -->
                    <div style="display:none" class="project-title">${i.title}</div>
                    <div style="display:none" class="project-cat">${i.category}</div>
                    <div style="display:none" class="project-desc">${i.description||""}</div>
                    <div style="display:none" class="project-gallery">${JSON.stringify(i.gallery||[])}</div>
                `,e.appendChild(n)}),a.length>4&&Array.from(e.children).forEach(n=>{const u=n.cloneNode(!0);e.appendChild(u)})}v(),gsap.from(".project-card",{y:100,opacity:0,duration:1,stagger:.1,ease:"power3.out",delay:.2})}catch(p){console.error("Error loading projects:",p)}}function v(){const c=document.querySelector(".project-modal"),m=document.querySelector(".modal-title"),p=document.querySelector(".modal-cat"),r=document.querySelector(".modal-desc p"),d=document.querySelector(".modal-gallery");document.querySelectorAll(".project-card, .carousel-item").forEach(e=>{e.addEventListener("click",()=>{const a=e.querySelector(".project-title")?.textContent||e.querySelector("h4")?.textContent,i=e.querySelector(".project-cat")?.textContent||e.querySelector("p")?.textContent,n=e.querySelector(".project-title")?.textContent,u=e.querySelector(".project-cat")?.textContent,y=e.querySelector(".project-desc").textContent,t=JSON.parse(e.querySelector(".project-gallery").textContent);if(m.textContent=n||a,p.textContent=u||i,r.textContent=y,d.innerHTML="",t.forEach(o=>{const s=document.createElement("div");if(s.className="gallery-item",o.includes("drive.google.com")&&(o.includes("/view")||o.includes("/preview"))){const l=o.replace(/\/view.*/,"/preview");s.innerHTML=`<iframe src="${l}" width="100%" height="400px" style="border:none;"></iframe>`,s.classList.add("video-item")}else if(o.includes("youtube.com")||o.includes("youtu.be")){let l=o.split("v=")[1];const g=l?l.indexOf("&"):-1;g!=-1&&(l=l.substring(0,g)),!l&&o.includes("youtu.be")&&(l=o.split("/").pop()),s.innerHTML=`<iframe src="https://www.youtube.com/embed/${l}" width="100%" height="400px" style="border:none;"></iframe>`,s.classList.add("video-item")}else o.match(/\.(mp4|webm|ogg)$/i)?(s.innerHTML=`<video controls src="${o}" width="100%"></video>`,s.classList.add("video-item")):s.innerHTML=`<img src="${o}">`;d.appendChild(s)}),t.length===0){const o=e.querySelector("img").src;d.innerHTML=`<div class="gallery-item wide"><img src="${o}"></div>`}c.style.display="block",document.body.style.overflow="hidden",gsap.to(c,{opacity:1,duration:.5}),gsap.from(".modal-content",{y:50,opacity:0,duration:.8,delay:.2,ease:"power3.out"})})})}document.addEventListener("DOMContentLoaded",()=>{f(),h()});function h(){document.getElementById("contact-modal")||document.body.insertAdjacentHTML("beforeend",`
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
                                <img src="images/javier-profile.jpg" alt="Javier">
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
        `);const c=document.getElementById("contact-modal"),m=c.querySelector(".close-contact-modal");Array.from(document.querySelectorAll("nav a")).filter(r=>r.textContent.trim()==="Contacto").forEach(r=>{r.addEventListener("click",d=>{d.preventDefault(),c.style.display="block",document.body.style.overflow="hidden",gsap.to(c,{opacity:1,duration:.5}),gsap.from(c.querySelector(".modal-content"),{y:50,opacity:0,duration:.8,delay:.2,ease:"power3.out"})})}),m.addEventListener("click",()=>{gsap.to(c,{opacity:0,duration:.5,onComplete:()=>{c.style.display="none",document.body.style.overflow="auto"}})})}
