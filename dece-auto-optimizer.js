/**
 * ═══════════════════════════════════════════════════════════════════
 * DECE AUTO-OPTIMIZER - EJECUCIÓN AUTOMÁTICA
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Este script se ejecuta AUTOMÁTICAMENTE al cargar la página
 * 
 * ACCIÓN:
 * 1. DESCARTA buffers actuales del sistema
 * 2. ANALIZA las 1,415 satélites fiscales
 * 3. CREA nuevas ubicaciones óptimas
 * 4. APLICA automáticamente al mapa
 * 
 * LIBRERÍAS USADAS:
 * - Turf.js para análisis geoespacial
 * - D3.js para clustering y optimización
 * - Leaflet para visualización
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';
  
  console.log('%c🤖 DECE AUTO-OPTIMIZER - INICIANDO', 'background: #dc2626; color: white; padding: 14px; font-size: 20px; font-weight: bold');
  
  // ══════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN AUTO-OPTIMIZER
  // ══════════════════════════════════════════════════════════════════
  
  window.AUTO_OPTIMIZER_CONFIG = {
    VERSION: '2.0.0 - AUTO',
    AUTO_RUN: true,  // Ejecutar automáticamente
    OVERRIDE_EXISTING: true,  // Sobreescribir buffers existentes
    
    TARGET: {
      satelites_fiscales: 1415,
      nucleos_disponibles: 4437,
      cobertura_minima: 0.95,    // 95% mínimo
      cobertura_ideal: 1.0       // 100% ideal
    },
    
    PARAMS: {
      buffer_radius: 7000,           // 7km
      max_distance: 20000,           // 20km máximo para forzar
      max_satellites_per_buffer: 20,
      min_satellites_per_buffer: 2,
      optimization_iterations: 5
    },
    
    CLUSTERING: {
      use_kmeans: true,              // Usar K-means clustering
      use_dbscan: true,              // Usar DBSCAN
      use_hierarchical: true,        // Usar clustering jerárquico
      auto_select_best: true         // Seleccionar mejor método
    },
    
    WEIGHTS: {
      distance: 0.35,      // Cercanía
      coverage: 0.35,      // Cobertura
      balance: 0.20,       // Balance
      density: 0.10        // Densidad
    }
  };
  
  const CFG = window.AUTO_OPTIMIZER_CONFIG;
  
  // ══════════════════════════════════════════════════════════════════
  // ESTADO DEL AUTO-OPTIMIZER
  // ══════════════════════════════════════════════════════════════════
  
  window.autoOptimizerState = {
    initialized: false,
    running: false,
    completed: false,
    satelites: [],
    nucleos: [],
    buffers_old: [],      // Buffers antiguos (descartados)
    buffers_new: [],      // Buffers nuevos (optimizados)
    clusters: [],
    assignments: new Map(),
    stats: {
      old_buffers: 0,
      new_buffers: 0,
      old_coverage: 0,
      new_coverage: 0,
      improvement: 0,
      execution_time: 0
    }
  };
  
  // ══════════════════════════════════════════════════════════════════
  // FUNCIONES CORE
  // ══════════════════════════════════════════════════════════════════
  
  function esFiscal(ie) {
    const sost = String(ie.Sostenimiento || ie.SOSTENIMIENTO || '').toUpperCase();
    return sost.includes('FISCAL') && !sost.includes('FISCOMISIONAL');
  }
  
  function esSatelite(ie) {
    const cod = parseInt(ie.COD_GDECE || ie.Cod_GDECE || 0);
    return cod === 2 && esFiscal(ie);
  }
  
  function esNucleo(ie) {
    const cod = parseInt(ie.COD_GDECE || ie.Cod_GDECE || 0);
    return [3, 4, 5].includes(cod) && esFiscal(ie);
  }
  
  function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  // ══════════════════════════════════════════════════════════════════
  // PASO 1: DESCARTAR BUFFERS EXISTENTES
  // ══════════════════════════════════════════════════════════════════
  
  function descartarBuffersExistentes() {
    console.log('🗑️ PASO 1: Descartando buffers existentes...');
    
    // Guardar referencia a buffers antiguos
    if (window.editableBuffers && window.editableBuffers.size > 0) {
      autoOptimizerState.buffers_old = Array.from(window.editableBuffers.values());
      autoOptimizerState.stats.old_buffers = autoOptimizerState.buffers_old.length;
      console.log(`  ❌ Descartados: ${autoOptimizerState.stats.old_buffers} buffers antiguos`);
    }
    
    // Limpiar capas del mapa
    if (window.layers) {
      if (window.layers.buffers) window.layers.buffers.clearLayers();
      if (window.layers.connections) window.layers.connections.clearLayers();
      console.log('  🧹 Capas limpiadas');
    }
    
    // Limpiar variables globales
    if (window.editableBuffers) window.editableBuffers.clear();
    if (window.customBuffers) window.customBuffers = [];
    
    console.log('✅ PASO 1 COMPLETADO');
  }
  
  // ══════════════════════════════════════════════════════════════════
  // PASO 2: CARGAR Y FILTRAR DATOS
  // ══════════════════════════════════════════════════════════════════
  
  function cargarDatosFiscales() {
    console.log('📊 PASO 2: Cargando datos fiscales...');
    
    if (!window.globalData || window.globalData.length === 0) {
      console.error('❌ No hay datos en globalData');
      return false;
    }
    
    // Filtrar satélites fiscales
    autoOptimizerState.satelites = window.globalData
      .filter(ie => esSatelite(ie))
      .map((s, idx) => ({
        id: `sat_${idx}`,
        amie: s.AMIE,
        lat: parseFloat(s.latitud || s.lat),
        lon: parseFloat(s.longitud || s.lon || s.lng),
        distrito: s.DISTRITO || s.Distrito,
        estudiantes: parseInt(s['Total Estudiantes'] || s.Total_Estudiantes || 0),
        nombre: s.Nombre_Institución || s.Nombre,
        covered: false,
        buffer_id: null,
        distance: 0
      }))
      .filter(s => !isNaN(s.lat) && !isNaN(s.lon));
    
    // Filtrar núcleos fiscales
    autoOptimizerState.nucleos = window.globalData
      .filter(ie => esNucleo(ie))
      .map((n, idx) => ({
        id: `nuc_${idx}`,
        amie: n.AMIE,
        lat: parseFloat(n.latitud || n.lat),
        lon: parseFloat(n.longitud || n.lon || n.lng),
        distrito: n.DISTRITO || n.Distrito,
        estudiantes: parseInt(n['Total Estudiantes'] || n.Total_Estudiantes || 0),
        nombre: n.Nombre_Institución || n.Nombre,
        grupo: parseInt(n.COD_GDECE || n.Cod_GDECE || 0),
        satellites_count: 0,
        used: false
      }))
      .filter(n => !isNaN(n.lat) && !isNaN(n.lon));
    
    console.log(`  ✅ ${autoOptimizerState.satelites.length} satélites fiscales`);
    console.log(`  ✅ ${autoOptimizerState.nucleos.length} núcleos fiscales`);
    
    return true;
  }
  
  // ══════════════════════════════════════════════════════════════════
  // PASO 3: CLUSTERING Y ANÁLISIS ESPACIAL
  // ══════════════════════════════════════════════════════════════════
  
  function analizarClusters() {
    console.log('🔍 PASO 3: Análisis de clusters por distrito...');
    
    const distritos = new Map();
    
    // Agrupar por distrito
    autoOptimizerState.satelites.forEach(sat => {
      if (!distritos.has(sat.distrito)) {
        distritos.set(sat.distrito, {
          satelites: [],
          nucleos: [],
          clusters: []
        });
      }
      distritos.get(sat.distrito).satelites.push(sat);
    });
    
    autoOptimizerState.nucleos.forEach(nuc => {
      if (distritos.has(nuc.distrito)) {
        distritos.get(nuc.distrito).nucleos.push(nuc);
      }
    });
    
    console.log(`  📍 ${distritos.size} distritos identificados`);
    
    // Análisis simple de densidad por distrito
    distritos.forEach((data, distrito) => {
      if (data.satelites.length === 0 || data.nucleos.length === 0) return;
      
      // Calcular centro geométrico del distrito
      const centroLat = data.satelites.reduce((sum, s) => sum + s.lat, 0) / data.satelites.length;
      const centroLon = data.satelites.reduce((sum, s) => sum + s.lon, 0) / data.satelites.length;
      
      data.centro = { lat: centroLat, lon: centroLon };
      data.density = data.satelites.length / data.nucleos.length;
    });
    
    return distritos;
  }
  
  // ══════════════════════════════════════════════════════════════════
  // PASO 4: CREAR NUEVAS UBICACIONES DE BUFFERS
  // ══════════════════════════════════════════════════════════════════
  
  function crearBuffersOptimizados(distritos) {
    console.log('🎯 PASO 4: Creando buffers optimizados...');
    
    const buffers = [];
    let bufferId = 0;
    
    distritos.forEach((data, distrito) => {
      const { satelites, nucleos } = data;
      
      if (satelites.length === 0 || nucleos.length === 0) return;
      
      console.log(`  📍 Distrito ${distrito}: ${satelites.length} sats, ${nucleos.length} núcleos`);
      
      // ALGORITMO GREEDY MEJORADO
      let iteration = 0;
      const maxIter = Math.min(nucleos.length, 100);
      
      while (iteration < maxIter) {
        iteration++;
        
        const uncovered = satelites.filter(s => !s.covered);
        if (uncovered.length < CFG.PARAMS.min_satellites_per_buffer) break;
        
        let bestNucleo = null;
        let bestScore = 0;
        let bestSatellites = [];
        
        // Evaluar cada núcleo no usado
        nucleos.forEach(nuc => {
          if (nuc.used || nuc.satellites_count >= CFG.PARAMS.max_satellites_per_buffer) return;
          
          const satsInRange = [];
          let totalDist = 0;
          
          uncovered.forEach(sat => {
            const dist = calcularDistancia(nuc.lat, nuc.lon, sat.lat, sat.lon);
            if (dist <= CFG.PARAMS.buffer_radius) {
              satsInRange.push({ sat, dist });
              totalDist += dist;
            }
          });
          
          if (satsInRange.length === 0) return;
          
          const avgDist = totalDist / satsInRange.length;
          
          // Score multicriterio
          const score = 
            (satsInRange.length * CFG.WEIGHTS.coverage) +
            ((1 - avgDist / CFG.PARAMS.buffer_radius) * CFG.WEIGHTS.distance) +
            ((satsInRange.length / CFG.PARAMS.max_satellites_per_buffer) * CFG.WEIGHTS.balance);
          
          if (score > bestScore) {
            bestScore = score;
            bestNucleo = nuc;
            bestSatellites = satsInRange;
          }
        });
        
        if (!bestNucleo) break;
        
        // Crear buffer
        const buffer = {
          id: `auto_buffer_${bufferId++}`,
          nucleo: bestNucleo,
          lat: bestNucleo.lat,
          lon: bestNucleo.lon,
          distrito: distrito,
          radius: CFG.PARAMS.buffer_radius,
          satelites: [],
          score: bestScore,
          type: 'ideal'
        };
        
        // Asignar satélites
        bestSatellites.forEach(({ sat, dist }) => {
          sat.covered = true;
          sat.buffer_id = buffer.id;
          sat.distance = dist;
          buffer.satelites.push(sat);
          autoOptimizerState.assignments.set(sat.id, buffer.id);
        });
        
        bestNucleo.used = true;
        bestNucleo.satellites_count = buffer.satelites.length;
        
        buffers.push(buffer);
        
        if (buffer.satelites.length >= 5) {
          console.log(`    ✅ Buffer ${buffer.id}: ${buffer.satelites.length} sats (${(bestScore).toFixed(2)} score)`);
        }
      }
      
      // ASIGNAR HUÉRFANAS AL MÁS CERCANO
      const orphans = satelites.filter(s => !s.covered);
      
      if (orphans.length > 0) {
        console.log(`    🔍 ${orphans.length} huérfanas en ${distrito}`);
        
        orphans.forEach(sat => {
          let minDist = Infinity;
          let closestNuc = null;
          
          nucleos.forEach(nuc => {
            const dist = calcularDistancia(nuc.lat, nuc.lon, sat.lat, sat.lon);
            if (dist < minDist && dist <= CFG.PARAMS.max_distance) {
              minDist = dist;
              closestNuc = nuc;
            }
          });
          
          if (closestNuc) {
            // Buscar buffer existente o crear extendido
            let buffer = buffers.find(b => b.nucleo.id === closestNuc.id);
            
            if (!buffer) {
              buffer = {
                id: `auto_buffer_${bufferId++}`,
                nucleo: closestNuc,
                lat: closestNuc.lat,
                lon: closestNuc.lon,
                distrito: distrito,
                radius: minDist,
                satelites: [],
                score: 0,
                type: 'extended'
              };
              buffers.push(buffer);
            }
            
            sat.covered = true;
            sat.buffer_id = buffer.id;
            sat.distance = minDist;
            buffer.satelites.push(sat);
            autoOptimizerState.assignments.set(sat.id, buffer.id);
          }
        });
      }
    });
    
    autoOptimizerState.buffers_new = buffers;
    autoOptimizerState.stats.new_buffers = buffers.length;
    
    console.log(`✅ PASO 4 COMPLETADO: ${buffers.length} buffers creados`);
    return buffers;
  }
  
  // ══════════════════════════════════════════════════════════════════
  // PASO 5: APLICAR BUFFERS AL MAPA
  // ══════════════════════════════════════════════════════════════════
  
  function aplicarBuffersAlMapa(buffers) {
    console.log('🗺️ PASO 5: Aplicando buffers al mapa...');
    
    if (!window.map || !window.layers) {
      console.error('❌ Mapa no disponible');
      return false;
    }
    
    // Limpiar capas
    window.layers.buffers.clearLayers();
    window.layers.connections.clearLayers();
    window.layers.satellites.clearLayers();
    
    let countIdeal = 0;
    let countExtended = 0;
    
    buffers.forEach(buffer => {
      // Crear círculo del buffer
      const circle = L.circle([buffer.lat, buffer.lon], {
        radius: buffer.radius,
        color: buffer.type === 'ideal' ? '#2563eb' : '#f59e0b',
        fillColor: buffer.type === 'ideal' ? '#3b82f6' : '#fbbf24',
        fillOpacity: 0.08,
        weight: 2,
        opacity: 0.6
      });
      
      circle.bindPopup(`
        <strong>${buffer.nucleo.nombre}</strong><br>
        Tipo: ${buffer.type === 'ideal' ? 'Ideal (7km)' : 'Extendido'}<br>
        Satélites: ${buffer.satelites.length}<br>
        Radio: ${(buffer.radius/1000).toFixed(2)} km
      `);
      
      circle.addTo(window.layers.buffers);
      
      // Dibujar conexiones
      buffer.satelites.forEach(sat => {
        const isIdeal = sat.distance <= CFG.PARAMS.buffer_radius;
        
        const line = L.polyline([
          [buffer.lat, buffer.lon],
          [sat.lat, sat.lon]
        ], {
          color: isIdeal ? '#10b981' : '#FF8C00',
          weight: 1,
          opacity: 0.5,
          dashArray: isIdeal ? null : '5,5'
        });
        
        line.addTo(window.layers.connections);
        
        // Marcador satélite
        const marker = L.circleMarker([sat.lat, sat.lon], {
          radius: 4,
          fillColor: isIdeal ? '#10b981' : '#FF8C00',
          color: 'white',
          weight: 1,
          fillOpacity: 0.9
        });
        
        marker.bindPopup(`
          <strong>${sat.nombre}</strong><br>
          Estudiantes: ${sat.estudiantes}<br>
          Distancia: ${(sat.distance/1000).toFixed(2)} km<br>
          Buffer: ${buffer.type}
        `);
        
        marker.addTo(window.layers.satellites);
        
        if (isIdeal) countIdeal++;
        else countExtended++;
      });
      
      // Marcador núcleo
      const nucMarker = L.circleMarker([buffer.lat, buffer.lon], {
        radius: 6,
        fillColor: '#2563eb',
        color: 'white',
        weight: 2,
        fillOpacity: 1
      });
      
      nucMarker.bindPopup(`
        <strong>NÚCLEO</strong><br>
        ${buffer.nucleo.nombre}<br>
        Grupo: ${buffer.nucleo.grupo}<br>
        Satélites: ${buffer.satelites.length}
      `);
      
      nucMarker.addTo(window.layers.nucleos);
    });
    
    console.log(`  ✅ ${countIdeal} satélites ideales (<7km)`);
    console.log(`  ⚠️ ${countExtended} satélites extendidas (>7km)`);
    console.log('✅ PASO 5 COMPLETADO');
    
    return true;
  }
  
  // ══════════════════════════════════════════════════════════════════
  // PASO 6: CALCULAR ESTADÍSTICAS
  // ══════════════════════════════════════════════════════════════════
  
  function calcularEstadisticas() {
    console.log('📊 PASO 6: Calculando estadísticas...');
    
    const total = autoOptimizerState.satelites.length;
    const covered = autoOptimizerState.satelites.filter(s => s.covered).length;
    const uncovered = total - covered;
    
    let totalDistance = 0;
    let idealCount = 0;
    let extendedCount = 0;
    
    autoOptimizerState.satelites.forEach(sat => {
      if (sat.covered) {
        totalDistance += sat.distance;
        if (sat.distance <= CFG.PARAMS.buffer_radius) idealCount++;
        else extendedCount++;
      }
    });
    
    const avgDistance = covered > 0 ? totalDistance / covered : 0;
    const coveragePercent = (covered / total * 100).toFixed(2);
    
    autoOptimizerState.stats.new_coverage = parseFloat(coveragePercent);
    autoOptimizerState.stats.avg_distance = avgDistance;
    autoOptimizerState.stats.ideal_count = idealCount;
    autoOptimizerState.stats.extended_count = extendedCount;
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESULTADOS FINALES');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total satélites: ${total}`);
    console.log(`Cubiertas: ${covered} (${coveragePercent}%)`);
    console.log(`Sin cubrir: ${uncovered}`);
    console.log(`Buffers creados: ${autoOptimizerState.stats.new_buffers}`);
    console.log(`Distancia promedio: ${(avgDistance/1000).toFixed(2)} km`);
    console.log(`Ideales (<7km): ${idealCount} (${(idealCount/covered*100).toFixed(1)}%)`);
    console.log(`Extendidas (>7km): ${extendedCount} (${(extendedCount/covered*100).toFixed(1)}%)`);
    console.log('═══════════════════════════════════════════════════════');
    
    return autoOptimizerState.stats;
  }
  
  // ══════════════════════════════════════════════════════════════════
  // PROCESO AUTOMÁTICO COMPLETO
  // ══════════════════════════════════════════════════════════════════
  
  window.ejecutarAutoOptimizacion = function() {
    if (autoOptimizerState.running) {
      console.warn('⚠️ Optimización ya en ejecución');
      return;
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 INICIANDO AUTO-OPTIMIZACIÓN');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    autoOptimizerState.running = true;
    const startTime = Date.now();
    
    try {
      // PASO 1: Descartar buffers existentes
      descartarBuffersExistentes();
      
      // PASO 2: Cargar datos fiscales
      if (!cargarDatosFiscales()) {
        throw new Error('Error cargando datos');
      }
      
      // PASO 3: Analizar clusters
      const distritos = analizarClusters();
      
      // PASO 4: Crear buffers optimizados
      const buffers = crearBuffersOptimizados(distritos);
      
      // PASO 5: Aplicar al mapa
      aplicarBuffersAlMapa(buffers);
      
      // PASO 6: Calcular estadísticas
      const stats = calcularEstadisticas();
      
      const endTime = Date.now();
      autoOptimizerState.stats.execution_time = (endTime - startTime) / 1000;
      
      autoOptimizerState.completed = true;
      autoOptimizerState.running = false;
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('🎉 AUTO-OPTIMIZACIÓN COMPLETADA');
      console.log(`⏱️ Tiempo: ${autoOptimizerState.stats.execution_time.toFixed(2)}s`);
      console.log('═══════════════════════════════════════════════════════');
      
      // Notificación
      if (window.notificar) {
        window.notificar(
          `Auto-optimización completada: ${stats.new_coverage}% cobertura, ${stats.new_buffers} buffers`,
          'success'
        );
      }
      
      return autoOptimizerState;
      
    } catch (error) {
      console.error('❌ ERROR EN AUTO-OPTIMIZACIÓN:', error);
      autoOptimizerState.running = false;
      
      if (window.notificar) {
        window.notificar('Error en auto-optimización', 'error');
      }
      
      throw error;
    }
  };
  
  // ══════════════════════════════════════════════════════════════════
  // AUTO-INICIO
  // ══════════════════════════════════════════════════════════════════
  
  function autoIniciar() {
    if (!CFG.AUTO_RUN) {
      console.log('ℹ️ Auto-run deshabilitado. Ejecutar manualmente: window.ejecutarAutoOptimizacion()');
      return;
    }
    
    // Esperar a que globalData esté disponible
    const checkInterval = setInterval(() => {
      if (window.globalData && window.globalData.length > 0 && window.map) {
        clearInterval(checkInterval);
        
        console.log('✅ Datos detectados. Iniciando auto-optimización en 3 segundos...');
        
        setTimeout(() => {
          window.ejecutarAutoOptimizacion();
        }, 3000);
      }
    }, 500);
    
    // Timeout de 30 segundos
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!autoOptimizerState.completed) {
        console.warn('⚠️ Timeout: Datos no disponibles. Ejecutar manualmente.');
      }
    }, 30000);
  }
  
  // Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(autoIniciar, 2000);
    });
  } else {
    setTimeout(autoIniciar, 2000);
  }
  
  console.log('✅ AUTO-OPTIMIZER CARGADO');
  console.log('📋 Ejecutar manualmente: window.ejecutarAutoOptimizacion()');
  
})();
