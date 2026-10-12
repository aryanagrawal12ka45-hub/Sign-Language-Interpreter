/**
 * Sign Language Studio - Neural Ambient Canvas Animation
 * High-performance 60fps constellation & tensor particle graph
 * Visual benchmark: KaptaanLM Research Labs ambient background
 */

(function () {
    const canvas = document.getElementById('neural-bg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Prefers-reduced-motion check
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
        // Draw single static frame
        renderStaticBackground();
        return;
    }

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let animationFrameId = null;
    let isTabVisible = true;

    // Mouse coordinates for gentle parallax
    let mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };

    // Ambient floating orbs (inspired by KaptaanLM AnimatedGradientOrb)
    let orbs = [
        { x: 0.5, y: 0.2, radius: 450, color: 'rgba(255, 255, 255, 0.032)', vx: 0.0003, vy: 0.0002 },
        { x: 0.8, y: 0.7, radius: 380, color: 'rgba(228, 228, 231, 0.022)', vx: -0.00025, vy: 0.0003 },
        { x: 0.2, y: 0.8, radius: 320, color: 'rgba(16, 185, 129, 0.018)', vx: 0.0002, vy: -0.0002 }
    ];

    // Constellation tensor particles
    const PARTICLE_COUNT = 54;
    const MAX_LINE_DIST = 110;
    const particles = [];

    function initParticles() {
        particles.length = 0;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.45,
                vy: (Math.random() - 0.5) * 0.45,
                radius: 1.1 + Math.random() * 1.4,
                alpha: 0.25 + Math.random() * 0.45,
                pulseSpeed: 0.015 + Math.random() * 0.02,
                pulseAngle: Math.random() * Math.PI * 2
            });
        }
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.scale(dpr, dpr);

        if (particles.length === 0) {
            initParticles();
        } else {
            // Keep particles inside new bounds
            particles.forEach(p => {
                p.x = Math.min(p.x, width);
                p.y = Math.min(p.y, height);
            });
        }
    }

    function renderStaticBackground() {
        resize();
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Ambient radial light
        const grad = ctx.createRadialGradient(width * 0.5, height * 0.2, 0, width * 0.5, height * 0.2, 500);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', (e) => {
        mouse.targetX = e.clientX;
        mouse.targetY = e.clientY;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
        mouse.targetX = -1000;
        mouse.targetY = -1000;
    });

    document.addEventListener('visibilitychange', () => {
        isTabVisible = !document.hidden;
        if (isTabVisible && !animationFrameId) {
            lastTime = performance.now();
            loop();
        }
    });

    let lastTime = performance.now();

    function loop(time = performance.now()) {
        if (!isTabVisible) {
            animationFrameId = null;
            return;
        }

        const delta = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        // Smooth mouse interpolation
        mouse.x += (mouse.targetX - mouse.x) * 0.08;
        mouse.y += (mouse.targetY - mouse.y) * 0.08;

        // Clear canvas with deep pitch black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // 1. Draw drifting ambient orbs
        orbs.forEach(orb => {
            orb.x += orb.vx;
            orb.y += orb.vy;
            if (orb.x < 0.1 || orb.x > 0.9) orb.vx *= -1;
            if (orb.y < 0.1 || orb.y > 0.9) orb.vy *= -1;

            const ox = orb.x * width;
            const oy = orb.y * height;
            const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.radius);
            grad.addColorStop(0, orb.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(ox, oy, orb.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Update and draw particles
        const count = particles.length;
        for (let i = 0; i < count; i++) {
            const p = particles[i];

            // Velocity movement
            p.x += p.vx;
            p.y += p.vy;

            // Bounce off boundaries
            if (p.x < 0) { p.x = 0; p.vx *= -1; }
            if (p.x > width) { p.x = width; p.vx *= -1; }
            if (p.y < 0) { p.y = 0; p.vy *= -1; }
            if (p.y > height) { p.y = height; p.vy *= -1; }

            // Mouse interaction: subtle repulsion/attraction
            const dxm = mouse.x - p.x;
            const dym = mouse.y - p.y;
            const distM = Math.hypot(dxm, dym);
            if (distM < 160 && distM > 0) {
                const force = (160 - distM) / 160 * 0.35;
                p.x -= (dxm / distM) * force;
                p.y -= (dym / distM) * force;
            }

            // Pulse alpha
            p.pulseAngle += p.pulseSpeed;
            const currentAlpha = p.alpha + Math.sin(p.pulseAngle) * 0.12;

            // Draw particle node
            ctx.fillStyle = `rgba(228, 228, 231, ${Math.max(0.1, currentAlpha)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();

            // Connect nearby nodes
            for (let j = i + 1; j < count; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.hypot(dx, dy);

                if (dist < MAX_LINE_DIST) {
                    const lineAlpha = (1 - dist / MAX_LINE_DIST) * 0.16;
                    ctx.strokeStyle = `rgba(228, 228, 231, ${lineAlpha})`;
                    ctx.lineWidth = 0.85;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }

        animationFrameId = requestAnimationFrame(loop);
    }

    resize();
    loop();
})();
