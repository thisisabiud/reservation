document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('floorPlanContainer');
    const zoomContainer = document.getElementById('floorPlanZoomContainer');
    const image = zoomContainer.querySelector('img');
    
    let scale = 1;
    let panning = false;
    let pointX = 0;
    let pointY = 0;
    let start = { x: 0, y: 0 };

    // Zoom Controls
    document.getElementById('zoomIn').addEventListener('click', () => {
        scale = Math.min(scale * 1.2, 4); // Max zoom 4x
        updateTransform();
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
        scale = Math.max(scale / 1.2, 0.5); // Min zoom 0.5x
        updateTransform();
    });

    document.getElementById('resetZoom').addEventListener('click', () => {
        scale = 1;
        pointX = 0;
        pointY = 0;
        updateTransform();
    });

    // Pan functionality
    zoomContainer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        start = { x: e.clientX - pointX, y: e.clientY - pointY };
        panning = true;
    });

    document.addEventListener('mousemove', (e) => {
        if (!panning) return;
        pointX = (e.clientX - start.x);
        pointY = (e.clientY - start.y);
        updateTransform();
    });

    document.addEventListener('mouseup', () => {
        panning = false;
    });

    // Touch support
    zoomContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        start = { 
            x: e.touches[0].clientX - pointX, 
            y: e.touches[0].clientY - pointY 
        };
        panning = true;
    });

    document.addEventListener('touchmove', (e) => {
        if (!panning) return;
        pointX = (e.touches[0].clientX - start.x);
        pointY = (e.touches[0].clientY - start.y);
        updateTransform();
    });

    document.addEventListener('touchend', () => {
        panning = false;
    });

    function updateTransform() {
        zoomContainer.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    }
});