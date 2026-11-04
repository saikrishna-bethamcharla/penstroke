/**
 * project.js — Standalone Project File Exporter & Importer (.inkplainer)
 *
 * Allows clients to export full project files (.inkplainer) directly to their computer,
 * including all images, scenes, camera settings, and audio tracks, surviving browser resets.
 */
(function(window) {
  'use strict';

  const ProjectFile = {
    /**
     * Exports the current project to a downloadable .inkplainer file
     */
    async exportFile() {
      if (!window.state) return;
      if (window.SceneManager) window.SceneManager.saveActiveSceneState();

      // Serialize audio tracks
      let audioData = null;
      if (window.AudioMix && typeof window.AudioMix.serialize === 'function') {
        try {
          audioData = await window.AudioMix.serialize();
        } catch (e) {
          console.warn('Failed to serialize audio:', e);
        }
      }

      // Collect layer data with images
      const serializedLayers = (window.state.layers || []).map(layer => ({
        id: layer.id,
        name: layer.name,
        imageDataURL: window.getImageDataURL ? window.getImageDataURL(layer.img) : null,
        origImageDataURL: (layer._origImg && window.getImageDataURL) ? window.getImageDataURL(layer._origImg) : null,
        origX: layer._origX, origY: layer._origY,
        origW: layer._origW, origH: layer._origH,
        x: layer.x, y: layer.y, w: layer.w, h: layer.h,
        baseW: layer.baseW, baseH: layer.baseH,
        resizePct: layer.resizePct,
        animStyle: layer.animStyle,
        hand: layer.hand,
        animOrder: layer.animOrder,
        opacity: layer.opacity,
        visible: layer.visible,
        groupId: layer.groupId,
        speed: layer.speed,
        handSpeed: layer.handSpeed,
        chunks: layer.chunks,
        specChunks: layer.specChunks,
        hasPngAlpha: layer.hasPngAlpha,
        outlineDetect: layer.outlineDetect,
        outlineAlgorithm: layer.outlineAlgorithm,
        outlineStrokeStyle: layer.outlineStrokeStyle,
        colorStyle: layer.colorStyle,
        outlineColor: layer.outlineColor,
        outlineThickness: layer.outlineThickness,
        textAnimDir: layer.textAnimDir,
        textDrawStyle: layer.textDrawStyle,
        zigzag: layer.zigzag,
      }));

      const projectData = {
        app: 'Penstroke Studio',
        version: 2,
        exportedAt: new Date().toISOString(),
        name: (window.state.projectName || 'My Whiteboard Project'),
        canvasW: window.state.canvasW,
        canvasH: window.state.canvasH,
        canvasBg: window.state.canvasBg,
        animStyle: window.state.animStyle,
        hand: window.state.hand,
        zigzag: window.state.zigzag,
        outlineDetect: window.state.outlineDetect,
        outlineAlgorithm: window.state.outlineAlgorithm,
        outlineStrokeStyle: window.state.outlineStrokeStyle,
        colorStyle: window.state.colorStyle,
        groups: window.state.groups,
        layers: serializedLayers,
        scenes: (window.SceneManager && window.SceneManager.scenes) || [],
        audio: audioData
      };

      const jsonStr = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const safeName = (projectData.name || 'project').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();

      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.penstroke`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (window.showToast) window.showToast('Project file exported successfully!');
    },

    /**
     * Imports a .inkplainer file and restores the entire project
     */
    async importFile(file) {
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data || !data.canvasW) {
          throw new Error('Invalid or corrupted project file.');
        }

        if (window.showToast) window.showToast('Importing project...');

        // Stop playback
        if (window.resetAnim) window.resetAnim();

        // Restore canvas properties
        window.state.canvasW = data.canvasW || 1280;
        window.state.canvasH = data.canvasH || 720;
        window.state.canvasBg = data.canvasBg || { type: 'solid', val: '#ffffff' };
        window.state.animStyle = data.animStyle || 'chunkjump';
        window.state.hand = data.hand || 'custom1';
        window.state.zigzag = data.zigzag !== undefined ? data.zigzag : true;
        window.state.groups = data.groups || [];

        if (window.initCanvas) window.initCanvas(window.state.canvasW, window.state.canvasH);
        if (window.selectBgPreset && window.state.canvasBg) {
          window.selectBgPreset(null, window.state.canvasBg.type, window.state.canvasBg.val);
        }

        // Restore scenes if available
        if (window.SceneManager && Array.isArray(data.scenes) && data.scenes.length > 0) {
          window.SceneManager.scenes = data.scenes;
          window.SceneManager.activeSceneId = data.scenes[0].id;
        }

        // Restore layers asynchronously
        window.state.layers = [];
        if (Array.isArray(data.layers)) {
          for (const ld of data.layers) {
            const img = new Image();
            await new Promise(res => {
              img.onload = res;
              img.onerror = res;
              img.src = ld.imageDataURL || '';
            });
            window.state.layers.push({
              ...ld,
              img,
              _origImg: img
            });
          }
        }

        // Restore Audio tracks
        if (window.AudioMix && data.audio) {
          await window.AudioMix.deserialize(data.audio);
        }

        // Refresh UI
        if (window.renderLayerList) window.renderLayerList();
        if (window.redrawLayersOnCanvas) window.redrawLayersOnCanvas();
        if (window.drawSelectionHandles) window.drawSelectionHandles();
        if (window.SceneManager) window.SceneManager.renderStrip();

        if (window.showToast) window.showToast('Project imported successfully!');
      } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to import project: ' + err.message);
      }
    }
  };

  window.ProjectFile = ProjectFile;
})(window);
