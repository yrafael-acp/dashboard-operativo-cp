window.Api = (() => {
  const baseUrl = window.APP_CONFIG.SCRIPT_URL;

  function assertConfigured() {
    if (!baseUrl || baseUrl.includes('https://script.google.com/macros/s/AKfycbyPTKRi6vDUxH9eIQNwh8XZCZAucg44Dr0TvywARJ64bUcYCVfmkPnk9nsSjf6g5DyxoA/exec')) {
      throw new Error('Configura APP_CONFIG.SCRIPT_URL con la URL del Web App de Apps Script');
    }
  }

  async function parseResponse(response) {
    const text = await response.text();
    let json;

    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new Error(`Respuesta inválida del servidor: ${text.slice(0, 180)}`);
    }

    if (!response.ok || !json.ok) {
      throw new Error(json?.message || `HTTP ${response.status}`);
    }

    return json.data;
  }

  async function get(action, params = {}) {
    assertConfigured();
    const url = new URL(baseUrl);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await Utils.withTimeout(fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store'
    }), window.APP_CONFIG.FETCH_TIMEOUT_MS);

    return parseResponse(response);
  }

  async function post(payload) {
    assertConfigured();
    const response = await Utils.withTimeout(fetch(baseUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    }), window.APP_CONFIG.FETCH_TIMEOUT_MS);

    return parseResponse(response);
  }

  return {
    getDashboard() {
      return get('getDashboard');
    },

    getHoja(nombreHoja, limit = 500) {
      return get('getHoja', { hoja: nombreHoja, limit });
    },

    saveRow({ hoja, rowIndex, values }) {
      return post({ action: 'saveRow', hoja, rowIndex, values });
    },

    appendRow({ hoja, values }) {
      return post({ action: 'appendRow', hoja, values });
    },

    deleteRow({ hoja, rowIndex }) {
      return post({ action: 'deleteRow', hoja, rowIndex });
    },

    runAction({ operation, hoja }) {
      return post({ action: 'runAction', operation, hoja });
    }
  };
})();
