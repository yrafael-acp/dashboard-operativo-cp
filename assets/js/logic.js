window.WarehouseLogic = {
  normalizeDashboardRows(rows) {
    if (!Array.isArray(rows)) return [];

    return rows.map((item) => {
      const datosUbi = Array.isArray(item?.datosUbi) ? item.datosUbi : [];
      return {
        id: Utils.safeString(item?.id),
        codigo: Utils.safeString(datosUbi[0]),
        zona: Utils.safeString(datosUbi[1]),
        grupo: Utils.safeString(datosUbi[2]),
        estado: Utils.safeString(item?.estado || 'DESCONOCIDO'),
        datosUbi
      };
    });
  },

  calculateKpis(rows) {
    const total = rows.length;
    const disponibles = rows.filter((row) => row.estado === 'DISPONIBLE').length;
    const sobrestock = rows.filter((row) => row.estado === 'SOBRESTOCK').length;
    const ocupados = total - disponibles;

    return {
      total,
      disponibles,
      sobrestock,
      ocupados,
      porcentajeDisponible: total ? ((disponibles / total) * 100).toFixed(1) : '0.0',
      porcentajeOcupado: total ? ((ocupados / total) * 100).toFixed(1) : '0.0'
    };
  },

  buildZoneSummary(rows) {
    const zoneMap = new Map();

    rows.forEach((row) => {
      const zone = row.zona || 'SIN ZONA';
      if (!zoneMap.has(zone)) {
        zoneMap.set(zone, { zona: zone, total: 0, disponibles: 0, ocupados: 0, sobrestock: 0 });
      }
      const item = zoneMap.get(zone);
      item.total += 1;
      if (row.estado === 'DISPONIBLE') item.disponibles += 1;
      if (row.estado !== 'DISPONIBLE') item.ocupados += 1;
      if (row.estado === 'SOBRESTOCK') item.sobrestock += 1;
    });

    return Array.from(zoneMap.values())
      .map((item) => ({
        ...item,
        porcentajeOcupado: item.total ? Math.round((item.ocupados / item.total) * 100) : 0
      }))
      .sort((a, b) => a.zona.localeCompare(b.zona));
  },

  filterDashboard(rows, term) {
    const query = Utils.normalizeText(term);
    if (!query) return [...rows];

    return rows.filter((row) => {
      return [row.id, row.codigo, row.zona, row.grupo, row.estado]
        .map(Utils.normalizeText)
        .some((field) => field.includes(query));
    });
  },

  filterSheetRows(rows, term) {
    const query = Utils.normalizeText(term);
    if (!query) return [...rows];

    return rows.filter((row) => row.some((cell) => Utils.normalizeText(cell).includes(query)));
  },

  paginate(rows, currentPage, pageSize) {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const page = Math.min(Math.max(1, currentPage), totalPages);
    const start = (page - 1) * pageSize;
    return {
      page,
      totalPages,
      rows: rows.slice(start, start + pageSize)
    };
  },

  validateEditableRow(values, headers) {
    if (!Array.isArray(values) || !Array.isArray(headers)) {
      throw new Error('Fila inválida');
    }

    if (values.length !== headers.length) {
      throw new Error('La fila no coincide con la cantidad de columnas');
    }

    return values.map((value) => Utils.safeString(value).trim());
  },

  editableSheetSupportsCreate(sheetName) {
    return sheetName !== 'UBICACIONES';
  },

  statusClass(status) {
    if (status === 'DISPONIBLE') return 'bg-disponible';
    if (status === 'SOBRESTOCK') return 'bg-sobrestock';
    return 'bg-ocupado';
  }
};
