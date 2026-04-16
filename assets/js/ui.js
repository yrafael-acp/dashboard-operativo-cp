window.UI = (() => {
  const elements = {
    loader: () => document.getElementById('loader-overlay'),
    toastContainer: () => document.getElementById('toastContainer'),
    appName: () => document.getElementById('appName'),
    kpiCards: () => document.getElementById('kpiCards'),
    resumenZonas: () => document.getElementById('resumenZonas'),
    selectorHoja: () => document.getElementById('selectorHoja'),
    searchInput: () => document.getElementById('searchInput'),
    btnNuevaFila: () => document.getElementById('btnNuevaFila'),
    btnAnterior: () => document.getElementById('btnAnterior'),
    btnSiguiente: () => document.getElementById('btnSiguiente'),
    infoPaginacion: () => document.getElementById('infoPaginacion'),
    tableHead: () => document.getElementById('tableHead'),
    tableBody: () => document.getElementById('tableBody'),
    btnOmisiones: () => document.getElementById('btnOmisiones'),
    tabDetalleBtn: () => document.getElementById('tabDetalleBtn')
  };

  function renderSheetSelector(hojas, selected) {
    elements.selectorHoja().innerHTML = hojas
      .map((hoja) => `<option value="${Utils.escapeHtml(hoja)}" ${hoja === selected ? 'selected' : ''}>${Utils.escapeHtml(hoja)}</option>`)
      .join('');
  }

  function setLoading(show) {
    const loader = elements.loader();
    loader.classList.toggle('d-none', !show);
    loader.classList.toggle('d-flex', show);
  }

  function setAppName(name) {
    elements.appName().textContent = name;
  }

  function showToast(message, type = 'success') {
    const palette = {
      success: 'text-bg-success',
      error: 'text-bg-danger',
      warning: 'text-bg-warning',
      info: 'text-bg-primary'
    };

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="toast align-items-center border-0 ${palette[type] || palette.info}" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">${Utils.escapeHtml(message)}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;

    const toastEl = wrapper.firstElementChild;
    elements.toastContainer().appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  }

  function renderKpis(kpis) {
    elements.kpiCards().innerHTML = `
      <div class="col clickable" data-kpi-filter="TODOS">
        <div class="card card-soft kpi-card p-2 border-start border-dark border-4">
          <span class="kpi-title">Capacidad</span>
          <div class="kpi-value">${kpis.total}</div>
        </div>
      </div>
      <div class="col clickable" data-kpi-filter="OCUPADOS_FULL">
        <div class="card card-soft kpi-card p-2 border-start border-primary border-4">
          <span class="kpi-title">Ocupado</span>
          <div class="kpi-value text-primary">${kpis.ocupados}</div>
          <span class="fw-bold small text-primary">${kpis.porcentajeOcupado}%</span>
        </div>
      </div>
      <div class="col clickable" data-kpi-filter="SOBRESTOCK">
        <div class="card card-soft kpi-card p-2 border-start border-danger border-4">
          <span class="kpi-title">Sobrestock</span>
          <div class="kpi-value text-danger">${kpis.sobrestock}</div>
        </div>
      </div>
      <div class="col clickable" data-kpi-filter="DISPONIBLE">
        <div class="card card-soft kpi-card p-2 border-start border-success border-4">
          <span class="kpi-title">Libre</span>
          <div class="kpi-value text-success">${kpis.disponibles}</div>
          <span class="fw-bold small text-success">${kpis.porcentajeDisponible}%</span>
        </div>
      </div>
    `;
  }

  function renderZoneSummary(zoneSummary) {
    elements.resumenZonas().innerHTML = `<div class="row row-cols-1 row-cols-md-2 g-2">
      ${zoneSummary.map((zone) => `
        <div class="col">
          <div class="p-2 border rounded bg-light small fw-bold zone-card">
            ${Utils.escapeHtml(zone.zona)}
            <span class="float-end text-success">${zone.disponibles} libres</span>
            <div class="progress mt-2">
              <div class="progress-bar bg-success" style="width: ${zone.porcentajeOcupado}%"></div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  function renderChart(chartRef, zoneSummary) {
    const canvas = document.getElementById('ctxGrafico');
    const labels = zoneSummary.map((item) => item.zona);
    const data = zoneSummary.map((item) => item.ocupados);
    const colors = Utils.makePalette(labels.length);

    if (chartRef) chartRef.destroy();

    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  function renderGeneralTable(rows, pagination) {
    elements.tableHead().innerHTML = '<tr><th>UBICACIÓN</th><th>ZONA</th><th>GRUPO</th><th>ESTADO</th></tr>';
    elements.tableBody().innerHTML = rows.map((item) => `
      <tr>
        <td><strong>${Utils.escapeHtml(item.codigo)}</strong></td>
        <td>${Utils.escapeHtml(item.zona)}</td>
        <td>${Utils.escapeHtml(item.grupo)}</td>
        <td><span class="status-badge ${WarehouseLogic.statusClass(item.estado)}">${Utils.escapeHtml(item.estado)}</span></td>
      </tr>
    `).join('');
    renderPagination(pagination);
  }

  function renderEditTable(headers, rows, pagination) {
    elements.tableHead().innerHTML = `
      <tr>
        ${headers.map((header) => `<th>${Utils.escapeHtml(header)}</th>`).join('')}
        <th class="table-actions">ACCIONES</th>
      </tr>
    `;

    const pageStartIndex = (pagination.page - 1) * AppState.filasPorPagina;
    elements.tableBody().innerHTML = rows.map((row, rowOffset) => {
      const realIndex = pageStartIndex + rowOffset;
      const isNew = row.__isNew === true;

      return `
        <tr data-row-index="${realIndex}" ${isNew ? 'class="table-warning"' : ''}>
          ${row.values.map((cell, colIndex) => `
            <td>
              <input
                type="text"
                class="form-control form-control-sm table-input"
                data-cell-input="true"
                data-row-index="${realIndex}"
                data-col-index="${colIndex}"
                value="${Utils.escapeHtml(cell)}"
              >
            </td>
          `).join('')}
          <td class="table-actions">
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-success" data-save-row="${realIndex}" title="Guardar"><i class="bi bi-floppy"></i></button>
              <button class="btn btn-sm btn-danger" data-delete-row="${realIndex}" title="Eliminar"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    renderPagination(pagination);
  }

  function renderPagination({ page, totalPages }) {
    elements.infoPaginacion().textContent = `Página ${page} de ${totalPages}`;
    elements.btnAnterior().disabled = page <= 1;
    elements.btnSiguiente().disabled = page >= totalPages;
  }

  function toggleNewRowButton(show) {
    elements.btnNuevaFila().classList.toggle('d-none', !show);
  }

  function toggleOmisionesButton(show) {
    elements.btnOmisiones().classList.toggle('d-none', !show);
  }

  function setSearchValue(value) {
    elements.searchInput().value = value;
  }

  function activateDetailTab() {
    bootstrap.Tab.getOrCreateInstance(elements.tabDetalleBtn()).show();
  }

  return {
    renderSheetSelector,
    setLoading,
    setAppName,
    showToast,
    renderKpis,
    renderZoneSummary,
    renderChart,
    renderGeneralTable,
    renderEditTable,
    toggleNewRowButton,
    toggleOmisionesButton,
    setSearchValue,
    activateDetailTab,
    elements
  };
})();
