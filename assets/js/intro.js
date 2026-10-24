(() => {
    const root = document.documentElement;
    const intro = document.getElementById('site-intro');
    if (!intro || !root.classList.contains('intro-pending')) return;

    clearTimeout(window.blogIntroFallback);
    const surface = intro.querySelector('.intro-surface');
    const canvas = intro.querySelector('.intro-backdrop');
    const context = canvas.getContext('2d');
    if (!context) {
        root.classList.remove('intro-pending');
        return;
    }

    const events = new AbortController();
    const on = (target, type, listener, options = {}) =>
        target.addEventListener(type, listener, { ...options, signal: events.signal });
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const content = [...document.querySelectorAll('body > .header, body > .main, body > .footer, #top-link')];
    const previousInert = content.map(element => element.inert);
    const dark = root.dataset.theme === 'dark';
    const colors = dark ? ['215,222,231', '130,221,198', '226,183,123'] : ['80,89,103', '24,124,112', '155,101,49'];
    let width, height, particles, frame, lastTime = 0, progress = 0, settling = null;
    let drag = null, idleTimer, finished = false, exiting = false, revealStart = null;
    const pointer = { x: -1000, y: -1000 };
    const clamp = value => Math.min(1, Math.max(0, value));

    function resize() {
        width = intro.clientWidth;
        height = intro.clientHeight;
        const ratio = Math.min(devicePixelRatio || 1, 1.75);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        const count = Math.min(150, Math.max(55, Math.round(width * height / 8500)));
        particles = Array.from({ length: count }, () => ({
            x: Math.random() * width, y: Math.random() * height,
            vx: (Math.random() - .5) * .22, vy: -.1 - Math.random() * .22,
            radius: .6 + Math.random() * 1.3, phase: Math.random() * Math.PI * 2,
            color: colors[Math.random() < .72 ? 0 : Math.random() < .5 ? 1 : 2]
        }));
    }

    function renderTransition() {
        const shrink = Math.min(progress / .34, 1);
        const flight = Math.max(0, (progress - .34) / .66);
        const y = -Math.pow(flight, 1.55) * height * 1.15;
        const scale = 1 - .18 * shrink;
        surface.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
    }

    function finish() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(frame);
        clearTimeout(idleTimer);
        events.abort();
        root.classList.remove('intro-active', 'intro-pending', 'intro-revealing');
        root.style.removeProperty('--intro-blog-opacity');
        content.forEach((element, index) => { element.inert = previousInert[index]; });
        try { sessionStorage.setItem('blog-intro-seen', '1'); } catch (_) {}
        intro.remove();
        const main = document.querySelector('main');
        const tabIndex = main.getAttribute('tabindex');
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
        if (tabIndex === null) main.removeAttribute('tabindex');
        else main.setAttribute('tabindex', tabIndex);
    }

    function settle(target) {
        if (exiting) return;
        clearTimeout(idleTimer);
        exiting = target === 1;
        settling = { start: progress, target, time: performance.now(), duration: target ? 1050 : 300 };
    }

    function draw(time) {
        if (finished) return;
        const delta = Math.min((time - (lastTime || time)) / 16.67, 2);
        lastTime = time;
        if (settling) {
            const elapsed = clamp((time - settling.time) / settling.duration);
            const ease = elapsed < .5 ? 4 * elapsed ** 3 : 1 - (-2 * elapsed + 2) ** 3 / 2;
            progress = settling.start + (settling.target - settling.start) * ease;
            renderTransition();
            if (elapsed === 1) {
                if (settling.target === 1) {
                    revealStart = time;
                    root.classList.add('intro-revealing');
                }
                settling = null;
            }
        }
        if (revealStart !== null) {
            const elapsed = clamp((time - revealStart) / 500);
            const ease = elapsed * elapsed * (3 - 2 * elapsed);
            intro.style.opacity = 1 - ease;
            root.style.setProperty('--intro-blog-opacity', ease);
            if (elapsed === 1) { finish(); return; }
        }
        context.clearRect(0, 0, width, height);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx * delta;
            p.y += p.vy * delta;
            if (p.y < -12) p.y = height + 12;
            if (p.x < -12) p.x = width + 12;
            if (p.x > width + 12) p.x = -12;
            const dx = p.x - pointer.x, dy = p.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            const force = distance < 180 ? (1 - distance / 180) * 12 : 0;
            const x = p.x + dx / (distance || 1) * force;
            const y = p.y + dy / (distance || 1) * force;
            const opacity = .3 + .32 * (.5 + .5 * Math.sin(time * .0007 + p.phase));
            context.fillStyle = `rgba(${p.color}, ${opacity})`;
            context.beginPath();
            context.arc(x, y, p.radius, 0, Math.PI * 2);
            context.fill();
            if (i % 3 !== 0) continue;
            for (let j = i + 1; j < particles.length; j++) {
                const other = particles[j];
                const gap = Math.hypot(p.x - other.x, p.y - other.y);
                if (gap > 105) continue;
                context.strokeStyle = `rgba(${p.color}, ${(1 - gap / 105) * .13})`;
                context.lineWidth = .6;
                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(other.x, other.y);
                context.stroke();
            }
        }
        frame = requestAnimationFrame(draw);
    }

    on(intro, 'wheel', event => {
        event.preventDefault();
        if (exiting || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
        settling = null;
        const delta = Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
        progress = clamp(progress + Math.min(delta, 120) / 480);
        renderTransition();
        if (progress >= .2) settle(1);
        else {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => settle(progress >= .06 ? 1 : 0), 180);
        }
    }, { passive: false });

    on(intro, 'pointerdown', event => {
        if (exiting || event.button !== 0 || event.target.closest('button')) return;
        clearTimeout(idleTimer);
        settling = null;
        drag = { id: event.pointerId, y: event.clientY, start: progress };
        intro.setPointerCapture(event.pointerId);
    });
    on(intro, 'pointermove', event => {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        if (!drag || drag.id !== event.pointerId || exiting) return;
        progress = clamp(drag.start + (drag.y - event.clientY) / Math.min(height * .65, 480));
        renderTransition();
    });
    on(intro, 'pointerup', event => {
        if (!drag || drag.id !== event.pointerId) return;
        drag = null;
        settle(progress >= .16 ? 1 : 0);
    });
    on(intro, 'pointercancel', () => { drag = null; settle(0); });
    on(intro, 'pointerleave', () => { pointer.x = pointer.y = -1000; });
    on(intro.querySelector('button'), 'click', () => settle(1));
    on(document, 'keydown', event => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (['ArrowUp', 'ArrowDown', 'PageDown', ' ', 'Enter', 'Escape'].includes(event.key)) {
            event.preventDefault();
            if (event.key === 'Escape') finish();
            else settle(1);
        }
    });
    on(window, 'resize', resize);
    on(document, 'visibilitychange', () => {
        cancelAnimationFrame(frame);
        if (!document.hidden) { lastTime = 0; frame = requestAnimationFrame(draw); }
    });
    on(reducedMotion, 'change', event => { if (event.matches) finish(); });
    on(window, 'pagehide', finish);

    intro.hidden = false;
    root.classList.replace('intro-pending', 'intro-active');
    content.forEach(element => { element.inert = true; });
    resize();
    renderTransition();
    frame = requestAnimationFrame(draw);
})();
