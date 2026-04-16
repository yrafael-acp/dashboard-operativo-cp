window.AppState = {
  vista: 'GENERAL',
  hojaActual: 'UBICACIONES',
  paginaActual: 1,
  filasPorPagina: window.APP_CONFIG.PAGE_SIZE,
  busqueda: '',
  ubicaciones: [],
  ubicacionesFiltradas: [],
  datosHoja: [],
  datosHojaFiltrados: [],
  headers: [],
  chart: null,
  loading: false,
  dirtyRows: new Set(),
  isCreatingNewRow: false
};
