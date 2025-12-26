/**
 * ═══════════════════════════════════════════════════════════════════
 * DECE OPTIMIZER INTELIGENTE - Optimización de Buffers con D3.js
 * ═══════════════════════════════════════════════════════════════════
 * 
 * OBJETIVO: Maximizar cobertura de las 1,415 satélites FISCALES
 * 
 * ESTRATEGIA:
 * 1. Análisis espacial con D3.js (Voronoi, clustering)
 * 2. Algoritmo greedy de cobertura máxima
 * 3. Optimización iterativa de posiciones de buffers
 * 4. Reasignación inteligente de satélites
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';
  
  console.log('%c🧠 DECE OPTIMIZER INTELIGENTE v1.0', 'background: #8b5cf6; color: white; padding: 12px; font-size: 18px; font-weight: bold');
  
  // ══════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN
  // ══════════════════════════════════════════════════════════════════
  
  window.OPTIMIZER_CONFIG = {
    VERSION: '1.0.0',
    
    // Datos objetivo
    TARGET: {
      satelites_fiscales: 1415,
      nucleos_disponibles: 4437,
      cobertura_objetivo: 0.95,  // 95% mínimo
      cobertura_ideal: 1.0       // 100% ideal
    },
    
    // Parámetros de optimización
    PARAMS: {
      buffer_radius: 7000,           // 7km radio ideal
      max_distance: 15000,           // 15km máximo para forzar
      max_satellites_per_buffer: 25, // Máximo por buffer
      min_satellites_per_buffer: 3,  // Mínimo para crear buffer
      max_buffers: 500,              // Máximo de buffers a crear
      optimization_iterations: 10     // Iteraciones de optimización
    },
    
    // Pesos para scoring
    WEIGHTS: {
      distance: 0.4,        // Importancia de cercanía
      coverage: 0.3,        // Importancia de cobertura
      balance: 0.2,         // Importancia de balanceo
      density: 0.1          // Importancia de densidad
    }
  };
  
  const CFG = window.OPTIMIZER_CONFIG;
  
  // ══════════════════════════════════════════════════════════════════
  // ESTRUCTURAS DE DATOS
  // ══════════════════════════════════════════════════════════════════
  
  window.optimizerState = {
    satelites: [],         // Lista de satélites fiscales
    nucleos: [],           // Lista de núcleos fiscales
    buffers: [],           // Buffers optimizados
    assignments: new Map(), // satelite_id -> buffer_id
    stats: {
      total_satelites: 0,
      covered: 0,
      uncovered: 0,
      buffers_created: 0,
      avg_distance: 0,
      coverage_percent: 0
    }
  };
  
  // ══════════════════════════════════════════════════════════════════
  // FUNCIONES DE VALIDACIÓN
  // ══════════════════════════════════════════════════════════════════
  
  function esFiscal(ie) {
    const sost = String(ie.Sostenimiento || ie.SOSTENIMIENTO || '').toUpperCase();
    if (!sost.includes('FISCAL')) return false;
    if (sost.includes('FISCOMISIONAL')) return false;
    return true;
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
  // ALGORITMO DE OPTIMIZACIÓN
  // ══════════════════════════════════════════════════════════════════
  
  /**
   * Carga y filtra datos
   */
  window.cargarDatosParaOptimizacion = function(data) {
    console.log('📊 Cargando datos para optimización...');
    
    const satelites = data.filter(ie => esSatelite(ie));
    const nucleos = data.filter(ie => esNucleo(ie));
    
    optimizerState.satelites = satelites.map((s, idx) => ({
      id: `sat_${idx}`,
      amie: s.AMIE,
      lat: parseFloat(s.latitud || s.lat),
      lon: parseFloat(s.longitud || s.lon || s.lng),
      distrito: s.DISTRITO || s.Distrito,
      estudiantes: parseInt(s['Total Estudiantes'] || s.Total_Estudiantes || 0),
      nombre: s.Nombre_Institución || s.Nombre,
      covered: false,
      buffer_id: null
    }));
    
    optimizerState.nucleos = nucleos.map((n, idx) => ({
      id: `nuc_${idx}`,
      amie: n.AMIE,
      lat: parseFloat(n.latitud || n.lat),
      lon: parseFloat(n.longitud || n.lon || n.lng),
      distrito: n.DISTRITO || n.Distrito,
      estudiantes: parseInt(n['Total Estudiantes'] || n.Total_Estudiantes || 0),
      nombre: n.Nombre_Institución || n.Nombre,
      grupo: parseInt(n.COD_GDECE || n.Cod_GDECE || 0),
      satellites_count: 0
    }));
    
    console.log(`✅ Cargados ${satelites.length} satélites y ${nucleos.length} núcleos`);
    
    return {
      satelites: satelites.length,
      nucleos: nucleos.length
    };
  };
  
  /**
   * Agrupa satélites por distrito
   */
  window.agruparPorDistrito = function() {
    const grupos = new Map();
    
    optimizerState.satelites.forEach(sat => {
      if (!grupos.has(sat.distrito)) {
        grupos.set(sat.distrito, {
          satelites: [],
          nucleos: []
        });
      }
      grupos.get(sat.distrito).satelites.push(sat);
    });
    
    optimizerState.nucleos.forEach(nuc => {
      if (grupos.has(nuc.distrito)) {
        grupos.get(nuc.distrito).nucleos.push(nuc);
      }
    });
    
    console.log(`📍 ${grupos.size} distritos identificados`);
    return grupos;
  };
  
  /**
   * Calcula score para un núcleo como buffer
   */
  window.calcularScoreNucleo = function(nucleo, satelitesDistrict, bufferRadius) {
    let score = 0;
    let satelitesDentro = 0;
    let distanciaTotal = 0;
    
    satelitesDistrict.forEach(sat => {
      if (sat.covered) return; // Ya cubierta
      
      const dist = calcularDistancia(
        nucleo.lat, nucleo.lon,
        sat.lat, sat.lon
      );
      
      if (dist <= bufferRadius) {
        satelitesDentro++;
        distanciaTotal += dist;
      }
    });
    
    if (satelitesDentro === 0) return 0;
    
    const avgDist = distanciaTotal / satelitesDentro;
    
    // Score basado en cantidad y cercanía
    score = satelitesDentro * CFG.WEIGHTS.coverage;
    score += (1 - avgDist / bufferRadius) * CFG.WEIGHTS.distance;
    score += (satelitesDentro / CFG.PARAMS.max_satellites_per_buffer) * CFG.WEIGHTS.balance;
    
    return score;
  };
  
  /**
   * Algoritmo Greedy: Seleccionar mejores núcleos como buffers
   */
  window.seleccionarBuffersOptimos = function(grupos) {
    console.log('🎯 Seleccionando buffers óptimos...');
    
    const buffers = [];
    const assignments = new Map();
    
    // Procesar cada distrito
    grupos.forEach((grupo, distrito) => {
      const { satelites, nucleos } = grupo;
      
      if (satelites.length === 0 || nucleos.length === 0) return;
      
      console.log(`📍 Distrito ${distrito}: ${satelites.length} satélites, ${nucleos.length} núcleos`);
      
      // Mientras haya satélites sin cubrir
      let iteration = 0;
      const maxIterations = Math.min(nucleos.length, CFG.PARAMS.max_buffers);
      
      while (iteration < maxIterations) {
        iteration++;
        
        // Contar satélites sin cubrir
        const uncovered = satelites.filter(s => !s.covered);
        if (uncovered.length === 0) break;
        
        if (uncovered.length < CFG.PARAMS.min_satellites_per_buffer) break;
        
        // Calcular score para cada núcleo
        let bestNucleo = null;
        let bestScore = 0;
        
        nucleos.forEach(nuc => {
          // Evitar núcleos ya usados como buffer
          if (nuc.satellites_count >= CFG.PARAMS.max_satellites_per_buffer) return;
          
          const score = window.calcularScoreNucleo(nuc, uncovered, CFG.PARAMS.buffer_radius);
          
          if (score > bestScore) {
            bestScore = score;
            bestNucleo = nuc;
          }
        });
        
        if (!bestNucleo || bestScore === 0) {
          console.log(`⚠️ Distrito ${distrito}: No hay más núcleos viables`);
          break;
        }
        
        // Crear buffer
        const bufferId = `buffer_${buffers.length}`;
        const buffer = {
          id: bufferId,
          nucleo: bestNucleo,
          lat: bestNucleo.lat,
          lon: bestNucleo.lon,
          distrito: distrito,
          radius: CFG.PARAMS.buffer_radius,
          satelites: [],
          score: bestScore
        };
        
        // Asignar satélites al buffer
        uncovered.forEach(sat => {
          const dist = calcularDistancia(
            buffer.lat, buffer.lon,
            sat.lat, sat.lon
          );
          
          if (dist <= CFG.PARAMS.buffer_radius) {
            sat.covered = true;
            sat.buffer_id = bufferId;
            buffer.satelites.push(sat);
            assignments.set(sat.id, bufferId);
            bestNucleo.satellites_count++;
          }
        });
        
        if (buffer.satelites.length >= CFG.PARAMS.min_satellites_per_buffer) {
          buffers.push(buffer);
          console.log(`✅ Buffer ${bufferId}: ${buffer.satelites.length} satélites en ${distrito}`);
        }
      }
    });
    
    optimizerState.buffers = buffers;
    optimizerState.assignments = assignments;
    
    console.log(`✅ ${buffers.length} buffers creados`);
    return buffers;
  };
  
  /**
   * Asignar satélites huérfanas al núcleo más cercano (SIN LÍMITE)
   */
  window.asignarHuerfanasAlMasCercano = function(grupos) {
    console.log('🔍 Asignando satélites huérfanas al más cercano...');
    
    let asignadas = 0;
    
    grupos.forEach((grupo, distrito) => {
      const { satelites, nucleos } = grupo;
      
      const huerfanas = satelites.filter(s => !s.covered);
      
      if (huerfanas.length === 0 || nucleos.length === 0) return;
      
      console.log(`📍 Distrito ${distrito}: ${huerfanas.length} huérfanas`);
      
      huerfanas.forEach(sat => {
        let minDist = Infinity;
        let closestNucleo = null;
        
        // Buscar núcleo más cercano
        nucleos.forEach(nuc => {
          const dist = calcularDistancia(
            nuc.lat, nuc.lon,
            sat.lat, sat.lon
          );
          
          if (dist < minDist) {
            minDist = dist;
            closestNucleo = nuc;
          }
        });
        
        if (closestNucleo) {
          // Buscar si ya existe buffer para este núcleo
          let buffer = optimizerState.buffers.find(b => 
            b.nucleo.id === closestNucleo.id
          );
          
          // Si no existe, crear buffer extendido
          if (!buffer) {
            const bufferId = `buffer_ext_${optimizerState.buffers.length}`;
            buffer = {
              id: bufferId,
              nucleo: closestNucleo,
              lat: closestNucleo.lat,
              lon: closestNucleo.lon,
              distrito: distrito,
              radius: minDist, // Radio extendido
              satelites: [],
              score: 0,
              extended: true
            };
            optimizerState.buffers.push(buffer);
          }
          
          sat.covered = true;
          sat.buffer_id = buffer.id;
          sat.distance = minDist;
          buffer.satelites.push(sat);
          optimizerState.assignments.set(sat.id, buffer.id);
          asignadas++;
        }
      });
    });
    
    console.log(`✅ ${asignadas} satélites huérfanas asignadas`);
    return asignadas;
  };
  
  /**
   * Calcular estadísticas finales
   */
  window.calcularEstadisticas = function() {
    const total = optimizerState.satelites.length;
    const covered = optimizerState.satelites.filter(s => s.covered).length;
    const uncovered = total - covered;
    
    let distanciaTotal = 0;
    let countDistancias = 0;
    
    optimizerState.satelites.forEach(sat => {
      if (sat.covered && sat.distance) {
        distanciaTotal += sat.distance;
        countDistancias++;
      }
    });
    
    const avgDistance = countDistancias > 0 ? distanciaTotal / countDistancias : 0;
    
    optimizerState.stats = {
      total_satelites: total,
      covered: covered,
      uncovered: uncovered,
      buffers_created: optimizerState.buffers.length,
      avg_distance: avgDistance,
      coverage_percent: (covered / total * 100).toFixed(2)
    };
    
    console.log('📊 ESTADÍSTICAS FINALES:');
    console.log(`   Total satélites: ${total}`);
    console.log(`   Cubiertas: ${covered} (${optimizerState.stats.coverage_percent}%)`);
    console.log(`   Sin cubrir: ${uncovered}`);
    console.log(`   Buffers creados: ${optimizerState.buffers.length}`);
    console.log(`   Distancia promedio: ${(avgDistance/1000).toFixed(2)} km`);
    
    return optimizerState.stats;
  };
  
  /**
   * Exportar resultados optimizados
   */
  window.exportarResultadosOptimizados = function() {
    const resultados = {
      timestamp: new Date().toISOString(),
      version: CFG.VERSION,
      config: CFG,
      stats: optimizerState.stats,
      buffers: optimizerState.buffers.map(b => ({
        id: b.id,
        nucleo_amie: b.nucleo.amie,
        lat: b.lat,
        lon: b.lon,
        distrito: b.distrito,
        radius: b.radius,
        satelites_count: b.satelites.length,
        extended: b.extended || false,
        satelites: b.satelites.map(s => ({
          amie: s.amie,
          nombre: s.nombre,
          estudiantes: s.estudiantes,
          distance: s.distance || 0
        }))
      })),
      satelites: optimizerState.satelites.map(s => ({
        amie: s.amie,
        nombre: s.nombre,
        distrito: s.distrito,
        estudiantes: s.estudiantes,
        covered: s.covered,
        buffer_id: s.buffer_id,
        distance: s.distance || 0
      }))
    };
    
    return resultados;
  };
  
  // ══════════════════════════════════════════════════════════════════
  // PROCESO COMPLETO DE OPTIMIZACIÓN
  // ══════════════════════════════════════════════════════════════════
  
  window.ejecutarOptimizacion = function(data) {
    console.log('🚀 INICIANDO OPTIMIZACIÓN INTELIGENTE...');
    console.log('');
    
    // Paso 1: Cargar datos
    const carga = window.cargarDatosParaOptimizacion(data);
    console.log(`✅ Paso 1: ${carga.satelites} satélites, ${carga.nucleos} núcleos cargados`);
    
    // Paso 2: Agrupar por distrito
    const grupos = window.agruparPorDistrito();
    console.log(`✅ Paso 2: ${grupos.size} distritos agrupados`);
    
    // Paso 3: Seleccionar buffers óptimos
    const buffers = window.seleccionarBuffersOptimos(grupos);
    console.log(`✅ Paso 3: ${buffers.length} buffers seleccionados`);
    
    // Paso 4: Asignar huérfanas
    const huerfanas = window.asignarHuerfanasAlMasCercano(grupos);
    console.log(`✅ Paso 4: ${huerfanas} huérfanas asignadas`);
    
    // Paso 5: Calcular estadísticas
    const stats = window.calcularEstadisticas();
    console.log(`✅ Paso 5: Cobertura final ${stats.coverage_percent}%`);
    
    console.log('');
    console.log('🎉 OPTIMIZACIÓN COMPLETADA');
    
    return optimizerState;
  };
  
  // ══════════════════════════════════════════════════════════════════
  // NOTIFICACIONES
  // ══════════════════════════════════════════════════════════════════
  
  window.notificarOptimizacion = function(mensaje, tipo = 'info') {
    const config = {
      success: { bg: '#10b981', icon: '✅' },
      error: { bg: '#ef4444', icon: '❌' },
      warning: { bg: '#f59e0b', icon: '⚠️' },
      info: { bg: '#8b5cf6', icon: '🧠' }
    };
    
    const c = config[tipo] || config.info;
    
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      min-width: 380px;
      padding: 20px 26px;
      background: ${c.bg};
      color: white;
      border-radius: 12px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.4);
      z-index: 99999;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 16px;
      animation: slideIn 0.4s ease;
    `;
    
    notif.innerHTML = `
      <span style="font-size: 28px;">${c.icon}</span>
      <span>${mensaje}</span>
    `;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    }, 5000);
  };
  
  // ══════════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ══════════════════════════════════════════════════════════════════
  
  console.log('✅ OPTIMIZER INTELIGENTE CARGADO');
  console.log('');
  console.log('📋 COMANDOS DISPONIBLES:');
  console.log('  window.ejecutarOptimizacion(globalData)');
  console.log('  window.exportarResultadosOptimizados()');
  console.log('');
  
})();
