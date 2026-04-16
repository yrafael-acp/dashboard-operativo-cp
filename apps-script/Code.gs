const SHEETS = {
  HISTORICO: 'HISTORICO UBICACIONES',
  STOCK: 'STOCK',
  STOCK_VARIOS: 'STOCK VARIOS',
  INGRESOS: 'INGRESOS DIARIOS',
  CONSOLIDADO_INGRESOS: 'CONSOLIDADO INGRESOS',
  UBICACIONES: 'UBICACIONES',
  ETIQUETAR: 'ETIQUETAR',
  FORMATO_ETIQUETA: 'FORMATO DE ETIQUETA',
  MASIVO_UBICACIONES: 'MASIVO_UBICACIONES',
  BACKUP: 'BACKUP',
  CONSIGNACION: 'CONSIGNACIÓN',
  REPOSICION: 'REPOSICIÓN',
  SIN_ETIQUETA: 'productos sin etiquetar',
  CONSOLIDADO: 'CONSOLIDADO'
};

const DEFAULT_GET_LIMIT = 500;
const LOCK_WAIT_MS = 15000;

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  try {
    const request = parseRequest_(e, method);
    const action = request.action || 'getDashboard';

    let data;
    switch (action) {
      case 'getDashboard':
        data = getDashboardData_();
        break;
      case 'getHoja':
        data = getSheetData_(request.hoja, Number(request.limit) || DEFAULT_GET_LIMIT);
        break;
      case 'saveRow':
        data = executeWithLock_(() => saveRow_(request.hoja, Number(request.rowIndex), request.values));
        break;
      case 'appendRow':
        data = executeWithLock_(() => appendRow_(request.hoja, request.values));
        break;
      case 'deleteRow':
        data = executeWithLock_(() => deleteRow_(request.hoja, Number(request.rowIndex)));
        break;
      case 'runAction':
        data = executeWithLock_(() => runAction_(request.operation, request.hoja));
        break;
      default:
        throw new Error('Acción no soportada: ' + action);
    }

    return jsonResponse_(true, data, 'OK');
  } catch (error) {
    return jsonResponse_(false, null, error && error.message ? error.message : String(error));
  }
}

function parseRequest_(e, method) {
  if (method === 'POST') {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object') throw new Error('Body JSON inválido');
    return parsed;
  }

  return e && e.parameter ? e.parameter : {};
}

function jsonResponse_(ok, data, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok, data: data, message: message || '' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function executeWithLock_(callback) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(LOCK_WAIT_MS);
    return callback();
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {}
  }
}

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheetByNameOrThrow_(name) {
  if (!name) throw new Error('Debes indicar una hoja');
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('No existe la hoja: ' + name);
  return sheet;
}

function getDashboardData_() {
  const ss = getSpreadsheet_();
  const shUbi = ss.getSheetByName(SHEETS.UBICACIONES);
  const shRepo = ss.getSheetByName(SHEETS.REPOSICION);
  const shStock = ss.getSheetByName(SHEETS.STOCK);

  if (!shUbi) throw new Error('No se encontró la hoja UBICACIONES');

  const lastRow = shUbi.getLastRow();
  if (lastRow < 2) return [];

  const rows = shUbi.getRange(2, 1, lastRow - 1, 5).getValues();
  const alertaMap = buildSobrestockMap_(shRepo, shStock);

  return rows
    .map(function(row) {
      const idUbi = cleanString_(row[0]);
      if (!idUbi) return null;

      const estadoExcel = cleanString_(row[4]).toUpperCase() || 'DISPONIBLE';
      const infoRepo = alertaMap.get(idUbi.toUpperCase());
      let estadoFinal = estadoExcel;

      if (estadoExcel === 'OCUPADO' && infoRepo && Number(infoRepo.stock) > Number(infoRepo.capacidad)) {
        estadoFinal = 'SOBRESTOCK';
      }

      return {
        id: idUbi,
        estado: estadoFinal,
        datosUbi: [row[0], row[1], row[2]],
        datosRepo: Boolean(infoRepo)
      };
    })
    .filter(Boolean);
}

function getSheetData_(sheetName, limit) {
  const sheet = getSheetByNameOrThrow_(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (!lastRow || !lastCol) return [[]];

  const safeLimit = Math.max(1, Math.min(limit || DEFAULT_GET_LIMIT, Math.max(lastRow, 1)));
  return sheet.getRange(1, 1, safeLimit, lastCol).getValues();
}

function saveRow_(sheetName, rowIndex, values) {
  validateRowOperation_(sheetName, rowIndex, values);
  const sheet = getSheetByNameOrThrow_(sheetName);
  sheet.getRange(rowIndex + 2, 1, 1, values.length).setValues([normalizeRowValues_(values)]);
  return { message: 'Fila guardada correctamente en ' + sheetName };
}

function appendRow_(sheetName, values) {
  if (!Array.isArray(values) || values.length === 0) throw new Error('Debes enviar valores para crear una fila');
  const sheet = getSheetByNameOrThrow_(sheetName);
  const headerLength = Math.max(sheet.getLastColumn(), values.length);
  const safeValues = normalizeRowValues_(values);

  while (safeValues.length < headerLength) safeValues.push('');
  sheet.appendRow(safeValues);

  return { message: 'Fila creada correctamente en ' + sheetName };
}

function deleteRow_(sheetName, rowIndex) {
  if (isNaN(rowIndex) || rowIndex < 0) throw new Error('Índice de fila inválido');
  const sheet = getSheetByNameOrThrow_(sheetName);
  const targetRow = rowIndex + 2;
  if (targetRow > sheet.getLastRow()) throw new Error('La fila a eliminar no existe');
  sheet.deleteRow(targetRow);
  return { message: 'Fila eliminada correctamente' };
}

function validateRowOperation_(sheetName, rowIndex, values) {
  if (!sheetName) throw new Error('Debes indicar la hoja');
  if (isNaN(rowIndex) || rowIndex < 0) throw new Error('Índice de fila inválido');
  if (!Array.isArray(values) || values.length === 0) throw new Error('Valores inválidos');
}

function normalizeRowValues_(values) {
  return values.map(function(value) {
    return value == null ? '' : String(value).trim();
  });
}

function runAction_(operation, sheetName) {
  switch (operation) {
    case 'limpiarRangoGeneral':
      return { message: limpiarRangoGeneral_(sheetName, 8) };
    case 'limpiarConOmisiones':
      return { message: limpiarConOmisiones_(sheetName) };
    case 'transferirConsolidadoAEtiquetar':
      return { message: transferirConsolidadoAEtiquetar_() };
    case 'copiarEtiquetasAMasivo':
      return { message: copiarEtiquetasAMasivo_() };
    case 'generarFormatoEtiqueta':
      return { message: generarFormatoEtiqueta_() };
    case 'actualizarTablasDinamicas':
      return { message: actualizarTablasDinamicas_() };
    case 'filtrarSinStock':
      return { message: filtrarSinStock_() };
    default:
      throw new Error('Acción no soportada: ' + operation);
  }
}

function limpiarRangoGeneral_(sheetName, numColumnas) {
  const sheet = getSheetByNameOrThrow_(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'Nada que limpiar en esta hoja';
  sheet.getRange(2, 1, lastRow - 1, numColumnas || 8).clearContent();
  return 'Datos eliminados';
}

function limpiarConOmisiones_(sheetName) {
  const sheet = getSheetByNameOrThrow_(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'No hay datos';
  const total = lastRow - 1;
  sheet.getRange(2, 1, total, 4).clearContent();
  sheet.getRange(2, 7, total, 1).clearContent();
  sheet.getRange(2, 9, total, 10).clearContent();
  return 'Limpieza completada. Se omitieron E, F y H';
}

function transferirConsolidadoAEtiquetar_() {
  const ss = getSpreadsheet_();
  const origin = getSheetByNameOrThrow_(SHEETS.CONSOLIDADO_INGRESOS);
  const destination = getSheetByNameOrThrow_(SHEETS.ETIQUETAR);
  const lastRowOrigin = origin.getLastRow();
  if (lastRowOrigin < 2) return 'No hay datos en Consolidado Ingresos';

  const lastRowDestination = destination.getLastRow();
  if (lastRowDestination > 1) destination.getRange(2, 1, lastRowDestination - 1, 8).clearContent();

  const values = origin.getRange(2, 2, lastRowOrigin - 1, 8).getValues();
  destination.getRange(2, 1, values.length, 8).setValues(values);
  return 'Datos transferidos a ETIQUETAR';
}

function copiarEtiquetasAMasivo_() {
  const origin = getSheetByNameOrThrow_(SHEETS.ETIQUETAR);
  const destination = getSheetByNameOrThrow_(SHEETS.MASIVO_UBICACIONES);
  const lastRowOrigin = origin.getLastRow();
  if (lastRowOrigin < 2) return 'No hay datos en ETIQUETAR';

  const values = origin.getRange(2, 1, lastRowOrigin - 1, Math.min(8, origin.getLastColumn())).getValues();
  const lastRowDestination = destination.getLastRow();
  if (lastRowDestination > 1) {
    destination.getRange(2, 1, lastRowDestination - 1, Math.min(8, destination.getLastColumn())).clearContent();
  }

  destination.getRange(2, 1, values.length, values[0].length).setValues(values);
  return 'Datos copiados a MASIVO_UBICACIONES';
}

function generarFormatoEtiqueta_() {
  const origin = getSheetByNameOrThrow_(SHEETS.ETIQUETAR);
  const destination = getSheetByNameOrThrow_(SHEETS.FORMATO_ETIQUETA);
  const lastRow = origin.getLastRow();
  if (lastRow < 2) return 'No hay datos en ETIQUETAR';

  const lastRowDestination = destination.getLastRow();
  if (lastRowDestination > 1) destination.getRange(2, 1, lastRowDestination - 1, 11).clearContent();

  const originValues = origin.getRange(2, 1, lastRow - 1, 8).getValues();
  const today = new Date();
  const finalMatrix = originValues.map(function(row) {
    return [row[0], row[4], row[5], row[1], 'FUNDO', 'FUNDO', row[2], today, row[6], '', row[7]];
  });

  destination.getRange(2, 1, finalMatrix.length, 11).setValues(finalMatrix);
  return 'Formato de Etiqueta generado correctamente';
}

function actualizarTablasDinamicas_() {
  SpreadsheetApp.flush();
  return 'Actualización solicitada. Verifica tablas dinámicas y fórmulas';
}

function filtrarSinStock_() {
  const stockSheet = getSheetByNameOrThrow_(SHEETS.STOCK);
  const targetSheet = getSheetByNameOrThrow_(SHEETS.SIN_ETIQUETA);
  const lastRow = stockSheet.getLastRow();
  const lastCol = stockSheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return 'No hay datos en STOCK';

  const values = stockSheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  const filtered = values.slice(1).filter(function(row) {
    return Number(row[3] || 0) <= 0;
  });

  targetSheet.clearContents();
  targetSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (filtered.length) {
    targetSheet.getRange(2, 1, filtered.length, headers.length).setValues(filtered);
  }

  return 'Filtro sin stock aplicado';
}

function buildSobrestockMap_(repoSheet, stockSheet) {
  const map = new Map();
  if (!repoSheet || !stockSheet) return map;

  const repoLastRow = repoSheet.getLastRow();
  const repoLastCol = repoSheet.getLastColumn();
  const stockLastRow = stockSheet.getLastRow();
  const stockLastCol = stockSheet.getLastColumn();

  if (repoLastRow < 2 || stockLastRow < 2) return map;

  const repoData = repoSheet.getRange(1, 1, repoLastRow, repoLastCol).getValues();
  const stockData = stockSheet.getRange(1, 1, stockLastRow, stockLastCol).getValues();

  const stockSums = {};
  for (var i = 1; i < stockData.length; i += 1) {
    var materialCode = cleanString_(stockData[i][0]).toUpperCase();
    if (!materialCode) continue;
    stockSums[materialCode] = (stockSums[materialCode] || 0) + (parseFloat(stockData[i][3]) || 0);
  }

  for (var j = 1; j < repoData.length; j += 1) {
    var location = cleanString_(repoData[j][3]).toUpperCase();
    var material = cleanString_(repoData[j][0]).toUpperCase();
    if (!location) continue;
    map.set(location, {
      stock: stockSums[material] || 0,
      capacidad: parseFloat(repoData[j][7]) || 0,
      filaCompleta: repoData[j]
    });
  }

  return map;
}

function cleanString_(value) {
  return value == null ? '' : String(value).trim();
}
