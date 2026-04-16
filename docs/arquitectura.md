# Arquitectura

## Frontend
- Hosting estático en GitHub Pages.
- Bootstrap + Chart.js.
- JavaScript modular sin build obligatorio.

## Backend
- Google Apps Script desplegado como Web App.
- Lee y escribe sobre Google Sheets.
- Exposición de API por `doGet` y `doPost`.

## Flujo
1. Frontend llama `getDashboard`.
2. Apps Script responde JSON.
3. Para edición, frontend usa `getHoja`, `saveRow`, `appendRow`, `deleteRow`.
4. Para acciones operativas usa `runAction`.
