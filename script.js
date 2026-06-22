document.addEventListener('DOMContentLoaded', () => {

    /* ═══════════════════════════════════════════════════════
       1. MOUSE GLOW
       ═══════════════════════════════════════════════════════ */
    const glow = document.getElementById('mouse-glow');
    let mx = innerWidth / 2, my = innerHeight / 2;
    let gx = mx, gy = my;

    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    (function glowLoop() {
        gx += (mx - gx) * .07;
        gy += (my - gy) * .07;
        if (glow) glow.style.transform = `translate(${gx}px,${gy}px)`;
        requestAnimationFrame(glowLoop);
    })();

    /* ═══════════════════════════════════════════════════════
       2. HERO HEADING — word-level staggered letter reveal
       ═══════════════════════════════════════════════════════ */
    const heading = document.getElementById('hero-heading');
    if (heading) {
        const text = heading.textContent;
        heading.textContent = '';
        heading.style.opacity = '1';

        let d = 0;
        text.split(' ').forEach((word, wi, arr) => {
            const wSpan = document.createElement('span');
            wSpan.style.cssText = 'display:inline-block;white-space:nowrap;';

            for (const ch of word) {
                const s = document.createElement('span');
                s.textContent = ch;
                s.style.cssText =
                    `display:inline-block;opacity:0;transform:translateY(22px);` +
                    `transition:opacity .42s ease ${d.toFixed(3)}s,` +
                    `transform .42s ease ${d.toFixed(3)}s;`;
                wSpan.appendChild(s);
                d += 0.05;
            }
            heading.appendChild(wSpan);

            if (wi < arr.length - 1) {
                const sp = document.createElement('span');
                sp.textContent = ' '; // non-breaking space
                sp.style.cssText =
                    `display:inline;opacity:0;` +
                    `transition:opacity .2s ease ${d.toFixed(3)}s;`;
                heading.appendChild(sp);
                d += 0.02;
            }
        });

        setTimeout(() => {
            heading.querySelectorAll('span').forEach(s => {
                s.style.opacity = '1';
                s.style.transform = 'translateY(0)';
            });
        }, 450);
    }

    /* ═══════════════════════════════════════════════════════
       3. SCROLL REVEAL — IntersectionObserver
       ═══════════════════════════════════════════════════════ */
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('active'); io.unobserve(e.target); }
        });
    }, { threshold: .1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll(
        '.reveal-fade,.reveal-slide-left,.reveal-slide-right,.reveal-slide-up,.reveal-zoom'
    ).forEach(el => io.observe(el));

    /* ═══════════════════════════════════════════════════════
       4. GLOBE CANVAS — 3D sphere with MOUSE HOVER interaction
          • Hover over globe → faster rotation + bigger particles
          • Depth correction: front=bright, back=dim
       ═══════════════════════════════════════════════════════ */
    const canvas = document.getElementById('globe-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H, CX, CY;
    const GLOBE_R   = 290;
    const PERSP     = 680;
    const CONN_DIST = 115;

    function resizeCanvas() {
        W = canvas.offsetWidth  || canvas.parentElement.clientWidth;
        H = canvas.offsetHeight || canvas.parentElement.clientHeight;
        canvas.width  = W;
        canvas.height = H;
        CX = W * 0.72;
        CY = H * 0.50;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    /* ── Interaction state (all smooth lerp) ── */
    let hoverScale     = 1;    // particle size multiplier
    let targetScale    = 1;
    let globeAngle     = 0;    // accumulated auto-rotation
    let autoSpeed      = 1;    // base auto-rotation rate
    let mouseRotOffset = 0;    // extra rotation from mouse X position
    let targetMouseRot = 0;
    let clickZoom      = 1;    // scale entire globe on click
    let targetZoom     = 1;
    let lastT          = performance.now();
    let isHover        = false;
    let isClicked      = false;

    const heroEl = canvas.parentElement;

    /* ── Mouse move: drives direction + hover scale ── */
    heroEl.addEventListener('mousemove', e => {
        const rect = heroEl.getBoundingClientRect();
        const dx   = e.clientX - (rect.left + CX);
        const dy   = e.clientY - (rect.top  + CY);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < GLOBE_R * 1.4) {
            // Map mouse X offset → rotation push (left/right of globe center)
            // dx ranges roughly ±GLOBE_R → maps to ±1.2 rad push
            targetMouseRot = (dx / GLOBE_R) * 1.2;
            targetScale    = isClicked ? 1.5 : 1.35;
            isHover        = true;
            canvas.style.cursor = 'grab';
        } else {
            targetMouseRot = 0;
            targetScale    = 1;
            isHover        = false;
            canvas.style.cursor = 'default';
        }
    });

    /* ── Click: zoom globe to bigger size ── */
    heroEl.addEventListener('mousedown', e => {
        const rect = heroEl.getBoundingClientRect();
        const dx   = e.clientX - (rect.left + CX);
        const dy   = e.clientY - (rect.top  + CY);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < GLOBE_R * 1.4) {
            isClicked   = true;
            targetZoom  = 1.65;  // expand globe 65%
            autoSpeed   = 0.35;  // slow auto-spin while zoomed
            targetScale = 1.5;
            canvas.style.cursor = 'grabbing';
        }
    });

    heroEl.addEventListener('mouseup', () => {
        isClicked   = false;
        targetZoom  = 1;
        autoSpeed   = 1;
        targetScale = isHover ? 1.35 : 1;
        canvas.style.cursor = isHover ? 'grab' : 'default';
    });

    heroEl.addEventListener('mouseleave', () => {
        isHover        = false;
        isClicked      = false;
        targetScale    = 1;
        targetMouseRot = 0;
        targetZoom     = 1;
        autoSpeed      = 1;
        canvas.style.cursor = 'default';
    });

    /* ── Colour palettes ── */
    const BLOB_COLORS   = ['#F26B45', '#00CCC5', '#1e5c34', '#e07810'];
    const MEDIUM_COLORS = ['#F26B45', '#00B7B2', '#888888', '#333333',
                           '#4a90d9', '#f5a020', '#2d6040', '#cc4422'];
    const SMALL_COLORS  = ['#666', '#999', '#444', '#F26B45', '#00B7B2', '#3a6080'];

    class Particle {
        constructor() {
            this.theta = Math.random() * Math.PI * 2;
            this.phi   = Math.acos(Math.random() * 2 - 1);
            this.r     = GLOBE_R + (Math.random() - 0.5) * 40;

            const roll = Math.random();
            if (roll < 0.09) {
                this.size  = 12 + Math.random() * 12;
                this.color = BLOB_COLORS[Math.floor(Math.random() * BLOB_COLORS.length)];
            } else if (roll < 0.32) {
                this.size  = 5 + Math.random() * 5;
                this.color = MEDIUM_COLORS[Math.floor(Math.random() * MEDIUM_COLORS.length)];
            } else {
                this.size  = 1.2 + Math.random() * 2.8;
                this.color = SMALL_COLORS[Math.floor(Math.random() * SMALL_COLORS.length)];
            }

            this.px = 0; this.py = 0; this.pz = 0; this.ps = 1;
        }

        update(t) {
            const x3 = this.r * Math.sin(this.phi) * Math.cos(this.theta + t);
            const y3 = this.r * Math.cos(this.phi);
            const z3 = this.r * Math.sin(this.phi) * Math.sin(this.theta + t);
            const s  = PERSP / (PERSP + z3);
            this.px = CX + x3 * s;
            this.py = CY + y3 * s;
            this.pz = z3;
            this.ps = s;
        }

        draw(sizeScale, zoomScale) {
            // Scale position outward from globe center for click-zoom effect
            const px = CX + (this.px - CX) * zoomScale;
            const py = CY + (this.py - CY) * zoomScale;

            // Correct depth: front (pz < 0) = bright, back (pz > 0) = dim
            const alpha = Math.max(0.12, Math.min(1,
                (GLOBE_R - this.pz) / (2 * GLOBE_R)
            ));
            const r = Math.max(0.5, this.size * this.ps * sizeScale * zoomScale);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fillStyle = this.color;

            // Glow on hover/click
            if (sizeScale > 1.1 || zoomScale > 1.1) {
                ctx.shadowBlur  = r * (zoomScale > 1.1 ? 3.5 : 2);
                ctx.shadowColor = this.color;
            }

            ctx.fill();
            ctx.restore();
        }
    }

    const particles = Array.from({ length: 148 }, () => new Particle());

    function drawFrame(now) {
        const delta = Math.min((now - lastT) / 1000, 0.05);
        lastT = now;

        /* ── Smooth lerp all interactive values ── */
        hoverScale     += (targetScale    - hoverScale)     * 0.06;
        mouseRotOffset += (targetMouseRot - mouseRotOffset) * 0.055;
        clickZoom      += (targetZoom     - clickZoom)      * 0.055;

        /* ── Auto-rotate (frame-rate independent) ── */
        globeAngle += 0.00042 * autoSpeed * (delta * 1000);

        /* ── Combined angle = auto-rotation + mouse-position offset ── */
        const angle = globeAngle + mouseRotOffset;

        ctx.clearRect(0, 0, W, H);

        // Update projected positions using combined angle
        particles.forEach(p => p.update(angle));

        /* ── Connection lines (brighter + thicker when hovered/clicked) ── */
        const lineAlphaMult = isClicked ? 1.0 : isHover ? 0.85 : 0.65;
        ctx.lineWidth = isClicked ? 0.9 : isHover ? 0.75 : 0.55;

        for (let i = 0; i < particles.length; i++) {
            const a = particles[i];
            for (let j = i + 1; j < particles.length; j++) {
                const b = particles[j];
                // Scale screen positions by clickZoom relative to globe center
                const ax = CX + (a.px - CX) * clickZoom;
                const ay = CY + (a.py - CY) * clickZoom;
                const bx = CX + (b.px - CX) * clickZoom;
                const by = CY + (b.py - CY) * clickZoom;
                const dx   = ax - bx;
                const dy   = ay - by;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > CONN_DIST * clickZoom) continue;

                const avgZ  = (a.pz + b.pz) * 0.5;
                const depth = Math.max(0, (GLOBE_R - avgZ) / (2 * GLOBE_R));
                const alpha = (1 - dist / (CONN_DIST * clickZoom)) * depth * lineAlphaMult;

                ctx.save();
                ctx.globalAlpha = Math.min(1, alpha);
                ctx.strokeStyle = isClicked ? '#bbb' : isHover ? '#999' : '#777';
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(bx, by);
                ctx.stroke();
                ctx.restore();
            }
        }

        /* ── Draw particles back → front, scaled from globe center ── */
        particles
            .slice()
            .sort((a, b) => b.pz - a.pz)
            .forEach(p => p.draw(hoverScale, clickZoom));

        requestAnimationFrame(drawFrame);
    }
    requestAnimationFrame(drawFrame);

    /* ═══════════════════════════════════════════════════════
       5. DYNAMIC SIDE LINKS
          Home + About  →  "VALUE CREATION / ENABLEMENT / PRESERVATION"
          Cap + Meth + Practitioners  →  "CREATE / ENABLE / PRESERVE VALUE"
       ═══════════════════════════════════════════════════════ */
    const sideItems = [...document.querySelectorAll('.sl-item')];

    const SIDE_HOME = [
        { text: 'VALUE CREATION',     href: '#capabilities',  cls: 'sl-vcreate'   },
        { text: 'VALUE ENABLEMENT',   href: '#about',         cls: 'sl-venable'   },
        { text: 'VALUE PRESERVATION', href: '#practitioners', cls: 'sl-vpreserve' },
        { text: 'OUR METHODOLOGY',    href: '#methodology',   cls: 'sl-vmethod'   },
    ];

    const SIDE_DEEP = [
        { text: 'CREATE VALUE',    href: '#capabilities',  cls: 'sl-create'   },
        { text: 'ENABLE VALUE',    href: '#about',         cls: 'sl-enable'   },
        { text: 'PRESERVE VALUE',  href: '#practitioners', cls: 'sl-preserve' },
        { text: 'OUR METHODOLOGY', href: '#methodology',   cls: 'sl-method'   },
    ];

    const DEEP_SECTIONS = new Set(['capabilities', 'methodology', 'practitioners']);
    let currentSideSet = null;

    function updateSideLinks(sectionId) {
        const config = DEEP_SECTIONS.has(sectionId) ? SIDE_DEEP : SIDE_HOME;
        const key    = DEEP_SECTIONS.has(sectionId) ? 'deep' : 'home';

        if (currentSideSet === key) return; // no change needed
        currentSideSet = key;

        sideItems.forEach((el, i) => {
            const cfg = config[i];
            el.textContent = cfg.text;
            el.href        = cfg.href;
            // Replace class (keep sl-item, swap colour class)
            el.className   = `sl-item ${cfg.cls}`;
        });
    }

    /* ═══════════════════════════════════════════════════════
       6. SCROLL — active nav + dynamic side links
       ═══════════════════════════════════════════════════════ */
    const sections = [...document.querySelectorAll('section[id]')];
    const navLinks = [...document.querySelectorAll('.nav-links a')];

    function onScroll() {
        let cur = 'hero';
        sections.forEach(s => {
            if (scrollY >= s.offsetTop - 160) cur = s.id;
        });

        // Active nav link
        navLinks.forEach(a => {
            const active = a.getAttribute('href') === `#${cur}`;
            a.style.color      = active ? 'var(--orange)' : '';
            a.style.fontWeight = active ? '700' : '';
        });

        // Dynamic side links
        updateSideLinks(cur);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // init on page load

    /* ═══════════════════════════════════════════════════════
       7. NAVBAR SCROLL TINT
       ═══════════════════════════════════════════════════════ */
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.style.background = scrollY > 60 ? 'rgba(10,10,10,.97)' : '#252525';
    }, { passive: true });

    /* ═══════════════════════════════════════════════════════
       8. MOBILE MENU TOGGLE
       ═══════════════════════════════════════════════════════ */
    const mBtn   = document.getElementById('mobile-menu');
    const nRight = document.getElementById('nav-right');

    if (mBtn && nRight) {
        let open = false;

        mBtn.addEventListener('click', () => {
            open = !open;
            if (open) {
                Object.assign(nRight.style, {
                    display:       'flex',
                    flexDirection: 'column',
                    alignItems:    'flex-start',
                    position:      'fixed',
                    top:           '110px',
                    left:          '2%',
                    width:         '96%',
                    background:    'rgba(10,10,10,.97)',
                    padding:       '22px 28px',
                    borderRadius:  '0 0 14px 14px',
                    gap:           '18px',
                    zIndex:        '999',
                    boxShadow:     '0 12px 40px rgba(0,0,0,.5)',
                });
                const lnks = nRight.querySelector('.nav-links');
                const btns = nRight.querySelector('.nav-buttons');
                if (lnks) Object.assign(lnks.style, { display:'flex', flexDirection:'column', gap:'14px' });
                if (btns) Object.assign(btns.style, { display:'flex', flexWrap:'wrap', gap:'10px' });
            } else {
                nRight.removeAttribute('style');
                const lnks = nRight.querySelector('.nav-links');
                const btns = nRight.querySelector('.nav-buttons');
                if (lnks) lnks.removeAttribute('style');
                if (btns) btns.removeAttribute('style');
            }
        });

        nRight.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                if (open) { open = false; nRight.removeAttribute('style'); }
            });
        });
    }

    /* ═══════════════════════════════════════════════════════
       9. BUBBLE NODES — gentle per-node sine float
       ═══════════════════════════════════════════════════════ */
    document.querySelectorAll('.bub').forEach(bub => {
        const amp   = 2 + Math.random() * 4;
        const speed = 1.2 + Math.random() * 2;
        const off   = Math.random() * Math.PI * 2;
        (function floatBub() {
            bub.style.transform = `translateY(${Math.sin(Date.now() / 1000 * speed + off) * amp}px)`;
            requestAnimationFrame(floatBub);
        })();
    });

    /* ═══════════════════════════════════════════════════════
       10. VENN CIRCLES — gentle breathing pulse
       ═══════════════════════════════════════════════════════ */
    const breathStyle = document.createElement('style');
    breathStyle.textContent = `
        @keyframes vcPulse {
            0%   { filter:brightness(1)    saturate(1);   }
            100% { filter:brightness(1.08) saturate(1.12);}
        }`;
    document.head.appendChild(breathStyle);

    document.querySelectorAll('.vcircle').forEach((vc, i) => {
        vc.style.animation = `vcPulse 3.5s ease-in-out ${i * 0.5}s infinite alternate`;
    });

});
