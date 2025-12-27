# 🎯 DECE Optimizer v7.0 - Sistema de Optimización de Cobertura

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Instalación y Uso](#instalación-y-uso)
- [Lógica del Sistema](#lógica-del-sistema)
- [Solución de Problemas](#solución-de-problemas)
- [Mejoras Implementadas](#mejoras-implementadas)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [API y Funciones](#api-y-funciones)

---

## 📖 Descripción

DECE Optimizer es un sistema de optimización geoespacial diseñado para el Ministerio de Educación de Ecuador. Su objetivo es determinar la ubicación óptima de los Departamentos de Consejería Estudiantil (DECE) para maximizar la cobertura de instituciones educativas.

### 🎯 Objetivo Principal

Seleccionar estratégicamente instituciones educativas que servirán como **núcleos DECE** para proporcionar servicios de consejería a instituciones más pequeñas (**satélites**) dentro de un radio de 7.5 km.

---

## ✨ Características

### 🔍 Análisis Geoespacial
- ✅ Clasificación automática de instituciones según COD_GDECE
- ✅ Cálculo de distancias usando fórmula de Haversine
- ✅ Optimización mediante algoritmo Greedy Set Cover
- ✅ Visualización interactiva con mapas Leaflet

### 📊 Dashboard Inteligente
- ✅ Métricas en tiempo real
- ✅ Estadísticas de cobertura
- ✅ Top instituciones por absorción
- ✅ Análisis de satélites sin cobertura

### 🛠️ Funcionalidades Avanzadas
- ✅ Modo edición: arrastra buffers para reoptimizar
- ✅ Buffers personalizados: añade cobertura manual
- ✅ Persistencia de estado con localStorage
- ✅ Exportación a Excel/CSV/JSON
- ✅ Sistema de backup automático

---

## 🚀 Instalación y Uso

### Opción 1: Python (Recomendado) ⭐

```bash
# 1. Navega a la carpeta del proyecto
cd DECE_PRODUCCION-main

# 2. Ejecuta el servidor
python servidor.py

# 3. El navegador se abrirá automáticamente en:
# http://localhost:8000/index-mejorado.html
```

### Opción 2: Python Manual

```bash
# En la carpeta del proyecto:
python -m http.server 8000

# Abre en tu navegador:
# http://localhost:8000/index-mejorado.html
```

### Opción 3: Node.js

```bash
# Instalar servidor HTTP
npm install -g http-server

# Ejecutar
http-server -p 8000

# Abrir
# http://localhost:8000/index-mejorado.html
```

### Opción 4: Visual Studio Code

1. Instala la extensión **"Live Server"**
2. Click derecho en `index-mejorado.html`
3. Selecciona **"Open with Live Server"**

### Opción 5: XAMPP/WAMP/MAMP

1. Copia la carpeta completa a `htdocs/` o `www/`
2. Inicia Apache
3. Abre `http://localhost/DECE_PRODUCCION-main/index-mejorado.html`

---

## 🧠 Lógica del Sistema

### 1. Clasificación de Instituciones

El sistema clasifica las instituciones educativas según `COD_GDECE`:

| COD_GDECE | Estudiantes | Rol | Acción |
|-----------|-------------|-----|--------|
| **1** | 1-50 | Excluidas | ❌ No se procesan |
| **2** | 51-120 | **Satélites** | 📍 Necesitan cobertura |
| **3** | 121-450 | **Núcleos** | 🏛️ Candidatos a DECE |
| **4** | 451-900 | **Núcleos** | 🏛️ Candidatos a DECE |
| **5** | 900+ | **Núcleos** | 🏛️ Candidatos a DECE |

### 2. Restricciones del Algoritmo

```javascript
PARÁMETROS = {
  Buffer: 7.5 km de radio,
  Mismo distrito: OBLIGATORIO,
  Mínimo satélites por buffer: 3,
  Máximo buffers: 220,
  Target de cobertura: 97%,
  Solo instituciones fiscales: SÍ (excluye fiscomisionales)
}
```

### 3. Flujo de Procesamiento

```
📥 CARGA CSV
   ↓
🔍 PARSEO (detecta delimitador automáticamente)
   ↓
🏷️ CLASIFICACIÓN
   ├─ Núcleos (COD 3,4,5 + fiscal)
   └─ Satélites (COD 2 + fiscal)
   ↓
📐 CÁLCULO DE DISTANCIAS
   ├─ Para cada satélite
   └─ Encuentra núcleos en radio de 7.5 km
   ↓
⚙️ OPTIMIZACIÓN (Greedy Set Cover)
   ├─ Selecciona núcleo que cubre MÁS satélites
   ├─ Marca satélites como cubiertos
   └─ Repite hasta alcanzar target (97%)
   ↓
🎨 RENDERIZADO
   ├─ Núcleos seleccionados (azul)
   ├─ Satélites cubiertos (verde)
   ├─ Satélites sin cobertura (naranja)
   └─ Buffers de 7.5 km
   ↓
📊 DASHBOARD
   └─ Actualiza métricas en tiempo real
```

### 4. Algoritmo de Optimización: Greedy Set Cover

```python
# Pseudocódigo
function optimizar(nucleos, satelites):
    sin_cobertura = todos_los_satelites
    seleccionados = conjunto_vacio
    
    while sin_cobertura.size > 0 AND seleccionados.size < 220:
        # Encontrar núcleo que cubra MÁS satélites sin cobertura
        mejor_nucleo = null
        max_cobertura = 0
        
        for nucleo in nucleos:
            if nucleo in seleccionados:
                continue
            
            # Contar satélites sin cobertura que este núcleo puede cubrir
            cobertura = count(satelites dentro de 7.5km de nucleo 
                            AND mismo_distrito
                            AND en sin_cobertura)
            
            if cobertura > max_cobertura:
                mejor_nucleo = nucleo
                max_cobertura = cobertura
        
        if mejor_nucleo == null:
            break  # No hay más núcleos útiles
        
        # Seleccionar el mejor núcleo
        seleccionados.add(mejor_nucleo)
        
        # Marcar satélites como cubiertos
        satelites_cubiertos = satelites_en_buffer(mejor_nucleo)
        sin_cobertura.remove(satelites_cubiertos)
        
        # Verificar si alcanzamos el target
        if cobertura_actual >= 97%:
            break
    
    return seleccionados, sin_cobertura
```

---

## 🔧 Solución de Problemas

### ❌ Problema: "CSV vacío"

**Causa:** Estás abriendo `index.html` directamente desde el sistema de archivos (`file:///`). Los navegadores bloquean la carga de archivos por seguridad (CORS).

**Solución:**
```bash
# Usa uno de los métodos de servidor local descritos arriba
python servidor.py
```

### ❌ Problema: El mapa no se muestra

**Verificar:**
1. ✅ Consola del navegador (F12) para ver errores
2. ✅ Conexión a internet (Leaflet se carga desde CDN)
3. ✅ Que el archivo `style.css` esté en la misma carpeta

### ❌ Problema: No se cargan las instituciones

**Verificar:**
1. ✅ Que `DECE_CRUCE_X_Y_NUC_SAT.csv` esté en la misma carpeta
2. ✅ Que el CSV tenga las columnas correctas:
   - `latitud` o `lat`
   - `longitud` o `lon`
   - `COD_GDECE`
   - `Sostenimiento`

### ❌ Problema: Error al guardar cambios

**Causa:** localStorage lleno o bloqueado

**Solución:**
```javascript
// Abrir consola (F12) y ejecutar:
localStorage.clear()
// Luego recargar la página
```

### ❌ Problema: Buffers en posiciones incorrectas

**Solución:**
```javascript
// En consola (F12):
localStorage.removeItem('dece_buffers_state')
// Recargar página
```

---

## 🆕 Mejoras Implementadas en v7.0

### 1. ✅ Código Consolidado
- **Antes:** 3 archivos JavaScript conflictivos
  - `app.js` (2000+ líneas)
  - `dece-FORCE-override.js`
  - `dece-patch-v4.3-DASHBOARD-FORZADO.js`
- **Ahora:** 1 archivo optimizado
  - `app-mejorado.js` (~1500 líneas, bien documentado)

### 2. ✅ Carga de CSV Mejorada
```javascript
// Antes: Solo fetch() - falla en file://
fetch("DECE_CRUCE_X_Y_NUC_SAT.csv")

// Ahora: Detección inteligente + modal de ayuda
async function loadCSV() {
  try {
    await fetch(...)
  } catch {
    showServerInstructions() // Modal con guía paso a paso
  }
}
```

### 3. ✅ Validación Robusta
```javascript
// Antes: Validación muy estricta (perdía datos)
lat >= -5 && lat <= 2

// Ahora: Con margen de seguridad
lat >= -5.5 && lat <= 2.5
```

### 4. ✅ Mejor Logging
```javascript
// Todos los pasos se registran:
console.log("[LOAD] 🚀 Iniciando carga CSV...")
console.log("[PARSE] 📊 Detectando delimitador...")
console.log("[OPTIMIZE] ✅ 127 núcleos seleccionados")
```

### 5. ✅ Modal de Instrucciones
Cuando falla la carga, muestra un modal elegante con:
- 4 opciones de servidor local
- Comandos listos para copiar
- Instrucciones paso a paso

### 6. ✅ Documentación Inline
Cada función tiene documentación clara:
```javascript
/**
 * Calcula distancia entre dos puntos usando fórmula de Haversine
 * @param {number} lat1 - Latitud del primer punto
 * @param {number} lng1 - Longitud del primer punto
 * @param {number} lat2 - Latitud del segundo punto
 * @param {number} lng2 - Longitud del segundo punto
 * @returns {number} Distancia en metros
 */
function haversineMeters(lat1, lng1, lat2, lng2) { ... }
```

---

## 📁 Estructura del Proyecto

```
DECE_PRODUCCION-main/
│
├── 📄 index.html                    # Versión original
├── 📄 index-mejorado.html          # ⭐ Versión mejorada (USAR ESTA)
│
├── 📜 app.js                        # Script original (2000+ líneas)
├── 📜 app-mejorado.js              # ⭐ Script consolidado y mejorado
├── 📜 dece-FORCE-override.js       # (Ya no necesario)
├── 📜 dece-patch-v4.3-DASHBOARD-FORZADO.js  # (Ya no necesario)
│
├── 🎨 style.css                     # Estilos
│
├── 📊 DECE_CRUCE_X_Y_NUC_SAT.csv   # Datos (6.5 MB)
│
├── 🐍 servidor.py                   # ⭐ Servidor local con auto-start
│
├── 📖 README_FINAL.txt             # README original
├── 📖 README-MEJORADO.md           # ⭐ Este archivo
│
├── 📘 OPTIMIZER_GUIDE.md           # Guía de optimización
├── 📘 AUTO_OPTIMIZER_GUIDE.txt     # Guía automática
├── 📘 EXPLICACION_MAPA.md          # Explicación del mapa
└── 📄 INSTRUCCIONES_RAPIDAS.html   # Guía rápida
```

---

## 🔌 API y Funciones Principales

### Funciones de Validación

```javascript
// Valida si una IE es fiscal (excluye fiscomisionales)
esFiscal(institucion) → boolean

// Valida si una IE está en grupo 1 (excluidos)
esExcluida(institucion) → boolean

// Valida si es satélite válido (COD 2 + fiscal)
esSateliteValida(institucion) → boolean

// Valida si es núcleo válido (COD 3,4,5 + fiscal)
esNucleoValido(institucion) → boolean

// Valida mismo distrito
mismoDistrito(ie1, ie2) → boolean

// Valida coordenadas para Ecuador
validateBufferCoordinates(lat, lng) → boolean
```

### Funciones de Cálculo

```javascript
// Calcula distancia en metros entre dos puntos
haversineMeters(lat1, lng1, lat2, lng2) → number

// Calcula qué núcleos pueden cubrir cada satélite
calculateCandidates(nucleos, satellites) → Array[]

// Optimiza selección de núcleos (Greedy Set Cover)
optimizeNucleoSelection(nucleos, satellites, candidates) 
  → { selected: Set, uncovered: Set }

// Construye estadísticas de cada núcleo
buildNucleoStats(nucleos, satellites, candidates) → Array
```

### Funciones de Almacenamiento

```javascript
// Guarda estado de buffers en localStorage
saveBuffersState() → void

// Carga estado de buffers desde localStorage
loadBuffersState() → Object | null

// Restaura buffer personalizado
restoreCustomBuffer(savedData) → void
```

### Funciones de UI

```javascript
// Muestra notificación toast
showNotification(message, type) → void

// Muestra modal con instrucciones de servidor
showServerInstructions() → void

// Actualiza dashboard con estadísticas
updateDashboard() → void

// Crea popup para núcleo
createNucleoPopup(nucleo, satCount, students) → string

// Crea popup para satélite
createSatellitePopup(satellite, isCovered) → string
```

---

## 📊 Datos del CSV

### Estructura Esperada

El CSV debe tener las siguientes columnas (el orden no importa):

| Columna | Requerida | Descripción |
|---------|-----------|-------------|
| `latitud` o `lat` | ✅ | Coordenada latitud |
| `longitud` o `lon` | ✅ | Coordenada longitud |
| `COD_GDECE` | ✅ | Código de grupo DECE (1-5) |
| `Sostenimiento` | ✅ | Tipo de sostenimiento (Fiscal, etc.) |
| `AMIE` | ⚪ | Código AMIE de la institución |
| `Nombre_Institución` | ⚪ | Nombre de la IE |
| `DISTRITO` | ⚪ | Distrito educativo |
| `Provincia` | ⚪ | Provincia |
| `Total Estudiantes` | ⚪ | Número de estudiantes |

### Delimitadores Soportados

El sistema detecta automáticamente:
- `,` (coma)
- `;` (punto y coma)

### Encoding

- ✅ UTF-8
- ✅ UTF-8 con BOM (se limpia automáticamente)

---

## 📈 Métricas y KPIs

### Dashboard Muestra:

```
📊 MÉTRICAS PRINCIPALES
├─ Núcleos Activos: ~220
├─ Satélites Totales: ~1,415
├─ Estudiantes Cubiertos: ~170,000
└─ Cobertura: ~97%

🎯 DISTRIBUCIÓN
├─ Satélites cubiertos: ~1,375 (97%)
├─ Satélites sin cobertura: ~40 (3%)
└─ Huérfanos identificados: Variable

🏆 TOP NÚCLEOS
└─ Por número de satélites absorbidos
```

---

## 🛡️ Seguridad y Privacidad

### localStorage
- ✅ Solo guarda posiciones de buffers (lat/lng)
- ✅ No guarda datos sensibles de estudiantes
- ✅ Se puede limpiar en cualquier momento

### Datos CSV
- ✅ Permanece en el cliente (no se envía a servidores)
- ✅ Procesamiento 100% local en el navegador

---

## 🤝 Contribuir

### Para Reportar Bugs

1. Abre la consola del navegador (F12)
2. Reproduce el error
3. Copia los mensajes de error
4. Incluye:
   - Sistema operativo
   - Navegador y versión
   - Tamaño del CSV
   - Pasos para reproducir

### Para Sugerir Mejoras

Considera incluir:
- Caso de uso específico
- Mockup o descripción clara
- Impacto esperado

---

## 📝 Changelog

### v7.0 (Actual) - Diciembre 2024
- ✅ Código consolidado en un solo archivo
- ✅ Carga de CSV mejorada con fallbacks
- ✅ Modal de instrucciones automático
- ✅ Validación de coordenadas más flexible
- ✅ Logging mejorado con emojis
- ✅ Servidor Python con auto-start
- ✅ Documentación completa

### v4.3 (Anterior)
- Optimización con algoritmo Greedy
- Dashboard con métricas
- Modo edición de buffers
- Exportación a Excel

---

## 🎓 Conceptos Clave

### Set Cover Problem
El problema de optimización consiste en seleccionar el **mínimo** número de conjuntos que cubran todos los elementos. En nuestro caso:
- **Conjuntos** = Buffers de núcleos (cada uno cubre varios satélites)
- **Elementos** = Satélites que necesitan cobertura
- **Objetivo** = Cubrir ≥97% de satélites con ≤220 núcleos

### Greedy Algorithm
Algoritmo que selecciona la mejor opción local en cada paso:
1. Selecciona el núcleo que cubre **MÁS** satélites sin cobertura
2. Marca esos satélites como cubiertos
3. Repite hasta alcanzar el objetivo

**Ventaja:** Rápido (O(n·m) donde n=núcleos, m=satélites)
**Desventaja:** No garantiza la solución óptima global (pero es ~97% efectivo)

### Haversine Formula
Fórmula para calcular distancia entre dos puntos en una esfera:

```
a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlon/2)
c = 2 · atan2(√a, √(1-a))
d = R · c

donde:
- R = 6,371 km (radio de la Tierra)
- Δlat = diferencia de latitudes
- Δlon = diferencia de longitudes
```

---

## 📞 Soporte

### Problemas Comunes

**P: ¿Por qué dice "CSV vacío"?**
R: Necesitas un servidor local. Usa `python servidor.py`

**P: ¿Puedo usar otros formatos además de CSV?**
R: No directamente, pero puedes convertir Excel → CSV

**P: ¿Los cambios se guardan automáticamente?**
R: Sí, en localStorage del navegador

**P: ¿Funciona offline?**
R: Sí (después de la primera carga de Leaflet/CDNs)

**P: ¿Puedo exportar los resultados?**
R: Sí, a Excel, CSV y JSON (función en desarrollo)

---

## 📜 Licencia

Este software fue desarrollado para el Ministerio de Educación de Ecuador.

---

## 🌟 Créditos

- **Algoritmo:** Greedy Set Cover adaptado
- **Mapas:** Leaflet.js
- **CSV Parsing:** PapaParse
- **UI:** Custom CSS con Inter font
- **Optimización:** Custom implementation

---

**Versión:** 7.0.0  
**Última actualización:** Diciembre 2024  
**Estado:** ✅ Producción  

---

💡 **Tip:** Para la mejor experiencia, usa `index-mejorado.html` con `python servidor.py`
