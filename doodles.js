/**
 * doodles.js — Free CC0 Vector Doodle & Shape Library for Whiteboard Animators
 *
 * 100% royalty-free vector drawings rendered onto the canvas as layers.
 * Designed specifically for hand-drawn whiteboard animations.
 */
(function(window) {
  'use strict';

  const DOODLES = [
    // ── Arrows & Pointers ──
    {
      id: 'arrow-right',
      name: 'Sketch Arrow',
      cat: 'arrows',
      viewBox: '0 0 200 100',
      svg: `<path d="M 20,50 Q 80,45 150,50 L 130,30 M 150,50 L 130,70" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'arrow-curved',
      name: 'Curved Arrow',
      cat: 'arrows',
      viewBox: '0 0 200 140',
      svg: `<path d="M 30,110 Q 70,30 160,40 L 135,20 M 160,40 L 140,65" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'arrow-loop',
      name: 'Cycle Loop',
      cat: 'arrows',
      viewBox: '0 0 160 160',
      svg: `<path d="M 130,80 A 50,50 0 1,1 80,30 L 95,15 M 80,30 L 95,45" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'arrow-double',
      name: 'Double Arrow',
      cat: 'arrows',
      viewBox: '0 0 200 100',
      svg: `<path d="M 30,50 L 170,50 M 50,30 L 30,50 L 50,70 M 150,30 L 170,50 L 150,70" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
    },

    // ── Callouts & Containers ──
    {
      id: 'speech-bubble',
      name: 'Speech Bubble',
      cat: 'containers',
      viewBox: '0 0 200 160',
      svg: `<path d="M 30,20 Q 20,20 20,30 L 20,90 Q 20,100 30,100 L 50,100 L 40,140 L 90,100 L 170,100 Q 180,100 180,90 L 180,30 Q 180,20 170,20 Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'thought-bubble',
      name: 'Thought Bubble',
      cat: 'containers',
      viewBox: '0 0 200 160',
      svg: `<path d="M 40,75 C 20,65 25,35 55,40 C 65,15 105,15 120,35 C 145,15 175,35 165,65 C 185,85 170,115 140,110 C 120,125 70,125 55,105 C 30,110 15,90 40,75 Z M 45,135 A 8,8 0 1,1 45,134 M 30,150 A 5,5 0 1,1 30,149" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'sticky-note',
      name: 'Sticky Note',
      cat: 'containers',
      viewBox: '0 0 180 180',
      svg: `<path d="M 25,25 L 155,25 L 155,120 L 120,155 L 25,155 Z M 120,120 L 155,120 M 120,120 L 120,155" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'sketch-box',
      name: 'Sketch Frame',
      cat: 'containers',
      viewBox: '0 0 200 140',
      svg: `<path d="M 20,25 Q 100,18 180,22 Q 185,70 178,118 Q 95,122 22,115 Q 15,68 20,25" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'highlight-oval',
      name: 'Highlight Oval',
      cat: 'containers',
      viewBox: '0 0 200 120',
      svg: `<path d="M 25,60 C 25,25 175,20 175,60 C 175,100 20,95 35,55" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    },

    // ── Business & Ideas ──
    {
      id: 'lightbulb',
      name: 'Idea Lightbulb',
      cat: 'business',
      viewBox: '0 0 160 200',
      svg: `<path d="M 80,30 C 50,30 40,55 45,80 C 48,98 62,110 65,125 L 95,125 C 98,110 112,98 115,80 C 120,55 110,30 80,30 Z M 65,135 L 95,135 M 68,145 L 92,145 M 75,155 L 85,155 M 80,10 L 80,20 M 35,35 L 45,45 M 125,35 L 115,45 M 20,80 L 30,80 M 140,80 L 130,80" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'target',
      name: 'Goal Target',
      cat: 'business',
      viewBox: '0 0 180 180',
      svg: `<circle cx="90" cy="90" r="70" fill="none" stroke="currentColor" stroke-width="7"/><circle cx="90" cy="90" r="45" fill="none" stroke="currentColor" stroke-width="7"/><circle cx="90" cy="90" r="20" fill="none" stroke="currentColor" stroke-width="7"/><path d="M 90,10 L 90,35 M 90,145 L 90,170 M 10,90 L 35,90 M 145,90 L 170,90" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>`
    },
    {
      id: 'bar-chart',
      name: 'Growth Chart',
      cat: 'business',
      viewBox: '0 0 180 160',
      svg: `<path d="M 25,20 L 25,135 L 165,135 M 45,135 L 45,95 L 65,95 L 65,135 M 80,135 L 80,65 L 100,65 L 100,135 M 115,135 L 115,35 L 135,35 L 135,135 M 35,85 L 75,55 L 110,70 L 155,25 L 140,25 M 155,25 L 155,40" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'checklist',
      name: 'Checklist',
      cat: 'business',
      viewBox: '0 0 160 180',
      svg: `<path d="M 35,25 L 125,25 Q 135,25 135,35 L 135,155 Q 135,165 125,165 L 35,165 Q 25,165 25,155 L 25,35 Q 25,25 35,25 Z M 45,55 L 55,65 L 75,45 M 85,55 L 115,55 M 45,95 L 55,105 L 75,85 M 85,95 L 115,95 M 45,135 L 55,145 L 75,125 M 85,135 L 115,135" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'gear',
      name: 'Settings Gear',
      cat: 'business',
      viewBox: '0 0 180 180',
      svg: `<path d="M 80,20 L 100,20 L 103,42 Q 112,46 120,52 L 139,39 L 153,53 L 140,72 Q 146,80 150,89 L 172,92 L 172,112 L 150,115 Q 146,124 140,132 L 153,151 L 139,165 L 120,152 Q 112,158 103,162 L 100,184 L 80,184 L 77,162 Q 68,158 60,152 L 41,165 L 27,151 L 40,132 Q 34,124 30,115 L 8,112 L 8,92 L 30,89 Q 34,80 40,72 L 27,53 L 41,39 L 60,52 Q 68,46 77,42 Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="90" cy="102" r="28" fill="none" stroke="currentColor" stroke-width="7"/>`
    },
    {
      id: 'shield',
      name: 'Security Shield',
      cat: 'business',
      viewBox: '0 0 160 180',
      svg: `<path d="M 80,25 Q 135,25 135,50 C 135,115 100,145 80,165 C 60,145 25,115 25,50 Q 25,25 80,25 Z M 55,90 L 75,110 L 110,65" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'rocket',
      name: 'Launch Rocket',
      cat: 'business',
      viewBox: '0 0 180 200',
      svg: `<path d="M 90,20 C 115,50 125,90 120,130 L 60,130 C 55,90 65,50 90,20 Z M 60,110 L 35,135 L 45,155 L 63,145 M 120,110 L 145,135 L 135,155 L 117,145 M 90,65 A 15,15 0 1,1 90,64 M 70,145 Q 90,185 90,185 Q 90,185 110,145" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    },

    // ── Symbols & Icons ──
    {
      id: 'check-badge',
      name: 'Checkmark',
      cat: 'symbols',
      viewBox: '0 0 160 160',
      svg: `<circle cx="80" cy="80" r="65" fill="none" stroke="currentColor" stroke-width="8"/><path d="M 45,82 L 70,107 L 120,55" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'cross-badge',
      name: 'Cross / X',
      cat: 'symbols',
      viewBox: '0 0 160 160',
      svg: `<circle cx="80" cy="80" r="65" fill="none" stroke="currentColor" stroke-width="8"/><path d="M 50,50 L 110,110 M 110,50 L 50,110" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>`
    },
    {
      id: 'star-doodle',
      name: 'Sketch Star',
      cat: 'symbols',
      viewBox: '0 0 160 160',
      svg: `<path d="M 80,15 L 98,58 L 145,62 L 109,93 L 120,140 L 80,115 L 40,140 L 51,93 L 15,62 L 62,58 Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'heart-doodle',
      name: 'Heart',
      cat: 'symbols',
      viewBox: '0 0 160 160',
      svg: `<path d="M 80,140 C 30,105 15,65 35,40 C 55,15 75,30 80,45 C 85,30 105,15 125,40 C 145,65 130,105 80,140 Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'question-mark',
      name: 'Question Mark',
      cat: 'symbols',
      viewBox: '0 0 140 180',
      svg: `<path d="M 40,60 C 40,25 100,25 100,60 C 100,85 70,90 70,120 M 70,145 A 5,5 0 1,1 70,144" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    {
      id: 'clock-doodle',
      name: 'Clock / Time',
      cat: 'symbols',
      viewBox: '0 0 160 160',
      svg: `<circle cx="80" cy="80" r="65" fill="none" stroke="currentColor" stroke-width="8"/><path d="M 80,35 L 80,80 L 110,95" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
    }
  ];

  const DoodleLibrary = {
    getAll() { return DOODLES; },
    getByCategory(cat) { return cat === 'all' ? DOODLES : DOODLES.filter(d => d.cat === cat); },

    /**
     * Converts a doodle SVG into a PNG data URL so it can be added directly as a canvas layer.
     */
    async toDataURL(doodleId, color = '#18181b', scale = 2) {
      const d = DOODLES.find(x => x.id === doodleId);
      if (!d) return null;
      const [,, w, h] = d.viewBox.split(' ').map(Number);
      const svgStr = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="${d.viewBox}" width="${w * scale}" height="${h * scale}">
          <g color="${color}">
            ${d.svg}
          </g>
        </svg>
      `;
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const cvs = document.createElement('canvas');
          cvs.width = w * scale;
          cvs.height = h * scale;
          const c = cvs.getContext('2d');
          c.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          resolve(cvs.toDataURL('image/png'));
        };
        img.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(e);
        };
        img.src = url;
      });
    }
  };

  window.DoodleLibrary = DoodleLibrary;
})(window);
