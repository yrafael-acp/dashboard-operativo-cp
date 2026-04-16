window.APP_CONFIG = Object.freeze({
  APP_NAME: 'DASHBOARD OPERATIVO CP',
  SCRIPT_URL: 'PEGAR_AQUI_TU_WEB_APP_URL',
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
