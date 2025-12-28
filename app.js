/*************************************************
 * DECE Coverage App - v6.0 ENHANCED
 * ✅ Botón Exportar Resultados (Excel, CSV, JSON)
 * ✅ Spatial Join completo
 * ✅ Animaciones Núcleo-Satélite
 * ✅ Popups dinámicos funcionales
 *************************************************/

let map;
const layers = {
  nucleos: L.featureGroup(),
  satellites: L.featureGroup(),
  satellitesUncovered: L.featureGroup(),  // Nueva capa para satélites SIN cobertura (rojos)
  buffers: L.featureGroup(),
  connections: L.featureGroup(),
  animations: L.featureGroup()
};

const BUFFER_RADIUS_M = 7500;
const ORPHAN_WARNING_DISTANCE_M = 7000; // 7 km: umbral para marcar conexiones extendidas
const ORPHAN_MAX_DISTANCE_M = Infinity; // Conectar huérfanos al núcleo más cercano (sin límite de distancia)

const ECUADOR_CENTER = [-1.831239, -78.183406];
const canvasRenderer = L.canvas({ padding: 0.5 });
const GRID_CELL_DEG = 0.10;
const BUFFER_SELECTION_POLICY = "cover";
const TARGET_COVERAGE = 0.97;
const MAX_BUFFERS = 220;
const MIN_SATS_PER_BUFFER = 3;
const TOP_N_BUFFERS = 120;
const ENABLE_NETWORK_ANIMATION = true;
const MAX_CONNECTIONS_FOR_ANIM = 6000;
const ASSUMED_SPEED_KMH = 30;

let editMode = false;
let addMode = false;
let deleteMode = false;
let editableBuffers = new Map();
let customBuffers = [];
let customBufferCounter = 0;
let globalData = null;
let metricsPanel = null;
let hasUnsavedChanges = false;


// ========== CONEXIONES DE SATÉLITES DESATENDIDOS ==========
let satelliteConnections = new Map(); // si -> {ni, distance, animated}
let connectionStats = {
  total: 0,
  connected: 0,
  orphans: 0,
  coverageImprovement: 0
};


// ========== ANÁLISIS DE HUÉRFANOS (AGREGADO) ==========
let orphanAnalysis = {
  forcedAssignments: new Map(), // si -> {ni, distance}
  orphanSatellites: new Set(),
  unservedSatellites: new Map(), // si -> {ni, distance} (más cercano, pero > 7km)

  orphanNucleos: new Set(),
  stats: {
    total: 0,
    normalCovered: 0,
    forcedCovered: 0,
    unserved: 0,
    normalPercent: 0,
    totalPercent: 0
  }
};

let animationLines = [];
let _connectionAnimTimer = null;
let _initialized = false;
let autoSaveTimer = null;
let analyzeOrphansTimer = null;

const STORAGE_KEY = 'dece_buffers_state';
const BACKUP_KEY = 'dece_buffers_backup';

// ==================== STORAGE MEJORADO ====================
/**
 * Valida que las coordenadas sean válidas para Ecuador
 */
function validateBufferCoordinates(lat, lng) {
  // Ecuador está aproximadamente entre -5° y 2° de latitud, -92° y -75° de longitud
  return !isNaN(lat) && !isNaN(lng) &&
         lat >= -5 && lat <= 2 &&
         lng >= -92 && lng <= -75;
}

/**
 * Guarda el estado completo de los buffers con validación
 */
function saveBuffersState() {
  const state = {
    editableBuffers: [],
    customBuffers: [],
    timestamp: new Date().toISOString(),
    version: '6.1'
  };

  // Guardar buffers editables con validación de coordenadas
  editableBuffers.forEach((data, ni) => {
    const pos = data.circle.getLatLng();
    
    // Validar que las coordenadas sean válidas
    if (isNaN(pos.lat) || isNaN(pos.lng)) {
      console.error(`❌ Coordenadas inválidas para buffer ${ni}`);
      return;
    }
    
    state.editableBuffers.push({
      ni: ni,
      currentLat: pos.lat,
      currentLng: pos.lng,
      originalLat: data.originalPos.lat,
      originalLng: data.originalPos.lng,
      nucleoName: data.nucleo.name || `Núcleo ${ni}`
    });
  });

  // Guardar buffers personalizados
  customBuffers.forEach(buffer => {
    const pos = buffer.circle.getLatLng();
    
    if (isNaN(pos.lat) || isNaN(pos.lng)) {
      console.error(`❌ Coordenadas inválidas para buffer personalizado ${buffer.id}`);
      return;
    }
    
    state.customBuffers.push({
      id: buffer.id,
      lat: pos.lat,
      lng: pos.lng,
      name: buffer.name,
      originalLat: buffer.originalPos?.lat || pos.lat,
      originalLng: buffer.originalPos?.lng || pos.lng
    });
  });

  try {
    // Crear backup antes de guardar
    const existingState = localStorage.getItem(STORAGE_KEY);
    if (existingState) {
      localStorage.setItem(BACKUP_KEY, existingState);
    }
    
    // Guardar nuevo estado
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    hasUnsavedChanges = false;
    updateSaveButtonState();
    
    console.log(`💾 Estado guardado: ${state.editableBuffers.length} buffers editables, ${state.customBuffers.length} personalizados`);
    showNotification("💾 Cambios guardados exitosamente", "success");
    
    return true;
  } catch (e) {
    console.error("❌ Error al guardar:", e);
    showNotification("❌ Error al guardar: " + e.message, "error");
    return false;
  }
}

/**
 * Carga el estado guardado con validación robusta
 */
function loadBuffersState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    
    if (!saved) {
      console.log("ℹ️ No hay estado guardado previo");
      return null;
    }
    
    const state = JSON.parse(saved);
    
    // Validar estructura del estado
    if (!state.editableBuffers && !state.customBuffers) {
      console.warn("⚠️ Estado guardado tiene formato inválido");
      return null;
    }
    
    // Validar cada buffer guardado
    let validBuffers = 0;
    let invalidBuffers = 0;
    
    if (state.editableBuffers) {
      state.editableBuffers.forEach(buf => {
        if (validateBufferCoordinates(buf.currentLat, buf.currentLng)) {
          validBuffers++;
        } else {
          invalidBuffers++;
          console.warn(`⚠️ Buffer inválido: ${buf.ni || 'desconocido'}`);
        }
      });
    }
    
    if (state.customBuffers) {
      state.customBuffers.forEach(buf => {
        if (validateBufferCoordinates(buf.lat, buf.lng)) {
          validBuffers++;
        } else {
          invalidBuffers++;
          console.warn(`⚠️ Buffer personalizado inválido: ${buf.id || 'desconocido'}`);
        }
      });
    }
    
    console.log(`✅ Estado cargado: ${validBuffers} buffers válidos, ${invalidBuffers} inválidos`);
    if (state.timestamp) {
      console.log(`📅 Guardado el: ${state.timestamp}`);
    }
    
    return state;
    
  } catch (e) {
    console.error("❌ Error al cargar estado:", e);
    showNotification("⚠️ Error al cargar estado guardado", "error");
    return null;
  }
}

/**
 * Limpia el estado guardado con confirmación
 */
function clearBuffersState() {
  if (!confirm("¿Estás seguro de que quieres reiniciar TODAS las posiciones de los buffers?")) {
    return;
  }
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    hasUnsavedChanges = false;
    updateSaveButtonState();
    showNotification("✅ Estado reiniciado. Recarga la página para ver los cambios.", "info");
  } catch (e) {
    showNotification("❌ Error al limpiar estado", "error");
  }
}

/**
 * Restaura el estado desde el backup
 */
function restoreFromBackup() {
  try {
    const backup = localStorage.getItem(BACKUP_KEY);
    
    if (!backup) {
      showNotification("⚠️ No hay backup disponible", "error");
      return false;
    }
    
    if (!confirm("¿Restaurar al estado anterior? Perderás los cambios actuales.")) {
      return false;
    }
    
    localStorage.setItem(STORAGE_KEY, backup);
    showNotification("✅ Backup restaurado. Recarga la página.", "success");
    return true;
    
  } catch (e) {
    console.error("❌ Error al restaurar backup:", e);
    showNotification("❌ Error al restaurar backup", "error");
    return false;
  }
}

/**
 * Exporta el estado completo a un archivo JSON
 */
function exportBuffersState() {
  const state = {
    editableBuffers: [],
    customBuffers: [],
    timestamp: new Date().toISOString(),
    version: '6.1',
    metadata: {
      totalBuffers: editableBuffers.size + customBuffers.length,
      editableCount: editableBuffers.size,
      customCount: customBuffers.length
    }
  };

  editableBuffers.forEach((data, ni) => {
    const pos = data.circle.getLatLng();
    state.editableBuffers.push({
      ni: ni,
      currentLat: pos.lat,
      currentLng: pos.lng,
      originalLat: data.originalPos.lat,
      originalLng: data.originalPos.lng,
      nucleoName: data.nucleo.name || `Núcleo ${ni}`,
      moved: pos.lat !== data.originalPos.lat || pos.lng !== data.originalPos.lng
    });
  });

  customBuffers.forEach(buffer => {
    const pos = buffer.circle.getLatLng();
    state.customBuffers.push({
      id: buffer.id,
      lat: pos.lat,
      lng: pos.lng,
      name: buffer.name,
      originalLat: buffer.originalPos?.lat || pos.lat,
      originalLng: buffer.originalPos?.lng || pos.lng
    });
  });

  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dece-buffers-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification("✅ Estado exportado exitosamente", "success");
}

/**
 * Importa el estado desde un archivo JSON
 */
function importBuffersState(file) {
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const state = JSON.parse(e.target.result);
      
      // Validar estructura
      if (!state.editableBuffers && !state.customBuffers) {
        showNotification("❌ Archivo inválido", "error");
        return;
      }
      
      if (!confirm("¿Importar este estado? Se perderán los cambios actuales.")) {
        return;
      }
      
      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      showNotification("✅ Estado importado. Recarga la página.", "success");
      
    } catch (err) {
      console.error("Error al importar:", err);
      showNotification("❌ Error al importar archivo", "error");
    }
  };
  
  reader.readAsText(file);
}

function markAsChanged() { 
  hasUnsavedChanges = true; 
  updateSaveButtonState(); 
  
  // Auto-guardar después de 2 segundos sin cambios
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if (hasUnsavedChanges) {
      saveBuffersState();
      console.log("💾 Auto-guardado ejecutado");
    }
  }, 2000);
}

// Función de debouncing para analyzeOrphans (mejora rendimiento)
function debounceAnalyzeOrphans() {
  if (analyzeOrphansTimer) clearTimeout(analyzeOrphansTimer);
  analyzeOrphansTimer = setTimeout(() => {
    analyzeOrphans();
  }, 300);
}

function updateSaveButtonState() {
  const btn = document.getElementById('btnSaveChanges');
  if (btn) btn.classList.toggle('has-changes', hasUnsavedChanges);
}

// ==================== EXPORT FUNCTIONS ====================
function showExportModal() {
  const exportData = performSpatialJoin();
  if (!exportData || exportData.buffers.length === 0) { showNotification("❌ No hay buffers para exportar", "error"); return; }
  
  const modal = document.createElement('div');
  modal.className = 'export-modal';
  modal.innerHTML = `
    <div class="export-panel">
      <div class="export-header">
        <h3>📤 Exportar Resultados</h3>
        <button class="close-btn" onclick="this.closest('.export-modal').remove()">×</button>
      </div>
      <div class="export-content">
        <div class="export-summary">
          <h4>📊 Resumen del Análisis Espacial</h4>
          <div class="summary-grid">
            <div class="summary-card"><div class="summary-icon">🎯</div><div class="summary-value">${exportData.summary.totalBuffers}</div><div class="summary-label">Buffers Totales</div></div>
            <div class="summary-card"><div class="summary-icon">🏫</div><div class="summary-value">${exportData.summary.totalAMIEs}</div><div class="summary-label">AMIEs Cubiertas</div></div>
            <div class="summary-card"><div class="summary-icon">🏛️</div><div class="summary-value">${exportData.summary.totalNucleos}</div><div class="summary-label">Núcleos</div></div>
            <div class="summary-card"><div class="summary-icon">📍</div><div class="summary-value">${exportData.summary.totalSatellites}</div><div class="summary-label">Satélites</div></div>
            <div class="summary-card"><div class="summary-icon">👥</div><div class="summary-value">${exportData.summary.totalStudents.toLocaleString()}</div><div class="summary-label">Estudiantes</div></div>
            <div class="summary-card"><div class="summary-icon">📈</div><div class="summary-value">${exportData.summary.coveragePercent}%</div><div class="summary-label">Cobertura</div></div>
          </div>
        </div>
        <div class="export-options">
          <h4>📁 Formato de exportación</h4>
          <div class="export-buttons">
            <button class="export-btn excel" onclick="exportToExcel()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>Excel (.xlsx)</span></button>
            <button class="export-btn csv" onclick="exportToCSV()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>CSV (.csv)</span></button>
            <button class="export-btn json" onclick="exportToJSON()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>JSON (.json)</span></button>
          </div>
        </div>
        <div class="export-preview">
          <h4>👁️ Vista previa</h4>
          <div class="preview-table-container">
            <table class="preview-table">
              <thead><tr><th>Buffer</th><th>Tipo</th><th>AMIEs</th><th>Núcleos</th><th>Satélites</th><th>Estudiantes</th></tr></thead>
              <tbody>
                ${exportData.buffers.slice(0, 5).map(b => `<tr><td>${b.bufferName}</td><td><span class="type-badge ${b.isCustom ? 'custom' : 'original'}">${b.isCustom ? 'Personalizado' : 'Original'}</span></td><td>${b.totalAMIEs}</td><td>${b.nucleosCount}</td><td>${b.satellitesCount}</td><td>${b.totalStudents.toLocaleString()}</td></tr>`).join('')}
                ${exportData.buffers.length > 5 ? `<tr class="more-rows"><td colspan="6">... y ${exportData.buffers.length - 5} buffers más</td></tr>` : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('show'), 10);
  window._exportData = exportData;
}

function performSpatialJoin() {
  if (!globalData) return null;
  const { nucleos, satellites } = globalData;
  const allInstitutions = [...nucleos.map(n => ({...n, type: 'nucleo'})), ...satellites.map(s => ({...s, type: 'satellite'}))];
  const buffers = [];
  let totalAMIEsCovered = new Set();
  let totalStudentsCovered = 0;
  
  editableBuffers.forEach((data, ni) => {
    const bufferPos = data.circle.getLatLng();
    const result = spatialJoinBuffer(bufferPos, BUFFER_RADIUS_M, allInstitutions);
    result.institutions.forEach(inst => { if (inst.amie) totalAMIEsCovered.add(inst.amie); });
    totalStudentsCovered += result.totalStudents;
    buffers.push({
      bufferId: `buffer_nucleo_${ni}`, bufferName: data.nucleo.name || `Núcleo ${ni}`, isCustom: false,
      centerLat: bufferPos.lat, centerLng: bufferPos.lng, radiusMeters: BUFFER_RADIUS_M,
      originalLat: data.nucleo.lat, originalLng: data.nucleo.lng,
      wasMoved: bufferPos.lat !== data.nucleo.lat || bufferPos.lng !== data.nucleo.lng,
      totalAMIEs: result.institutions.length, nucleosCount: result.nucleosCount, satellitesCount: result.satellitesCount,
      totalStudents: result.totalStudents, institutions: result.institutions
    });
  });
  
  customBuffers.forEach(buffer => {
    const bufferPos = buffer.circle.getLatLng();
    const result = spatialJoinBuffer(bufferPos, BUFFER_RADIUS_M, allInstitutions);
    result.institutions.forEach(inst => { if (inst.amie) totalAMIEsCovered.add(inst.amie); });
    totalStudentsCovered += result.totalStudents;
    buffers.push({
      bufferId: buffer.id, bufferName: buffer.name, isCustom: true,
      centerLat: bufferPos.lat, centerLng: bufferPos.lng, radiusMeters: BUFFER_RADIUS_M,
      originalLat: buffer.originalPos.lat, originalLng: buffer.originalPos.lng,
      wasMoved: bufferPos.lat !== buffer.originalPos.lat || bufferPos.lng !== buffer.originalPos.lng,
      totalAMIEs: result.institutions.length, nucleosCount: result.nucleosCount, satellitesCount: result.satellitesCount,
      totalStudents: result.totalStudents, institutions: result.institutions
    });
  });
  
  const allSatellites = buffers.reduce((sum, b) => sum + b.satellitesCount, 0);

  // ============================
  // Extra para EXPORTAR RESULTADOS (satélites cubiertos / sin cobertura / conexiones extendidas)
  // ============================
  const activeCenters = getActiveBufferCenters();
  const centerInfos = activeCenters.map(c => {
    if (c.kind === 'nucleo') {
      const nuc = nucleos?.[c.ni];
      return {
        ...c,
        label: nuc?.name || `Núcleo ${c.ni}`,
        amie: nuc?.amie || '',
        kindName: 'Núcleo'
      };
    }
    if (c.kind === 'custom') {
      const b = customBuffers?.find(x => x.id === c.id);
      return {
        ...c,
        label: b?.name || c.id || 'Buffer personalizado',
        amie: '',
        kindName: 'Personalizado'
      };
    }
    return { ...c, label: 'Buffer', amie: '', kindName: String(c.kind || 'Buffer') };
  });

  const satellitesAllExport = (satellites || []).map((sat, si) => {
    let nearest = { dist: Infinity, center: null };
    for (const c of centerInfos) {
      const d = haversineMeters(c.lat, c.lng, sat.lat, sat.lng);
      if (d < nearest.dist) nearest = { dist: d, center: c };
    }
    const covered = Number.isFinite(nearest.dist) && nearest.dist <= BUFFER_RADIUS_M;

    const forced = orphanAnalysis?.forcedAssignments?.get?.(si) || null;
    const forcedNuc = (forced && Number.isFinite(forced.ni)) ? (nucleos?.[forced.ni] || null) : null;
    const forcedLabel = forcedNuc ? (forcedNuc.name || `Núcleo ${forced.ni}`) : '';
    const forcedAmie = forcedNuc ? (forcedNuc.amie || '') : '';
    const forcedDistance = forced ? forced.distance : null;
    const extended = Number.isFinite(forcedDistance) && forcedDistance > ORPHAN_WARNING_DISTANCE_M;

    return {
      si,
      amie: sat.amie || '',
      name: sat.name || '',
      students: sat.students || 0,
      distrito: sat.dist || '',
      zona: sat.zona ?? null,
      provincia: sat.provincia || '',
      canton: sat.canton || '',
      lat: sat.lat,
      lng: sat.lng,
      covered,
      nearestBuffer: nearest.center ? {
        kind: nearest.center.kind,
        kindName: nearest.center.kindName,
        label: nearest.center.label,
        amie: nearest.center.amie || '',
        distanceMeters: Math.round(nearest.dist),
        distanceKm: (nearest.dist / 1000).toFixed(2)
      } : null,
      forcedAssignment: forced ? {
        ni: forced.ni,
        nucleoName: forcedLabel,
        nucleoAmie: forcedAmie,
        distanceMeters: Math.round(forcedDistance || 0),
        distanceKm: ((forcedDistance || 0) / 1000).toFixed(2),
        extended
      } : null
    };
  });

  const satellitesCoveredExport = satellitesAllExport.filter(s => s.covered);
  const satellitesUncoveredExport = satellitesAllExport.filter(s => !s.covered);
  const satellitesExtendedExport = satellitesAllExport.filter(s => s.forcedAssignment?.extended);

  const orphanNucleosList = Array.from(orphanAnalysis?.orphanNucleos || []).map(ni => {
    const nuc = nucleos?.[ni];
    const pos = nuc ? getCurrentNucleoLatLng(ni, nuc) : null;
    return {
      ni,
      amie: nuc?.amie || '',
      name: nuc?.name || `Núcleo ${ni}`,
      distrito: nuc?.dist || '',
      lat: pos?.lat ?? nuc?.lat ?? null,
      lng: pos?.lng ?? nuc?.lng ?? null
    };
  });

  return {
    exportDate: new Date().toISOString(),
    summary: {
      totalBuffers: buffers.length, originalBuffers: buffers.filter(b => !b.isCustom).length,
      customBuffers: buffers.filter(b => b.isCustom).length, totalAMIEs: totalAMIEsCovered.size,
      totalNucleos: new Set(buffers.flatMap(b => b.institutions.filter(i => i.type === 'nucleo').map(i => i.amie))).size,
      totalSatellites: allSatellites, totalStudents: totalStudentsCovered,
      coveragePercent: satellites.length > 0 ? ((allSatellites / satellites.length) * 100).toFixed(1) : 0
    },
    buffers,
    satellitesSummary: {
      total: satellitesAllExport.length,
      covered: satellitesCoveredExport.length,
      uncovered: satellitesUncoveredExport.length,
      extendedConnections: satellitesExtendedExport.length
    },
    satellitesAll: satellitesAllExport,
    satellitesUncovered: satellitesUncoveredExport,
    satellitesExtended: satellitesExtendedExport,
    orphanNucleos: orphanNucleosList
  };
}

function spatialJoinBuffer(center, radius, institutions) {
  const result = { institutions: [], nucleosCount: 0, satellitesCount: 0, totalStudents: 0 };
  institutions.forEach(inst => {
    const dist = haversineMeters(center.lat, center.lng, inst.lat, inst.lng);
    if (dist <= radius) {
      result.institutions.push({
        amie: inst.amie || '', name: inst.name || '', type: inst.type, typeName: inst.type === 'nucleo' ? 'Núcleo' : 'Satélite',
        codGDECE: (inst.codGDECE ?? inst.code), lat: inst.lat, lng: inst.lng, distanceMeters: Math.round(dist),
        distanceKm: (dist / 1000).toFixed(2), students: inst.students || 0, distrito: inst.dist || ''
      });
      if (inst.type === 'nucleo') result.nucleosCount++; else result.satellitesCount++;
      result.totalStudents += inst.students || 0;
    }
  });
  result.institutions.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return result;
}

function exportToExcel() {
  const data = window._exportData;
  if (!data) return;
  showNotification("📊 Generando Excel...", "info");
  
  const wb = XLSX.utils.book_new();
  const summaryData = [['REPORTE DE ANÁLISIS ESPACIAL DECE'],['Fecha:', data.exportDate],[''],['MÉTRICAS'],
    ['Total Buffers:', data.summary.totalBuffers],['Buffers Originales:', data.summary.originalBuffers],
    ['Buffers Personalizados:', data.summary.customBuffers],['Total AMIEs:', data.summary.totalAMIEs],
    ['Núcleos:', data.summary.totalNucleos],['Satélites:', data.summary.totalSatellites],
    ['Satélites SIN cobertura:', data.satellitesSummary?.uncovered ?? ''],
    ['Conexiones extendidas (>7km):', data.satellitesSummary?.extendedConnections ?? ''],
    ['Núcleos huérfanos:', (data.orphanNucleos?.length ?? '')],
    ['Estudiantes:', data.summary.totalStudents],['Cobertura:', data.summary.coveragePercent + '%']];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Resumen');
  
  const buffersHeaders = ['ID Buffer','Nombre','Tipo','Lat Centro','Lng Centro','Radio (m)','Fue Movido','Total AMIEs','Núcleos','Satélites','Estudiantes'];
  const buffersData = data.buffers.map(b => [b.bufferId,b.bufferName,b.isCustom?'Personalizado':'Original',b.centerLat,b.centerLng,b.radiusMeters,b.wasMoved?'Sí':'No',b.totalAMIEs,b.nucleosCount,b.satellitesCount,b.totalStudents]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([buffersHeaders, ...buffersData]), 'Buffers');
  
  const instHeaders = ['Buffer','AMIE','Nombre','Tipo','COD_GDECE','Lat','Lng','Distancia(m)','Distancia(km)','Estudiantes','Distrito'];
  const instData = [];
  data.buffers.forEach(buffer => buffer.institutions.forEach(inst => instData.push([buffer.bufferName,inst.amie,inst.name,inst.typeName,inst.codGDECE,inst.lat,inst.lng,inst.distanceMeters,inst.distanceKm,inst.students,inst.distrito])));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([instHeaders, ...instData]), 'Instituciones');


  // --- Satélites (uno por registro) ---
  if (Array.isArray(data.satellitesAll) && data.satellitesAll.length) {
    const satHeaders = ['AMIE','Nombre','Estudiantes','Distrito','Zona','Provincia','Cantón','Lat','Lng','¿Cubierto por buffer?','Buffer más cercano','Tipo buffer','Distancia a buffer (m)','Distancia a buffer (km)','¿Tiene conexión forzada?','Núcleo asignado','AMIE núcleo asignado','Dist. conexión forzada (m)','Dist. conexión forzada (km)','¿Extendida >7km?'];
    const satRows = data.satellitesAll.map(s => [
      s.amie, s.name, s.students, s.distrito, s.zona ?? '', s.provincia, s.canton,
      s.lat, s.lng,
      s.covered ? 'Sí' : 'No',
      s.nearestBuffer?.label || '',
      s.nearestBuffer?.kindName || '',
      s.nearestBuffer?.distanceMeters ?? '',
      s.nearestBuffer?.distanceKm ?? '',
      s.forcedAssignment ? 'Sí' : 'No',
      s.forcedAssignment?.nucleoName || '',
      s.forcedAssignment?.nucleoAmie || '',
      s.forcedAssignment?.distanceMeters ?? '',
      s.forcedAssignment?.distanceKm ?? '',
      s.forcedAssignment?.extended ? 'Sí' : 'No'
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([satHeaders, ...satRows]), 'Satélites');
  }

  // --- Satélites SIN cobertura ---
  if (Array.isArray(data.satellitesUncovered) && data.satellitesUncovered.length) {
    const uncHeaders = ['AMIE','Nombre','Estudiantes','Distrito','Lat','Lng','Buffer más cercano','Distancia a buffer (km)','Núcleo sugerido (forzado)','Dist. forzada (km)','¿Extendida >7km?'];
    const uncRows = data.satellitesUncovered.map(s => [
      s.amie, s.name, s.students, s.distrito, s.lat, s.lng,
      s.nearestBuffer?.label || '',
      s.nearestBuffer?.distanceKm ?? '',
      s.forcedAssignment?.nucleoName || '',
      s.forcedAssignment?.distanceKm ?? '',
      s.forcedAssignment?.extended ? 'Sí' : 'No'
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([uncHeaders, ...uncRows]), 'Satélites_SIN_Cobertura');
  }

  // --- Conexiones extendidas (>7km) ---
  if (Array.isArray(data.satellitesExtended) && data.satellitesExtended.length) {
    const extHeaders = ['AMIE','Nombre','Estudiantes','Distrito','Núcleo asignado','AMIE núcleo','Distancia (km)'];
    const extRows = data.satellitesExtended.map(s => [
      s.amie, s.name, s.students, s.distrito,
      s.forcedAssignment?.nucleoName || '',
      s.forcedAssignment?.nucleoAmie || '',
      s.forcedAssignment?.distanceKm ?? ''
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([extHeaders, ...extRows]), 'Conexiones_>7km');
  }

  // --- Núcleos huérfanos ---
  if (Array.isArray(data.orphanNucleos) && data.orphanNucleos.length) {
    const onHeaders = ['Índice','AMIE','Nombre','Distrito','Lat','Lng'];
    const onRows = data.orphanNucleos.map(n => [n.ni, n.amie, n.name, n.distrito, n.lat, n.lng]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([onHeaders, ...onRows]), 'Núcleos_Huérfanos');
  }

  
  XLSX.writeFile(wb, `DECE_Analysis_${formatDateForFilename()}.xlsx`);
  showNotification("✅ Excel descargado", "success");
  document.querySelector('.export-modal')?.remove();
}

function exportToCSV() {
  const data = window._exportData;
  if (!data) return;
  showNotification("📄 Generando CSV...", "info");
  const headers = ['Buffer_ID','Buffer_Nombre','Buffer_Tipo','Buffer_Lat','Buffer_Lng','AMIE','Institucion_Nombre','Institucion_Tipo','COD_GDECE','Inst_Lat','Inst_Lng','Distancia_m','Distancia_km','Estudiantes','Distrito'];
  const rows = [];
  data.buffers.forEach(buffer => buffer.institutions.forEach(inst => rows.push([buffer.bufferId,`"${buffer.bufferName}"`,buffer.isCustom?'Personalizado':'Original',buffer.centerLat,buffer.centerLng,inst.amie,`"${inst.name}"`,inst.typeName,inst.codGDECE,inst.lat,inst.lng,inst.distanceMeters,inst.distanceKm,inst.students,`"${inst.distrito}"`].join(','))));
  downloadFile([headers.join(','), ...rows].join('\\n'), `DECE_Analysis_BUFFERS_${formatDateForFilename()}.csv`, 'text/csv;charset=utf-8;');

  // CSV adicional: resumen de satélites (uno por registro)
  if (Array.isArray(data.satellitesAll) && data.satellitesAll.length) {
    const satHeaders = ['AMIE','Nombre','Estudiantes','Distrito','Lat','Lng','Cubierto','BufferMasCercano','DistBufferKm','ConexionForzada','NucleoAsignado','DistForzadaKm','Extendida>7km'];
    const satRows = data.satellitesAll.map(s => ([
      `"${String(s.amie || '').replace(/"/g,'""')}"`,
      `"${String(s.name || '').replace(/"/g,'""')}"`,
      s.students || 0,
      `"${String(s.distrito || '').replace(/"/g,'""')}"`,
      s.lat, s.lng,
      s.covered ? 'SI' : 'NO',
      `"${String(s.nearestBuffer?.label || '').replace(/"/g,'""')}"`,
      s.nearestBuffer?.distanceKm ?? '',
      s.forcedAssignment ? 'SI' : 'NO',
      `"${String(s.forcedAssignment?.nucleoName || '').replace(/"/g,'""')}"`,
      s.forcedAssignment?.distanceKm ?? '',
      s.forcedAssignment?.extended ? 'SI' : 'NO'
    ].join(',')));
    downloadFile([satHeaders.join(','), ...satRows].join('\\n'), `DECE_Analysis_SATELITES_${formatDateForFilename()}.csv`, 'text/csv;charset=utf-8;');
  }
  showNotification("✅ CSV descargado", "success");
  document.querySelector('.export-modal')?.remove();
}

function exportToJSON() {
  const data = window._exportData;
  if (!data) return;
  showNotification("📋 Generando JSON...", "info");
  downloadFile(JSON.stringify(data, null, 2), `DECE_Analysis_${formatDateForFilename()}.json`, 'application/json');
  showNotification("✅ JSON descargado", "success");
  document.querySelector('.export-modal')?.remove();
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function formatDateForFilename() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
}

window.showExportModal = showExportModal;
window.exportToExcel = exportToExcel;
window.exportToCSV = exportToCSV;
window.exportToJSON = exportToJSON;

// ==================== COVERAGE ====================
function completeCoverage() {
  if (!globalData) { showNotification("❌ Espera a que carguen los datos", "error"); return; }
  showNotification("🔄 Completando cobertura...", "info");
  const uncovered = findUncoveredSatellites();
  if (uncovered.length === 0) { showNotification("✅ ¡Cobertura completa!", "success"); return; }
  const newBuffers = createOptimalBuffers(uncovered);
  newBuffers.forEach(pos => createCustomBuffer(pos.lat, pos.lng));
  setTimeout(() => {
    const stillUncovered = findUncoveredSatellites();
    const coverage = ((globalData.satellites.length - stillUncovered.length) / globalData.satellites.length * 100).toFixed(1);
    analyzeOrphans();
    showNotification(`✅ Cobertura: ${coverage}%. ${newBuffers.length} buffers agregados.`, stillUncovered.length === 0 ? "success" : "info");
    markAsChanged();
  }, 300);
}

function findUncoveredSatellites() {
  if (!globalData) return [];
  return globalData.satellites.filter((sat, index) => {
    let covered = false;
    editableBuffers.forEach(data => { if (haversineMeters(sat.lat, sat.lng, data.circle.getLatLng().lat, data.circle.getLatLng().lng) <= BUFFER_RADIUS_M) covered = true; });
    if (!covered) customBuffers.forEach(buffer => { if (haversineMeters(sat.lat, sat.lng, buffer.circle.getLatLng().lat, buffer.circle.getLatLng().lng) <= BUFFER_RADIUS_M) covered = true; });
    return !covered;
  }).map((sat, index) => ({ ...sat, index }));
}

function createOptimalBuffers(uncoveredSatellites) {
  const minDistance = BUFFER_RADIUS_M * 1.5;
  let numClusters = Math.min(Math.ceil(uncoveredSatellites.length / 5), uncoveredSatellites.length);
  let centroids = [];
  const usedIndices = new Set();
  for (let i = 0; i < numClusters; i++) {
    let idx; do { idx = Math.floor(Math.random() * uncoveredSatellites.length); } while (usedIndices.has(idx));
    usedIndices.add(idx);
    centroids.push({ lat: uncoveredSatellites[idx].lat, lng: uncoveredSatellites[idx].lng });
  }
  for (let iter = 0; iter < 10; iter++) {
    const clusters = Array.from({ length: numClusters }, () => []);
    uncoveredSatellites.forEach(sat => {
      let minDist = Infinity, closest = 0;
      centroids.forEach((c, ci) => { const d = haversineMeters(sat.lat, sat.lng, c.lat, c.lng); if (d < minDist) { minDist = d; closest = ci; } });
      clusters[closest].push(sat);
    });
    centroids = clusters.filter(c => c.length > 0).map(cluster => ({
      lat: cluster.reduce((s, sat) => s + sat.lat, 0) / cluster.length,
      lng: cluster.reduce((s, sat) => s + sat.lng, 0) / cluster.length
    }));
  }
  return centroids.filter(c => {
    let tooClose = false;
    editableBuffers.forEach(data => { if (haversineMeters(c.lat, c.lng, data.circle.getLatLng().lat, data.circle.getLatLng().lng) < minDistance) tooClose = true; });
    if (!tooClose) customBuffers.forEach(buffer => { if (haversineMeters(c.lat, c.lng, buffer.circle.getLatLng().lat, buffer.circle.getLatLng().lng) < minDistance) tooClose = true; });
    return !tooClose;
  });
}

function showUncoveredInstitutions() {
  const uncovered = findUncoveredSatellites();
  if (uncovered.length === 0) { showNotification("✅ ¡Todas cubiertas!", "success"); return; }
  const modal = document.createElement('div');
  modal.className = 'uncovered-modal';
  modal.innerHTML = `<div class="uncovered-panel"><div class="uncovered-header"><h3>⚠️ Sin Cobertura</h3><button class="close-btn" onclick="this.closest('.uncovered-modal').remove()">×</button></div><div class="uncovered-content"><div class="uncovered-summary"><div class="summary-item"><span class="summary-number">${uncovered.length}</span><span class="summary-label">Instituciones</span></div><div class="summary-item"><span class="summary-number">${uncovered.reduce((s, sat) => s + (sat.students || 0), 0).toLocaleString()}</span><span class="summary-label">Estudiantes</span></div></div><div class="uncovered-actions"><button class="btn-action-modal" onclick="completeCoverage(); this.closest('.uncovered-modal').remove();">🔧 Completar Cobertura</button></div><div class="uncovered-list">${uncovered.slice(0, 20).map((sat, idx) => `<div class="uncovered-item" onclick="map.flyTo([${sat.lat}, ${sat.lng}], 13)"><div class="uncovered-item-number">${idx + 1}</div><div class="uncovered-item-info"><div class="uncovered-item-name">${escapeHTML(sat.name)}</div><div class="uncovered-item-details">👥 ${sat.students || 0}</div></div></div>`).join('')}${uncovered.length > 20 ? `<div class="more-rows">... y ${uncovered.length - 20} más</div>` : ''}</div></div></div>`;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('show'), 10);
}

window.showUncoveredInstitutions = showUncoveredInstitutions;
window.completeCoverage = completeCoverage;

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => {
  if (_initialized) return;
  _initialized = true;
  initMap();
  setupControls();
  setupEditControls();
  loadCSV();
});

function initMap() {
  map = L.map("map", { center: ECUADOR_CENTER, zoom: 7, zoomControl: true, preferCanvas: true, renderer: canvasRenderer });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
  L.control.layers({ "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"), "Satélite": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}") }).addTo(map);
  Object.values(layers).forEach(layer => layer.addTo(map));
}

function setupEditControls() {
  document.getElementById("btnEditBuffers")?.addEventListener("click", toggleEditMode);
  document.getElementById("btnAddBuffers")?.addEventListener("click", toggleAddMode);
  document.getElementById("btnDeleteBuffers")?.addEventListener("click", toggleDeleteMode);
  document.getElementById("btnSaveChanges")?.addEventListener("click", saveBuffersState);
  document.getElementById("btnCompleteCoverage")?.addEventListener("click", completeCoverage);
  document.getElementById("btnExportResults")?.addEventListener("click", showExportModal);
}

function toggleEditMode() {
  editMode = !editMode;
  const btn = document.getElementById("btnEditBuffers");
  if (editMode && addMode) toggleAddMode();
  if (editMode) { btn?.classList.add("active"); enableBufferEditing(); showNotification("🖊️ Modo edición activado", "info"); }
  else { btn?.classList.remove("active"); disableBufferEditing(); closeMetricsPanel(); showNotification("Modo edición desactivado", "info"); }
}

function toggleAddMode() {
  addMode = !addMode;
  const btn = document.getElementById("btnAddBuffers");
  if (addMode && editMode) toggleEditMode();
  if (addMode && deleteMode) toggleDeleteMode();
  if (addMode) { btn?.classList.add("active"); map.getContainer().style.cursor = 'crosshair'; map.on('click', onMapClickAddBuffer); showNotification("➕ Click en mapa para crear buffer", "info"); }
  else { btn?.classList.remove("active"); map.getContainer().style.cursor = ''; map.off('click', onMapClickAddBuffer); }
}

function toggleDeleteMode() {
  deleteMode = !deleteMode;
  const btn = document.getElementById("btnDeleteBuffers");
  if (deleteMode && editMode) toggleEditMode();
  if (deleteMode && addMode) toggleAddMode();
  if (deleteMode) { 
    btn?.classList.add("active"); 
    map.getContainer().style.cursor = 'not-allowed'; 
    enableDeleteMode();
    showNotification("🗑️ Click en un buffer para eliminarlo", "info"); 
  } else { 
    btn?.classList.remove("active"); 
    map.getContainer().style.cursor = ''; 
    disableDeleteMode();
  }
}

function enableDeleteMode() {
  // Hacer los buffers personalizados clickeables para eliminar
  customBuffers.forEach(buffer => {
    buffer.circle.off('click');
    buffer.circle.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (deleteMode) {
        if (confirm(`¿Eliminar "${buffer.name}"?`)) {
          deleteCustomBuffer(buffer.id);
        }
      }
    });
    buffer.circle.setStyle({ color: '#f85149', fillColor: '#f85149' });
  });
  
  // También para buffers editables (núcleos) - mostrar que no se pueden eliminar
  editableBuffers.forEach((data, ni) => {
    data.circle.off('click');
    data.circle.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (deleteMode) {
        showNotification("⚠️ Los buffers de núcleo no se pueden eliminar, solo mover", "error");
      }
    });
  });
}

function disableDeleteMode() {
  // Restaurar comportamiento normal de los buffers personalizados
  customBuffers.forEach(buffer => {
    buffer.circle.off('click');
    buffer.circle.on('click', (e) => { L.DomEvent.stopPropagation(e); showBufferPopup(buffer, true); });
    buffer.circle.setStyle({ color: '#a371f7', fillColor: '#a371f7' });
  });
  
  // Restaurar buffers editables
  editableBuffers.forEach((data, ni) => {
    data.circle.off('click');
    data.circle.on('click', (e) => { if (!editMode) showBufferPopup(data, false); });
  });
}

function onMapClickAddBuffer(e) { if (addMode) createCustomBuffer(e.latlng.lat, e.latlng.lng); }

function createCustomBuffer(lat, lng) {
  customBufferCounter++;
  const circle = L.circle([lat, lng], { radius: BUFFER_RADIUS_M, color: '#a371f7', fillColor: '#a371f7', weight: 2, opacity: 0.7, fillOpacity: 0.15, renderer: canvasRenderer });
  circle.addTo(layers.buffers);
  const buffer = { id: `custom_${customBufferCounter}`, circle, lat, lng, originalPos: { lat, lng }, currentPos: { lat, lng }, isCustom: true, isDragging: false, name: `Buffer Personalizado #${customBufferCounter}` };
  customBuffers.push(buffer);
  markAsChanged();
  circle.on('click', (e) => { L.DomEvent.stopPropagation(e); showBufferPopup(buffer, true); });
  const metrics = calculateBufferMetrics({ lat, lng }, BUFFER_RADIUS_M);
  showNotification(`✓ Buffer creado: ${metrics.iesCount} IEs`, "info");
  setTimeout(() => analyzeOrphans(), 100);
  if (editMode) makeBufferDraggable(circle, buffer, true);
}

window.createCustomBuffer = createCustomBuffer;

// ==================== POPUPS ====================
function showBufferPopup(bufferData, isCustom = false) {
  const pos = bufferData.circle.getLatLng();
  const metrics = calculateBufferMetricsDetailed(pos, BUFFER_RADIUS_M);
  const content = `<div class="buffer-popup"><div class="popup-title">${isCustom ? '🎨' : '🏛️'} ${isCustom ? bufferData.name : (bufferData.nucleo?.name || 'Buffer')}</div><div class="popup-content"><div class="popup-row"><span class="popup-label">Tipo:</span><span class="popup-value" style="color:${isCustom ? '#a371f7' : '#58a6ff'}">${isCustom ? 'Personalizado' : 'Núcleo'}</span></div><div class="popup-row"><span class="popup-label">Posición:</span><span class="popup-value">${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}</span></div><div class="popup-divider"></div><div class="popup-row highlight"><span class="popup-label">🎯 AMIEs:</span><span class="popup-value">${metrics.iesCount}</span></div><div class="popup-row"><span class="popup-label">🏛️ Núcleos:</span><span class="popup-value" style="color:#58a6ff">${metrics.nucleosCount}</span></div><div class="popup-row"><span class="popup-label">📍 Satélites:</span><span class="popup-value" style="color:#58a6ff">${metrics.satellitesCount}</span></div><div class="popup-row"><span class="popup-label">👥 Estudiantes:</span><span class="popup-value" style="color:#d29922">${metrics.totalStudents.toLocaleString()}</span></div>${metrics.iesList.length > 0 ? `<div class="popup-divider"></div><div class="popup-ies-list"><strong>Instituciones:</strong>${metrics.iesList.slice(0, 5).map(ie => `<div class="popup-ie-item"><span class="ie-type-dot ${ie.type}"></span><span class="ie-name">${escapeHTML(ie.name).substring(0, 25)}...</span><span class="ie-dist">${(ie.dist/1000).toFixed(1)}km</span></div>`).join('')}${metrics.iesList.length > 5 ? `<div class="popup-more">... y ${metrics.iesList.length - 5} más</div>` : ''}</div>` : ''}</div></div>`;
  bufferData.circle.bindPopup(content, { maxWidth: 350, className: 'custom-buffer-popup' }).openPopup();
}

function calculateBufferMetricsDetailed(position, radius) {
  if (!globalData) return { iesCount: 0, totalStudents: 0, profNecesarios: 0, iesList: [], nucleosCount: 0, satellitesCount: 0 };
  let iesCount = 0, totalStudents = 0, iesList = [], nucleosCount = 0, satellitesCount = 0;
  globalData.satellites.forEach(sat => {
    const dist = haversineMeters(position.lat, position.lng, sat.lat, sat.lng);
    if (dist <= radius) { iesCount++; satellitesCount++; totalStudents += sat.students || 0; iesList.push({ name: sat.name || 'Sin nombre', dist, students: sat.students || 0, type: 'satellite' }); }
  });
  globalData.nucleos.forEach(nuc => {
    const dist = haversineMeters(position.lat, position.lng, nuc.lat, nuc.lng);
    if (dist <= radius) { iesCount++; nucleosCount++; totalStudents += nuc.students || 0; iesList.push({ name: nuc.name || 'Sin nombre', dist, students: nuc.students || 0, type: 'nucleo' }); }
  });
  iesList.sort((a, b) => a.dist - b.dist);
  return { iesCount, totalStudents, profNecesarios: Math.ceil(totalStudents / 450), iesList, nucleosCount, satellitesCount };
}

function calculateBufferMetrics(position, radius) {
  if (!globalData) return { iesCount: 0, totalStudents: 0, profNecesarios: 0, iesList: [] };
  let iesCount = 0, totalStudents = 0, iesList = [];
  globalData.satellites.forEach(sat => {
    const dist = haversineMeters(position.lat, position.lng, sat.lat, sat.lng);
    if (dist <= radius) { iesCount++; totalStudents += sat.students || 0; iesList.push({ name: sat.name || 'Sin nombre', dist, students: sat.students || 0 }); }
  });
  iesList.sort((a, b) => a.dist - b.dist);
  return { iesCount, totalStudents, profNecesarios: Math.ceil(totalStudents / 450), iesList };
}

function closeMetricsPanel() { if (metricsPanel) metricsPanel.classList.remove('show'); }
window.closeMetricsPanel = closeMetricsPanel;

function deleteCustomBuffer(bufferId) {
  const idx = customBuffers.findIndex(b => b.id === bufferId);
  if (idx === -1) return;
  layers.buffers.removeLayer(customBuffers[idx].circle);
  customBuffers.splice(idx, 1);
  markAsChanged();
  closeMetricsPanel();
  debounceAnalyzeOrphans(); // Usar debouncing
  showNotification("✓ Buffer eliminado", "info");
}
window.deleteCustomBuffer = deleteCustomBuffer;

// ==================== EDITING ====================
function enableBufferEditing() {
  // Detener animaciones durante edición para mejor rendimiento
  stopAnimations();
  
  editableBuffers.forEach((data, ni) => {
    data.circle.setStyle({ color: '#f0883e', fillColor: '#f0883e', weight: 3, fillOpacity: 0.2 });
    makeBufferDraggable(data.circle, data, false, ni);
    data.circle.on('click', (e) => { L.DomEvent.stopPropagation(e); if (editMode && !data.isDragging) showBufferPopup(data, false); });
  });
  customBuffers.forEach(buffer => makeBufferDraggable(buffer.circle, buffer, true));
}

function disableBufferEditing() {
  editableBuffers.forEach((data) => {
    data.circle.setStyle({ color: '#58a6ff', fillColor: '#58a6ff', weight: 2, fillOpacity: 0.08 });
    data.circle.off('mousedown'); data.circle.off('click');
  });
  
  // Reactivar animaciones al terminar edición
  setTimeout(() => regenerateAnimations(), 500);
}

function makeBufferDraggable(circle, data, isCustom, ni = null) {
  let isDragging = false;
  circle.on('mousedown', function(e) {
    if (!editMode) return;
    isDragging = true; data.isDragging = true;
    map.dragging.disable();
    circle.setStyle({ weight: 4, fillOpacity: 0.3 });
    const onMove = (e) => { if (isDragging) circle.setLatLng(e.latlng); };
    const onUp = () => {
      isDragging = false; data.isDragging = false;
      map.dragging.enable();
      circle.setStyle({ weight: isCustom ? 2 : 3, fillOpacity: isCustom ? 0.15 : 0.2 });
      map.off('mousemove', onMove); map.off('mouseup', onUp);
      const pos = circle.getLatLng();
      data.currentPos = pos;
      if (isCustom) { data.lat = pos.lat; data.lng = pos.lng; }
      markAsChanged();
      debounceAnalyzeOrphans(); // Usar debouncing en lugar de llamada directa
      showNotification("Buffer reposicionado", "info");
    };
    map.on('mousemove', onMove);
    map.on('mouseup', onUp);
  });
}

function resetBufferPosition(ni) {
  const data = editableBuffers.get(ni);
  if (!data) return;
  data.circle.setLatLng([data.originalPos.lat, data.originalPos.lng]);
  data.currentPos = data.originalPos;
  markAsChanged();
  debounceAnalyzeOrphans(); // Usar debouncing
  showNotification("✓ Posición restaurada", "info");
}
window.resetBufferPosition = resetBufferPosition;

function resetAllBuffersState() { if (confirm('¿Reiniciar todos los buffers?')) { clearBuffersState(); location.reload(); } }
window.resetAllBuffersState = resetAllBuffersState;

// ==================== ANIMATIONS ====================

// Dibuja conexiones forzadas (huérfanos) dentro de la misma capa de conexiones
// Nota: Se generan para todo satélite sin cobertura normal, asignándolo al núcleo más cercano.
function drawForcedConnections(targetLinesArray = null) {
  if (!globalData || !orphanAnalysis?.forcedAssignments?.size) return;
  const { satellites, nucleos } = globalData;

  orphanAnalysis.forcedAssignments.forEach((assign, si) => {
    const sat = satellites[si];
    const nuc = nucleos[assign.ni];
    if (!sat || !nuc) return;

    // Posición actual (si el buffer fue movido)
    const pos = getCurrentNucleoLatLng(assign.ni, nuc);
    const nucLat = pos.lat;
    const nucLng = pos.lng;

    const line = L.polyline(
      [[sat.lat, sat.lng], [nucLat, nucLng]],
      {
        color: '#d29922',
        weight: 2,
        opacity: 0.7,
        dashArray: '8,12',
        renderer: canvasRenderer
      }
    );

    const tag = assign.distance <= ORPHAN_WARNING_DISTANCE_M ? "Apoyo (≤ 7 km)" : "Apoyo (> 7 km)";

    line.bindPopup(`
      <b>${tag}</b><br>
      Satélite: ${escapeHTML(sat.name)}<br>
      → Núcleo: ${escapeHTML(nuc.name)}<br>
      Distancia: ${(assign.distance / 1000).toFixed(2)} km
    `);

    line.addTo(layers.connections);
    line.bringToFront();
    if (targetLinesArray) targetLinesArray.push(line);
  });
}
function regenerateAnimations() {
  layers.connections.clearLayers();
  animationLines = [];
  if (!globalData) return;
  const { nucleos, satellites } = globalData;
  
  satellites.forEach(sat => {
    let bestBuffer = null, bestDist = BUFFER_RADIUS_M + 1;
    editableBuffers.forEach((data) => {
      const pos = data.circle.getLatLng();
      const dist = haversineMeters(sat.lat, sat.lng, pos.lat, pos.lng);
      if (dist <= BUFFER_RADIUS_M && dist < bestDist) { bestDist = dist; bestBuffer = pos; }
    });
    if (!bestBuffer) {
      customBuffers.forEach(buffer => {
        const pos = buffer.circle.getLatLng();
        const dist = haversineMeters(sat.lat, sat.lng, pos.lat, pos.lng);
        if (dist <= BUFFER_RADIUS_M && dist < bestDist) { bestDist = dist; bestBuffer = pos; }
      });
    }
    if (bestBuffer) {
      const line = L.polyline([[sat.lat, sat.lng], [bestBuffer.lat, bestBuffer.lng]], { color: '#58a6ff', weight: 2, opacity: 0.6, dashArray: '6,6', renderer: canvasRenderer });
      line.bringToFront();
      line.addTo(layers.connections);
      animationLines.push(line);
    }
  });
  // Incluir conexiones forzadas (asignación al núcleo más cercano)
  drawForcedConnections(animationLines);

  if (ENABLE_NETWORK_ANIMATION && animationLines.length <= MAX_CONNECTIONS_FOR_ANIM) startConnectionAnimation(animationLines);
}

function startConnectionAnimation(lines) {
  stopAnimations();
  let offset = 0;
  _connectionAnimTimer = setInterval(() => {
    offset = (offset + 1) % 1000;
    lines.forEach(line => line.setStyle({ dashOffset: String(offset) }));
  }, 80);
}

function stopAnimations() { if (_connectionAnimTimer) { clearInterval(_connectionAnimTimer); _connectionAnimTimer = null; } }

// ==================== UTILITIES ====================
function showNotification(message, type = 'info') {
  const n = document.createElement('div');
  n.className = `notification notification-${type}`;
  n.innerHTML = `<div class="notification-content">${type === 'success' ? '✓' : type === 'info' ? 'ℹ' : '⚠'} ${message}</div>`;
  document.body.appendChild(n);
  setTimeout(() => n.classList.add('show'), 10);
  setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3500);
}




// ==================== HELPERS DE COBERTURA Y ASIGNACIÓN (DINÁMICO) ====================

function getCurrentNucleoLatLng(ni, nuc) {
  const bufData = editableBuffers.get(ni);
  const pos = bufData?.circle?.getLatLng ? bufData.circle.getLatLng() : null;
  if (pos && Number.isFinite(pos.lat) && Number.isFinite(pos.lng)) return { lat: pos.lat, lng: pos.lng };
  if (bufData?.currentPos && Number.isFinite(bufData.currentPos.lat) && Number.isFinite(bufData.currentPos.lng)) return bufData.currentPos;
  return { lat: nuc.lat, lng: nuc.lng };
}

function buildPointGrid(points) {
  const grid = new Map();
  for (const p of points) {
    const key = `${Math.floor(p.lat / GRID_CELL_DEG)},${Math.floor(p.lng / GRID_CELL_DEG)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(p);
  }
  return grid;
}

function findClosestInGridWithin(grid, lat, lng, maxDistM, ring = 1) {
  const cellLat = Math.floor(lat / GRID_CELL_DEG);
  const cellLng = Math.floor(lng / GRID_CELL_DEG);
  let minDist = Infinity;
  let best = null;

  for (let dLat = -ring; dLat <= ring; dLat++) {
    for (let dLng = -ring; dLng <= ring; dLng++) {
      const arr = grid.get(`${cellLat + dLat},${cellLng + dLng}`);
      if (!arr) continue;
      for (const p of arr) {
        const dist = haversineMeters(p.lat, p.lng, lat, lng);
        if (dist < minDist) { minDist = dist; best = p; }
      }
    }
  }
  if (best && minDist <= maxDistM) return { point: best, distance: minDist };
  return null;
}

function getActiveBufferCenters() {
  if (!globalData) return [];
  const centers = [];
  const { nucleos, selected } = globalData;

  // Buffers de núcleos seleccionados
  selected?.forEach?.(ni => {
    const nuc = nucleos?.[ni];
    if (!nuc) return;
    const pos = getCurrentNucleoLatLng(ni, nuc);
    centers.push({ kind: 'nucleo', ni, lat: pos.lat, lng: pos.lng });
  });

  // Buffers personalizados
  customBuffers.forEach(b => {
    const pos = b.circle?.getLatLng ? b.circle.getLatLng() : b.currentPos;
    if (!pos || !Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return;
    centers.push({ kind: 'custom', id: b.id, lat: pos.lat, lng: pos.lng });
  });

  return centers;
}

function getCoverageInfoForSatellite(sat, activeBufferGrid) {
  // Retorna { covered: bool, dist: number|null }
  const hit = findClosestInGridWithin(activeBufferGrid, sat.lat, sat.lng, BUFFER_RADIUS_M, 1);
  if (hit) return { covered: true, dist: hit.distance };
  return { covered: false, dist: null };
}

function buildNucleoLookup(nucleos, selectedSet) {
  const all = [];
  const selected = [];
  const allByProv = new Map();
  const allByProvCant = new Map();
  const allByZona = new Map();
  const selByProv = new Map();
  const selByProvCant = new Map();
  const selByZona = new Map();

  nucleos.forEach((nuc, ni) => {
    if (!nuc) return;
    const pos = getCurrentNucleoLatLng(ni, nuc);
    const entry = {
      ni,
      lat: pos.lat,
      lng: pos.lng,
      zona: Number.isFinite(nuc.zona) ? nuc.zona : null,
      codProvincia: Number.isFinite(nuc.codProvincia) ? nuc.codProvincia : null,
      codCanton: Number.isFinite(nuc.codCanton) ? nuc.codCanton : null
    };
    all.push(entry);

    if (Number.isFinite(entry.zona)) {
      if (!allByZona.has(entry.zona)) allByZona.set(entry.zona, []);
      allByZona.get(entry.zona).push(entry);
    }

    if (Number.isFinite(entry.codProvincia)) {
      if (!allByProv.has(entry.codProvincia)) allByProv.set(entry.codProvincia, []);
      allByProv.get(entry.codProvincia).push(entry);

      if (Number.isFinite(entry.codCanton)) {
        const key = `${entry.codProvincia}-${entry.codCanton}`;
        if (!allByProvCant.has(key)) allByProvCant.set(key, []);
        allByProvCant.get(key).push(entry);
      }
    }

    if (selectedSet?.has?.(ni)) {
      selected.push(entry);
      if (Number.isFinite(entry.zona)) {
        if (!selByZona.has(entry.zona)) selByZona.set(entry.zona, []);
        selByZona.get(entry.zona).push(entry);
      }
      if (Number.isFinite(entry.codProvincia)) {
        if (!selByProv.has(entry.codProvincia)) selByProv.set(entry.codProvincia, []);
        selByProv.get(entry.codProvincia).push(entry);

        if (Number.isFinite(entry.codCanton)) {
          const key = `${entry.codProvincia}-${entry.codCanton}`;
          if (!selByProvCant.has(key)) selByProvCant.set(key, []);
          selByProvCant.get(key).push(entry);
        }
      }
    }
  });

  return { all, selected, allByProv, allByProvCant, allByZona, selByProv, selByProvCant, selByZona };
}

function findClosestNucleoForOrphan(sat, lookup, preferSelected = true) {
  const prov = Number.isFinite(sat.codProvincia) ? sat.codProvincia : null;
  const cant = Number.isFinite(sat.codCanton) ? sat.codCanton : null;
  const zona = Number.isFinite(sat.zona) ? sat.zona : null;

  const useSel = preferSelected && lookup.selected.length > 0;

  // 1) Regla especial Galápagos: NO cruzar islas (canton) ni continente (provincia).
  if (prov === 20 && Number.isFinite(cant)) {
    const key = `${prov}-${cant}`;
    const pool = (useSel ? lookup.selByProvCant.get(key) : null) || lookup.allByProvCant.get(key) || [];
    if (!pool.length) return null; // se queda huérfano si no hay núcleo en su isla/cantón
    return findClosestFromPool(sat, pool);
  }

  // 2) Resto del país: preferir mismo cantón; luego misma provincia; luego misma zona; si no existe, usar el pool general.
  if (Number.isFinite(prov) && Number.isFinite(cant)) {
    const key = `${prov}-${cant}`;
    const poolCant = (useSel ? lookup.selByProvCant.get(key) : null) || lookup.allByProvCant.get(key) || [];
    if (poolCant.length) return findClosestFromPool(sat, poolCant);
  }

  if (Number.isFinite(prov)) {
    const poolProv = (useSel ? lookup.selByProv.get(prov) : null) || lookup.allByProv.get(prov) || [];
    if (poolProv.length) return findClosestFromPool(sat, poolProv);
  }

  if (Number.isFinite(zona)) {
    const poolZona = (useSel ? lookup.selByZona.get(zona) : null) || lookup.allByZona.get(zona) || [];
    if (poolZona.length) return findClosestFromPool(sat, poolZona);
  }

  // 3) Fallback: usar seleccionados o todos
  const pool = useSel ? lookup.selected : lookup.all;
  if (!pool.length) return null;
  return findClosestFromPool(sat, pool);
}

function findClosestFromPool(sat, pool) {
  let best = null;
  let minDist = Infinity;
  for (const n of pool) {
    const dist = haversineMeters(n.lat, n.lng, sat.lat, sat.lng);
    if (dist < minDist) { minDist = dist; best = n; }
  }
  if (!best) return null;
  return { ni: best.ni, distance: minDist };
}


// ========== FUNCIONES DE ANÁLISIS DE HUÉRFANOS ==========

function analyzeOrphans() {
  if (!globalData || !globalData.satellites || !globalData.nucleos) {
    console.log("[WARN] globalData no disponible para análisis");
    return;
  }

  console.log("=== ANÁLISIS DE HUÉRFANOS (DINÁMICO) ===");

  const { satellites, nucleos, selected } = globalData;

  // Limpiar
  orphanAnalysis.forcedAssignments.clear();
  orphanAnalysis.orphanSatellites.clear();
  orphanAnalysis.unservedSatellites.clear();
  orphanAnalysis.orphanNucleos.clear();

  let normalCovered = 0;
  let forcedCovered = 0;

  // Índice dinámico de buffers (núcleos seleccionados + buffers personalizados)
  const activeCenters = getActiveBufferCenters();
  const activeGrid = buildPointGrid(activeCenters);

  // Lookup de núcleos para asignación (respeta provincia/isla)
  const lookup = buildNucleoLookup(nucleos, selected);

  // Para identificar núcleos sin satélites (de los seleccionados)
  const hasAnySatellite = new Array(nucleos.length).fill(false);

  // Analizar satélites
  satellites.forEach((sat, si) => {
    // 1) Cobertura normal (dentro de algún buffer ACTUAL)
    const hit = findClosestInGridWithin(activeGrid, sat.lat, sat.lng, BUFFER_RADIUS_M, 1);

    if (hit) {
      normalCovered++;
      // Si está cubierto por un buffer de núcleo, marcar ese núcleo como "tiene satélite"
      if (hit.point?.kind === 'nucleo' && Number.isFinite(hit.point.ni)) {
        hasAnySatellite[hit.point.ni] = true;
      }
      return;
    }

    // 2) Huérfano real: asignar al núcleo más cercano bajo reglas (no cruzar islas/continente)
    const closest = findClosestNucleoForOrphan(sat, lookup, true);

    if (closest) {
      orphanAnalysis.forcedAssignments.set(si, { ni: closest.ni, distance: closest.distance });
      forcedCovered++;
      hasAnySatellite[closest.ni] = true;

      if (closest.distance > ORPHAN_WARNING_DISTANCE_M) {
        orphanAnalysis.orphanSatellites.add(si);
        orphanAnalysis.unservedSatellites.set(si, { ni: closest.ni, distance: closest.distance });
      }
    } else {
      // No hay núcleo válido según las reglas: queda sin atención
      orphanAnalysis.orphanSatellites.add(si);
    }
  });

  // Núcleos huérfanos (solo seleccionados)
  selected?.forEach?.(ni => {
    if (!hasAnySatellite[ni]) orphanAnalysis.orphanNucleos.add(ni);
  });

  // Stats
  orphanAnalysis.stats = {
    total: satellites.length,
    normalCovered: normalCovered,
    forcedCovered: forcedCovered,
    unserved: orphanAnalysis.orphanSatellites.size,
    normalPercent: satellites.length ? ((normalCovered / satellites.length) * 100).toFixed(2) : "0.00",
    totalPercent: satellites.length ? (((normalCovered + forcedCovered) / satellites.length) * 100).toFixed(2) : "0.00"
  };

  console.log("Total:", satellites.length);
  console.log("Normal:", normalCovered, `(${orphanAnalysis.stats.normalPercent}%)`);
  console.log("Forzados:", forcedCovered);
  console.log("TOTAL:", normalCovered + forcedCovered, `(${orphanAnalysis.stats.totalPercent}%)`);
  console.log("Conexiones extendidas (>7km):", orphanAnalysis.orphanSatellites.size);
  console.log("Huérfanos (núcleos):", orphanAnalysis.orphanNucleos.size);

  updateOrphanPanel();
  refreshSatellitesLayer();
  regenerateAnimations();
}


function updateOrphanPanel() {
  const panel = document.getElementById('orphanStatsPanel');
  if (!panel) {
    console.warn("Panel no encontrado");
    return;
  }
  
  const s = orphanAnalysis.stats;
  
  panel.innerHTML = `
    <div class="orphan-stat">
      <div class="stat-label">Cobertura Normal</div>
      <div class="stat-value">${s.normalPercent}%</div>
      <div class="stat-sub">${s.normalCovered} satélites</div>
    </div>
    <div class="orphan-stat">
      <div class="stat-label">Asignación Forzada</div>
      <div class="stat-value">${s.forcedCovered}</div>
      <div class="stat-sub">satélites forzados</div>
    </div>
    <div class="orphan-stat warn">
      <div class="stat-label">Conexiones extendidas (&gt;7km)</div>
      <div class="stat-value">${s.unserved}</div>
      <div class="stat-sub">satélites</div>
    </div>
    <div class="orphan-stat highlight">
      <div class="stat-label">COBERTURA TOTAL</div>
      <div class="stat-value-big">${s.totalPercent}%</div>
      <div class="stat-sub">${s.normalCovered + s.forcedCovered} de ${s.total}</div>
    </div>
    <div class="orphan-stat">
      <div class="stat-label">Núcleos Huérfanos</div>
      <div class="stat-value">${orphanAnalysis.orphanNucleos.size}</div>
      <div class="stat-sub">sin satélites</div>
    </div>
  `;
  
  console.log("✅ Panel actualizado");
}

function drawOrphanConnections() {
  console.log("🎨 Dibujando líneas...");
  
  if (!layers.orphanConnections) {
    layers.orphanConnections = L.featureGroup().addTo(map);
  } else {
    layers.orphanConnections.clearLayers();
  }
  
  if (!globalData) return;
  
  const { satellites, nucleos } = globalData;
  let count = 0;
  
  orphanAnalysis.forcedAssignments.forEach((assign, si) => {
    const sat = satellites[si];
    const nuc = nucleos[assign.ni];
    if (!sat || !nuc) return;
    
    const bufData = editableBuffers.get(assign.ni);
    const nucLat = bufData?.currentPos?.lat || nuc.lat;
    const nucLng = bufData?.currentPos?.lng || nuc.lng;
    
    const line = L.polyline(
      [[sat.lat, sat.lng], [nucLat, nucLng]],
      {
        color: '#ff9800',
        weight: 2,
        opacity: 0.6,
        dashArray: '5,10',
        renderer: canvasRenderer
      }
    );
    
    line.bindPopup(`
      <b>Asignación Forzada</b><br>
      Satélite: ${sat.name}<br>
      → Núcleo: ${nuc.name}<br>
      Distancia: ${(assign.distance / 1000).toFixed(2)} km
    `);
    
    layers.orphanConnections.addLayer(line);
    count++;
  });
  
  console.log(`✅ ${count} líneas dibujadas`);
}




// ========== CONECTAR SATÉLITES DESATENDIDOS ==========
function connectUnattendedSatellites(nucleos, satellites, satCandidates, selected) {
  console.log("🔗 Analizando satélites desatendidos...");
  
  satelliteConnections.clear();
  let normalCovered = 0;
  let newConnections = 0;
  let orphansRemaining = 0;
  let longConnections = 0;
  
  const MAX_CONNECTION_DISTANCE = Infinity; // sin límite de distancia (conectar al núcleo más cercano)
  const WARNING_DISTANCE = ORPHAN_WARNING_DISTANCE_M; // 7 km: umbral para marcar conexiones extendidas
  
  satellites.forEach((sat, si) => {
    let isCovered = false;
    
    // Verificar cobertura normal (dentro de buffer)
    if (satCandidates[si]) {
      satCandidates[si].forEach(c => {
        if (selected.has(c.ni) && c.dist <= BUFFER_RADIUS_M) {
          isCovered = true;
        }
      });
    }
    
    if (isCovered) {
      normalCovered++;
    } else {
      // Buscar núcleo más cercano
      let closestNi = null;
      let minDist = MAX_CONNECTION_DISTANCE;
      
      selected.forEach(ni => {
        const nuc = nucleos[ni];
        if (!nuc) return;
        
        const bufferData = editableBuffers.get(ni);
        const nucLat = bufferData?.currentPos?.lat || nuc.lat;
        const nucLng = bufferData?.currentPos?.lng || nuc.lng;
        
        const dist = haversineMeters(nucLat, nucLng, sat.lat, sat.lng);
        
        if (dist < minDist) {
          minDist = dist;
          closestNi = ni;
        }
      });
      
      if (closestNi !== null) {
        if (minDist > WARNING_DISTANCE) longConnections++;
        satelliteConnections.set(si, {
          ni: closestNi,
          distance: minDist,
          animated: true
        });
        newConnections++;
      } else {
        orphansRemaining++;
      }
    }
  });
  
  connectionStats = {
    total: satellites.length,
    normalCovered: normalCovered,
    connected: newConnections,
    orphans: orphansRemaining,
    normalCoveragePercent: ((normalCovered / satellites.length) * 100).toFixed(2),
    totalCoveragePercent: (((normalCovered + newConnections) / satellites.length) * 100).toFixed(2)
  };
  
  console.log("📊 Resultados:");
  console.log(`  Total satélites: ${connectionStats.total}`);
  console.log(`  Cobertura normal: ${normalCovered} (${connectionStats.normalCoveragePercent}%)`);
  console.log(`  Nuevas conexiones: ${newConnections}`);
  console.log(`  Cobertura TOTAL: ${normalCovered + newConnections} (${connectionStats.totalCoveragePercent}%)`);
  console.log(`  Conexiones extendidas (>7km): ${longConnections}`);
  console.log(`  Sin núcleo seleccionado: ${orphansRemaining}`);
  
  return connectionStats;
}

// ========== DIBUJAR CONEXIONES ANIMADAS ==========
function drawAnimatedConnections(nucleos, satellites) {
  console.log("🎨 Dibujando conexiones animadas...");
  
  if (!layers.connections) {
    layers.connections = L.featureGroup().addTo(map);
  } else {
    layers.connections.clearLayers();
  }
  
  let drawnCount = 0;
  
  satelliteConnections.forEach((conn, si) => {
    const sat = satellites[si];
    const nuc = nucleos[conn.ni];
    if (!sat || !nuc) return;
    
    const bufferData = editableBuffers.get(conn.ni);
    const nucLat = bufferData?.currentPos?.lat || nuc.lat;
    const nucLng = bufferData?.currentPos?.lng || nuc.lng;
    
    // Crear línea animada
    const line = L.polyline(
      [[sat.lat, sat.lng], [nucLat, nucLng]],
      {
        color: '#d29922',
        weight: 2,
        opacity: 0.7,
        dashArray: '10, 15',
        className: 'animated-connection',
        renderer: canvasRenderer
      }
    );
    
    line.bindPopup(`
      <div style="font-family: system-ui;">
        <b style="color: #d29922;">🔗 Conexión Servicio</b><br>
        <b>Satélite:</b> ${sat.name}<br>
        <b>→ Núcleo:</b> ${nuc.name}<br>
        <b>Distancia:</b> ${(conn.distance / 1000).toFixed(2)} km<br>
        <b>Estado:</b> <span style="color: #d29922;">✓ Conectado</span>
      </div>
    `);
    
    layers.connections.addLayer(line);
    drawnCount++;
  });
  
  console.log(`✅ ${drawnCount} conexiones dibujadas`);
  
  // Agregar animación CSS
  addConnectionAnimation();
}

// ========== AGREGAR ANIMACIÓN CSS ==========
function addConnectionAnimation() {
  const styleId = 'connection-animation-style';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes dash-flow {
      0% {
        stroke-dashoffset: 25;
      }
      100% {
        stroke-dashoffset: 0;
      }
    }
    
    .animated-connection {
      animation: dash-flow 2s linear infinite;
    }
    
    @keyframes pulse-glow {
      0%, 100% {
        opacity: 0.7;
      }
      50% {
        opacity: 1;
      }
    }
  `;
  
  document.head.appendChild(style);
}




// ========== ACTUALIZAR DISPLAY DE COBERTURA ==========
function updateCoverageDisplay(stats) {
  // Buscar el elemento de cobertura en la UI
  const coverageElement = document.querySelector('.coverage-value, #coverage-stat, [class*="cobertura"]');
  
  if (coverageElement) {
    const improvement = (parseFloat(stats.totalCoveragePercent) - parseFloat(stats.normalCoveragePercent)).toFixed(1);
    coverageElement.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 2em; color: #d29922;">${stats.totalCoveragePercent}%</div>
        <div style="font-size: 0.8em; color: #8b949e;">
          Base: ${stats.normalCoveragePercent}% 
          <span style="color: #d29922;">+${improvement}%</span>
        </div>
      </div>
    `;
  }
  
  console.log(`📈 Mejora de cobertura: +${(parseFloat(stats.totalCoveragePercent) - parseFloat(stats.normalCoveragePercent)).toFixed(2)}%`);
}


function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function escapeHTML(str) { return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

function flyToLocation(lat, lng) { map.flyTo([lat, lng], 12, { duration: 1.2 }); }
window.flyToLocation = flyToLocation;

// ==================== CSV LOADING ====================
function loadCSV() {
  console.log("[LOAD] Iniciando carga CSV...");
  const overlay = document.getElementById("loadingOverlay");
  const setText = (main, sub = "") => { 
    console.log("[LOAD] setText:", main, sub);
    if (overlay) { 
      overlay.querySelector(".loading-text").textContent = main; 
      const s = document.getElementById("loadingSubtext"); 
      if (s) s.textContent = sub; 
    } 
  };
  
  if (!window.Papa) { 
    console.error("[ERROR] PapaParse no disponible");
    setText("Falta PapaParse"); 
    return; 
  }
  console.log("[OK] PapaParse disponible");
  
  setText("Cargando CSV...", "DECE_CRUCE_X_Y_NUC_SAT.csv");
  
  console.log("[LOAD] Iniciando fetch...");
  fetch("DECE_CRUCE_X_Y_NUC_SAT.csv", { cache: "no-store" })
    .then(res => { 
      console.log("[FETCH] Status:", res.status, "OK:", res.ok);
      if (!res.ok) throw new Error(`HTTP ${res.status}`); 
      return res.text(); 
    })
    .then(rawText => {
      console.log("[OK] CSV cargado, tamaño:", rawText.length);
      let text = rawText.replace(/^\uFEFF/, "");
      const firstLine = text.split(/\r?\n/, 1)[0] || "";
      const delim = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ";" : ",";
      console.log("[PARSE] Delimiter:", delim);
      console.log("[PARSE] Primera línea:", firstLine.substring(0, 100));
      setText("Procesando...", `Delimiter: ${delim}`);
      Papa.parse(text, {
        delimiter: delim, skipEmptyLines: "greedy", worker: false,
        complete: (results) => { 
          console.log("[PARSE] Completado, rows:", results.data.length);
          try { 
            handleParsed(results); 
          } catch (e) { 
            console.error("[ERROR] handleParsed:", e);
            setText("Error procesando CSV"); 
          } 
        },
        error: (err) => { 
          console.error("[ERROR] Papa.parse:", err);
          setText("Error leyendo CSV"); 
        }
      });
    })
    .catch(err => { 
      console.error("[ERROR] Fetch falló:", err);
      console.error("[ERROR] Detalles:", err.message);
      setText("Error cargando CSV: " + err.message); 
    });
  
  function handleParsed(results) {
    const rows = results.data || [];
    if (!rows.length) { setText("CSV vacío"); return; }
    const resolved = resolveColumnIndexes(rows[0] || []);
    const mapped = mapRowsToData(rows, resolved.idx);
    if (!mapped.data.length) { setText("No hay registros válidos"); return; }
    if (mapped.bounds?.isValid()) map.fitBounds(mapped.bounds.pad(0.10), { animate: false });
    processData(mapped.data);
  }
}

function resolveColumnIndexes(headerRow) {
  const norm = s => String(s ?? "").replace(/^\uFEFF/, "").trim().toLowerCase();
  const header = headerRow.map(norm);
  const find = (candidates) => {
    for (let c of candidates) {
      const idx = header.findIndex(h => h.includes(c));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  // Preferimos COORD_DECE para clasificar (0 satélite, 1/2/3 núcleo). Si no existe, caemos a COD_GDECE.
  const idxCodGdece = find(["cod_gdece", "cod gdece"]);
  const idxCoordDece = find(["coord_dece", "coord dece"]);

  return {
    idx: {
      lat: find(["lat", "latitud"]),
      lon: find(["lon", "longitud", "lng"]),
      typeCode: idxCoordDece >= 0 ? idxCoordDece : idxCodGdece,
      codGDECE: idxCodGdece,
      name: find(["nombre_ie", "nombre_institución", "nombre institucion", "nombre"]),
      dist: find(["distrito"]),
      zona: find(["zona"]),
      students: find(["total estudiantes", "estudiantes"]),
      amie: find(["amie"]),
      provincia: find(["provincia"]),
      codProvincia: find(["cod_provincia", "cod provincia", "cod_prov"]),
      canton: find(["cantón", "canton"]),
      codCanton: find(["cod_cantón", "cod canton", "cod_cant"])
      ,
      // Filtros (solo fiscales / grupo DECE)
      sostenimiento: find(["sostenimiento"]),
      ieFiscales: find(["ie_fiscales", "ie fiscales"]),
      grupoDece: find(["grupo_dece", "grupo dece"])
    },
    issues: []
  };
}


function mapRowsToData(rows, idx) {
  const data = [], bounds = L.latLngBounds();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r?.length) continue;

    const lat = parseFloat(String(r[idx.lat] || "").replace(",", "."));
    const lng = parseFloat(String(r[idx.lon] || "").replace(",", "."));

    const typeCode = parseInt(String(r[idx.typeCode] || "").trim(), 10);
    const codGDECE = idx.codGDECE >= 0 ? parseInt(String(r[idx.codGDECE] || "").trim(), 10) : null;

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(typeCode)) continue;

    const name = idx.name >= 0 ? String(r[idx.name] || "").trim() : "";
    const dist = idx.dist >= 0 ? String(r[idx.dist] || "").trim() : "";

    const zonaRaw = idx.zona >= 0 ? String(r[idx.zona] || "").trim() : "";
    const zonaNum = zonaRaw ? parseInt((zonaRaw.match(/\d+/) || [""])[0], 10) : NaN;
    const zona = Number.isFinite(zonaNum) ? zonaNum : null;
    const students = idx.students >= 0 ? parseInt(String(r[idx.students] || "0").replace(/\D/g, ""), 10) || 0 : 0;
    const amie = idx.amie >= 0 ? String(r[idx.amie] || "").trim() : "";

    const provincia = idx.provincia >= 0 ? String(r[idx.provincia] || "").trim() : "";
    const codProvinciaRaw = idx.codProvincia >= 0 ? parseInt(String(r[idx.codProvincia] || "").trim(), 10) : NaN;
    const codProvincia = Number.isFinite(codProvinciaRaw) ? codProvinciaRaw : null;
    const canton = idx.canton >= 0 ? String(r[idx.canton] || "").trim() : "";
    const codCantonRaw = idx.codCanton >= 0 ? parseInt(String(r[idx.codCanton] || "").trim(), 10) : NaN;
    const codCanton = Number.isFinite(codCantonRaw) ? codCantonRaw : null;

    const sostenimiento = idx.sostenimiento >= 0 ? String(r[idx.sostenimiento] || "").trim() : "";
    const ieFiscalesRaw = idx.ieFiscales >= 0 ? String(r[idx.ieFiscales] || "").trim() : "";
    const ieFiscales = ieFiscalesRaw === "1" || ieFiscalesRaw.toLowerCase() === "si" || ieFiscalesRaw.toLowerCase() === "sí";
    const grupoDece = idx.grupoDece >= 0 ? String(r[idx.grupoDece] || "").trim() : "";

    data.push({ lat, lng, code: typeCode, codGDECE, name, dist, zona, students, amie, provincia, codProvincia, canton, codCanton, sostenimiento, ieFiscales, grupoDece });
    bounds.extend([lat, lng]);
  }
  return { data, bounds };
}

function isFiscalInstitution(row) {
  // Priorizamos IE_Fiscales si existe. Si no, caemos a Sostenimiento.
  if (row?.ieFiscales === true) return true;
  const sost = String(row?.sostenimiento || "").toUpperCase();
  // Aceptar "FISCAL" y excluir "FISCOMISIONAL" (y otras variantes que a veces se cuelan)
  if (!sost.includes("FISCAL")) return false;
  if (sost.includes("FISCOMISIONAL")) return false;
  return true;
}

function isSatellite51to120(row) {
  const g = String(row?.grupoDece || "");
  if (/51\s*a\s*120/i.test(g)) return true;
  const n = Number(row?.students);
  return Number.isFinite(n) && n >= 51 && n <= 120;
}


function processData(data) {
  layers.nucleos.clearLayers(); layers.satellites.clearLayers(); layers.satellitesUncovered.clearLayers(); layers.buffers.clearLayers(); layers.connections.clearLayers(); layers.animations.clearLayers();
  editableBuffers.clear(); stopAnimations();

  // ✅ Filtro 1: trabajar solo con IE FISCALES (según IE_Fiscales o Sostenimiento)
  const fiscalData = (data || []).filter(isFiscalInstitution);
  const dropped = (data?.length || 0) - fiscalData.length;
  console.log(`[FILTER] Fiscales: ${fiscalData.length}/${data?.length || 0} (excluidas: ${dropped})`);
  data = fiscalData;
  
  // Detectar códigos de tipo (satélite vs núcleo) de forma robusta.
// Soporta datasets típicos:
//   - COORD_DECE: 0 = satélite, 1/2/3 = núcleo
//   - CODE:       2 = satélite, 3/4/5 = núcleo
const counts = {};
data.forEach(d => {
  const c = Number(d.code);
  if (!Number.isFinite(c)) return;
  counts[c] = (counts[c] || 0) + 1;
});
const codes = Object.keys(counts).map(Number);

const has013 = counts[0] && (counts[1] || counts[2] || counts[3]);
const has235 = counts[2] && (counts[3] || counts[4] || counts[5]);

let satelliteCodes = [];
let nucleoCodes = [];

if (has013 && !has235) {
  satelliteCodes = [0];
  nucleoCodes = [1, 2, 3];
} else if (has235 && !has013) {
  satelliteCodes = [2];
  nucleoCodes = [3, 4, 5];
} else if (has013 && has235) {
  // Ambiguo: elegir el código más frecuente como satélite (normalmente hay MUCHOS más satélites).
  const sorted = [...codes].sort((a,b) => (counts[b]||0) - (counts[a]||0));
  const sat = sorted[0];
  satelliteCodes = [sat];
  nucleoCodes = sorted.slice(1);
} else {
  // Fallback: elegir el código más frecuente como satélite y el resto como núcleos.
  const sorted = [...codes].sort((a,b) => (counts[b]||0) - (counts[a]||0));
  const sat = sorted[0];
  satelliteCodes = [sat];
  nucleoCodes = sorted.slice(1);
}

let nucleos = data.filter(d => nucleoCodes.includes(Number(d.code)));
let satellitesAll = data.filter(d => satelliteCodes.includes(Number(d.code)));

// ✅ Filtro 2: satélites SOLO del grupo 51 a 120 estudiantes
let satellites = satellitesAll.filter(isSatellite51to120);
console.log(`[FILTER] Satélites 51-120: ${satellites.length}/${satellitesAll.length}`);

console.log("[DATA] Códigos detectados:", { counts, satelliteCodes, nucleoCodes, nucleos: nucleos.length, satellites: satellites.length });
if (!nucleos.length || !satellites.length) {
  console.warn("[DATA] No se detectaron núcleos o satélites. Revisa columnas y códigos.");
  hideLoadingOverlay();
  // Actualizar panel para no quedarse en "Cargando análisis..."
  const panel = document.getElementById("orphanStatsPanel");
  if (panel) {
    panel.innerHTML = `
      <div style="text-align:center; color:#ff7b72; padding:10px;">
        No se pudieron detectar núcleos/satélites.<br/>
        <span style="color:#8b949e; font-size:12px;">Códigos detectados: ${codes.join(", ") || "ninguno"}</span>
      </div>
    `;
  }
  return;
}
  
  const spatialIndex = buildSpatialIndex(satellites);
  const satCandidates = findCandidates(nucleos, satellites, spatialIndex);
  const result = setCoverGreedy(nucleos, satellites, satCandidates);
  const nucleoStats = buildNucleoStats(nucleos, satellites, satCandidates);
  
  // Guardar globalData COMPLETO para analyzeOrphans
  globalData = { nucleos, satellites, satCandidates, selected: result.selected };
  
  drawNucleos(nucleos, result.selected);
  drawBuffersEditable(nucleos, result.selected, nucleoStats);
  drawSatellites(satellites, satCandidates, result.selected);
  regenerateAnimations();
  
  const stats = computeStatistics(nucleos, satellites, satCandidates, result.selected, nucleoStats);
  updateStatistics(stats);
  updateTopNucleos(nucleoStats);
  
  hideLoadingOverlay();
  console.log(`✓ ${nucleos.length} núcleos, ${satellites.length} satélites`);
  
  // ========== APOYO A HUÉRFANOS (SOLO NO CUBIERTOS) ==========
  setTimeout(() => {
    // Evitar duplicar capas antiguas de conexión
    if (layers.satelliteConnections) layers.satelliteConnections.clearLayers();
    satelliteConnections?.clear?.();
    analyzeOrphans();
  }, 900);

}

function buildSpatialIndex(satellites) {
  const grid = new Map();
  satellites.forEach((s, i) => { const key = `${Math.floor(s.lat / GRID_CELL_DEG)},${Math.floor(s.lng / GRID_CELL_DEG)}`; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(i); });
  return grid;
}

function findCandidates(nucleos, satellites, spatialIndex) {
  const satCandidates = Array.from({ length: satellites.length }, () => []);
  nucleos.forEach((n, ni) => {
    const cellLat = Math.floor(n.lat / GRID_CELL_DEG), cellLng = Math.floor(n.lng / GRID_CELL_DEG);
    for (let dLat = -2; dLat <= 2; dLat++) for (let dLng = -2; dLng <= 2; dLng++) {
      (spatialIndex.get(`${cellLat + dLat},${cellLng + dLng}`) || []).forEach(si => {
        const dist = haversineMeters(n.lat, n.lng, satellites[si].lat, satellites[si].lng);
        if (dist <= BUFFER_RADIUS_M) satCandidates[si].push({ ni, dist });
      });
    }
  });
  satCandidates.forEach(cands => cands.sort((a, b) => a.dist - b.dist));
  return satCandidates;
}

function setCoverGreedy(nucleos, satellites, satCandidates) {
  const uncovered = new Set(satCandidates.map((c, i) => c.length > 0 ? i : -1).filter(i => i >= 0));
  const selected = new Set();
  const nucleoStats = buildNucleoStats(nucleos, satellites, satCandidates);
  while (uncovered.size > 0 && selected.size < MAX_BUFFERS) {
    if (uncovered.size / satellites.length <= (1 - TARGET_COVERAGE)) break;
    let bestNi = -1, bestCount = 0;
    nucleos.forEach((_, ni) => {
      if (selected.has(ni) || nucleoStats[ni].satIdx.length < MIN_SATS_PER_BUFFER) return;
      let count = nucleoStats[ni].satIdx.filter(si => uncovered.has(si)).length;
      if (count > bestCount) { bestCount = count; bestNi = ni; }
    });
    if (bestNi < 0) break;
    selected.add(bestNi);
    nucleoStats[bestNi].satIdx.forEach(si => uncovered.delete(si));
  }
  return { selected, uncovered };
}

function buildNucleoStats(nucleos, satellites, satCandidates) {
  const stats = nucleos.map(n => ({ satIdx: [], totalStudents: 0, nucleo: n }));
  satCandidates.forEach((cands, si) => {
    if (cands.length > 0) stats[cands[0].ni].satIdx.push(si);
  });
  stats.forEach(st => {
    st.satIdx.forEach(si => { st.totalStudents += satellites[si]?.students || 0; });
  });
  return stats;
}

function drawNucleos(nucleos, selected) {
  nucleos.forEach((n, ni) => {
    const isSelected = selected.has(ni);
    // 🔵 AZUL FUERTE para núcleos activos
    const marker = L.circleMarker([n.lat, n.lng], { radius: isSelected ? 10 : 6, fillColor: isSelected ? '#1e40af' : '#60a5fa', color: '#fff', weight: 2, opacity: 1, fillOpacity: isSelected ? 0.9 : 0.7, renderer: canvasRenderer });
    marker.bindPopup(createNucleoPopup(n, 0, 0));
    marker.addTo(layers.nucleos);
  });
}

function drawBuffersEditable(nucleos, selected, nucleoStats) {
  const savedState = loadBuffersState();
  const savedPositions = new Map();
  
  // Crear mapa de posiciones guardadas CON VALIDACIÓN
  if (savedState?.editableBuffers) {
    savedState.editableBuffers.forEach(s => {
      // CRÍTICO: validar antes de usar
      if (validateBufferCoordinates(s.currentLat, s.currentLng)) {
        savedPositions.set(s.ni, {
          lat: s.currentLat,
          lng: s.currentLng
        });
      } else {
        console.warn(`⚠️ Posición inválida para buffer ${s.ni}, usando original`);
      }
    });
  }
  
  let restoredCount = 0;
  let originalCount = 0;
  
  selected.forEach(ni => {
    const n = nucleos[ni], st = nucleoStats[ni];
    const savedPos = savedPositions.get(ni);
    
    // Usar posición guardada si existe y es válida, sino usar original
    let lat, lng, wasRestored;
    
    if (savedPos) {
      lat = savedPos.lat;
      lng = savedPos.lng;
      wasRestored = true;
      restoredCount++;
    } else {
      lat = n.lat;
      lng = n.lng;
      wasRestored = false;
      originalCount++;
    }
    
    // 🟣 PÚRPURA para buffers
    const circle = L.circle([lat, lng], { radius: BUFFER_RADIUS_M, color: '#9333ea', fillColor: '#9333ea', weight: 2, opacity: 0.6, fillOpacity: 0.08, renderer: canvasRenderer });
    circle.addTo(layers.buffers);
    circle.on('click', (e) => { if (!editMode) showBufferPopup(editableBuffers.get(ni), false); });
    editableBuffers.set(ni, { circle, nucleo: n, stats: st, originalPos: { lat: n.lat, lng: n.lng }, currentPos: { lat, lng }, isDragging: false, wasRestored });
  });
  
  // Restaurar buffers personalizados
  if (savedState?.customBuffers) {
    savedState.customBuffers.forEach(s => {
      if (validateBufferCoordinates(s.lat, s.lng)) {
        restoreCustomBuffer(s);
        restoredCount++;
      } else {
        console.warn(`⚠️ Buffer personalizado inválido: ${s.id}`);
      }
    });
  }
  
  // Log de restauración
  if (restoredCount > 0 || originalCount > 0) {
    console.log(`📍 Buffers cargados: ${restoredCount} restaurados, ${originalCount} originales`);
    
    if (restoredCount > 0) {
      showNotification(`✅ ${restoredCount} buffer(s) restaurado(s) desde posiciones guardadas`, "success");
    }
  }
}

function restoreCustomBuffer(saved) {
  customBufferCounter++;
  const circle = L.circle([saved.lat, saved.lng], { radius: BUFFER_RADIUS_M, color: '#a371f7', fillColor: '#a371f7', weight: 2, opacity: 0.7, fillOpacity: 0.15, renderer: canvasRenderer });
  circle.addTo(layers.buffers);
  const buffer = { id: saved.id, circle, lat: saved.lat, lng: saved.lng, originalPos: { lat: saved.lat, lng: saved.lng }, currentPos: { lat: saved.lat, lng: saved.lng }, isCustom: true, isDragging: false, name: saved.name };
  customBuffers.push(buffer);
  circle.on('click', (e) => { L.DomEvent.stopPropagation(e); showBufferPopup(buffer, true); });
  if (editMode) makeBufferDraggable(circle, buffer, true);
}


function drawSatellites(satellites, satCandidates, selected) {
  // satCandidates/selected se mantienen por compatibilidad, pero la cobertura se calcula con buffers actuales.
  const activeCenters = getActiveBufferCenters();
  const activeGrid = buildPointGrid(activeCenters);

  let verdesCount = 0;
  let rojosCount = 0;

  satellites.forEach((s, si) => {
    // ✅ "Cobertura" para colorear = SOLO si está dentro de un buffer (≤ 7.5 km)
    // La asignación forzada (huérfanos) NO cambia el color: sigue siendo rojo para que puedas ajustarlo manualmente.
    let normalCovered = false;
    let normalDist = null;

    // 1) Cobertura real por buffer (núcleos seleccionados + personalizados), usando posición actual
    const hit = findClosestInGridWithin(activeGrid, s.lat, s.lng, BUFFER_RADIUS_M, 1);
    if (hit) {
      normalCovered = true;
      normalDist = hit.distance;
    }

    // 2) Info de asignación forzada (solo para popup / líneas), sin cambiar color
    const forced = orphanAnalysis?.forcedAssignments?.get(si) || null;

    const marker = L.circleMarker([s.lat, s.lng], {
      radius: normalCovered ? 5 : 7,
      fillColor: normalCovered ? '#10b981' : '#dc2626',
      color: normalCovered ? '#fff' : '#7f1d1d',
      weight: normalCovered ? 1 : 2,
      opacity: 1,
      fillOpacity: normalCovered ? 0.85 : 0.95,
      renderer: canvasRenderer
    });

    marker.bindPopup(createSatellitePopup(s, { normalCovered, normalDist, forced }));

    // Agregar a capa correspondiente
    if (normalCovered) {

      verdesCount++;
      marker.addTo(layers.satellites);
    } else {
      rojosCount++;
      marker.addTo(layers.satellitesUncovered);
    }
  });
  
  // LOGS DE DEBUGGING
  console.log('%c═══════════════════════════════════', 'color: #9333ea; font-weight: bold;');
  console.log('%c🎯 SATÉLITES DIBUJADOS', 'color: #9333ea; font-size: 16px; font-weight: bold;');
  console.log('%c═══════════════════════════════════', 'color: #9333ea; font-weight: bold;');
  console.log('%c🟢 Satélites CON cobertura: ' + verdesCount, 'color: #10b981; font-size: 14px; font-weight: bold;');
  console.log('%c🔴 Satélites SIN cobertura: ' + rojosCount, 'color: #dc2626; font-size: 14px; font-weight: bold;');
  console.log('%c📊 Total satélites: ' + satellites.length, 'color: #60a5fa; font-size: 14px;');
  console.log('%c═══════════════════════════════════', 'color: #9333ea; font-weight: bold;');
  
  if (rojosCount > 0) {
    console.log('%c✅ HAY ' + rojosCount + ' SATÉLITES ROJOS - Usa el toggle para verlos', 'background: #dc2626; color: white; padding: 8px; font-weight: bold; font-size: 12px;');
  } else {
    console.log('%c✅ 100% COBERTURA - Todos los satélites están cubiertos', 'background: #10b981; color: white; padding: 8px; font-weight: bold; font-size: 12px;');
  }
}


function refreshSatellitesLayer() {
  if (!globalData) return;
  layers.satellites.clearLayers();
  layers.satellitesUncovered.clearLayers();  // Limpiar también la capa de rojos
  drawSatellites(globalData.satellites, globalData.satCandidates, globalData.selected);
}


function hideLoadingOverlay() { const o = document.getElementById("loadingOverlay"); if (o) { o.style.opacity = "0"; setTimeout(() => o.style.display = "none", 500); } }

function createNucleoPopup(n, satCount, totalStudents) {
  return `<div class="popup-title">🏛️ Núcleo DECE</div><div class="popup-content"><div class="popup-row"><span class="popup-label">Institución:</span><span class="popup-value">${escapeHTML(n.name)}</span></div><div class="popup-row"><span class="popup-label">Distrito:</span><span class="popup-value">${escapeHTML(n.dist)}</span></div><div class="popup-row"><span class="popup-label">Estudiantes:</span><span class="popup-value" style="color:#d29922">${(n.students || 0).toLocaleString()}</span></div></div>`;
}

function createSatellitePopup(s, info) {
  // info: { normalCovered: boolean, normalDist: number|null, forced: {ni, distance}|undefined|null }
  const normalCovered = !!(info && info.normalCovered);
  const normalDist = (info && typeof info.normalDist === 'number') ? info.normalDist : null;
  const forced = info && info.forced ? info.forced : null;

  const statusColor = normalCovered ? "#10b981" : "#dc2626";
  const statusText = normalCovered ? "✅ CON cobertura (≤ 7.5 km)" : "❌ SIN cobertura (fuera de 7.5 km)";

  const forcedLine = (!normalCovered && forced)
    ? `<div class="popup-row"><span class="popup-label">Asignación:</span><span class="popup-value" style="color:#f59e0b">↪ Forzada al núcleo más cercano (${(forced.distance/1000).toFixed(2)} km)</span></div>`
    : '';

  const distLine = normalCovered && normalDist !== null
    ? `<div class="popup-row"><span class="popup-label">Distancia:</span><span class="popup-value">${(normalDist/1000).toFixed(2)} km</span></div>`
    : '';

  return `<div class="popup-title">📍 Satélite ${normalCovered ? '🟢' : '🔴'}</div>` +
    `<div class="popup-content">` +
      `<div class="popup-row"><span class="popup-label">Institución:</span><span class="popup-value">${escapeHTML(s.name)}</span></div>` +
      `<div class="popup-row"><span class="popup-label">Distrito:</span><span class="popup-value">${escapeHTML(s.dist)}</span></div>` +
      `<div class="popup-row"><span class="popup-label">Estado:</span><span class="popup-value" style="color:${statusColor}">${statusText}</span></div>` +
      distLine +
      forcedLine +
      `<div class="popup-row"><span class="popup-label">Estudiantes:</span><span class="popup-value" style="color:#d29922">${(s.students || 0).toLocaleString()}</span></div>` +
    `</div>`;
}


function updateStatistics(stats) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = typeof val === 'number' ? val.toLocaleString() : val; };
  set("totalNucleos", stats.totalNucleos); set("totalSatellites", stats.totalSatellites); set("coveragePercent", stats.coveragePercent + "%"); set("totalStudents", stats.totalStudents);
  set("nucleosActivos", stats.nucleosActivos); set("sinCobertura", stats.sinCobertura);
  const fill = document.getElementById("coverageFill"); if (fill) fill.style.width = Math.min(100, parseFloat(stats.coveragePercent)) + "%";
}

function computeStatistics(nucleos, satellites, satCandidates, selected, nucleoStats) {
  // ✅ Estadísticas coherentes con los satélites dibujados:
  // - Cobertura normal = dentro de algún buffer (≤ 7.5 km) con posición ACTUAL
  // - "Sin cobertura" = satélites rojos (fuera de 7.5 km)
  const activeCenters = getActiveBufferCenters();
  const activeGrid = buildPointGrid(activeCenters);

  let covered = 0;
  let totalStudents = 0;

  satellites.forEach((s) => {
    const hit = findClosestInGridWithin(activeGrid, s.lat, s.lng, BUFFER_RADIUS_M, 1);
    if (hit) {
      covered++;
      totalStudents += s.students || 0;
    }
  });

  const total = satellites.length || 0;
  const uncovered = total - covered;

  return {
    totalNucleos: nucleos.length,
    totalSatellites: total,
    coveragePercent: total > 0 ? ((covered / total) * 100).toFixed(2) : "0.00",
    totalStudents,
    nucleosActivos: selected?.size || 0,
    sinCobertura: uncovered
  };
}


function updateTopNucleos(nucleoStats) {
  const container = document.getElementById("topNucleos");
  if (!container) return;
  const sorted = nucleoStats.map((st, i) => ({ st, i })).sort((a, b) => b.st.satIdx.length - a.st.satIdx.length).slice(0, 10);
  container.innerHTML = sorted.map((x, idx) => `<div class="top-item" onclick="flyToLocation(${x.st.nucleo.lat},${x.st.nucleo.lng})"><div class="top-item-header"><span class="top-rank">#${idx + 1}</span><span class="top-name">${escapeHTML(x.st.nucleo.name)}</span><span class="top-count">${x.st.satIdx.length}</span></div><div class="top-desc">${x.st.totalStudents.toLocaleString()} est.</div></div>`).join("");
}

function setupControls() {
  document.getElementById("toggleStats")?.addEventListener("click", () => { document.getElementById("statsPanel")?.classList.toggle("active"); document.getElementById("legendPanel")?.classList.remove("active"); });
  document.getElementById("toggleLegend")?.addEventListener("click", () => { document.getElementById("legendPanel")?.classList.toggle("active"); document.getElementById("statsPanel")?.classList.remove("active"); });
  
  // Toggles de capas con satélites separados
  ["toggleBuffers", "toggleConnections", "toggleNucleos", "toggleSatellites", "toggleSatellitesUncovered"].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", (e) => { 
      const layer = [layers.buffers, layers.connections, layers.nucleos, layers.satellites, layers.satellitesUncovered][i];
      const layerNames = ["Buffers", "Conexiones", "Núcleos", "Satélites Verdes", "Satélites Rojos"];
      
      if (e.target.checked) {
        map.addLayer(layer);
        console.log(`✅ Capa activada: ${layerNames[i]} (${layer.getLayers().length} elementos)`);
      } else {
        map.removeLayer(layer);
        console.log(`❌ Capa desactivada: ${layerNames[i]}`);
      }
    });
  });
  
  setTimeout(() => document.getElementById("statsPanel")?.classList.add("active"), 500);
}
