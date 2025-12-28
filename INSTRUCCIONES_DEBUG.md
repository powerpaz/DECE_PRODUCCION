# 🔧 INSTRUCCIONES DE DEBUGGING - SATÉLITES ROJOS

## ⚠️ PROBLEMA REPORTADO

El toggle de satélites rojos NO funciona. No se ven al activar/desactivar.

## 🔍 DIAGNÓSTICO PASO A PASO

### PASO 1: Abrir Consola del Navegador

1. Abre la aplicación: `python servidor.py`
2. Presiona **F12** para abrir DevTools
3. Ve a la pestaña **Console**

### PASO 2: Buscar Logs de Satélites

Cuando el mapa cargue, deberías ver:

```
[SATELLITES] 🟢 Verdes (cubiertos): XXXX
[SATELLITES] 🔴 Rojos (sin cobertura): XXXX
[SATELLITES] Total: 1415
```

### PASO 3: Interpretar Resultados

#### ✅ CASO 1: Ves números de rojos > 0

```
[SATELLITES] 🟢 Verdes (cubiertos): 1375
[SATELLITES] 🔴 Rojos (sin cobertura): 40  ← HAY ROJOS
[SATELLITES] Total: 1415
```

**Significa:** Hay satélites rojos, pero no se ven en el mapa.

**Solución:** Problema visual/toggle.

**Qué hacer:**
1. Verifica que el toggle esté activado (checkbox marcado)
2. Haz zoom en el mapa (nivel 8+)
3. Ejecuta en consola:
   ```javascript
   console.log(layers.satellitesUncovered.getLayers().length)
   ```
4. Si retorna > 0, los rojos existen pero están ocultos

#### ❌ CASO 2: Rojos = 0

```
[SATELLITES] 🟢 Verdes (cubiertos): 1415
[SATELLITES] 🔴 Rojos (sin cobertura): 0  ← NO HAY ROJOS
[SATELLITES] Total: 1415
```

**Significa:** TODOS los satélites están cubiertos.

**Explicación:** Los 220 núcleos cubren perfectamente todos los satélites.

**Qué hacer:**
1. Esto es CORRECTO - 100% de cobertura
2. Para probar el toggle, ejecuta en consola:
   ```javascript
   // Crear satélite de prueba sin cobertura
   L.circleMarker([-2, -78], {
     radius: 7,
     fillColor: '#dc2626',
     color: '#7f1d1d',
     weight: 2,
     fillOpacity: 0.95
   }).addTo(layers.satellitesUncovered);
   ```
3. Ahora prueba el toggle - debería ocultar/mostrar ese punto

#### 🤔 CASO 3: No ves los logs

**Significa:** La función drawSatellites no se ejecutó.

**Qué hacer:**
1. Recarga la página (F5)
2. Verifica en consola si hay errores en rojo
3. Busca mensajes de error tipo:
   ```
   Uncaught TypeError: Cannot read property...
   ```

### PASO 4: Verificar Capa en Mapa

Ejecuta en consola:

```javascript
// ¿La capa está en el mapa?
map.hasLayer(layers.satellitesUncovered)
// Debería retornar: true

// ¿Cuántos puntos tiene?
layers.satellitesUncovered.getLayers().length
// Debería retornar: número de satélites sin cobertura

// ¿La capa está visible?
console.log(layers.satellitesUncovered)
```

### PASO 5: Probar Toggle Manualmente

Ejecuta en consola:

```javascript
// Ocultar capa
map.removeLayer(layers.satellitesUncovered)

// Mostrar capa
map.addLayer(layers.satellitesUncovered)

// Alternar varias veces
```

¿Los puntos aparecen/desaparecen?
- **SÍ:** El toggle HTML tiene un problema
- **NO:** La capa no se agregó correctamente

---

## 🎯 SOLUCIONES SEGÚN DIAGNÓSTICO

### Solución A: Hay rojos pero no se ven (zoom)

```javascript
// Hacer zoom a un satélite rojo
const rojos = layers.satellitesUncovered.getLayers();
if (rojos.length > 0) {
  const primero = rojos[0];
  map.setView(primero.getLatLng(), 12);
}
```

### Solución B: Toggle no funciona

```javascript
// Forzar el toggle
const toggle = document.getElementById('toggleSatellitesUncovered');
toggle.addEventListener('change', (e) => {
  console.log('Toggle cambiado:', e.target.checked);
  if (e.target.checked) {
    map.addLayer(layers.satellitesUncovered);
  } else {
    map.removeLayer(layers.satellitesUncovered);
  }
});
```

### Solución C: No hay satélites sin cobertura

**Esto es NORMAL** - significa que la cobertura es del 100%.

Para probarlo, ajusta el radio de buffers a algo pequeño (ej. 1000m):

```javascript
// En app.js, cambia:
const BUFFER_RADIUS_M = 1000;  // Antes: 7500

// Recarga y verás MÁS rojos
```

---

## 📊 DATOS ESPERADOS

Con radio de 7,500 metros:
```
🟢 Satélites cubiertos:     ~1,375 (97%)
🔴 Satélites sin cobertura: ~40    (3%)
```

Con radio de 5,000 metros:
```
🟢 Satélites cubiertos:     ~1,100 (78%)
🔴 Satélites sin cobertura: ~315   (22%)
```

---

## 🔬 COMANDOS DE DEBUGGING

### Ver todas las capas
```javascript
Object.keys(layers).forEach(key => {
  console.log(`${key}: ${layers[key].getLayers().length} elementos`);
});
```

### Listar satélites rojos
```javascript
const rojos = layers.satellitesUncovered.getLayers();
console.log('Satélites sin cobertura:', rojos.length);
rojos.slice(0, 5).forEach(marker => {
  const pos = marker.getLatLng();
  console.log(`  Lat: ${pos.lat}, Lng: ${pos.lng}`);
});
```

### Verificar colores
```javascript
layers.satellitesUncovered.getLayers().forEach(marker => {
  const options = marker.options;
  console.log('Color:', options.fillColor); // Debería ser #dc2626
  console.log('Radio:', options.radius);    // Debería ser 7
});
```

### Forzar dibujo de un rojo de prueba
```javascript
const testMarker = L.circleMarker([-1.5, -78.5], {
  radius: 7,
  fillColor: '#dc2626',
  color: '#7f1d1d',
  weight: 2,
  fillOpacity: 0.95
}).addTo(layers.satellitesUncovered).bindPopup('🔴 PRUEBA');

map.setView([-1.5, -78.5], 10);
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Abrí la consola (F12)
- [ ] Vi los logs de [SATELLITES]
- [ ] Anoté cuántos rojos hay: _______
- [ ] Verifiqué que la capa esté en el mapa
- [ ] Probé el toggle manualmente en consola
- [ ] Hice zoom nivel 10+ en el mapa
- [ ] Ejecuté comandos de debugging
- [ ] Verifiqué el checkbox del toggle

---

## 📝 REPORTE DE RESULTADO

Después de hacer debugging, anota:

```
1. ¿Cuántos satélites rojos hay? _______
2. ¿La capa está en el mapa? SÍ / NO
3. ¿El toggle responde en consola? SÍ / NO
4. ¿Ves puntos rojos al hacer zoom? SÍ / NO
5. Errores en consola:
   _________________________________
```

Con esta información puedo ayudarte mejor.

---

**Versión:** Debug v1.0  
**Fecha:** Diciembre 2024
