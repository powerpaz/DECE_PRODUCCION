/**
 * ═══════════════════════════════════════════════════════════════════
 * DECE FORCE OVERRIDE - BLOQUEO Y REEMPLAZO FORZADO
 * ═══════════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';
  
  console.log('%c🔴🔴🔴 FORCE OVERRIDE ACTIVADO 🔴🔴🔴', 'background: red; color: white; padding: 20px; font-size: 24px; font-weight: bold;');
  
  // ══════════════════════════════════════════════════════════════════
  // BLOQUEAR APP.JS HASTA QUE ESTE SCRIPT TERMINE
  // ══════════════════════════════════════════════════════════════════
  
  let DATA_FISCALES = {
    satelites: [],
    nucleos: [],
    ready: false
  };
  
  // ══════════════════════════════════════════════════════════════════
  // INTERCEPTAR Papa.parse ANTES de que app.js lo use
  // ══════════════════════════════════════════════════════════════════
  
  const originalPapaParse = Papa.parse;
  
  Papa.parse = function(file, config) {
    console.log('🎯 Papa.parse INTERCEPTADO');
    
    // Modificar el callback de complete
    const originalComplete = config.complete;
    
    config.complete = function(results) {
      console.log('📊 CSV cargado, FILTRANDO...');
      console.log(`   Original: ${results.data.length} registros`);
      
      // FILTRAR SOLO FISCALES
      const fiscalesSat = results.data.filter(ie => {
        const sost = String(ie.Sostenimiento || ie.SOSTENIMIENTO || '').toUpperCase();
        const cod = parseInt(ie.COD_GDECE || ie.Cod_GDECE || 0);
        return cod === 2 && sost.includes('FISCAL') && !sost.includes('FISCOMISIONAL');
      });
      
      const fiscalesNuc = results.data.filter(ie => {
        const sost = String(ie.Sostenimiento || ie.SOSTENIMIENTO || '').toUpperCase();
        const cod = parseInt(ie.COD_GDECE || ie.Cod_GDECE || 0);
        return [3,4,5].includes(cod) && sost.includes('FISCAL') && !sost.includes('FISCOMISIONAL');
      });
      
      console.log(`   ✅ Satélites fiscales: ${fiscalesSat.length}`);
      console.log(`   ✅ Núcleos fiscales: ${fiscalesNuc.length}`);
      
      // GUARDAR DATOS FISCALES
      DATA_FISCALES.satelites = fiscalesSat;
      DATA_FISCALES.nucleos = fiscalesNuc;
      DATA_FISCALES.ready = true;
      
      // REEMPLAZAR results.data con SOLO fiscales
      results.data = [...fiscalesSat, ...fiscalesNuc];
      
      console.log(`   🔄 CSV REEMPLAZADO: ${results.data.length} registros`);
      console.log('');
      
      // Llamar callback original con datos filtrados
      originalComplete(results);
    };
    
    // Llamar Papa.parse original con config modificado
    return originalPapaParse(file, config);
  };
  
  console.log('✅ Papa.parse INTERCEPTADO - Filtrará automáticamente');
  
  // ══════════════════════════════════════════════════════════════════
  // INTERCEPTAR createOptimalBuffers
  // ══════════════════════════════════════════════════════════════════
  
  window.addEventListener('load', function() {
    console.log('⏳ Esperando createOptimalBuffers...');
    
    const checkInterval = setInterval(() => {
      if (typeof window.createOptimalBuffers === 'function') {
        clearInterval(checkInterval);
        
        console.log('🎯 createOptimalBuffers encontrado, REEMPLAZANDO...');
        
        const originalCreate = window.createOptimalBuffers;
        
        window.createOptimalBuffers = function() {
          console.log('');
          console.log('═══════════════════════════════════════════════════════');
          console.log('🔴 FORCE OVERRIDE - RECALCULANDO BUFFERS');
          console.log('═══════════════════════════════════════════════════════');
          console.log('');
          
          if (!DATA_FISCALES.ready) {
            console.warn('⚠️ Datos fiscales no listos, esperando...');
            setTimeout(() => window.createOptimalBuffers(), 500);
            return;
          }
          
          console.log(`📊 Usando ${DATA_FISCALES.satelites.length} satélites fiscales`);
          console.log(`📊 Usando ${DATA_FISCALES.nucleos.length} núcleos fiscales`);
          
          // VERIFICAR que globalData fue reemplazado
          if (window.globalData) {
            console.log(`✅ globalData confirmado: ${window.globalData.length} registros`);
            
            const satCount = window.globalData.filter(ie => {
              const cod = parseInt(ie.COD_GDECE || ie.Cod_GDECE || 0);
              return cod === 2;
            }).length;
            
            const nucCount = window.globalData.filter(ie => {
              const cod = parseInt(ie.COD_GDECE || ie.Cod_GDECE || 0);
              return [3,4,5].includes(cod);
            }).length;
            
            console.log(`   Satélites en globalData: ${satCount}`);
            console.log(`   Núcleos en globalData: ${nucCount}`);
          }
          
          // Llamar función original (que ahora usa datos filtrados)
          console.log('🔄 Ejecutando createOptimalBuffers con datos filtrados...');
          return originalCreate.apply(this, arguments);
        };
        
        console.log('✅ createOptimalBuffers REEMPLAZADO');
      }
    }, 100);
    
    setTimeout(() => clearInterval(checkInterval), 10000);
  });
  
  // ══════════════════════════════════════════════════════════════════
  // MONITOREAR globalData
  // ══════════════════════════════════════════════════════════════════
  
  const monitorInterval = setInterval(() => {
    if (window.globalData && window.globalData.length > 0) {
      console.log(`📊 globalData detectado: ${window.globalData.length} registros`);
      
      if (window.globalData.length > 6000) {
        console.warn('⚠️ globalData tiene MÁS de 6000 registros - puede que el filtro no funcionó');
        console.warn('   Se esperaban ~5852 registros (1415 sats + 4437 núcleos)');
      } else if (window.globalData.length >= 5000 && window.globalData.length <= 6000) {
        console.log('✅ globalData tiene el tamaño correcto (5000-6000)');
        console.log('✅ FILTRO FUNCIONÓ CORRECTAMENTE');
      }
      
      clearInterval(monitorInterval);
    }
  }, 500);
  
  setTimeout(() => clearInterval(monitorInterval), 15000);
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ FORCE OVERRIDE CARGADO');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  
})();
