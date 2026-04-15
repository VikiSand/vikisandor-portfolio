// Custom cursor — dot + lazy-follow ring
(function () {
    const cursor    = document.getElementById('cursor');
    const cursorRing = document.getElementById('cursorRing');
    if (!cursor || !cursorRing) return;

    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.style.left = mouseX + 'px';
        cursor.style.top  = mouseY + 'px';
    });

    (function animateRing() {
        ringX += (mouseX - ringX) * 0.12;
        ringY += (mouseY - ringY) * 0.12;
        cursorRing.style.left = ringX + 'px';
        cursorRing.style.top  = ringY + 'px';
        requestAnimationFrame(animateRing);
    })();

    // Expose globally so renderProjects() can call it on new cards
    window.addHoverCursor = function (selector) {
        document.querySelectorAll(selector).forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.classList.add('hover');
                cursorRing.classList.add('hover');
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('hover');
                cursorRing.classList.remove('hover');
            });
        });
    };

    window.addHoverCursor('a, button');
})();
