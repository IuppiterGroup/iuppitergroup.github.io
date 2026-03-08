// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (toggle && links) {
        toggle.addEventListener('click', () => links.classList.toggle('open'));
    }

    // Hero particle effect — gold and red particles
    const canvas = document.getElementById('particles');
    if (canvas) {
        const parent = canvas.parentElement;
        const c = document.createElement('canvas');
        c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        canvas.appendChild(c);
        const ctx = c.getContext('2d');
        
        function resize() { c.width = parent.offsetWidth; c.height = parent.offsetHeight; }
        resize();
        window.addEventListener('resize', resize);

        const particles = [];
        for (let i = 0; i < 60; i++) {
            const isRed = Math.random() < 0.3;
            particles.push({
                x: Math.random() * 2000, y: Math.random() * 1200,
                r: Math.random() * 1.5 + 0.3,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.2 - 0.08,
                alpha: Math.random() * 0.4 + 0.1,
                color: isRed ? [139, 26, 26] : [196, 164, 74],
            });
        }

        function animate() {
            ctx.clearRect(0, 0, c.width, c.height);
            for (const p of particles) {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
                if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${p.alpha})`;
                ctx.fill();
            }
            requestAnimationFrame(animate);
        }
        animate();
    }

    // Initialize homepage quote widget
    if (document.getElementById('quoteText') && typeof getRandomQuote === 'function') {
        nextQuote();
    }
});

// Homepage quote cycling
let currentCategory = 'all';

function nextQuote(category) {
    if (category) currentCategory = category;
    const quote = getRandomQuote(currentCategory);
    if (!quote) return;
    
    const textEl = document.getElementById('quoteText');
    const authorEl = document.getElementById('quoteAuthor');
    const eraEl = document.getElementById('quoteEra');
    
    if (!textEl) return;
    
    // Fade out
    textEl.classList.add('fading');
    authorEl.classList.add('fading');
    eraEl.classList.add('fading');
    
    setTimeout(() => {
        textEl.textContent = '"' + quote.q + '"';
        authorEl.textContent = '— ' + quote.a.toUpperCase();
        eraEl.textContent = quote.era + ' · ' + quote.civ;
        
        // Fade in
        textEl.classList.remove('fading');
        authorEl.classList.remove('fading');
        eraEl.classList.remove('fading');
    }, 400);
}
