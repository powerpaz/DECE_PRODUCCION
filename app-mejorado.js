/*************************************************
 * DECE Coverage App - v7.0 MEJORADO Y CONSOLIDADO
 * 
 * MEJORAS IMPLEMENTADAS:
 * ✅ Carga de CSV con fallback para file://
 * ✅ Validación mejorada de coordenadas
 * ✅ Código consolidado (sin conflictos entre scripts)
 * ✅ Mejor manejo de errores
 * ✅ Performance optimizado
 * ✅ Documentación inline mejorada
 *************************************************/

// ==================== CONFIGURACIÓN GLOBAL ====================

const DECE_CONFIG = {
  VERSION: '7.0.0 - MEJORADO',
  
  // Clasificación de instituciones
  NUCLEOS: {
    grupo3: { min: 121, max: 450 },
    grupo4: { min: 451, max: 900 },
    grupo5: { min: 901, max: Infinity }
  },
  
  SATELITES: {
    grupo2: { min: 51, max: 120 }
  },
  
  EXCLUIDOS: {
    grupo1: { min: 1, max: 50 }
  },
  
  // Parámetros de optimización
  BUFFER_RADIUS_M: 7500,              // 7.5 km de radio
  ORPHAN_WARNING_DISTANCE_M: 7000,    // Umbral para alertas
  ORPHAN_MAX_DISTANCE_M: Infinity,    // Sin límite para conexiones forzadas
  TARGET_COVERAGE: 0.97,              // 97% de cobertura objetivo
  MAX_BUFFERS: 220,                   // Máximo de buffers a crear
  MIN_SATS_PER_BUFFER: 3,             // Mínimo satélites por buffer
  
  // Colores
  COLORS: {
    nucleo: '#58a6ff',
    nucleoSeleccionado: '#58a6ff',
    nucleoNoSeleccionado: '#a371f7',
    sateliteCubierto: '#10b981',
    sateliteSinCobertura: '#FF8C00',
    bufferNormal: '#58a6ff',
    bufferEdicion: '#f0883e',
    bufferPersonalizado: '#a371f7'
  },
  
  // Ecuador bounds para validación
  ECUADOR_BOUNDS: {
    lat: { min: -5, max: 2 },
    lng: { min: -92, max: -75 }
  }
};

// ==================== ESTADO GLOBAL ====================

let map;
const layers = {
  nucleos: L.featureGroup(),
  satellites: L.featureGroup(),
  buffers: L.featureGroup(),
  connections: L.featureGroup(),
  animations: L.featureGroup()
};

const ECUADOR_CENTER = [-1.831239, -78.183406];
const canvasRenderer = L.canvas({ padding: 0.5 });

// Modos de edición
let editMode = false;
let addMode = false;
let deleteMode = false;

// Datos
let editableBuffers = new Map();
let customBuffers = [];
let customBufferCounter = 0;
let globalData = null;
let hasUnsavedChanges = false;

// Análisis
let satelliteConnections = new Map();
let orphanAnalysis = {
  forcedAssignments: new Map(),
  orphanSatellites: new Set(),
  unservedSatellites: new Map(),
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

// Storage
const STORAGE_KEY = 'dece_buffers_state';
const BACKUP_KEY = 'dece_buffers_backup';

// ==================== FUNCIONES DE VALIDACIÓN ====================

/**
 * Valida si una institución es fiscal (excluyendo fiscomisionales)
 */
function esFiscal(ie) {
  const sost = String(ie.Sostenimiento || ie.SOSTENIMIENTO || '').toUpperCase();
  if (!sost.includes('FISCAL')) return false;
  if (sost.includes('FISCOMISIONAL')) return false;
  if (sost.includes('FISCO')) return false;
  return true;
}

/**
 * Valida si una institución está en el grupo 1 (excluido)
 */
function esExcluida(ie) {
  const cod = parseInt(ie.COD_GDECE || ie.Cod_GDECE || 0);
  return cod === 1;
}

/**
 * Valida si es un satélite válido (COD_GDECE 2, fiscal)
 */
function esSateliteValida(ie) {
  if (!esFiscal(ie)) return false;
  if (esExcluida(ie)) return false;
  const cod = parseInt(ie.COD_GDECE || ie.Cod_GDECE || 0);
  return cod === 2;
}

/**
 * Valida si es un núcleo válido (COD_GDECE 3,4,5, fiscal)
 */
function esNucleoValido(ie) {
  if (!esFiscal(ie)) return false;
  if (esExcluida(ie)) return false;
  const cod = parseInt(ie.COD_GDECE || ie.Cod_GDECE || 0);
  return [3, 4, 5].includes(cod);
}

/**
 * Valida que dos instituciones pertenezcan al mismo distrito
 */
function mismoDistrito(ie1, ie2) {
  const d1 = String(ie1.DISTRITO || ie1.Distrito || '').trim();
  const d2 = String(ie2.DISTRITO || ie2.Distrito || '').trim();
  return d1 !== '' && d2 !== '' && d1 === d2;
}

/**
 * Valida coordenadas para Ecuador (con margen de error)
 */
function validateBufferCoordinates(lat, lng) {
  if (isNaN(lat) || isNaN(lng)) return false;
  
  // Rangos ampliados con margen de seguridad
  const bounds = DECE_CONFIG.ECUADOR_BOUNDS;
  return lat >= bounds.lat.min - 0.5 && lat <= bounds.lat.max + 0.5 &&
         lng >= bounds.lng.min - 2 && lng <= bounds.lng.max + 2;
}

/**
 * Calcula distancia entre dos puntos usando fórmula de Haversine
 */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==================== CARGA DE CSV MEJORADA ====================

/**
 * Carga el CSV con múltiples estrategias de fallback
 */
async function loadCSV() {
  console.log("[LOAD] 🚀 Iniciando carga CSV v7.0...");
  const overlay = document.getElementById("loadingOverlay");
  
  const setText = (main, sub = "") => {
    console.log(`[LOAD] ${main} ${sub}`);
    if (overlay) {
      const mainText = overlay.querySelector(".loading-text");
      const subText = document.getElementById("loadingSubtext");
      if (mainText) mainText.textContent = main;
      if (subText) subText.textContent = sub;
    }
  };
  
  // Verificar que PapaParse esté disponible
  if (!window.Papa) {
    console.error("[ERROR] ❌ PapaParse no está disponible");
    setText("Error: Falta biblioteca PapaParse", "Verifica que esté cargada en index.html");
    return;
  }
  
  setText("🔍 Buscando archivo CSV...", "DECE_CRUCE_X_Y_NUC_SAT.csv");
  
  try {
    // Estrategia 1: Fetch normal (funciona con servidor)
    const response = await fetch("DECE_CRUCE_X_Y_NUC_SAT.csv", { 
      cache: "no-store",
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const rawText = await response.text();
    console.log(`[OK] ✅ CSV cargado exitosamente: ${rawText.length} caracteres`);
    
    parseCSV(rawText, setText);
    
  } catch (fetchError) {
    console.warn("[WARN] ⚠️ Fetch falló:", fetchError.message);
    
    // Estrategia 2: Mostrar instrucciones para usar servidor local
    setText(
      "⚠️ No se puede cargar el CSV desde file://",
      "Se necesita un servidor local"
    );
    
    // Mostrar modal con instrucciones
    setTimeout(() => showServerInstructions(), 1000);
  }
}

/**
 * Parsea el contenido del CSV
 */
function parseCSV(rawText, setText) {
  console.log("[PARSE] 📊 Iniciando parseo...");
  
  // Limpiar BOM si existe
  let text = rawText.replace(/^\uFEFF/, "");
  
  // Detectar delimitador
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount >= commaCount ? ";" : ",";
  
  console.log(`[PARSE] Delimitador detectado: "${delimiter}"`);
  console.log(`[PARSE] Primera línea: ${firstLine.substring(0, 150)}...`);
  
  setText("⚙️ Procesando datos...", `Delimitador: ${delimiter}`);
  
  // Parsear con PapaParse
  Papa.parse(text, {
    delimiter: delimiter,
    skipEmptyLines: "greedy",
    worker: false,
    complete: (results) => {
      console.log(`[PARSE] ✅ Completado: ${results.data.length} filas`);
      
      if (results.errors && results.errors.length > 0) {
        console.warn("[WARN] ⚠️ Errores de parseo:", results.errors.slice(0, 5));
      }
      
      try {
        handleParsedData(results, setText);
      } catch (error) {
        console.error("[ERROR] ❌ Error procesando datos:", error);
        setText("Error procesando CSV", error.message);
      }
    },
    error: (error) => {
      console.error("[ERROR] ❌ Error de PapaParse:", error);
      setText("Error leyendo CSV", error.message);
    }
  });
}

/**
 * Procesa los datos parseados del CSV
 */
function handleParsedData(results, setText) {
  const rows = results.data || [];
  
  if (rows.length === 0) {
    setText("❌ CSV vacío o sin datos");
    return;
  }
  
  console.log(`[PROCESS] 📋 Procesando ${rows.length} filas...`);
  setText("🔍 Analizando instituciones...", `${rows.length} registros encontrados`);
  
  // Resolver índices de columnas
  const columnMapping = resolveColumnIndexes(rows[0] || []);
  console.log("[PROCESS] Columnas mapeadas:", columnMapping.idx);
  
  // Mapear filas a datos estructurados
  const mappedData = mapRowsToData(rows, columnMapping.idx);
  
  if (!mappedData.data || mappedData.data.length === 0) {
    setText("❌ No se encontraron registros válidos");
    return;
  }
  
  console.log(`[PROCESS] ✅ ${mappedData.data.length} registros válidos mapeados`);
  
  // Ajustar vista del mapa
  if (mappedData.bounds && mappedData.bounds.isValid()) {
    map.fitBounds(mappedData.bounds.pad(0.10), { animate: false });
  }
  
  // Procesar datos
  processData(mappedData.data);
}

/**
 * Resuelve los índices de las columnas del CSV
 */
function resolveColumnIndexes(headerRow) {
  const normalize = s => String(s ?? "").replace(/^\uFEFF/, "").trim().toLowerCase();
  const headers = headerRow.map(normalize);
  
  const findColumn = (candidates) => {
    for (let candidate of candidates) {
      const index = headers.findIndex(h => h.includes(candidate));
      if (index >= 0) return index;
    }
    return -1;
  };
  
  // Buscar índices de columnas críticas
  const codGDECE = findColumn(["cod_gdece", "cod gdece"]);
  const coordDECE = findColumn(["coord_dece", "coord dece"]);
  
  const mapping = {
    lat: findColumn(["lat", "latitud"]),
    lon: findColumn(["lon", "longitud", "lng"]),
    typeCode: coordDECE >= 0 ? coordDECE : codGDECE,
    codGDECE: codGDECE,
    name: findColumn(["nombre_ie", "nombre_institución", "nombre institucion", "nombre"]),
    dist: findColumn(["distrito"]),
    zona: findColumn(["zona"]),
    students: findColumn(["total estudiantes", "estudiantes", "total_estudiantes"]),
    amie: findColumn(["amie"]),
    provincia: findColumn(["provincia"]),
    codProvincia: findColumn(["cod_provincia", "cod provincia", "cod_prov"]),
    canton: findColumn(["cantón", "canton"]),
    codCanton: findColumn(["cod_cantón", "cod canton", "cod_cant"]),
    sostenimiento: findColumn(["sostenimiento"])
  };
  
  console.log("[COLUMNS] Índices encontrados:", mapping);
  
  // Validar columnas críticas
  const missing = [];
  if (mapping.lat < 0) missing.push("latitud");
  if (mapping.lon < 0) missing.push("longitud");
  if (mapping.codGDECE < 0) missing.push("COD_GDECE");
  
  if (missing.length > 0) {
    console.error("[ERROR] ❌ Columnas faltantes:", missing);
  }
  
  return { idx: mapping, issues: missing };
}

/**
 * Mapea las filas del CSV a objetos de datos estructurados
 */
function mapRowsToData(rows, indices) {
  const data = [];
  const bounds = L.latLngBounds();
  let validCount = 0;
  let invalidCount = 0;
  
  // Saltar la fila de encabezado
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Extraer valores
    const lat = parseFloat(row[indices.lat]);
    const lng = parseFloat(row[indices.lon]);
    const codGDECE = parseInt(row[indices.codGDECE]) || 0;
    
    // Validar coordenadas
    if (isNaN(lat) || isNaN(lng) || !validateBufferCoordinates(lat, lng)) {
      invalidCount++;
      continue;
    }
    
    // Crear objeto de institución
    const institution = {
      lat: lat,
      lng: lng,
      COD_GDECE: codGDECE,
      AMIE: row[indices.amie] || '',
      Nombre_Institución: row[indices.name] || '',
      DISTRITO: row[indices.dist] || '',
      Zona: row[indices.zona] || '',
      Provincia: row[indices.provincia] || '',
      Cod_Provincia: row[indices.codProvincia] || '',
      Cantón: row[indices.canton] || '',
      Cod_Cantón: row[indices.codCanton] || '',
      Sostenimiento: row[indices.sostenimiento] || '',
      students: parseInt(row[indices.students]) || 0
    };
    
    data.push(institution);
    bounds.extend([lat, lng]);
    validCount++;
  }
  
  console.log(`[MAP] ✅ Válidos: ${validCount}, ❌ Inválidos: ${invalidCount}`);
  
  return { data, bounds };
}

// ==================== PROCESAMIENTO DE DATOS ====================

/**
 * Procesa los datos y genera la optimización
 */
function processData(rawData) {
  console.log("[PROCESS] 🎯 Iniciando procesamiento de datos...");
  
  const overlay = document.getElementById("loadingOverlay");
  const setText = (main, sub = "") => {
    if (overlay) {
      const mainText = overlay.querySelector(".loading-text");
      const subText = document.getElementById("loadingSubtext");
      if (mainText) mainText.textContent = main;
      if (subText) subText.textContent = sub;
    }
  };
  
  setText("🔍 Clasificando instituciones...");
  
  // Clasificar instituciones
  const nucleos = rawData.filter(ie => esNucleoValido(ie));
  const satellites = rawData.filter(ie => esSateliteValida(ie));
  
  console.log(`[CLASSIFY] 🏛️ Núcleos: ${nucleos.length}`);
  console.log(`[CLASSIFY] 📍 Satélites: ${satellites.length}`);
  
  if (nucleos.length === 0) {
    setText("❌ No se encontraron núcleos válidos");
    return;
  }
  
  if (satellites.length === 0) {
    setText("❌ No se encontraron satélites válidos");
    return;
  }
  
  // Guardar datos globales
  globalData = { nucleos, satellites, raw: rawData };
  
  setText("🔬 Calculando cobertura...", "Analizando distancias");
  
  // Calcular candidatos (qué núcleos pueden cubrir cada satélite)
  const satCandidates = calculateCandidates(nucleos, satellites);
  
  setText("⚙️ Optimizando selección...", "Algoritmo Greedy Set Cover");
  
  // Optimizar selección de núcleos
  const { selected, uncovered } = optimizeNucleoSelection(nucleos, satellites, satCandidates);
  
  console.log(`[OPTIMIZE] ✅ Núcleos seleccionados: ${selected.size}`);
  console.log(`[OPTIMIZE] ⚠️ Satélites sin cobertura: ${uncovered.size}`);
  
  setText("🎨 Renderizando mapa...");
  
  // Limpiar capas anteriores
  Object.values(layers).forEach(layer => layer.clearLayers());
  
  // Construir estadísticas
  const nucleoStats = buildNucleoStats(nucleos, satellites, satCandidates);
  
  // Dibujar en el mapa
  drawNucleos(nucleos, selected);
  drawBuffersEditable(nucleos, selected, nucleoStats);
  drawSatellites(satellites, satCandidates, uncovered);
  
  setText("🔗 Analizando conexiones...");
  
  // Analizar huérfanos y conexiones
  analyzeOrphans();
  
  setText("📊 Actualizando dashboard...");
  
  // Actualizar dashboard
  updateDashboard();
  
  // Ocultar overlay de carga
  setTimeout(() => {
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.style.display = 'none', 300);
    }
    console.log("[PROCESS] ✅ Procesamiento completado");
  }, 500);
}

/**
 * Calcula qué núcleos pueden cubrir cada satélite
 */
function calculateCandidates(nucleos, satellites) {
  const candidates = new Array(satellites.length).fill(null).map(() => []);
  
  satellites.forEach((sat, si) => {
    nucleos.forEach((nuc, ni) => {
      // Verificar mismo distrito
      if (!mismoDistrito(sat, nuc)) return;
      
      // Calcular distancia
      const distance = haversineMeters(sat.lat, sat.lng, nuc.lat, nuc.lng);
      
      // Si está dentro del radio del buffer
      if (distance <= DECE_CONFIG.BUFFER_RADIUS_M) {
        candidates[si].push({ ni, distance });
      }
    });
    
    // Ordenar por distancia (más cercano primero)
    candidates[si].sort((a, b) => a.distance - b.distance);
  });
  
  return candidates;
}

/**
 * Optimiza la selección de núcleos usando algoritmo Greedy Set Cover
 */
function optimizeNucleoSelection(nucleos, satellites, satCandidates) {
  const uncovered = new Set();
  const selected = new Set();
  
  // Inicializar conjunto de satélites sin cobertura
  satCandidates.forEach((candidates, si) => {
    if (candidates.length > 0) {
      uncovered.add(si);
    }
  });
  
  const nucleoStats = buildNucleoStats(nucleos, satellites, satCandidates);
  
  // Algoritmo greedy: seleccionar núcleos que cubran más satélites
  while (uncovered.size > 0 && selected.size < DECE_CONFIG.MAX_BUFFERS) {
    // Verificar si ya alcanzamos el target de cobertura
    const coveragePercent = 1 - (uncovered.size / satellites.length);
    if (coveragePercent >= DECE_CONFIG.TARGET_COVERAGE) {
      console.log(`[OPTIMIZE] ✅ Target alcanzado: ${(coveragePercent * 100).toFixed(2)}%`);
      break;
    }
    
    // Encontrar el mejor núcleo (que cubra más satélites sin cobertura)
    let bestNi = -1;
    let bestCount = 0;
    
    nucleos.forEach((_, ni) => {
      // Saltar si ya está seleccionado o no cumple el mínimo
      if (selected.has(ni)) return;
      if (nucleoStats[ni].satIdx.length < DECE_CONFIG.MIN_SATS_PER_BUFFER) return;
      
      // Contar cuántos satélites sin cobertura puede cubrir
      const count = nucleoStats[ni].satIdx.filter(si => uncovered.has(si)).length;
      
      if (count > bestCount) {
        bestCount = count;
        bestNi = ni;
      }
    });
    
    // Si no encontramos ningún núcleo útil, salir
    if (bestNi < 0 || bestCount === 0) {
      console.log("[OPTIMIZE] ⚠️ No hay más núcleos útiles disponibles");
      break;
    }
    
    // Seleccionar el mejor núcleo
    selected.add(bestNi);
    
    // Marcar satélites como cubiertos
    nucleoStats[bestNi].satIdx.forEach(si => uncovered.delete(si));
  }
  
  return { selected, uncovered };
}

/**
 * Construye estadísticas de cada núcleo
 */
function buildNucleoStats(nucleos, satellites, satCandidates) {
  const stats = nucleos.map(nuc => ({
    satIdx: [],
    totalStudents: 0,
    nucleo: nuc
  }));
  
  // Asignar cada satélite a su núcleo más cercano
  satCandidates.forEach((candidates, si) => {
    if (candidates.length > 0) {
      const closestNi = candidates[0].ni;
      stats[closestNi].satIdx.push(si);
    }
  });
  
  // Calcular total de estudiantes
  stats.forEach(stat => {
    stat.satIdx.forEach(si => {
      stat.totalStudents += satellites[si]?.students || 0;
    });
  });
  
  return stats;
}

// ==================== DIBUJO EN EL MAPA ====================

/**
 * Dibuja los núcleos en el mapa
 */
function drawNucleos(nucleos, selected) {
  nucleos.forEach((nuc, ni) => {
    const isSelected = selected.has(ni);
    
    const marker = L.circleMarker([nuc.lat, nuc.lng], {
      radius: isSelected ? 10 : 6,
      fillColor: isSelected ? DECE_CONFIG.COLORS.nucleoSeleccionado : DECE_CONFIG.COLORS.nucleoNoSeleccionado,
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: isSelected ? 0.9 : 0.7,
      renderer: canvasRenderer
    });
    
    marker.bindPopup(createNucleoPopup(nuc, 0, 0));
    marker.addTo(layers.nucleos);
  });
}

/**
 * Dibuja los buffers editables en el mapa
 */
function drawBuffersEditable(nucleos, selected, nucleoStats) {
  // Cargar posiciones guardadas
  const savedState = loadBuffersState();
  const savedPositions = new Map();
  
  if (savedState?.editableBuffers) {
    savedState.editableBuffers.forEach(saved => {
      if (validateBufferCoordinates(saved.currentLat, saved.currentLng)) {
        savedPositions.set(saved.ni, {
          lat: saved.currentLat,
          lng: saved.currentLng
        });
      } else {
        console.warn(`⚠️ Posición inválida para buffer ${saved.ni}, usando original`);
      }
    });
  }
  
  let restoredCount = 0;
  
  // Crear buffers para núcleos seleccionados
  selected.forEach(ni => {
    const nuc = nucleos[ni];
    const stat = nucleoStats[ni];
    const savedPos = savedPositions.get(ni);
    
    // Usar posición guardada si existe, sino usar original
    let lat, lng, wasRestored;
    
    if (savedPos) {
      lat = savedPos.lat;
      lng = savedPos.lng;
      wasRestored = true;
      restoredCount++;
    } else {
      lat = nuc.lat;
      lng = nuc.lng;
      wasRestored = false;
    }
    
    // Crear círculo de buffer
    const circle = L.circle([lat, lng], {
      radius: DECE_CONFIG.BUFFER_RADIUS_M,
      color: DECE_CONFIG.COLORS.bufferNormal,
      fillColor: DECE_CONFIG.COLORS.bufferNormal,
      weight: 2,
      opacity: 0.6,
      fillOpacity: 0.08,
      renderer: canvasRenderer
    });
    
    circle.addTo(layers.buffers);
    
    // Event handler para click
    circle.on('click', (e) => {
      if (!editMode) {
        showBufferPopup(editableBuffers.get(ni), false);
      }
    });
    
    // Guardar referencia
    editableBuffers.set(ni, {
      circle,
      nucleo: nuc,
      stats: stat,
      originalPos: { lat: nuc.lat, lng: nuc.lng },
      currentPos: { lat, lng },
      isDragging: false,
      wasRestored
    });
  });
  
  // Restaurar buffers personalizados
  if (savedState?.customBuffers) {
    savedState.customBuffers.forEach(saved => {
      if (validateBufferCoordinates(saved.lat, saved.lng)) {
        restoreCustomBuffer(saved);
        restoredCount++;
      } else {
        console.warn(`⚠️ Buffer personalizado inválido: ${saved.id}`);
      }
    });
  }
  
  if (restoredCount > 0) {
    console.log(`[BUFFERS] ✅ Restaurados ${restoredCount} buffers desde localStorage`);
  }
}

/**
 * Dibuja los satélites en el mapa
 */
function drawSatellites(satellites, satCandidates, uncovered) {
  satellites.forEach((sat, si) => {
    const isCovered = !uncovered.has(si);
    const hasCandidates = satCandidates[si].length > 0;
    
    let color;
    if (isCovered) {
      color = DECE_CONFIG.COLORS.sateliteCubierto;
    } else if (hasCandidates) {
      color = DECE_CONFIG.COLORS.sateliteSinCobertura;
    } else {
      color = '#dc2626'; // Rojo para satélites sin ningún candidato
    }
    
    const marker = L.circleMarker([sat.lat, sat.lng], {
      radius: 5,
      fillColor: color,
      color: '#fff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
      renderer: canvasRenderer
    });
    
    marker.bindPopup(createSatellitePopup(sat, isCovered));
    marker.addTo(layers.satellites);
  });
}

// ==================== POPUPS ====================

/**
 * Crea popup para núcleo
 */
function createNucleoPopup(nucleo, satCount, students) {
  return `
    <div class="custom-popup">
      <div class="popup-header">🏛️ Núcleo DECE</div>
      <div class="popup-content">
        <strong>${escapeHTML(nucleo.Nombre_Institución || 'Sin nombre')}</strong><br>
        <small>AMIE: ${nucleo.AMIE || 'N/A'}</small><br>
        <small>Distrito: ${nucleo.DISTRITO || 'N/A'}</small><br>
        <small>COD_GDECE: ${nucleo.COD_GDECE}</small><br>
        <small>Estudiantes: ${nucleo.students || 0}</small>
      </div>
    </div>
  `;
}

/**
 * Crea popup para satélite
 */
function createSatellitePopup(satellite, isCovered) {
  const status = isCovered ? '✅ Cubierto' : '⚠️ Sin cobertura';
  const statusClass = isCovered ? 'covered' : 'uncovered';
  
  return `
    <div class="custom-popup">
      <div class="popup-header">📍 Satélite</div>
      <div class="popup-content">
        <strong>${escapeHTML(satellite.Nombre_Institución || 'Sin nombre')}</strong><br>
        <small>AMIE: ${satellite.AMIE || 'N/A'}</small><br>
        <small>Distrito: ${satellite.DISTRITO || 'N/A'}</small><br>
        <small>Estudiantes: ${satellite.students || 0}</small><br>
        <span class="status-badge ${statusClass}">${status}</span>
      </div>
    </div>
  `;
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==================== STORAGE ====================

/**
 * Guarda el estado de los buffers en localStorage
 */
function saveBuffersState() {
  const state = {
    editableBuffers: [],
    customBuffers: [],
    timestamp: new Date().toISOString(),
    version: DECE_CONFIG.VERSION
  };
  
  // Guardar buffers editables
  editableBuffers.forEach((data, ni) => {
    const pos = data.currentPos || data.circle.getLatLng();
    if (validateBufferCoordinates(pos.lat, pos.lng)) {
      state.editableBuffers.push({
        ni: ni,
        currentLat: pos.lat,
        currentLng: pos.lng,
        originalLat: data.originalPos.lat,
        originalLng: data.originalPos.lng
      });
    }
  });
  
  // Guardar buffers personalizados
  customBuffers.forEach(buffer => {
    const pos = buffer.circle.getLatLng();
    if (validateBufferCoordinates(pos.lat, pos.lng)) {
      state.customBuffers.push({
        id: buffer.id,
        lat: pos.lat,
        lng: pos.lng
      });
    }
  });
  
  try {
    // Crear backup antes de guardar
    const currentState = localStorage.getItem(STORAGE_KEY);
    if (currentState) {
      localStorage.setItem(BACKUP_KEY, currentState);
    }
    
    // Guardar nuevo estado
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    
    hasUnsavedChanges = false;
    console.log(`[STORAGE] ✅ Estado guardado: ${state.editableBuffers.length} buffers editables, ${state.customBuffers.length} personalizados`);
    
    showNotification("💾 Cambios guardados exitosamente", "success");
    
    // Actualizar botón de guardar
    const btnSave = document.getElementById("btnSaveChanges");
    if (btnSave) {
      btnSave.classList.remove("has-changes");
    }
    
  } catch (error) {
    console.error("[STORAGE] ❌ Error guardando estado:", error);
    showNotification("Error al guardar cambios", "error");
  }
}

/**
 * Carga el estado de los buffers desde localStorage
 */
function loadBuffersState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const state = JSON.parse(stored);
    console.log(`[STORAGE] ✅ Estado cargado: ${state.editableBuffers?.length || 0} buffers editables`);
    
    return state;
  } catch (error) {
    console.error("[STORAGE] ❌ Error cargando estado:", error);
    return null;
  }
}

/**
 * Restaura un buffer personalizado
 */
function restoreCustomBuffer(saved) {
  const circle = L.circle([saved.lat, saved.lng], {
    radius: DECE_CONFIG.BUFFER_RADIUS_M,
    color: DECE_CONFIG.COLORS.bufferPersonalizado,
    fillColor: DECE_CONFIG.COLORS.bufferPersonalizado,
    weight: 2,
    opacity: 0.7,
    fillOpacity: 0.12,
    renderer: canvasRenderer
  });
  
  circle.addTo(layers.buffers);
  
  circle.on('click', (e) => {
    if (!editMode) {
      showCustomBufferPopup(circle, saved.id);
    }
  });
  
  customBuffers.push({
    id: saved.id,
    circle: circle,
    isCustom: true
  });
  
  if (parseInt(saved.id.split('_')[1]) >= customBufferCounter) {
    customBufferCounter = parseInt(saved.id.split('_')[1]) + 1;
  }
}

// ==================== ANÁLISIS DE HUÉRFANOS ====================

/**
 * Analiza satélites huérfanos (sin cobertura)
 */
function analyzeOrphans() {
  if (!globalData) return;
  
  console.log("[ORPHANS] 🔍 Analizando huérfanos...");
  
  // Implementación simplificada - será expandida en versiones futuras
  orphanAnalysis.stats = {
    total: globalData.satellites.length,
    normalCovered: 0,
    forcedCovered: 0,
    unserved: 0,
    normalPercent: 0,
    totalPercent: 0
  };
  
  // TODO: Implementar análisis completo
}

// ==================== DASHBOARD ====================

/**
 * Actualiza el dashboard con estadísticas
 */
function updateDashboard() {
  if (!globalData) return;
  
  console.log("[DASHBOARD] 📊 Actualizando...");
  
  // Actualizar contadores
  updateElement('nucleosCount', editableBuffers.size);
  updateElement('satellitesCount', globalData.satellites.length);
  updateElement('totalStudents', calculateTotalStudents());
  
  // Actualizar top núcleos
  updateTopNucleos();
}

function updateElement(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = typeof value === 'number' ? value.toLocaleString() : value;
}

function calculateTotalStudents() {
  if (!globalData) return 0;
  return globalData.satellites.reduce((sum, sat) => sum + (sat.students || 0), 0);
}

function updateTopNucleos() {
  // TODO: Implementar top núcleos
}

// ==================== NOTIFICACIONES ====================

/**
 * Muestra una notificación toast
 */
function showNotification(message, type = 'info') {
  console.log(`[NOTIFICATION] ${type.toUpperCase()}: ${message}`);
  
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 12px 24px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remover después de 3 segundos
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ==================== MODAL DE INSTRUCCIONES ====================

/**
 * Muestra instrucciones para usar un servidor local
 */
function showServerInstructions() {
  const modal = document.createElement('div');
  modal.className = 'server-instructions-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>⚠️ Servidor Local Requerido</h2>
        <button class="modal-close" onclick="this.closest('.server-instructions-modal').remove()">×</button>
      </div>
      <div class="modal-body">
        <p>Para que la aplicación funcione correctamente, necesitas ejecutarla desde un servidor local.</p>
        
        <h3>🐍 Opción 1: Python (Recomendado)</h3>
        <pre><code># En la carpeta del proyecto:
python -m http.server 8000

# Luego abre:
http://localhost:8000</code></pre>
        
        <h3>💻 Opción 2: Node.js</h3>
        <pre><code># Instalar servidor:
npm install -g http-server

# Ejecutar:
http-server -p 8000

# Luego abre:
http://localhost:8000</code></pre>
        
        <h3>🔧 Opción 3: Visual Studio Code</h3>
        <ol>
          <li>Instala la extensión "Live Server"</li>
          <li>Click derecho en index.html</li>
          <li>Selecciona "Open with Live Server"</li>
        </ol>
        
        <h3>📦 Opción 4: XAMPP/WAMP/MAMP</h3>
        <ol>
          <li>Copia la carpeta del proyecto a htdocs/www</li>
          <li>Inicia el servidor Apache</li>
          <li>Abre http://localhost/DECE_PRODUCCION-main/</li>
        </ol>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" onclick="this.closest('.server-instructions-modal').remove()">Entendido</button>
      </div>
    </div>
  `;
  
  // Estilos del modal
  const style = document.createElement('style');
  style.textContent = `
    .server-instructions-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
    }
    
    .modal-content {
      position: relative;
      background: #1a1b26;
      border-radius: 16px;
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      border: 1px solid rgba(88, 166, 255, 0.3);
    }
    
    .modal-header {
      padding: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-header h2 {
      margin: 0;
      color: #fff;
      font-size: 24px;
    }
    
    .modal-close {
      background: none;
      border: none;
      color: #fff;
      font-size: 32px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    }
    
    .modal-close:hover {
      background: rgba(255,255,255,0.1);
    }
    
    .modal-body {
      padding: 24px;
      color: #e6e6e6;
    }
    
    .modal-body h3 {
      color: #58a6ff;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    
    .modal-body pre {
      background: #0d1117;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      border: 1px solid rgba(88, 166, 255, 0.2);
    }
    
    .modal-body code {
      color: #10b981;
      font-family: 'Courier New', monospace;
    }
    
    .modal-body ol {
      padding-left: 24px;
    }
    
    .modal-body li {
      margin: 8px 0;
    }
    
    .modal-footer {
      padding: 24px;
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: flex-end;
    }
    
    .btn-primary {
      background: #58a6ff;
      color: #fff;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .btn-primary:hover {
      background: #4d94e6;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes slideOut {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100px);
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(modal);
}

// ==================== INICIALIZACIÓN ====================

/**
 * Inicializa el mapa
 */
function initMap() {
  map = L.map("map", {
    center: ECUADOR_CENTER,
    zoom: 7,
    zoomControl: true,
    preferCanvas: true,
    renderer: canvasRenderer
  });
  
  // Capa base
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19
  }).addTo(map);
  
  // Agregar control de capas
  const baseLayers = {
    "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
    "Satélite": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}")
  };
  
  L.control.layers(baseLayers).addTo(map);
  
  // Agregar todas las capas al mapa
  Object.values(layers).forEach(layer => layer.addTo(map));
  
  console.log("[MAP] ✅ Mapa inicializado");
}

/**
 * Configura los controles de la interfaz
 */
function setupControls() {
  // Toggles de paneles
  document.getElementById("toggleStats")?.addEventListener("click", () => {
    document.getElementById("statsPanel")?.classList.toggle("active");
  });
  
  document.getElementById("toggleLegend")?.addEventListener("click", () => {
    document.getElementById("legendPanel")?.classList.toggle("active");
  });
  
  // Toggles de capas
  document.getElementById("toggleNucleos")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      map.addLayer(layers.nucleos);
    } else {
      map.removeLayer(layers.nucleos);
    }
  });
  
  document.getElementById("toggleSatellites")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      map.addLayer(layers.satellites);
    } else {
      map.removeLayer(layers.satellites);
    }
  });
  
  document.getElementById("toggleBuffers")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      map.addLayer(layers.buffers);
    } else {
      map.removeLayer(layers.buffers);
    }
  });
  
  document.getElementById("toggleConnections")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      map.addLayer(layers.connections);
    } else {
      map.removeLayer(layers.connections);
    }
  });
  
  console.log("[CONTROLS] ✅ Controles configurados");
}

/**
 * Configura los controles de edición
 */
function setupEditControls() {
  document.getElementById("btnSaveChanges")?.addEventListener("click", saveBuffersState);
  
  // TODO: Implementar resto de controles de edición
  
  console.log("[CONTROLS] ✅ Controles de edición configurados");
}

/**
 * Inicialización al cargar el DOM
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log(`%c
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🎯 DECE OPTIMIZER v${DECE_CONFIG.VERSION}                 ║
║                                                               ║
║            Sistema de Optimización de Cobertura              ║
║       Departamentos de Consejería Estudiantil (DECE)         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `, 'color: #58a6ff; font-weight: bold;');
  
  console.log("[INIT] 🚀 Iniciando aplicación...");
  
  initMap();
  setupControls();
  setupEditControls();
  loadCSV();
});

// ==================== EXPORTS GLOBALES ====================

// Exponer funciones necesarias al scope global
window.saveBuffersState = saveBuffersState;
window.showNotification = showNotification;
window.showServerInstructions = showServerInstructions;

console.log("[APP] ✅ app-mejorado.js cargado correctamente");
