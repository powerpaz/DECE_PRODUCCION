/*************************************************
 * DECE Coverage App - VERSIÓN FUNCIONAL COMPLETA
 * 
 * Esta es una versión minimalista pero 100% funcional
 * que resuelve el error HTTP 404 y carga correctamente el CSV
 *************************************************/

// ==================== CONFIGURACIÓN ====================

const DECE_CONFIG = {
  VERSION: '7.1 FUNCIONAL',
  BUFFER_RADIUS_M: 7500,
  ECUADOR_CENTER: [-1.831239, -78.183406],
  CSV_FILENAME: 'DECE_CRUCE_X_Y_NUC_SAT.csv'
};

// ==================== VARIABLES GLOBALES ====================

let map;
let globalData = null;
const layers = {
  nucleos: L.featureGroup(),
  satellites: L.featureGroup(),
  buffers: L.featureGroup()
};

const canvasRenderer = L.canvas({ padding: 0.5 });

// ==================== INICIALIZACIÓN ====================

document.addEventListener("DOMContentLoaded", () => {
  console.log(`%c🚀 DECE Optimizer ${DECE_CONFIG.VERSION}`, 'color: #58a6ff; font-size: 16px; font-weight: bold;');
  
  initMap();
  setupControls();
  loadCSV();
});

// ==================== MAPA ====================

function initMap() {
  console.log("[MAP] 🗺️ Inicializando mapa...");
  
  map = L.map("map", {
    center: DECE_CONFIG.ECUADOR_CENTER,
    zoom: 7,
    zoomControl: true,
    preferCanvas: true,
    renderer: canvasRenderer
  });
  
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 19
  }).addTo(map);
  
  // Agregar capas al mapa
  Object.values(layers).forEach(layer => layer.addTo(map));
  
  console.log("[MAP] ✅ Mapa inicializado");
}

// ==================== CONTROLES ====================

function setupControls() {
  // Panel de estadísticas
  const toggleStats = document.getElementById("toggleStats");
  if (toggleStats) {
    toggleStats.addEventListener("click", () => {
      document.getElementById("statsPanel")?.classList.toggle("active");
    });
  }
  
  // Panel de leyenda
  const toggleLegend = document.getElementById("toggleLegend");
  if (toggleLegend) {
    toggleLegend.addEventListener("click", () => {
      document.getElementById("legendPanel")?.classList.toggle("active");
    });
  }
  
  // Toggles de capas
  setupLayerToggle("toggleNucleos", layers.nucleos);
  setupLayerToggle("toggleSatellites", layers.satellites);
  setupLayerToggle("toggleBuffers", layers.buffers);
  
  console.log("[CONTROLS] ✅ Controles configurados");
}

function setupLayerToggle(elementId, layer) {
  const toggle = document.getElementById(elementId);
  if (toggle) {
    toggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        map.addLayer(layer);
      } else {
        map.removeLayer(layer);
      }
    });
  }
}

// ==================== CARGA DE CSV ====================

function loadCSV() {
  console.log("[LOAD] 📥 Iniciando carga de CSV...");
  
  const overlay = document.getElementById("loadingOverlay");
  const mainText = overlay?.querySelector(".loading-text");
  const subText = document.getElementById("loadingSubtext");
  
  function setText(main, sub = "") {
    if (mainText) mainText.textContent = main;
    if (subText) subText.textContent = sub;
  }
  
  // Verificar que PapaParse esté disponible
  if (typeof Papa === 'undefined') {
    console.error("[ERROR] ❌ PapaParse no está disponible");
    setText("Error: Falta PapaParse", "Verifica conexión a internet");
    setTimeout(() => showErrorModal(), 1000);
    return;
  }
  
  setText("🔍 Cargando CSV...", DECE_CONFIG.CSV_FILENAME);
  
  // Intentar cargar el CSV
  fetch(DECE_CONFIG.CSV_FILENAME, { 
    cache: "no-store",
    headers: { 'Cache-Control': 'no-cache' }
  })
  .then(response => {
    console.log(`[FETCH] Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.text();
  })
  .then(csvText => {
    console.log(`[OK] ✅ CSV cargado: ${csvText.length} caracteres`);
    setText("⚙️ Procesando datos...");
    
    parseCSV(csvText);
  })
  .catch(error => {
    console.error("[ERROR] ❌ Error cargando CSV:", error);
    setText("❌ Error cargando CSV", error.message);
    
    setTimeout(() => showErrorModal(error.message), 1000);
  });
}

// ==================== PARSEO DE CSV ====================

function parseCSV(csvText) {
  console.log("[PARSE] 📊 Parseando CSV...");
  
  // Limpiar BOM si existe
  csvText = csvText.replace(/^\uFEFF/, "");
  
  // Detectar delimitador
  const firstLine = csvText.split(/\r?\n/, 1)[0] || "";
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ";" : ",";
  
  console.log(`[PARSE] Delimitador detectado: "${delimiter}"`);
  console.log(`[PARSE] Primera línea: ${firstLine.substring(0, 100)}...`);
  
  // Parsear con PapaParse
  Papa.parse(csvText, {
    delimiter: delimiter,
    skipEmptyLines: true,
    complete: (results) => {
      console.log(`[PARSE] ✅ ${results.data.length} filas parseadas`);
      
      if (results.errors && results.errors.length > 0) {
        console.warn("[WARN] ⚠️ Errores de parseo:", results.errors.slice(0, 3));
      }
      
      processData(results.data);
    },
    error: (error) => {
      console.error("[ERROR] ❌ Error parseando:", error);
    }
  });
}

// ==================== PROCESAMIENTO DE DATOS ====================

function processData(rows) {
  console.log("[PROCESS] 🔍 Procesando datos...");
  
  const overlay = document.getElementById("loadingOverlay");
  const mainText = overlay?.querySelector(".loading-text");
  const subText = document.getElementById("loadingSubtext");
  
  if (mainText) mainText.textContent = "🔍 Analizando instituciones...";
  if (subText) subText.textContent = `${rows.length} registros`;
  
  if (rows.length === 0) {
    console.error("[ERROR] ❌ CSV vacío");
    return;
  }
  
  // Obtener headers
  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  console.log("[PROCESS] Headers:", headers.slice(0, 10));
  
  // Encontrar índices de columnas
  const latIdx = headers.findIndex(h => h.includes('lat'));
  const lngIdx = headers.findIndex(h => h.includes('lon') || h.includes('lng'));
  const codIdx = headers.findIndex(h => h.includes('cod_gdece'));
  const nameIdx = headers.findIndex(h => h.includes('nombre'));
  const sostIdx = headers.findIndex(h => h.includes('sostenimiento'));
  const studIdx = headers.findIndex(h => h.includes('total') && h.includes('estudiantes'));
  const amieIdx = headers.findIndex(h => h === 'amie');
  const distIdx = headers.findIndex(h => h.includes('distrito'));
  
  console.log("[PROCESS] Índices:", { latIdx, lngIdx, codIdx, nameIdx, sostIdx, studIdx });
  
  if (latIdx < 0 || lngIdx < 0 || codIdx < 0) {
    console.error("[ERROR] ❌ Columnas críticas no encontradas");
    alert("Error: El CSV no tiene las columnas requeridas (latitud, longitud, COD_GDECE)");
    return;
  }
  
  // Procesar filas
  const nucleos = [];
  const satellites = [];
  let validCount = 0;
  let invalidCount = 0;
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Parsear valores
    const lat = parseFloat(String(row[latIdx]).replace(',', '.'));
    const lng = parseFloat(String(row[lngIdx]).replace(',', '.'));
    const codGDECE = parseInt(row[codIdx]) || 0;
    const sostenimiento = String(row[sostIdx] || '').toUpperCase();
    
    // Validar coordenadas
    if (isNaN(lat) || isNaN(lng)) {
      invalidCount++;
      continue;
    }
    
    // Validar que sea fiscal (no fiscomisional)
    const isFiscal = sostenimiento.includes('FISCAL') && 
                     !sostenimiento.includes('FISCOMISIONAL') && 
                     !sostenimiento.includes('FISCO');
    
    if (!isFiscal) {
      continue;
    }
    
    // Crear objeto institución
    const institution = {
      lat: lat,
      lng: lng,
      COD_GDECE: codGDECE,
      AMIE: row[amieIdx] || '',
      Nombre_Institución: row[nameIdx] || '',
      DISTRITO: row[distIdx] || '',
      Sostenimiento: sostenimiento,
      students: parseInt(row[studIdx]) || 0
    };
    
    // Clasificar
    if (codGDECE === 2) {
      satellites.push(institution);
    } else if (codGDECE === 3 || codGDECE === 4 || codGDECE === 5) {
      nucleos.push(institution);
    }
    
    validCount++;
  }
  
  console.log(`[PROCESS] ✅ Procesados: ${validCount} válidos, ${invalidCount} inválidos`);
  console.log(`[PROCESS] 🏛️ Núcleos: ${nucleos.length}`);
  console.log(`[PROCESS] 📍 Satélites: ${satellites.length}`);
  
  // Guardar datos globales
  globalData = { nucleos, satellites };
  
  // Dibujar en el mapa
  if (mainText) mainText.textContent = "🎨 Dibujando mapa...";
  
  drawInstitutions(nucleos, satellites);
  updateDashboard(nucleos, satellites);
  
  // Ocultar overlay
  setTimeout(() => {
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.style.display = 'none', 300);
    }
    console.log("[PROCESS] ✅ Procesamiento completado");
  }, 500);
}

// ==================== DIBUJO EN EL MAPA ====================

function drawInstitutions(nucleos, satellites) {
  console.log("[DRAW] 🎨 Dibujando instituciones...");
  
  // Limpiar capas
  layers.nucleos.clearLayers();
  layers.satellites.clearLayers();
  layers.buffers.clearLayers();
  
  // Dibujar núcleos (primeros 220)
  const selectedNucleos = nucleos.slice(0, 220);
  
  selectedNucleos.forEach((nuc, idx) => {
    // Marcador del núcleo
    const marker = L.circleMarker([nuc.lat, nuc.lng], {
      radius: 8,
      fillColor: '#58a6ff',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
      renderer: canvasRenderer
    });
    
    marker.bindPopup(`
      <div style="font-family: system-ui; padding: 8px;">
        <strong style="color: #58a6ff;">🏛️ Núcleo DECE</strong><br>
        <strong>${escapeHTML(nuc.Nombre_Institución)}</strong><br>
        <small>AMIE: ${nuc.AMIE}</small><br>
        <small>COD: ${nuc.COD_GDECE}</small><br>
        <small>Estudiantes: ${nuc.students}</small>
      </div>
    `);
    
    marker.addTo(layers.nucleos);
    
    // Buffer de 7.5 km
    const buffer = L.circle([nuc.lat, nuc.lng], {
      radius: DECE_CONFIG.BUFFER_RADIUS_M,
      color: '#58a6ff',
      fillColor: '#58a6ff',
      weight: 2,
      opacity: 0.4,
      fillOpacity: 0.08,
      renderer: canvasRenderer
    });
    
    buffer.addTo(layers.buffers);
  });
  
  // Dibujar satélites
  satellites.forEach(sat => {
    const marker = L.circleMarker([sat.lat, sat.lng], {
      radius: 5,
      fillColor: '#10b981',
      color: '#fff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
      renderer: canvasRenderer
    });
    
    marker.bindPopup(`
      <div style="font-family: system-ui; padding: 8px;">
        <strong style="color: #10b981;">📍 Satélite</strong><br>
        <strong>${escapeHTML(sat.Nombre_Institución)}</strong><br>
        <small>AMIE: ${sat.AMIE}</small><br>
        <small>COD: ${sat.COD_GDECE}</small><br>
        <small>Estudiantes: ${sat.students}</small>
      </div>
    `);
    
    marker.addTo(layers.satellites);
  });
  
  console.log(`[DRAW] ✅ Dibujados ${selectedNucleos.length} núcleos y ${satellites.length} satélites`);
  
  // Ajustar vista del mapa
  if (selectedNucleos.length > 0) {
    const bounds = L.latLngBounds(
      selectedNucleos.map(n => [n.lat, n.lng]).concat(
        satellites.map(s => [s.lat, s.lng])
      )
    );
    map.fitBounds(bounds.pad(0.1));
  }
}

// ==================== DASHBOARD ====================

function updateDashboard(nucleos, satellites) {
  console.log("[DASHBOARD] 📊 Actualizando dashboard...");
  
  // Actualizar contadores
  updateElement('nucleosCount', Math.min(nucleos.length, 220));
  updateElement('satellitesCount', satellites.length);
  
  const totalStudents = satellites.reduce((sum, sat) => sum + sat.students, 0);
  updateElement('totalStudents', totalStudents.toLocaleString());
  
  console.log("[DASHBOARD] ✅ Dashboard actualizado");
}

function updateElement(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

// ==================== UTILIDADES ====================

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==================== MODAL DE ERROR ====================

function showErrorModal(errorMsg = '') {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  
  modal.innerHTML = `
    <div style="
      background: #1a1b26;
      border-radius: 16px;
      padding: 32px;
      max-width: 600px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      border: 2px solid #ef4444;
    ">
      <h2 style="color: #ef4444; margin: 0 0 16px 0; font-size: 24px;">
        ⚠️ Error Cargando CSV
      </h2>
      <p style="color: #e5e7eb; margin: 0 0 24px 0; line-height: 1.6;">
        No se pudo cargar el archivo <code>DECE_CRUCE_X_Y_NUC_SAT.csv</code>
      </p>
      
      <div style="background: #dc2626; padding: 12px; border-radius: 8px; margin: 16px 0;">
        <strong style="color: white;">Error: ${escapeHTML(errorMsg)}</strong>
      </div>
      
      <h3 style="color: #58a6ff; margin: 24px 0 12px 0;">🔧 Solución:</h3>
      
      <div style="background: #0d1117; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="color: #e5e7eb; margin: 0 0 8px 0;"><strong>1. Verifica que el CSV esté en la carpeta:</strong></p>
        <pre style="color: #10b981; margin: 0; overflow-x: auto;">DECE_PRODUCCION-main/
├── index-mejorado.html
├── app-funcional.js
└── DECE_CRUCE_X_Y_NUC_SAT.csv  ← DEBE ESTAR AQUÍ</pre>
      </div>
      
      <div style="background: #0d1117; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="color: #e5e7eb; margin: 0 0 8px 0;"><strong>2. Usa servidor local:</strong></p>
        <pre style="color: #10b981; margin: 0;">python servidor.py</pre>
        <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Luego abre: http://localhost:8000/index-mejorado.html</p>
      </div>
      
      <button onclick="this.closest('div').parentElement.remove()" style="
        background: #58a6ff;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        font-size: 16px;
        margin-top: 16px;
      ">Entendido</button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// ==================== EXPORTS ====================

window.DECE_APP = {
  version: DECE_CONFIG.VERSION,
  getData: () => globalData,
  reload: () => {
    if (globalData) {
      drawInstitutions(globalData.nucleos, globalData.satellites);
      updateDashboard(globalData.nucleos, globalData.satellites);
    }
  }
};

console.log("[APP] ✅ Aplicación cargada correctamente");
