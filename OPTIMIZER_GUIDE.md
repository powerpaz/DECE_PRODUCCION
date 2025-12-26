# 🧠 GUÍA DEL OPTIMIZER INTELIGENTE

## 🎯 OBJETIVO

Maximizar la cobertura de las **1,415 satélites FISCALES** usando los **4,437 núcleos FISCALES** disponibles mediante un algoritmo inteligente de optimización.

---

## 📊 PROBLEMA ACTUAL

Según tus imágenes de exportación:
```
❌ ACTUAL:
- Buffers: 470
- AMIEs cubiertas: 11,449
- Núcleos: 2,492
- Satélites: 8,970
- Cobertura: 67.1%
```

Pero deberías tener:
```
✅ OBJETIVO:
- Satélites fiscales: 1,415
- Núcleos disponibles: 4,437
- Cobertura objetivo: 100%
```

---

## 🚀 CÓMO FUNCIONA

### Paso 1: **Carga y Filtrado**
```javascript
// Filtra SOLO satélites y núcleos fiscales
satelites = data.filter(ie => 
  ie.COD_GDECE === 2 && 
  ie.Sostenimiento === "Fiscal"
);

nucleos = data.filter(ie => 
  [3,4,5].includes(ie.COD_GDECE) && 
  ie.Sostenimiento === "Fiscal"
);
```

### Paso 2: **Agrupación por Distrito**
```javascript
// Agrupa satélites y núcleos por distrito
grupos = {
  "09D01": { satelites: [...], nucleos: [...] },
  "09D02": { satelites: [...], nucleos: [...] },
  ...
}
```

### Paso 3: **Algoritmo Greedy de Cobertura Máxima**
```javascript
Para cada distrito:
  Mientras haya satélites sin cubrir:
    
    1. Calcular score para cada núcleo:
       score = (satelites_dentro * 0.3) +
               (cercanía * 0.4) +
               (balance * 0.2) +
               (densidad * 0.1)
    
    2. Seleccionar núcleo con mayor score
    
    3. Crear buffer de 7km alrededor
    
    4. Asignar satélites dentro del buffer
    
    5. Marcar satélites como cubiertas
```

### Paso 4: **Asignación de Huérfanas**
```javascript
Para cada satélite SIN cubrir:
  
  1. Buscar núcleo MÁS CERCANO en mismo distrito
  
  2. Calcular distancia (sin límite)
  
  3. Crear buffer extendido si es necesario
  
  4. Asignar satélite al núcleo más cercano
```

### Paso 5: **Cálculo de Estadísticas**
```javascript
stats = {
  total: 1415,
  covered: X,
  uncovered: Y,
  buffers: Z,
  coverage_percent: (X/1415 * 100)
}
```

---

## 🎮 USO

### **Opción 1: Desde Console (F12)**

```javascript
// 1. Ejecutar optimización
const resultado = window.ejecutarOptimizacion(globalData);

// 2. Ver estadísticas
console.log(resultado.stats);

// 3. Exportar resultados
const exportado = window.exportarResultadosOptimizados();
console.log(JSON.stringify(exportado, null, 2));

// 4. Descargar como JSON
const blob = new Blob([JSON.stringify(exportado, null, 2)], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'optimizacion_dece.json';
a.click();
```

### **Opción 2: Botón en la Interfaz** (próxima versión)

---

## 📊 PARÁMETROS CONFIGURABLES

```javascript
window.OPTIMIZER_CONFIG = {
  TARGET: {
    satelites_fiscales: 1415,
    nucleos_disponibles: 4437,
    cobertura_objetivo: 0.95,    // 95%
    cobertura_ideal: 1.0         // 100%
  },
  
  PARAMS: {
    buffer_radius: 7000,            // 7km ideal
    max_distance: 15000,            // 15km máximo forzado
    max_satellites_per_buffer: 25,  // Máx por buffer
    min_satellites_per_buffer: 3,   // Mín para crear
    max_buffers: 500                // Máx buffers
  },
  
  WEIGHTS: {
    distance: 0.4,     // Importancia cercanía
    coverage: 0.3,     // Importancia cobertura
    balance: 0.2,      // Importancia balance
    density: 0.1       // Importancia densidad
  }
}
```

---

## 🔧 AJUSTAR PARÁMETROS

### **Aumentar cobertura ideal:**
```javascript
window.OPTIMIZER_CONFIG.PARAMS.buffer_radius = 10000; // 10km
window.ejecutarOptimizacion(globalData);
```

### **Permitir más satélites por buffer:**
```javascript
window.OPTIMIZER_CONFIG.PARAMS.max_satellites_per_buffer = 30;
window.ejecutarOptimizacion(globalData);
```

### **Priorizar cercanía:**
```javascript
window.OPTIMIZER_CONFIG.WEIGHTS.distance = 0.6;
window.OPTIMIZER_CONFIG.WEIGHTS.coverage = 0.2;
window.ejecutarOptimizacion(globalData);
```

---

## 📈 RESULTADOS ESPERADOS

### **Escenario Optimista:**
```
✅ Cobertura: 98-100%
✅ Buffers: 350-450
✅ Distancia promedio: 5-6 km
✅ Satélites por buffer: 3-8
```

### **Escenario Realista:**
```
✅ Cobertura: 95-98%
✅ Buffers: 400-500
✅ Distancia promedio: 6-8 km
✅ Satélites por buffer: 3-6
```

### **Escenario Conservador:**
```
✅ Cobertura: 90-95%
✅ Buffers: 300-400
✅ Distancia promedio: 7-10 km
✅ Satélites por buffer: 4-7
```

---

## 🎯 VENTAJAS DEL ALGORITMO

### **1. Greedy Optimizado**
- Selecciona el mejor núcleo en cada iteración
- Maximiza cobertura incremental
- Balance entre cantidad y cercanía

### **2. Scoring Multicriterio**
- Distancia (40%)
- Cobertura (30%)
- Balance (20%)
- Densidad (10%)

### **3. Sin Límite para Huérfanas**
- Garantiza 100% de asignación
- Conecta al más cercano disponible
- Permite buffers extendidos

### **4. Respeta Restricciones**
- Solo fiscales
- Mismo distrito
- Balance de carga por núcleo

---

## 🔍 DEBUG Y MONITOREO

### **Ver estado actual:**
```javascript
console.log(window.optimizerState);
```

### **Ver buffers creados:**
```javascript
console.log(window.optimizerState.buffers);
```

### **Ver satélites sin cubrir:**
```javascript
const uncovered = window.optimizerState.satelites.filter(s => !s.covered);
console.log(`Sin cubrir: ${uncovered.length}`);
console.log(uncovered);
```

### **Ver estadísticas:**
```javascript
console.log(window.optimizerState.stats);
```

---

## 📤 FORMATO DE EXPORTACIÓN

```json
{
  "timestamp": "2024-12-26T...",
  "version": "1.0.0",
  "stats": {
    "total_satelites": 1415,
    "covered": 1398,
    "uncovered": 17,
    "buffers_created": 420,
    "coverage_percent": "98.80"
  },
  "buffers": [
    {
      "id": "buffer_0",
      "nucleo_amie": "06H01234",
      "lat": -1.2345,
      "lon": -78.5678,
      "distrito": "09D01",
      "radius": 7000,
      "satelites_count": 8,
      "satelites": [...]
    }
  ],
  "satelites": [
    {
      "amie": "06H04567",
      "nombre": "IE X",
      "covered": true,
      "buffer_id": "buffer_0",
      "distance": 4523
    }
  ]
}
```

---

## ⚡ INTEGRACIÓN CON EL SISTEMA ACTUAL

El optimizer se integra perfectamente:

```javascript
// El sistema carga los datos
loadCSV() → globalData

// Ejecutar optimizer
window.ejecutarOptimizacion(globalData);

// Aplicar resultados al mapa
window.optimizerState.buffers.forEach(buffer => {
  // Crear círculo en mapa
  L.circle([buffer.lat, buffer.lon], {
    radius: buffer.radius,
    color: buffer.extended ? '#f59e0b' : '#2563eb'
  }).addTo(map);
  
  // Dibujar conexiones
  buffer.satelites.forEach(sat => {
    L.polyline([
      [buffer.lat, buffer.lon],
      [sat.lat, sat.lon]
    ], {
      color: sat.distance <= 7000 ? '#10b981' : '#FF8C00',
      dashArray: sat.distance > 7000 ? '5,5' : null
    }).addTo(map);
  });
});
```

---

## 🎯 PRÓXIMOS PASOS

1. ✅ Ejecutar optimización con tus datos
2. ✅ Analizar resultados
3. ✅ Ajustar parámetros si es necesario
4. ✅ Exportar resultados finales
5. ✅ Integrar con visualización en mapa

---

**Versión:** 1.0.0  
**Estado:** ✅ Listo para usar  
**Compatibilidad:** D3.js, Leaflet, Sistema actual
