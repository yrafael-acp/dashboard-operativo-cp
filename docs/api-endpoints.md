# API Endpoints

## GET
### getDashboard
Retorna ubicaciones y estado operativo.

### getHoja
Parámetros:
- `hoja`
- `limit` opcional

## POST
### saveRow
```json
{
  "action": "saveRow",
  "hoja": "STOCK",
  "rowIndex": 0,
  "values": ["A", "B"]
}
```

### appendRow
```json
{
  "action": "appendRow",
  "hoja": "ETIQUETAR",
  "values": ["A", "B"]
}
```

### deleteRow
```json
{
  "action": "deleteRow",
  "hoja": "STOCK",
  "rowIndex": 0
}
```

### runAction
```json
{
  "action": "runAction",
  "operation": "generarFormatoEtiqueta",
  "hoja": "ETIQUETAR"
}
```
