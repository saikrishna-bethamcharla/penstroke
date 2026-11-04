/**
 * audio.js — Voiceover, Music & Procedural Sound Effects for Inkplainer
 *
 * 100% local: files are decoded with the Web Audio API in the browser and never uploaded.
 * Features:
 *   - Voiceover & Music tracks with waveform, volume, offset, looping
 *   - Auto-ducking (music lowers when voiceover speaks)
 *   - Procedural 0 KB Sound Effects (Pencil, Marker, Chalk, Eraser, Whoosh) synthesized via Web Audio
 *   - In-browser Microphone voiceover recording
 *   - Audio serialization/deserialization for saving & loading .inkplainer project files
 *   - Audio mixing in WebM & MP4 export
 */
(function (window) {
  'use strict';

  const SR = 48000;            // export sample rate
  const DUCK_LEVEL = 0.28;     // music gain multiplier while a voiceover is speaking
  const DUCK_RAMP = 0.25;      // seconds to fade down / up
  let _idSeq = 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCEDURAL 0 KB SOUND EFFECTS ENGINE (Web Audio API Synth)
  // ═══════════════════════════════════════════════════════════════════════════
  const AudioSFX = {
    enabled: true,
    type: 'pencil', // 'pencil' | 'marker' | 'chalk' | 'none'
    volume: 0.5,
    _noiseBuf: null,
    _lastTick: 0,

    _getNoise(ctx) {
      if (this._noiseBuf && this._noiseBuf.sampleRate === ctx.sampleRate) return this._noiseBuf;
      const len = ctx.sampleRate * 2; // 2 seconds of pink/white noise
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise filter
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      this._noiseBuf = buf;
      return buf;
    },

    /**
     * Triggers a friction sound burst when the pen draws on canvas
     */
    tick() {
      if (!this.enabled || this.type === 'none' || this.volume <= 0.01) return;
      const now = performance.now();
      if (now - this._lastTick < 45) return; // rate-limit to ~20 bursts/sec
      this._lastTick = now;

      const ctx = AudioMix._ensureCtx();
      if (!ctx || ctx.state !== 'running') return;

      const t = ctx.currentTime;
      const noise = ctx.createBufferSource();
      noise.buffer = this._getNoise(ctx);
      noise.loop = true;
      noise.loopStart = Math.random() * 0.5;
      noise.loopEnd = noise.loopStart + 0.1;

      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      if (this.type === 'pencil') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3200 + (Math.random() * 800 - 400), t);
        filter.Q.setValueAtTime(3.5, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(this.volume * 0.22, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      } else if (this.type === 'chalk') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800 + (Math.random() * 500 - 250), t);
        filter.Q.setValueAtTime(2.0, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(this.volume * 0.35, t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
      } else if (this.type === 'marker') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2600 + (Math.random() * 400 - 200), t);
        filter.Q.setValueAtTime(4.0, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(this.volume * 0.18, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      }

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      if (AudioMix.exportDest) gain.connect(AudioMix.exportDest);

      noise.start(t);
      noise.stop(t + 0.07);
    },

    /**
     * Triggers an eraser / duster whoosh wipe sound
     */
    wipe() {
      if (!this.enabled || this.volume <= 0.01) return;
      const ctx = AudioMix._ensureCtx();
      if (!ctx || ctx.state !== 'running') return;

      const t = ctx.currentTime;
      const noise = ctx.createBufferSource();
      noise.buffer = this._getNoise(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, t);
      filter.frequency.exponentialRampToValueAtTime(2200, t + 0.2);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.45);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(this.volume * 0.4, t + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      if (AudioMix.exportDest) gain.connect(AudioMix.exportDest);

      noise.start(t);
      noise.stop(t + 0.55);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIO MIXER & TRACK SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  const AudioMix = {
    tracks: [],        // { id, name, kind:'voice'|'music', buffer, volume, offset, loop, originalBlob }
    duck: true,
    ctx: null,
    exportDest: null,  // MediaStreamAudioDestinationNode (WebM export)
    _live: [],         // currently playing { src, gain }
    _startCtxTime: null,
    lastStartPerf: null,
    _recordingStream: null,
    _mediaRecorder: null,
    _isRecordingMic: false,

    // ───────────── context ─────────────
    _ensureCtx() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { this.ctx = new AC({ sampleRate: SR }); } catch (e) { this.ctx = new AC(); }
      }
      if (this.ctx.state === 'suspended' && !this._paused) this.ctx.resume().catch(() => {});
      return this.ctx;
    },

    hasTracks() { return this.tracks.length > 0; },

    /** Seconds until the last non-looping track ends (looping music never extends the video). */
    endTime() {
      let end = 0;
      for (const t of this.tracks) {
        if (t.kind === 'music' && t.loop) continue;
        end = Math.max(end, t.offset + t.buffer.duration);
      }
      return end;
    },

    // ───────────── adding / removing ─────────────
    async addFiles(fileList, kind) {
      const ctx = this._ensureCtx();
      if (!ctx) { toast('Your browser does not support Web Audio.'); return; }
      for (const file of Array.from(fileList || [])) {
        try {
          const data = await file.arrayBuffer();
          const buffer = await ctx.decodeAudioData(data.slice(0));
          this.tracks.push({
            id: _idSeq++,
            name: file.name.replace(/\.[^.]+$/, ''),
            kind,
            buffer,
            volume: kind === 'music' ? 0.5 : 1,
            offset: 0,
            loop: kind === 'music',
            originalBlob: file
          });
        } catch (e) {
          console.error('Audio decode failed:', e);
          toast('Could not read "' + file.name + '". Try MP3, WAV, M4A or OGG.');
        }
      }
      this.render();
    },

    async addBuffer(name, kind, buffer, blob = null) {
      this.tracks.push({
        id: _idSeq++,
        name,
        kind,
        buffer,
        volume: kind === 'music' ? 0.5 : 1,
        offset: 0,
        loop: kind === 'music',
        originalBlob: blob
      });
      this.render();
    },

    remove(id) {
      this.tracks = this.tracks.filter(t => t.id !== id);
      this.stop();
      this.render();
    },

    // ───────────── graph building (shared by live preview and offline export) ─────────────
    _schedule(ctx, destinations, base, totalDuration) {
      const nodes = [];
      const voices = this.tracks.filter(t => t.kind === 'voice');
      for (const t of this.tracks) {
        const src = ctx.createBufferSource();
        src.buffer = t.buffer;
        const gain = ctx.createGain();
        gain.gain.value = t.volume;

        if (t.kind === 'music' && t.loop) src.loop = true;

        // Auto-ducking: lower this music track while any voiceover is speaking
        if (t.kind === 'music' && this.duck && voices.length) {
          const g = gain.gain;
          g.setValueAtTime(t.volume, base);
          const spans = voices
            .map(v => [v.offset, v.offset + v.buffer.duration])
            .sort((a, b) => a[0] - b[0]);
          for (const [s, e] of spans) {
            const sT = base + s, eT = base + e;
            g.setValueAtTime(t.volume, Math.max(base, sT - DUCK_RAMP));
            g.linearRampToValueAtTime(t.volume * DUCK_LEVEL, sT);
            g.setValueAtTime(t.volume * DUCK_LEVEL, eT);
            g.linearRampToValueAtTime(t.volume, eT + DUCK_RAMP);
          }
        }

        src.connect(gain);
        destinations.forEach(d => gain.connect(d));
        src.start(base + t.offset);
        if (src.loop && totalDuration) { try { src.stop(base + totalDuration); } catch (e) {} }
        nodes.push({ src, gain });
      }
      return nodes;
    },

    // ───────────── live preview ─────────────
    start() {
      this.stop();
      if (!this.hasTracks()) return;
      const ctx = this._ensureCtx();
      if (!ctx) return;
      this._paused = false;
      const dests = [ctx.destination];
      if (this.exportDest) dests.push(this.exportDest);
      this._startCtxTime = ctx.currentTime + 0.05;
      this.lastStartPerf = performance.now() + 50;
      this._live = this._schedule(ctx, dests, this._startCtxTime, 0);
    },

    stop() {
      for (const n of this._live) { try { n.src.stop(); } catch (e) {} try { n.gain.disconnect(); } catch (e) {} }
      this._live = [];
      this._startCtxTime = null;
      this._paused = false;
    },

    pause()  { if (this.ctx && this._live.length) { this._paused = true;  this.ctx.suspend().catch(() => {}); } },
    resume() { if (this.ctx && this._live.length) { this._paused = false; this.ctx.resume().catch(() => {}); } },

    exportBusy() {
      if (!this.ctx || this._startCtxTime == null || !window.state || !window.state.recording) return false;
      return (this.ctx.currentTime - this._startCtxTime) < this.endTime() + 0.15;
    },

    // ───────────── WebM export ─────────────
    getExportTrack() {
      if (!this.hasTracks() && (!AudioSFX.enabled || AudioSFX.type === 'none')) return null;
      const ctx = this._ensureCtx();
      if (!ctx || !ctx.createMediaStreamDestination) return null;
      if (!this.exportDest) this.exportDest = ctx.createMediaStreamDestination();
      return this.exportDest.stream.getAudioTracks()[0] || null;
    },

    // ───────────── MP4 export ─────────────
    async pickMp4Codec() {
      if (!this.hasTracks() || typeof AudioEncoder === 'undefined') return null;
      const candidates = [
        { muxer: 'aac',  cfg: { codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 2, bitrate: 160000 } },
        { muxer: 'opus', cfg: { codec: 'opus',      sampleRate: SR, numberOfChannels: 2, bitrate: 128000 } },
      ];
      for (const c of candidates) {
        try {
          const r = await AudioEncoder.isConfigSupported(c.cfg);
          if (r && r.supported) return c;
        } catch (e) { /* try next */ }
      }
      return null;
    },

    async encodeIntoMuxer(muxer, choice, videoSeconds, offsetSeconds) {
      const total = Math.max(0.1, videoSeconds);
      const frames = Math.ceil(total * SR);
      const off = new OfflineAudioContext(2, frames, SR);
      this._schedule(off, [off.destination], Math.max(0, offsetSeconds || 0), total);
      const rendered = await off.startRendering();

      let encErr = null;
      const enc = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: e => { encErr = e; },
      });
      enc.configure(choice.cfg);

      const CH = 2, STEP = SR;
      const left = rendered.getChannelData(0);
      const right = rendered.numberOfChannels > 1 ? rendered.getChannelData(1) : left;
      for (let i = 0; i < frames; i += STEP) {
        if (encErr) throw encErr;
        const n = Math.min(STEP, frames - i);
        const buf = new Float32Array(n * CH);
        buf.set(left.subarray(i, i + n), 0);
        buf.set(right.subarray(i, i + n), n);
        const data = new AudioData({
          format: 'f32-planar', sampleRate: SR, numberOfFrames: n, numberOfChannels: CH,
          timestamp: Math.round((i / SR) * 1e6), data: buf,
        });
        enc.encode(data);
        data.close();
        if (enc.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 0));
      }
      await enc.flush();
      enc.close();
      if (encErr) throw encErr;
    },

    // ───────────── Microphone Recording ─────────────
    async toggleMicRecording(btn) {
      if (this._isRecordingMic) {
        // Stop
        if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
          this._mediaRecorder.stop();
        }
        this._isRecordingMic = false;
        if (btn) { btn.classList.remove('recording'); btn.textContent = '🎙️ Record Voiceover'; }
      } else {
        // Start
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this._recordingStream = stream;
          const chunks = [];
          const mr = new MediaRecorder(stream);
          this._mediaRecorder = mr;
          mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
          mr.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            stream.getTracks().forEach(t => t.stop());
            const ctx = this._ensureCtx();
            const arr = await blob.arrayBuffer();
            const buf = await ctx.decodeAudioData(arr);
            const name = 'Recording ' + (this.tracks.filter(t => t.kind === 'voice').length + 1);
            this.addBuffer(name, 'voice', buf, blob);
            toast('Voice recording added!');
          };
          mr.start();
          this._isRecordingMic = true;
          if (btn) { btn.classList.add('recording'); btn.textContent = '⏹️ Stop Recording'; }
        } catch (e) {
          console.error(e);
          toast('Microphone access denied or unavailable.');
        }
      }
    },

    // ───────────── Project Serialization (.inkplainer) ─────────────
    async serialize() {
      const serializedTracks = [];
      for (const t of this.tracks) {
        // Convert AudioBuffer to Base64 WAV
        const wavBlob = audioBufferToWav(t.buffer);
        const dataUrl = await blobToBase64(wavBlob);
        serializedTracks.push({
          id: t.id,
          name: t.name,
          kind: t.kind,
          volume: t.volume,
          offset: t.offset,
          loop: t.loop,
          dataUrl
        });
      }
      return {
        duck: this.duck,
        sfx: {
          enabled: AudioSFX.enabled,
          type: AudioSFX.type,
          volume: AudioSFX.volume
        },
        tracks: serializedTracks
      };
    },

    async deserialize(data) {
      if (!data) return;
      this.stop();
      this.tracks = [];
      if (data.duck !== undefined) this.duck = data.duck;
      if (data.sfx) {
        AudioSFX.enabled = data.sfx.enabled ?? true;
        AudioSFX.type = data.sfx.type || 'pencil';
        AudioSFX.volume = data.sfx.volume ?? 0.5;
      }
      if (Array.isArray(data.tracks)) {
        const ctx = this._ensureCtx();
        for (const tr of data.tracks) {
          if (!tr.dataUrl) continue;
          try {
            const resp = await fetch(tr.dataUrl);
            const ab = await resp.arrayBuffer();
            const buf = await ctx.decodeAudioData(ab);
            this.tracks.push({
              id: tr.id || _idSeq++,
              name: tr.name || 'Audio',
              kind: tr.kind || 'voice',
              buffer: buf,
              volume: tr.volume !== undefined ? tr.volume : 1,
              offset: tr.offset || 0,
              loop: !!tr.loop
            });
          } catch (e) {
            console.error('Failed to restore audio track:', e);
          }
        }
      }
      this.render();
    },

    // ───────────── UI ─────────────
    _peaks(buffer, n) {
      const ch = buffer.getChannelData(0), block = Math.max(1, Math.floor(ch.length / n)), out = [];
      for (let i = 0; i < n; i++) {
        let m = 0;
        for (let j = i * block, e = Math.min(ch.length, j + block); j < e; j += 8) m = Math.max(m, Math.abs(ch[j]));
        out.push(m);
      }
      return out;
    },

    render() {
      const list = document.getElementById('audio-track-list');
      if (!list) return;
      list.textContent = '';
      if (!this.tracks.length) {
        const hint = document.createElement('div');
        hint.className = 'audio-empty';
        hint.textContent = 'No audio tracks yet. Add voiceover, music, or record your mic.';
        list.appendChild(hint);
      }
      for (const t of this.tracks) {
        const row = document.createElement('div');
        row.className = 'audio-track';

        const head = document.createElement('div');
        head.className = 'audio-track-head';
        const badge = document.createElement('span');
        badge.className = 'audio-badge ' + t.kind;
        badge.textContent = t.kind === 'voice' ? 'VOICE' : 'MUSIC';
        const name = document.createElement('span');
        name.className = 'audio-name';
        name.textContent = t.name;
        name.title = t.name;
        const dur = document.createElement('span');
        dur.className = 'audio-dur';
        dur.textContent = t.buffer.duration.toFixed(1) + 's';
        const del = document.createElement('button');
        del.className = 'audio-del';
        del.textContent = '✕';
        del.title = 'Remove';
        del.onclick = () => this.remove(t.id);
        head.append(badge, name, dur, del);

        const wave = document.createElement('canvas');
        wave.className = 'audio-wave';
        wave.width = 240; wave.height = 28;
        const wc = wave.getContext('2d');
        wc.fillStyle = t.kind === 'voice' ? '#3b82f6' : '#10b981';
        this._peaks(t.buffer, 120).forEach((p, i) => {
          const h = Math.max(1, p * 26);
          wc.fillRect(i * 2, 14 - h / 2, 1.4, h);
        });

        const ctrls = document.createElement('div');
        ctrls.className = 'audio-ctrls';

        const vLabel = document.createElement('label');
        vLabel.textContent = 'Vol';
        const vol = document.createElement('input');
        vol.type = 'range'; vol.min = 0; vol.max = 100; vol.value = Math.round(t.volume * 100);
        vol.oninput = () => { t.volume = vol.value / 100; };

        const oLabel = document.createElement('label');
        oLabel.textContent = 'Start at';
        const off = document.createElement('input');
        off.type = 'number'; off.min = 0; off.step = 0.1; off.value = t.offset;
        off.className = 'audio-offset';
        off.onchange = () => { t.offset = Math.max(0, parseFloat(off.value) || 0); off.value = t.offset; };
        const sec = document.createElement('span');
        sec.textContent = 's';

        ctrls.append(vLabel, vol, oLabel, off, sec);

        if (t.kind === 'music') {
          const loopL = document.createElement('label');
          loopL.className = 'audio-loop';
          const loop = document.createElement('input');
          loop.type = 'checkbox'; loop.checked = t.loop;
          loop.onchange = () => { t.loop = loop.checked; };
          loopL.append(loop, document.createTextNode(' Loop'));
          ctrls.appendChild(loopL);
        }

        row.append(head, wave, ctrls);
        list.appendChild(row);
      }
      const duckRow = document.getElementById('audio-duck-row');
      if (duckRow) duckRow.style.display = this.tracks.some(t => t.kind === 'voice') &&
                                           this.tracks.some(t => t.kind === 'music') ? 'flex' : 'none';
      
      // Sync SFX UI
      const sfxSel = document.getElementById('sfx-type-select');
      if (sfxSel) sfxSel.value = AudioSFX.type;
      const sfxVol = document.getElementById('sfx-vol-slider');
      if (sfxVol) sfxVol.value = Math.round(AudioSFX.volume * 100);
    },
  };

  // ───────────── WAV & Base64 Helpers ─────────────
  function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const length = buffer.length * numChannels * bytesPerSample;
    const ab = new ArrayBuffer(44 + length);
    const view = new DataView(ab);

    function writeStr(offset, str) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, 'data');
    view.setUint32(40, length, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    return new Blob([ab], { type: 'audio/wav' });
  }

  function blobToBase64(blob) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  function toast(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg); else alert(msg);
  }

  // ───────────── hook into the existing app ─────────────
  function wrap(name, after) {
    const orig = window[name];
    if (typeof orig !== 'function') { return; }
    window[name] = function () {
      const pre = after.pre ? after.pre() : undefined;
      const r = orig.apply(this, arguments);
      if (after.post) after.post(pre);
      return r;
    };
  }

  wrap('_generateNow', { post: () => AudioMix.start() });
  wrap('resetAnim',    { post: () => AudioMix.stop() });
  wrap('togglePlay', {
    pre:  () => !!(window.state && window.state.done),
    post: (wasDone) => {
      if (wasDone || !window.state) return;
      if (window.state.playing) AudioMix.resume(); else AudioMix.pause();
    },
  });

  window.AudioMix = AudioMix;
  window.AudioSFX = AudioSFX;
  document.addEventListener('DOMContentLoaded', () => AudioMix.render());
  AudioMix.render();
})(window);
