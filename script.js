let currentMode = 'none';
let isDrawing = false;
let currentOverlay = null;
let overlays = [];
const svg = document.getElementById('bodyDiagram');
const overlayGroup = document.getElementById('overlayGroup');
const lastSavedElement = document.getElementById('lastSaved');
let selectedOverlay = null;
let isDragging = false;
let isResizing = false;
let startX, startY, initialRadiusX, initialRadiusY;

const STATE_KEY = 'bodyDiagramState';

function getStoredState() {
    try {
        const stored = localStorage.getItem(STATE_KEY);
        if (!stored) return null;
        
        const state = JSON.parse(stored);
        return {
            overlays: state.overlays || [],
            lastSaved: state.lastSaved || null,
            currentMode: state.currentMode || 'none'
        };
    } catch (error) {
        console.error('Error loading stored state:', error);
        return null;
    }
}

function loadSavedState() {
    const state = getStoredState();
    if (!state) return;
    
    overlays = state.overlays;
    renderOverlays();
    
    if (state.currentMode && state.currentMode !== 'none') {
        setMode(state.currentMode);
    }
    
    updateLastSavedTimestamp(state.lastSaved);
}

function updateLastSavedTimestamp(timestamp = null) {
    if (!timestamp) return;
    
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleString();
    lastSavedElement.textContent = `Last saved: ${formattedDate}`;
}

function getSVGCoordinates(event) {
    const pt = svg.createSVGPoint();
    if (event.touches && event.touches.length > 0) {
        pt.x = event.touches[0].clientX;
        pt.y = event.touches[0].clientY;
    } else {
        pt.x = event.clientX;
        pt.y = event.clientY;
    }
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function setMode(mode) {
    currentMode = mode === currentMode ? 'none' : mode;
    
    document.getElementById('modeIndicator').textContent = 
        `Current Mode: ${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}`;
    
    document.getElementById('burnBtn').classList.toggle('active-button', mode === 'burn');
    document.getElementById('cutBtn').classList.toggle('active-button', mode === 'cut');
}

svg.addEventListener('mousedown', handleDrawStart);
svg.addEventListener('touchstart', handleDrawStart);

function handleDrawStart(e) {
    if (currentMode === 'none') return;
    
    const svgP = getSVGCoordinates(e);
    isDrawing = true;
    
    currentOverlay = {
        id: Date.now(),
        type: currentMode,
        centerX: svgP.x,
        centerY: svgP.y,
        radiusX: 0,
        radiusY: 0
    };
    
    renderCurrentOverlay();
}

svg.addEventListener('mousemove', handleDrawMove);
svg.addEventListener('touchmove', handleDrawMove);

function handleDrawMove(e) {
    if (!isDrawing || !currentOverlay) return;
    
    const svgP = getSVGCoordinates(e);
    const dx = svgP.x - currentOverlay.centerX;
    const dy = svgP.y - currentOverlay.centerY;
    
    currentOverlay.radiusX = Math.abs(dx);
    currentOverlay.radiusY = Math.abs(dy);
    
    renderCurrentOverlay();
}

svg.addEventListener('mouseup', finishDrawing);
svg.addEventListener('mouseleave', finishDrawing);
svg.addEventListener('touchend', finishDrawing);

function finishDrawing() {
    if (!isDrawing || !currentOverlay) return;
    
    isDrawing = false;
    overlays.push(currentOverlay);
    currentOverlay = null;
    renderOverlays();
}

function renderOverlays() {
    overlayGroup.innerHTML = '';
    overlays.forEach(renderOverlay);
}

function renderCurrentOverlay() {
    if (!currentOverlay) return;
    
    const existing = document.getElementById('currentOverlay');
    if (existing) existing.remove();
    
    renderOverlay(currentOverlay, 'currentOverlay');
}

function renderOverlay(overlay, id = `overlay-${overlay.id}`) {
    const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipse.id = id;
    ellipse.setAttribute('cx', overlay.centerX);
    ellipse.setAttribute('cy', overlay.centerY);
    ellipse.setAttribute('rx', overlay.radiusX);
    ellipse.setAttribute('ry', overlay.radiusY);
    ellipse.classList.add('overlay-ellipse', `${overlay.type}-overlay`);

    enableMoveOrResize(ellipse);

    overlayGroup.appendChild(ellipse);
}

function enableMoveOrResize(overlay) {
    overlay.addEventListener('mousedown', (e) => {
        selectOverlay(overlay);
        const svgP = getSVGCoordinates(e);
        startX = svgP.x;
        startY = svgP.y;

        if (Math.abs(svgP.x - overlay.cx.baseVal.value) < 10 && Math.abs(svgP.y - overlay.cy.baseVal.value) < 10) {
            isResizing = true;
            initialRadiusX = overlay.rx.baseVal.value;
            initialRadiusY = overlay.ry.baseVal.value;
        } else {
            isDragging = true;
        }
    });

    overlay.addEventListener('touchstart', (e) => {
        selectOverlay(overlay);
        const svgP = getSVGCoordinates(e);
        startX = svgP.x;
        startY = svgP.y;

        if (Math.abs(svgP.x - overlay.cx.baseVal.value) < 10 && Math.abs(svgP.y - overlay.cy.baseVal.value) < 10) {
            isResizing = true;
            initialRadiusX = overlay.rx.baseVal.value;
            initialRadiusY = overlay.ry.baseVal.value;
        } else {
            isDragging = true;
        }
    });
}

function moveOrResizeOverlay(e) {
    if (!selectedOverlay) return;
    const svgP = getSVGCoordinates(e);
    
    if (isDragging) {
        const dx = svgP.x - startX;
        const dy = svgP.y - startY;
        selectedOverlay.setAttribute('cx', selectedOverlay.cx.baseVal.value + dx);
        selectedOverlay.setAttribute('cy', selectedOverlay.cy.baseVal.value + dy);
        startX = svgP.x;
        startY = svgP.y;
    } else if (isResizing) {
        const dx = svgP.x - startX;
        const dy = svgP.y - startY;
        selectedOverlay.setAttribute('rx', initialRadiusX + dx);
        selectedOverlay.setAttribute('ry', initialRadiusY + dy);
    }
}

svg.addEventListener('mousemove', (e) => {
    moveOrResizeOverlay(e);
});

svg.addEventListener('touchmove', (e) => {
    moveOrResizeOverlay(e);
});

svg.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
});

svg.addEventListener('touchend', () => {
    isDragging = false;
    isResizing = false;
});

svg.addEventListener('mouseleave', () => {
    isDragging = false;
    isResizing = false;
});

function selectOverlay(overlay) {
    if (selectedOverlay) {
        selectedOverlay.classList.remove('selected');
    }
    selectedOverlay = overlay;
    selectedOverlay.classList.add('selected');
    document.getElementById('deleteBtn').disabled = false; 
}

function deselectOverlay() {
    if (selectedOverlay) {
        selectedOverlay.classList.remove('selected');
        selectedOverlay = null;
        document.getElementById('deleteBtn').disabled = true; 
    }
}

svg.addEventListener('mousedown', (e) => {
    if (e.target.tagName !== 'ellipse') {
        deselectOverlay();
    }
});

svg.addEventListener('touchstart', (e) => {
    if (e.target.tagName !== 'ellipse') {
        deselectOverlay();
    }
});

function deleteOverlay() {
    if (!selectedOverlay) return;
    
    selectedOverlay.remove();

    overlays = overlays.filter(o => `overlay-${o.id}` !== selectedOverlay.id);

    deselectOverlay(); 
}

function saveState() {
    const state = {
        overlays,
        lastSaved: new Date().toISOString(),
        currentMode
    };
    
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    updateLastSavedTimestamp(state.lastSaved);
    
    const toast = new bootstrap.Toast(Object.assign(document.createElement('div'), {
        className: 'toast position-fixed top-0 end-0 m-3',
        innerHTML: `
            <div class="toast-header">
                <strong class="me-auto">Success</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">State saved successfully!</div>
        `
    }));
    document.body.appendChild(toast.element);
    toast.show();
    setTimeout(() => toast.element.remove(), 3000);
}

function resetState() {
    localStorage.removeItem(STATE_KEY);
    overlays = [];
    currentMode = 'none';
    renderOverlays();
    setMode('none');
    lastSavedElement.textContent = '';
}

function clearAll() {
    overlays = [];
    currentMode = 'none';
    renderOverlays();
    setMode('none');
}

document.addEventListener('DOMContentLoaded', () => {
    loadSavedState();

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 's') {
                e.preventDefault();
                saveState();
            }
        }
    });
});
