# Apps Script backend

## Deploy
1. Crea un proyecto de Google Apps Script vinculado al spreadsheet operativo.
2. Copia `Code.gs` y `appsscript.json`.
3. Despliega como **Web app**.
4. Copia la URL y pégala en `assets/js/config.js`.

## Endpoints
- `GET ?action=getDashboard`
- `GET ?action=getHoja&hoja=STOCK`
- `POST saveRow`
- `POST appendRow`
- `POST deleteRow`
- `POST runAction`

## Notas
- El frontend usa `fetch`, no `google.script.run`.
- El payload POST se envía como `text/plain` con JSON para minimizar fricción de CORS/preflight.
