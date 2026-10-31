// Web Audio API Sound Synthesizer for Vigga Mini-Games
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ViggaAudio = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  let ctx = null;
  const STORAGE_KEY = 'vigga_games_muted';
  let isMuted = localStorage.getItem(STORAGE_KEY) === 'true';

  function getContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playTone(freq, type, duration, gainValue = 0.15) {
    if (isMuted) return;
    const context = getContext();
    if (!context) return;

    try {
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, context.currentTime);

      gain.gain.setValueAtTime(gainValue, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

      osc.connect(gain);
      gain.connect(context.destination);

      osc.start();
      osc.stop(context.currentTime + duration);
    } catch (e) {
      // Audio not permitted or interrupted
    }
  }

  return {
    isMuted: () => isMuted,

    toggleMute: () => {
      isMuted = !isMuted;
      localStorage.setItem(STORAGE_KEY, String(isMuted));
      return isMuted;
    },

    setMuted: (muted) => {
      isMuted = !!muted;
      localStorage.setItem(STORAGE_KEY, String(isMuted));
    },

    // Soft click for moves (X is slightly higher pitch, O slightly lower)
    playMove: (isX = true) => {
      const freq = isX ? 520 : 420;
      playTone(freq, 'sine', 0.08, 0.2);
    },

    // Crisp soft pop on undo
    playUndo: () => {
      playTone(330, 'triangle', 0.1, 0.15);
    },

    // Soft thud for invalid action
    playInvalid: () => {
      playTone(180, 'sine', 0.12, 0.18);
    },

    // Joyful soft arpeggio on win
    playWin: () => {
      if (isMuted) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          playTone(freq, 'triangle', 0.25, 0.18);
        }, idx * 90);
      });
    },

    // Draw sound
    playDraw: () => {
      if (isMuted) return;
      const notes = [440, 392, 349];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          playTone(freq, 'sine', 0.2, 0.15);
        }, idx * 100);
      });
    }
  };
});

