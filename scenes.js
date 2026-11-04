/**
 * scenes.js — Multi-Scene Sequencer, Dynamic Camera Pan/Zoom & Transitions
 *
 * Enables multi-scene whiteboard animations with camera pan & zoom focus,
 * hand-wipe/eraser transitions, and seamless scene switching.
 */
(function(window) {
  'use strict';

  const SceneManager = {
    scenes: [],
    activeSceneId: null,
    camera: { x: 0, y: 0, zoom: 1 },
    _transitioning: false,

    init() {
      // Create initial scene if none exists
      if (!this.scenes.length) {
        const firstScene = this._createSceneObject('Scene 1');
        this.scenes.push(firstScene);
        this.activeSceneId = firstScene.id;
      }
      this.renderStrip();
    },

    _createSceneObject(name) {
      return {
        id: 'scene_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: name || 'Scene ' + (this.scenes.length + 1),
        layers: [],
        camera: { x: 0, y: 0, zoom: 1 },
        transition: 'pan', // 'pan' | 'wipe' | 'fade' | 'cut'
        holdSeconds: 1.5,
      };
    },

    getActiveScene() {
      return this.scenes.find(s => s.id === this.activeSceneId) || this.scenes[0];
    },

    addScene(name) {
      this.saveActiveSceneState();
      const sc = this._createSceneObject(name);
      this.scenes.push(sc);
      this.switchScene(sc.id);
    },

    duplicateScene(sceneId) {
      const idx = this.scenes.findIndex(s => s.id === sceneId);
      if (idx === -1) return;
      this.saveActiveSceneState();
      const orig = this.scenes[idx];
      const copy = JSON.parse(JSON.stringify(orig));
      copy.id = 'scene_' + Date.now();
      copy.name = orig.name + ' (Copy)';
      this.scenes.splice(idx + 1, 0, copy);
      this.switchScene(copy.id);
    },

    deleteScene(sceneId) {
      if (this.scenes.length <= 1) {
        if (window.showToast) window.showToast('Projects must have at least one scene.');
        return;
      }
      const idx = this.scenes.findIndex(s => s.id === sceneId);
      if (idx === -1) return;
      this.scenes.splice(idx, 1);
      const nextScene = this.scenes[Math.max(0, idx - 1)];
      this.switchScene(nextScene.id);
    },

    saveActiveSceneState() {
      if (!window.state) return;
      const act = this.getActiveScene();
      if (!act) return;
      // Snapshot current layers and camera
      act.layers = (window.state.layers || []).slice(0);
      act.camera = { ...this.camera };
    },

    switchScene(sceneId) {
      this.saveActiveSceneState();
      this.activeSceneId = sceneId;
      const target = this.getActiveScene();
      if (!target || !window.state) return;

      // Stop any running animation
      if (window.resetAnim) window.resetAnim();

      // Restore target scene's layers
      window.state.layers = (target.layers || []).slice(0);
      window.state.selectedLayerId = null;
      this.camera = target.camera ? { ...target.camera } : { x: 0, y: 0, zoom: 1 };

      if (window.renderLayerList) window.renderLayerList();
      if (window.redrawLayersOnCanvas) window.redrawLayersOnCanvas();
      if (window.drawSelectionHandles) window.drawSelectionHandles();
      this.renderStrip();
    },

    // ───────────── Camera Controls ─────────────
    setZoom(level) {
      this.camera.zoom = Math.max(0.5, Math.min(3.0, level));
      const cur = this.getActiveScene();
      if (cur) cur.camera.zoom = this.camera.zoom;
      this.applyCameraTransform();
      const zoomLbl = document.getElementById('camera-zoom-val');
      if (zoomLbl) zoomLbl.textContent = Math.round(this.camera.zoom * 100) + '%';
    },

    setPan(x, y) {
      this.camera.x = x;
      this.camera.y = y;
      const cur = this.getActiveScene();
      if (cur) { cur.camera.x = x; cur.camera.y = y; }
      this.applyCameraTransform();
    },

    applyCameraTransform() {
      const cvs = document.getElementById('main-canvas');
      if (!cvs) return;
      // Visual CSS preview zoom/pan for intuitive positioning
      cvs.style.transformOrigin = 'center center';
      cvs.style.transition = 'transform 0.3s ease-out';
      cvs.style.transform = `scale(${this.camera.zoom}) translate(${this.camera.x}px, ${this.camera.y}px)`;
    },

    resetCamera() {
      this.setZoom(1);
      this.setPan(0, 0);
    },

    // ───────────── Eraser Wipe Transition ─────────────
    async playEraserWipe(durationMs = 900) {
      if (window.AudioSFX) window.AudioSFX.wipe();
      const mainCvs = document.getElementById('main-canvas');
      const handCvs = document.getElementById('hand-canvas');
      if (!mainCvs) return;

      const mctx = mainCvs.getContext('2d');
      const startT = performance.now();
      const W = mainCvs.width, H = mainCvs.height;

      return new Promise(resolve => {
        function wipeStep(now) {
          const progress = Math.min(1, (now - startT) / durationMs);
          mctx.save();
          mctx.globalCompositeOperation = 'destination-out';
          mctx.fillStyle = 'rgba(0,0,0,1)';
          
          // Draw expanding wiper bands
          const wipeW = W * progress * 1.2;
          mctx.beginPath();
          mctx.rect(0, 0, wipeW, H);
          mctx.fill();
          mctx.restore();

          if (progress < 1) {
            requestAnimationFrame(wipeStep);
          } else {
            mctx.clearRect(0, 0, W, H);
            if (handCvs) handCvs.getContext('2d').clearRect(0, 0, W, H);
            resolve();
          }
        }
        requestAnimationFrame(wipeStep);
      });
    },

    // ───────────── Scene Strip UI ─────────────
    renderStrip() {
      const container = document.getElementById('scene-strip-items');
      if (!container) return;
      container.innerHTML = '';

      this.scenes.forEach((sc, i) => {
        const isAct = sc.id === this.activeSceneId;
        const item = document.createElement('div');
        item.className = 'scene-strip-card' + (isAct ? ' active' : '');
        item.onclick = () => this.switchScene(sc.id);

        const title = document.createElement('span');
        title.className = 'scene-card-title';
        title.textContent = sc.name;

        const count = document.createElement('span');
        count.className = 'scene-card-count';
        count.textContent = `${(sc.layers || []).length} layer${(sc.layers || []).length !== 1 ? 's' : ''}`;

        const actions = document.createElement('div');
        actions.className = 'scene-card-actions';

        if (this.scenes.length > 1) {
          const del = document.createElement('button');
          del.className = 'scene-card-btn';
          del.innerHTML = '🗑️';
          del.title = 'Delete Scene';
          del.onclick = (e) => { e.stopPropagation(); this.deleteScene(sc.id); };
          actions.appendChild(del);
        }

        const dup = document.createElement('button');
        dup.className = 'scene-card-btn';
        dup.innerHTML = '📋';
        dup.title = 'Duplicate Scene';
        dup.onclick = (e) => { e.stopPropagation(); this.duplicateScene(sc.id); };
        actions.appendChild(dup);

        item.append(title, count, actions);
        container.appendChild(item);
      });
    }
  };

  window.SceneManager = SceneManager;
  document.addEventListener('DOMContentLoaded', () => SceneManager.init());
})(window);
