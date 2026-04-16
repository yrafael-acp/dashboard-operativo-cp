window.APP_CONFIG = Object.freeze({
  APP_NAME: 'DASHBOARD OPERATIVO CP',
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyPTKRi6vDUxH9eIQNwh8XZCZAucg44Dr0TvywARJ64bUcYCVfmkPnk9nsSjf6g5DyxoA/exec',
  PAGE_SIZE: 50,
  FETCH_TIMEOUT_MS: 30000,
  DEBUG: false,
  HOJAS: [
    'UBICACIONES',
    'STOCK',
    'REPOSICIÓN',
    'CONSOLIDADO INGRESOS',
    'ETIQUETAR',
    'FORMATO DE ETIQUETA',
    'MASIVO_UBICACIONES',
    'HISTORICO UBICACIONES',
    'INGRESOS DIARIOS',
    'STOCK VARIOS',
    'productos sin etiquetar',
    'CONSIGNACIÓN',
    'BACKUP'
  ],
  ACTION_LABELS: {
    limpiarRangoGeneral: 'Limpiar A:H',
    limpiarConOmisiones: 'Limpiar con omisiones',
    transferirConsolidadoAEtiquetar: 'Consolidado -> Etiquetar',
    copiarEtiquetasAMasivo: 'Etiquetar -> Masivo',
    generarFormatoEtiqueta: 'Generar formato etiqueta',
    actualizarTablasDinamicas: 'Refrescar pivots',
    filtrarSinStock: 'Filtrar sin stock'
  }
});
