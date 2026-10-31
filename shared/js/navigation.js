// Navigation & Shell Utilities for Vigga Mini-Games
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ViggaNav = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const HUB_URL = 'https://vigga.netlify.app/';

  function getMuteSvg(isMuted) {
    if (isMuted) {
      return `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
    }
    return `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
  }

  function init({ audioModule, soundBtnId = 'btn-sound', hubBtnId = 'btn-hub' } = {}) {
    const audio = audioModule || window.ViggaAudio;
    const soundBtn = document.getElementById(soundBtnId);
    const hubBtn = document.getElementById(hubBtnId);

    if (hubBtn) {
      hubBtn.href = HUB_URL;
    }

    if (soundBtn && audio) {
      const updateIcon = () => {
        const muted = audio.isMuted();
        soundBtn.innerHTML = getMuteSvg(muted);
        soundBtn.title = muted ? 'Bật âm thanh' : 'Tắt âm thanh';
        soundBtn.setAttribute('aria-label', soundBtn.title);
      };

      updateIcon();

      soundBtn.addEventListener('click', () => {
        audio.toggleMute();
        updateIcon();
        if (!audio.isMuted()) {
          audio.playMove(true);
        }
      });
    }
  }

  return {
    HUB_URL,
    init,
    getMuteSvg
  };
});

