/**
 * ═══════════════════════════════════════════════════════════════════
 * DECE OVERRIDE TOTAL - REEMPLAZO COMPLETO DE LÓGICA
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Este script INTERCEPTA y REEMPLAZA completamente la lógica del app.js
 * 
 * OBJETIVO: Analizar SOLO 1,415 satélites fiscales
 * 
 * ACCIÓN:
 * 1. INTERCEPTA loadCSV() del app.js
 * 2. FILTRA solo satélites fiscales (1,415)
 * 3. RECALCULA posiciones de buffers óptimas
 * 4. REEMPLAZA createOptimalBuffers()
 * 5. APLICA nuevas ubicaciones geográficas
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';
  
  console.log('%c🔴 DECE OVERRIDE TOTAL - INTERCEPTANDO SISTEMA', 'background: #dc2626; color: white; padding: 16px; font-size: 22px; font-weight: bold; border: 3px solid white;');
  
  // ══════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN
  // ══════════════════════════════════════════════════════════════════
  
  window.OVERRIDE_CONFIG = {
    ENABLED: true,
    TARGET_SATELLITES: 1415,
    TARGET_NUCLEOS: 4437,
    BUFFER_RADIUS: 7000,
    MAX_DISTANCE: 20000
  };
  
  const CFG = window.OVERRIDE_CONFIG;
  
  // ══════════════════════════════════════════════════════════════════
  // INTERCEPTAR CARGA DE DATOS
  // ══════════════════════════════════════════════════════════════════
  
  let originalLoadCSV = null;
  let intercepted = false;
  
  function interceptarLoadCSV() {
    console.log('🎯 Buscando función loadCSV para interceptar...');
    
    // Esperar a que loadCSV exista
    const checkInterval = setInterval(() => {
      if (typeof window.loadCSV === 'function' && !intercepted) {
        clearInterval(checkInterval);
        
        console.log('✅ loadCSV encontrada. INTERCEPTANDO...');
        
        // Guardar original
        originalLoadCSV = window.loadCSV;
        
        // REEMPLAZAR con nuestra versión
        window.loadCSV = function() {
          console.log('');
          console.log('═══════════════════════════════════════════════════════');
          console.log('🔴 OVERRIDE ACTIVADO - FILTRANDO SOLO FISCALES');
          console.log('═══════════════════════════════════════════════════════');
          console.log('');
          
          // Llamar original
          originalLoadCSV.apply(this, arguments);
          
          // Esperar que globalData esté cargado
          setTimeout(() => {
            if (window.globalData && window.globalData.length > 0) {
              console.log(`📊 Datos originales cargados: ${window.globalData.length} registros`);
              
              // FILTRAR SOLO FISCALES
              filtrarSoloFiscales();
              
              // RECALCULAR BUFFERS
              setTimeout(() => {
                recalcularBuffersOptimizados();
              }, 1000);
            }
          }, 500);
        };
        
        intercepted = true;
        console.log('✅ loadCSV INTERCEPTADA correctamente');
      }
    }, 100);
    
    // Timeout de 10 segundos
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!intercepted) {
        console.error('❌ No se pudo interceptar loadCSV');
      }
    }, 10000);
  }
  
  // ══════════════════════════════════════════════════════════════════
  // FILTRAR SOLO FISCALES
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
  
  window.datosFiscales = {
    satelites: [],
    nucleos: [],
    original_count: 0,
    filtered_count: 0
  };
  
  function filtrarSoloFiscales() {
    console.log('🔍 FILTRANDO datos...');
    
    window.datosFiscales.original_count = window.globalData.length;
    
    // Filtrar satélites fiscales
    window.datosFiscales.satelites = window.globalData
      .filter(ie => esSatelite(ie))
      .map((s, idx) => ({
        ...s,
        id: `sat_${idx}`,
        covered: false,
        buffer_id: null
      }));
    
    // Filtrar núcleos fiscales
    window.datosFiscales.nucleos = window.globalData
      .filter(ie => esNucleo(ie))
      .map((n, idx) => ({
        ...n,
        id: `nuc_${idx}`,
        used: false,
        satellites_count: 0
      }));
    
    window.datosFiscales.filtered_count = 
      window.datosFiscales.satelites.length + 
      window.datosFiscales.nucleos.length;
    
    console.log('');
    console.log('📊 RESULTADOS DEL FILTRO:');
    console.log(`  ❌ Datos originales: ${window.datosFiscales.original_count}`);
    console.log(`  ✅ Satélites fiscales: ${window.datosFiscales.satelites.length}`);
    console.log(`  ✅ Núcleos fiscales: ${window.datosFiscales.nucleos.length}`);
    console.log(`  ✅ Total filtrado: ${window.datosFiscales.filtered_count}`);
    console.log('');
    
    // REEMPLAZAR globalData con datos filtrados
    window.globalData = [
      ...window.datosFiscales.satelites,
      ...window.datosFiscales.nucleos
    ];
    
    console.log(`🔄 globalData REEMPLAZADO: ${window.globalData.length} registros`);
  }
  
  // ══════════════════════════════════════════════════════════════════
  // RECALCULAR BUFFERS OPTIMIZADOS
  // ══════════════════════════════════════════════════════════════════
  
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
  
  function recalcularBuffersOptimizados() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎯 RECALCULANDO UBICACIONES DE BUFFERS');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    if (!window.map || !window.layers) {
      console.error('❌ Mapa no disponible');
      return;
    }
    
    // Limpiar buffers existentes
    if (window.layers.buffers) window.layers.buffers.clearLayers();
    if (window.layers.connections) window.layers.connections.clearLayers();
    if (window.layers.satellites) window.layers.satellites.clearLayers();
    if (window.editableBuffers) window.editableBuffers.clear();
    
    console.log('🧹 Buffers antiguos eliminados');
    
    // Agrupar por distrito
    const distritos = new Map();
    
    window.datosFiscales.satelites.forEach(sat => {
      const distrito = sat.DISTRITO || sat.Distrito || 'SIN_DISTRITO';
      if (!distritos.has(distrito)) {
        distritos.set(distrito, { satelites: [], nucleos: [] });
      }
      distritos.get(distrito).satelites.push(sat);
    });
    
    window.datosFiscales.nucleos.forEach(nuc => {
      const distrito = nuc.DISTRITO || nuc.Distrito || 'SIN_DISTRITO';
      if (distritos.has(distrito)) {
        distritos.get(distrito).nucleos.push(nuc);
      }
    });
    
    console.log(`📍 ${distritos.size} distritos encontrados`);
    console.log('');
    
    // Crear buffers por distrito
    let totalBuffers = 0;
    let totalCubiertos = 0;
    const nuevosBuffers = [];
    
    distritos.forEach((data, distrito) => {
      const { satelites, nucleos } = data;
      
      if (satelites.length === 0 || nucleos.length === 0) {
        console.log(`⚠️ Distrito ${distrito}: Sin satélites o núcleos`);
        return;
      }
      
      console.log(`📍 Distrito ${distrito}:`);
      console.log(`   Satélites: ${satelites.length}, Núcleos: ${nucleos.length}`);
      
      // ALGORITMO GREEDY
      let iteration = 0;
      
      while (iteration < nucleos.length) {
        iteration++;
        
        const sinCubrir = satelites.filter(s => !s.covered);
        if (sinCubrir.length < 2) break;
        
        let mejorNucleo = null;
        let mejorScore = 0;
        let mejorSatelites = [];
        
        // Evaluar cada núcleo
        nucleos.forEach(nuc => {
          if (nuc.used) return;
          
          const satsEnRango = [];
          let distTotal = 0;
          
          sinCubrir.forEach(sat => {
            const lat1 = parseFloat(nuc.latitud || nuc.lat);
            const lon1 = parseFloat(nuc.longitud || nuc.lon || nuc.lng);
            const lat2 = parseFloat(sat.latitud || sat.lat);
            const lon2 = parseFloat(sat.longitud || sat.lon || sat.lng);
            
            if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return;
            
            const dist = calcularDistancia(lat1, lon1, lat2, lon2);
            
            if (dist <= CFG.BUFFER_RADIUS) {
              satsEnRango.push({ sat, dist });
              distTotal += dist;
            }
          });
          
          if (satsEnRango.length === 0) return;
          
          const avgDist = distTotal / satsEnRango.length;
          const score = satsEnRango.length * (1 - avgDist / CFG.BUFFER_RADIUS);
          
          if (score > mejorScore) {
            mejorScore = score;
            mejorNucleo = nuc;
            mejorSatelites = satsEnRango;
          }
        });
        
        if (!mejorNucleo) break;
        
        // Crear buffer
        const lat = parseFloat(mejorNucleo.latitud || mejorNucleo.lat);
        const lon = parseFloat(mejorNucleo.longitud || mejorNucleo.lon || mejorNucleo.lng);
        
        if (isNaN(lat) || isNaN(lon)) continue;
        
        const buffer = {
          id: `opt_buffer_${totalBuffers}`,
          nucleo: mejorNucleo,
          lat: lat,
          lon: lon,
          distrito: distrito,
          satelites: mejorSatelites.map(s => s.sat),
          type: 'ideal'
        };
        
        // Marcar como cubiertas
        mejorSatelites.forEach(({ sat }) => {
          sat.covered = true;
          sat.buffer_id = buffer.id;
        });
        
        mejorNucleo.used = true;
        totalBuffers++;
        totalCubiertos += mejorSatelites.length;
        nuevosBuffers.push(buffer);
        
        // Dibujar buffer en mapa
        const circle = L.circle([lat, lon], {
          radius: CFG.BUFFER_RADIUS,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.08,
          weight: 2,
          opacity: 0.6
        });
        
        circle.bindPopup(`
          <strong>${mejorNucleo.Nombre_Institución || mejorNucleo.Nombre || 'Núcleo'}</strong><br>
          AMIE: ${mejorNucleo.AMIE}<br>
          Satélites: ${mejorSatelites.length}<br>
          Distrito: ${distrito}
        `);
        
        circle.addTo(window.layers.buffers);
        
        // Dibujar conexiones
        mejorSatelites.forEach(({ sat, dist }) => {
          const satLat = parseFloat(sat.latitud || sat.lat);
          const satLon = parseFloat(sat.longitud || sat.lon || sat.lng);
          
          if (isNaN(satLat) || isNaN(satLon)) return;
          
          const line = L.polyline([
            [lat, lon],
            [satLat, satLon]
          ], {
            color: '#10b981',
            weight: 1,
            opacity: 0.5
          });
          
          line.addTo(window.layers.connections);
          
          // Marcador satélite
          const marker = L.circleMarker([satLat, satLon], {
            radius: 4,
            fillColor: '#10b981',
            color: 'white',
            weight: 1,
            fillOpacity: 0.9
          });
          
          marker.bindPopup(`
            <strong>${sat.Nombre_Institución || sat.Nombre || 'Satélite'}</strong><br>
            AMIE: ${sat.AMIE}<br>
            Distancia: ${(dist/1000).toFixed(2)} km
          `);
          
          marker.addTo(window.layers.satellites);
        });
        
        console.log(`   ✅ Buffer ${buffer.id}: ${mejorSatelites.length} satélites`);
      }
      
      // Huérfanas
      const huerfanas = satelites.filter(s => !s.covered);
      
      if (huerfanas.length > 0) {
        console.log(`   🔍 ${huerfanas.length} huérfanas - asignando al más cercano...`);
        
        huerfanas.forEach(sat => {
          let minDist = Infinity;
          let masCercano = null;
          
          const satLat = parseFloat(sat.latitud || sat.lat);
          const satLon = parseFloat(sat.longitud || sat.lon || sat.lng);
          
          if (isNaN(satLat) || isNaN(satLon)) return;
          
          nucleos.forEach(nuc => {
            const nucLat = parseFloat(nuc.latitud || nuc.lat);
            const nucLon = parseFloat(nuc.longitud || nuc.lon || nuc.lng);
            
            if (isNaN(nucLat) || isNaN(nucLon)) return;
            
            const dist = calcularDistancia(satLat, satLon, nucLat, nucLon);
            
            if (dist < minDist && dist <= CFG.MAX_DISTANCE) {
              minDist = dist;
              masCercano = nuc;
            }
          });
          
          if (masCercano) {
            sat.covered = true;
            totalCubiertos++;
            
            const nucLat = parseFloat(masCercano.latitud || masCercano.lat);
            const nucLon = parseFloat(masCercano.longitud || masCercano.lon || masCercano.lng);
            
            // Línea naranja para extendidas
            const line = L.polyline([
              [nucLat, nucLon],
              [satLat, satLon]
            ], {
              color: '#FF8C00',
              weight: 1,
              opacity: 0.5,
              dashArray: '5,5'
            });
            
            line.addTo(window.layers.connections);
            
            // Marcador naranja
            const marker = L.circleMarker([satLat, satLon], {
              radius: 4,
              fillColor: '#FF8C00',
              color: 'white',
              weight: 1,
              fillOpacity: 0.9
            });
            
            marker.bindPopup(`
              <strong>${sat.Nombre_Institución || sat.Nombre || 'Satélite'}</strong><br>
              AMIE: ${sat.AMIE}<br>
              Distancia: ${(minDist/1000).toFixed(2)} km<br>
              Tipo: Extendida
            `);
            
            marker.addTo(window.layers.satellites);
          }
        });
      }
      
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESULTADOS FINALES:');
    console.log(`  Buffers creados: ${totalBuffers}`);
    console.log(`  Satélites cubiertas: ${totalCubiertos}/${window.datosFiscales.satelites.length}`);
    console.log(`  Cobertura: ${(totalCubiertos/window.datosFiscales.satelites.length*100).toFixed(2)}%`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('🎉 OPTIMIZACIÓN COMPLETADA');
    
    // Actualizar métricas
    if (window.updateMetrics) {
      window.updateMetrics();
    }
    
    // Notificación
    if (window.notificar) {
      window.notificar(
        `Optimización: ${totalBuffers} buffers, ${totalCubiertos} satélites cubiertas (${(totalCubiertos/window.datosFiscales.satelites.length*100).toFixed(1)}%)`,
        'success'
      );
    }
  }
  
  // ══════════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ══════════════════════════════════════════════════════════════════
  
  console.log('⏳ Esperando que el sistema cargue...');
  
  // Interceptar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(interceptarLoadCSV, 500);
    });
  } else {
    setTimeout(interceptarLoadCSV, 500);
  }
  
  console.log('✅ OVERRIDE TOTAL CARGADO Y LISTO');
  
})();
