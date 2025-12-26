// ===== PARCHE COMPLETO DECE v4.0 =====
// ✅ Soluciona problema de carga
// ✅ Agrega todos los cambios solicitados

(function() {
  'use strict';
  
  console.log('🔧 Aplicando parche DECE v4.0...');
  
  // ===== 1. CONSTANTES Y CONFIGURACIÓN =====
  window.DECE_CONFIG = {
    // KPI Oficiales MINEDUC 2024-2025
    KPI: {
      grupo1: { min: 1, max: 50, count: 6500, total: 118713 },
      grupo2: { min: 51, max: 120, count: 1415, total: 112760 }, // SATÉLITES
      grupo3: { min: 121, max: 450, count: 2351, total: 584410 },
      grupo4: { min: 451, max: 900, count: 1075, total: 687565 },
      grupo5: { min: 902, max: 7832, count: 1011, total: 1562248 },
      total: 12352
    },
    
    // Colores actualizados
    COLORES: {
      nucleo: '#2563eb',
      sateliteCubierta: '#10b981',
      sateliteSinCobertura: '#FF8C00', // NARANJA para 51-120
      buffer: 'rgba(37, 99, 235, 0.2)',
      kpiSinDece: '#ef4444'
    },
    
    // Validaciones
    GRUPO_SATELITES: 2,
    MIN_ESTUDIANTES_SATELITE: 51,
    MAX_ESTUDIANTES_SATELITE: 120,
    MAX_DISTANCIA_BUFFER: 11000, // 11km
    
    // CSV
    CSV_FILE: 'DECE_CRUCE_X_Y_NUC_SAT.csv',
    CSV_TIMEOUT: 30000 // 30 segundos
  };
  
  // ===== 2. FUNCIONES DE VALIDACIÓN =====
  
  window.filtrarSoloFiscales = function(datos) {
    console.log(`📊 Filtrando IE fiscales de ${datos.length} registros...`);
    const fiscales = datos.filter(ie => {
      const sost = (ie.Sostenimiento || ie.SOSTENIMIENTO || '').toUpperCase();
      return sost.includes('FISCAL');
    });
    console.log(`✅ ${fiscales.length} IE fiscales encontradas`);
    return fiscales;
  };
  
  window.esSateliteValida = function(ie) {
    const est = parseInt(ie['Total Estudiantes'] || ie.TOTAL_ESTUDIANTES || 0);
    const sost = (ie.Sostenimiento || ie.SOSTENIMIENTO || '').toUpperCase();
    return sost.includes('FISCAL') && 
           est >= window.DECE_CONFIG.MIN_ESTUDIANTES_SATELITE && 
           est <= window.DECE_CONFIG.MAX_ESTUDIANTES_SATELITE;
  };
  
  window.esNucleoValido = function(ie) {
    const est = parseInt(ie['Total Estudiantes'] || ie.TOTAL_ESTUDIANTES || 0);
    const sost = (ie.Sostenimiento || ie.SOSTENIMIENTO || '').toUpperCase();
    return sost.includes('FISCAL') && est > window.DECE_CONFIG.MAX_ESTUDIANTES_SATELITE;
  };
  
  window.mismoDistrito = function(ie1, ie2) {
    const d1 = ie1.DISTRITO || ie1.Distrito || '';
    const d2 = ie2.DISTRITO || ie2.Distrito || '';
    return d1 === d2 && d1 !== '';
  };
  
  window.validarDistanciaBuffer = function(distancia) {
    if (distancia > window.DECE_CONFIG.MAX_DISTANCIA_BUFFER) {
      console.warn(`⚠️ Buffer excede 11km: ${(distancia/1000).toFixed(2)}km`);
      return false;
    }
    return true;
  };
  
  // ===== 3. BUSCADOR DE AMIE =====
  
  window.buscarYCentrarAMIE = function() {
    const input = document.getElementById('amie-search-input');
    if (!input) {
      console.error('❌ Input de búsqueda no encontrado');
      return;
    }
    
    const amie = input.value.trim();
    if (!amie) {
      mostrarNotificacion('Ingresa un código AMIE', 'warning');
      return;
    }
    
    console.log(`🔍 Buscando AMIE: ${amie}`);
    
    // Buscar en todas las capas
    let encontrado = false;
    
    // Buscar en núcleos
    if (window.layers && window.layers.nucleos) {
      window.layers.nucleos.eachLayer(layer => {
        if (layer.options && layer.options.amie === amie) {
          map.setView(layer.getLatLng(), 16);
          layer.openPopup();
          resaltarMarcador(layer);
          encontrado = true;
          mostrarNotificacion(`IE Núcleo encontrada: ${amie}`, 'success');
        }
      });
    }
    
    // Buscar en satélites
    if (!encontrado && window.layers && window.layers.satellites) {
      window.layers.satellites.eachLayer(layer => {
        if (layer.options && layer.options.amie === amie) {
          map.setView(layer.getLatLng(), 16);
          layer.openPopup();
          resaltarMarcador(layer);
          encontrado = true;
          mostrarNotificacion(`IE Satélite encontrada: ${amie}`, 'success');
        }
      });
    }
    
    if (!encontrado) {
      mostrarNotificacion(`No se encontró IE con AMIE: ${amie}`, 'error');
    }
  };
  
  function resaltarMarcador(marker) {
    const latLng = marker.getLatLng();
    const highlight = L.circleMarker(latLng, {
      radius: 20,
      fillColor: '#FFD700',
      color: '#FFA500',
      weight: 4,
      fillOpacity: 0.4
    }).addTo(map);
    
    setTimeout(() => {
      map.removeLayer(highlight);
    }, 3000);
  }
  
  // ===== 4. NOTIFICACIONES =====
  
  window.mostrarNotificacion = function(mensaje, tipo = 'info') {
    const colores = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 16px 24px;
      background: ${colores[tipo]};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease;
      max-width: 400px;
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    }, 4000);
  };
  
  // ===== 5. CARGA MEJORADA DE CSV =====
  
  window.cargarCSVMejorado = function() {
    console.log('📥 Iniciando carga mejorada de CSV...');
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = loadingOverlay?.querySelector('.loading-text');
    
    function setText(msg) {
      if (loadingText) loadingText.textContent = msg;
      console.log(`📝 ${msg}`);
    }
    
    setText('Verificando archivo CSV...');
    
    // Timeout de 30 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: CSV tardó más de 30 segundos')), 
      window.DECE_CONFIG.CSV_TIMEOUT)
    );
    
    const fetchPromise = fetch(window.DECE_CONFIG.CSV_FILE, {
      cache: 'no-store',
      headers: { 'Accept': 'text/csv' }
    })
    .then(response => {
      console.log(`📡 Response status: ${response.status}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.text();
    })
    .then(text => {
      setText('Procesando datos...');
      console.log(`📊 CSV cargado: ${text.length} caracteres`);
      
      if (!window.Papa) {
        throw new Error('PapaParse no está disponible');
      }
      
      return new Promise((resolve, reject) => {
        // Limpiar BOM
        text = text.replace(/^\uFEFF/, '');
        
        // Detectar delimitador
        const firstLine = text.split(/\r?\n/, 1)[0] || '';
        const delimiter = (firstLine.match(/;/g) || []).length >= 
                         (firstLine.match(/,/g) || []).length ? ';' : ',';
        
        console.log(`🔍 Delimitador detectado: "${delimiter}"`);
        
        Papa.parse(text, {
          delimiter,
          skipEmptyLines: 'greedy',
          header: false,
          complete: (results) => {
            console.log(`✅ Parse completo: ${results.data.length} filas`);
            resolve(results.data);
          },
          error: (error) => {
            reject(new Error(`Error en Papa.parse: ${error.message}`));
          }
        });
      });
    });
    
    Promise.race([fetchPromise, timeoutPromise])
      .then(data => {
        setText('Validando datos...');
        
        if (!data || data.length < 2) {
          throw new Error('CSV vacío o inválido');
        }
        
        console.log(`✅ ${data.length} filas cargadas`);
        
        // Continuar con el procesamiento normal
        if (window.procesarDatosCSV) {
          window.procesarDatosCSV(data);
        } else {
          throw new Error('Función procesarDatosCSV no encontrada');
        }
        
        setText('Datos cargados correctamente');
        
        setTimeout(() => {
          if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
          }
        }, 1000);
      })
      .catch(error => {
        console.error('❌ Error al cargar CSV:', error);
        setText(`ERROR: ${error.message}`);
        
        // Mostrar error en pantalla
        if (loadingOverlay) {
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = `
            margin-top: 20px;
            padding: 20px;
            background: #ef4444;
            border-radius: 8px;
            color: white;
          `;
          errorDiv.innerHTML = `
            <h3>⚠️ Error al Cargar Datos</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="
              margin-top: 10px;
              padding: 10px 20px;
              background: white;
              color: #ef4444;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
            ">Reintentar</button>
          `;
          loadingOverlay.appendChild(errorDiv);
        }
      });
  };
  
  // ===== 6. INICIALIZACIÓN MEJORADA =====
  
  window.inicializarDECEMejorado = function() {
    console.log('🚀 Iniciando DECE Optimizer v4.0...');
    
    // Verificar dependencias
    if (!window.L) {
      console.error('❌ Leaflet no cargado');
      mostrarNotificacion('Error: Leaflet no cargado', 'error');
      return;
    }
    
    if (!window.Papa) {
      console.error('❌ PapaParse no cargado');
      mostrarNotificacion('Error: PapaParse no cargado', 'error');
      return;
    }
    
    console.log('✅ Dependencias verificadas');
    
    // Agregar buscador de AMIE al DOM si no existe
    agregarBuscadorAMIE();
    
    // Agregar estilos de animación
    agregarEstilosAnimacion();
    
    // Cargar CSV con sistema mejorado
    setTimeout(() => {
      window.cargarCSVMejorado();
    }, 500);
  };
  
  function agregarBuscadorAMIE() {
    if (document.getElementById('amie-search-input')) {
      console.log('✅ Buscador AMIE ya existe');
      return;
    }
    
    const topbar = document.querySelector('.topbar-right');
    if (!topbar) {
      console.warn('⚠️ No se encontró .topbar-right');
      return;
    }
    
    const container = document.createElement('div');
    container.className = 'amie-search-container';
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: 12px;
    `;
    
    container.innerHTML = `
      <input 
        type="text" 
        id="amie-search-input" 
        placeholder="Buscar AMIE..."
        style="
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          background: rgba(255,255,255,0.1);
          color: white;
          font-size: 14px;
          width: 160px;
        "
      />
      <button 
        onclick="buscarYCentrarAMIE()"
        class="btn-action"
        title="Buscar IE"
        style="padding: 8px 12px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </button>
    `;
    
    topbar.insertBefore(container, topbar.firstChild);
    console.log('✅ Buscador AMIE agregado');
    
    // Enter para buscar
    const input = container.querySelector('input');
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        window.buscarYCentrarAMIE();
      }
    });
  }
  
  function agregarEstilosAnimacion() {
    if (document.getElementById('dece-animations')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'dece-animations';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
      
      .amie-search-container input:focus {
        outline: none;
        border-color: rgba(255,255,255,0.4);
        box-shadow: 0 0 0 3px rgba(255,255,255,0.1);
      }
    `;
    document.head.appendChild(style);
  }
  
  // ===== 7. AUTO-INICIO =====
  
  // Si el DOM ya está listo, inicializar inmediatamente
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(window.inicializarDECEMejorado, 1000);
    });
  } else {
    setTimeout(window.inicializarDECEMejorado, 1000);
  }
  
  console.log('✅ Parche DECE v4.0 cargado');
  
})();
