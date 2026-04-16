window.App = (() => {
  const state = window.AppState;

  function getEditableRows() {
    return state.datosHojaFiltrados.map((row) => ({
      values: Array.isArray(row.values) ? row.values : row,
      __isNew: Boolean(row.__isNew)
    }));
  }

  function renderCurrentView() {
    if (state.vista === 'GENERAL') {
      const pagination = WarehouseLogic.paginate(state.ubicacionesFiltradas, state.paginaActual, state.filasPorPagina);
      state.paginaActual = pagination.page;
      UI.renderGeneralTable(pagination.rows, pagination);
      return;
    }

    const pagination = WarehouseLogic.paginate(getEditableRows(), state.paginaActual, state.filasPorPagina);
    state.paginaActual = pagination.page;
    UI.renderEditTable(state.headers, pagination.rows, pagination);
  }

  async function loadDashboard() {
    UI.setLoading(true);
    try {
      const rows = await Api.getDashboard();
      const normalized = WarehouseLogic.normalizeDashboardRows(rows);
      state.ubicaciones = normalized;
      state.ubicacionesFiltradas = [...normalized];
      state.vista = 'GENERAL';
      state.hojaActual = 'UBICACIONES';
      state.paginaActual = 1;

      const kpis = WarehouseLogic.calculateKpis(normalized);
      const zoneSummary = WarehouseLogic.buildZoneSummary(normalized);
      UI.renderKpis(kpis);
      UI.renderZoneSummary(zoneSummary);
      state.chart = UI.renderChart(state.chart, zoneSummary);
      UI.toggleNewRowButton(false);
      UI.toggleOmisionesButton(false);
      renderCurrentView();
    } catch (error) {
      UI.showToast(error.message, 'error');
      throw error;
    } finally {
      UI.setLoading(false);
    }
  }

  async function loadEditableSheet(sheetName) {
    UI.setLoading(true);
    try {
      const data = await Api.getHoja(sheetName, 500);
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`La hoja ${sheetName} está vacía o no tiene un formato válido`);
      }

      const [headers, ...rows] = data;
      state.headers = headers.map(Utils.safeString);
      state.datosHoja = rows.map((row) => ({ values: row.map(Utils.safeString), __isNew: false }));
      state.datosHojaFiltrados = [...state.datosHoja];
      state.hojaActual = sheetName;
      state.vista = 'EDICION';
      state.paginaActual = 1;
      state.isCreatingNewRow = false;

      UI.toggleNewRowButton(WarehouseLogic.editableSheetSupportsCreate(sheetName));
      UI.toggleOmisionesButton(sheetName === 'ETIQUETAR');
      renderCurrentView();
    } catch (error) {
      UI.showToast(error.message, 'error');
      throw error;
    } finally {
      UI.setLoading(false);
    }
  }

  function applySearch() {
    state.paginaActual = 1;
    if (state.vista === 'GENERAL') {
      state.ubicacionesFiltradas = WarehouseLogic.filterDashboard(state.ubicaciones, state.busqueda);
    } else {
      state.datosHojaFiltrados = WarehouseLogic.filterSheetRows(state.datosHoja, state.busqueda);
    }
    renderCurrentView();
  }

  function collectRowValues(realIndex) {
    const values = state.headers.map((_, colIndex) => {
      const selector = `[data-cell-input="true"][data-row-index="${realIndex}"][data-col-index="${colIndex}"]`;
      const input = document.querySelector(selector);
      return input ? input.value : '';
    });
    return WarehouseLogic.validateEditableRow(values, state.headers);
  }

  async function saveRow(realIndex) {
    try {
      const values = collectRowValues(realIndex);
      const row = state.datosHojaFiltrados[realIndex];
      UI.setLoading(true);

      if (row?.__isNew) {
        await Api.appendRow({ hoja: state.hojaActual, values });
        UI.showToast('Fila creada correctamente', 'success');
      } else {
        await Api.saveRow({ hoja: state.hojaActual, rowIndex: realIndex, values });
        UI.showToast('Fila guardada correctamente', 'success');
      }

      await loadEditableSheet(state.hojaActual);
    } catch (error) {
      UI.showToast(error.message, 'error');
    } finally {
      UI.setLoading(false);
    }
  }

  async function deleteRow(realIndex) {
    const confirmed = window.confirm('¿Borrar fila permanentemente?');
    if (!confirmed) return;

    const row = state.datosHojaFiltrados[realIndex];
    if (row?.__isNew) {
      state.datosHoja.splice(realIndex, 1);
      state.datosHojaFiltrados = WarehouseLogic.filterSheetRows(state.datosHoja, state.busqueda);
      renderCurrentView();
      UI.showToast('Fila nueva descartada', 'info');
      return;
    }

    try {
      UI.setLoading(true);
      await Api.deleteRow({ hoja: state.hojaActual, rowIndex: realIndex });
      UI.showToast('Fila eliminada correctamente', 'success');
      await loadEditableSheet(state.hojaActual);
    } catch (error) {
      UI.showToast(error.message, 'error');
    } finally {
      UI.setLoading(false);
    }
  }

  function addNewRow() {
    if (state.vista !== 'EDICION') return;
    const values = state.headers.map(() => '');
    state.datosHoja.unshift({ values, __isNew: true });
    state.datosHojaFiltrados = WarehouseLogic.filterSheetRows(state.datosHoja, state.busqueda);
    state.paginaActual = 1;
    renderCurrentView();
    UI.showToast('Fila nueva lista para completar y guardar', 'info');
  }

  async function runAction(operation) {
    const label = window.APP_CONFIG.ACTION_LABELS[operation] || operation;
    const confirmed = window.confirm(`¿Deseas ejecutar la acción: ${label}?`);
    if (!confirmed) return;

    try {
      UI.setLoading(true);
      const result = await Api.runAction({ operation, hoja: state.hojaActual });
      UI.showToast(result?.message || 'Acción ejecutada correctamente', 'success');

      if (state.hojaActual === 'UBICACIONES') {
        await loadDashboard();
      } else {
        await loadEditableSheet(state.hojaActual);
      }
    } catch (error) {
      UI.showToast(error.message, 'error');
    } finally {
      UI.setLoading(false);
    }
  }

  function filterByKpi(kpi) {
    state.hojaActual = 'UBICACIONES';
    state.vista = 'GENERAL';
    UI.activateDetailTab();

    switch (kpi) {
      case 'DISPONIBLE':
        state.ubicacionesFiltradas = state.ubicaciones.filter((row) => row.estado === 'DISPONIBLE');
        break;
      case 'SOBRESTOCK':
        state.ubicacionesFiltradas = state.ubicaciones.filter((row) => row.estado === 'SOBRESTOCK');
        break;
      case 'OCUPADOS_FULL':
        state.ubicacionesFiltradas = state.ubicaciones.filter((row) => row.estado !== 'DISPONIBLE');
        break;
      default:
        state.ubicacionesFiltradas = [...state.ubicaciones];
    }

    state.paginaActual = 1;
    renderCurrentView();
  }

  async function onSheetChange(event) {
    const sheetName = event.target.value;
    UI.setSearchValue('');
    state.busqueda = '';

    if (sheetName === 'UBICACIONES') {
      await loadDashboard();
      return;
    }

    await loadEditableSheet(sheetName);
  }

  function attachEvents() {
    UI.elements().selectorHoja().addEventListener('change', onSheetChange);
    UI.elements().btnAnterior().addEventListener('click', () => {
      state.paginaActual -= 1;
      renderCurrentView();
    });
    UI.elements().btnSiguiente().addEventListener('click', () => {
      state.paginaActual += 1;
      renderCurrentView();
    });
    document.getElementById('btnReset').addEventListener('click', async () => {
      UI.elements().selectorHoja().value = 'UBICACIONES';
      state.busqueda = '';
      UI.setSearchValue('');
      await loadDashboard();
    });
    document.getElementById('btnRecargar').addEventListener('click', async () => {
      if (state.hojaActual === 'UBICACIONES') await loadDashboard();
      else await loadEditableSheet(state.hojaActual);
    });
    UI.elements().btnNuevaFila().addEventListener('click', addNewRow);

    UI.elements().searchInput().addEventListener('input', Utils.debounce((event) => {
      state.busqueda = event.target.value;
      applySearch();
    }, 200));

    document.getElementById('actionButtons').addEventListener('click', async (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      await runAction(button.dataset.action);
    });

    document.getElementById('kpiCards').addEventListener('click', (event) => {
      const card = event.target.closest('[data-kpi-filter]');
      if (!card) return;
      filterByKpi(card.dataset.kpiFilter);
    });

    UI.elements().tableBody().addEventListener('click', async (event) => {
      const saveButton = event.target.closest('[data-save-row]');
      const deleteButton = event.target.closest('[data-delete-row]');

      if (saveButton) {
        await saveRow(Number(saveButton.dataset.saveRow));
        return;
      }

      if (deleteButton) {
        await deleteRow(Number(deleteButton.dataset.deleteRow));
      }
    });
  }

  async function init() {
    UI.setAppName(window.APP_CONFIG.APP_NAME);
    UI.renderSheetSelector(window.APP_CONFIG.HOJAS, 'UBICACIONES');
    attachEvents();
    await loadDashboard();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  window.App.init().catch((error) => {
    console.error(error);
    UI.showToast(error.message || 'No se pudo iniciar la aplicación', 'error');
  });
});
