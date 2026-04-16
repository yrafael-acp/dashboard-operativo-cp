window.Utils = {
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  normalizeText(value) {
    return String(value ?? '').trim().toLowerCase();
  },

  safeString(value) {
    return value == null ? '' : String(value);
  },

  isNonEmptyArray(value) {
    return Array.isArray(value) && value.length > 0;
  },

  makePalette(size) {
    return Array.from({ length: size }, (_, index) => `hsl(${Math.round((index * 360) / Math.max(size, 1))}, 65%, 52%)`);
  },

  debounce(fn, wait = 250) {
    let timeoutId;
    return (...args) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn(...args), wait);
    };
  },

  withTimeout(promise, ms) {
    let timerId;
    const timeout = new Promise((_, reject) => {
      timerId = window.setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms);
    });

    return Promise.race([
      promise.finally(() => window.clearTimeout(timerId)),
      timeout
    ]);
  }
};
