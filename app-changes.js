// ===== CAMBIOS IMPLEMENTADOS v4.0 =====

// 1. CONSTANTES ACTUALIZADAS
const GRUPO_SATELITES = 2; // Solo grupo 51-120
const MAX_ESTUDIANTES_SATELITE = 120;
const MIN_ESTUDIANTES_SATELITE = 51;
const MAX_DISTANCIA_BUFFER = 11000; // 11km en metros

// 2. KPI OFICIALES MINEDUC 2024-2025
const KPI_OFICIAL = {
    grupo1: { min: 1, max: 50, count: 6500, total: 118713 },
    grupo2: { min: 51, max: 120, count: 1415, total: 112760 }, // SATELITES
    grupo3: { min: 121, max: 450, count: 2351, total: 584410 },
    grupo4: { min: 451, max: 900, count: 1075, total: 687565 },
    grupo5: { min: 902, max: 7832, count: 1011, total: 1562248 },
    total: 12352
};

// 3. COLORES ACTUALIZADOS
const COLORES = {
    nucleo: '#2563eb',           // Azul - IE Núcleo
    sateliteCubierta: '#10b981', // Verde - Satélite cubierta
    sateliteSinCobertura: '#FF8C00', // NARANJA - 51-120 sin buffer
    buffer: 'rgba(37, 99, 235, 0.2)', // Azul transparente
    kpiSinDece: '#ef4444'        // Rojo - Sin DECE (KPI general)
};

// 4. FILTRAR SOLO FISCALES
function filtrarSoloFiscales(datos) {
    return datos.filter(ie => {
        const sostenimiento = ie.Sostenimiento || ie.SOSTENIMIENTO || '';
        return sostenimiento.toUpperCase().includes('FISCAL');
    });
}

// 5. VALIDAR SATELITE (SOLO 51-120)
function esSateliteValida(ie) {
    const estudiantes = parseInt(ie['Total Estudiantes'] || ie.TOTAL_ESTUDIANTES || 0);
    const sostenimiento = (ie.Sostenimiento || ie.SOSTENIMIENTO || '').toUpperCase();
    
    return sostenimiento.includes('FISCAL') && 
           estudiantes >= MIN_ESTUDIANTES_SATELITE && 
           estudiantes <= MAX_ESTUDIANTES_SATELITE;
}

// 6. VALIDAR NUCLEO (SOLO FISCALES >120)
function esNucleoValido(ie) {
    const estudiantes = parseInt(ie['Total Estudiantes'] || ie.TOTAL_ESTUDIANTES || 0);
    const sostenimiento = (ie.Sostenimiento || ie.SOSTENIMIENTO || '').toUpperCase();
    
    return sostenimiento.includes('FISCAL') && estudiantes > MAX_ESTUDIANTES_SATELITE;
}

// 7. VALIDAR MISMO DISTRITO
function mismoDistrito(ie1, ie2) {
    const distrito1 = ie1.DISTRITO || ie1.Distrito || '';
    const distrito2 = ie2.DISTRITO || ie2.Distrito || '';
    return distrito1 === distrito2;
}

// 8. BUSCAR Y CENTRAR POR AMIE
function buscarYCentrarAMIE() {
    const amieInput = document.getElementById('amie-search-input');
    const amieBuscado = amieInput.value.trim();
    
    if (!amieBuscado) {
        mostrarNotificacion('Por favor ingresa un código AMIE', 'warning');
        return;
    }
    
    // Buscar en todas las IE cargadas
    let ieEncontrada = null;
    
    // Buscar en markers
    if (window.allMarkers) {
        for (let marker of window.allMarkers) {
            if (marker.options.amie === amieBuscado) {
                ieEncontrada = marker;
                break;
            }
        }
    }
    
    if (ieEncontrada) {
        // Centrar mapa
        map.setView(ieEncontrada.getLatLng(), 16);
        
        // Abrir popup
        ieEncontrada.openPopup();
        
        // Resaltar temporalmente
        if (ieEncontrada.setStyle) {
            const estiloOriginal = ieEncontrada.options;
            ieEncontrada.setStyle({
                fillColor: '#FFD700',
                color: '#FFA500',
                weight: 4,
                fillOpacity: 0.8
            });
            
            setTimeout(() => {
                ieEncontrada.setStyle(estiloOriginal);
            }, 3000);
        }
        
        mostrarNotificacion(`IE encontrada: ${amieBuscado}`, 'success');
    } else {
        mostrarNotificacion(`No se encontró IE con AMIE: ${amieBuscado}`, 'error');
    }
}

// 9. VALIDAR DISTANCIA BUFFER
function validarDistanciaBuffer(nucleo, satelite) {
    const distancia = calcularDistancia(
        nucleo.lat, nucleo.lng,
        satelite.lat, satelite.lng
    );
    
    if (distancia > MAX_DISTANCIA_BUFFER) {
        console.warn(`⚠️ Buffer excede 11km: ${nucleo.AMIE} -> ${satelite.AMIE} (${(distancia/1000).toFixed(2)}km)`);
        return false;
    }
    
    return true;
}

// 10. ACTUALIZAR POPUP CON AMIE DEL BUFFER
function crearPopupSatelite(satelite, nucleo) {
    return `
        <div class="popup-content">
            <h3>IE Satélite</h3>
            <p><strong>AMIE:</strong> ${satelite.AMIE}</p>
            <p><strong>Nombre:</strong> ${satelite.Nombre_Institucion}</p>
            <p><strong>Estudiantes:</strong> ${satelite.Total_Estudiantes}</p>
            <p><strong>Distrito:</strong> ${satelite.DISTRITO}</p>
            <hr>
            <h4>Núcleo Asignado</h4>
            <p><strong>AMIE Núcleo:</strong> ${nucleo.AMIE}</p>
            <p><strong>Nombre Núcleo:</strong> ${nucleo.Nombre_Institucion}</p>
            <p><strong>Distancia:</strong> ${calcularDistancia(nucleo.lat, nucleo.lng, satelite.lat, satelite.lng).toFixed(0)}m</p>
        </div>
    `;
}

// Notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
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
        padding: 16px 20px;
        background: ${colores[tipo]};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        animation: slideIn 0.3s ease;
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

console.log('✅ DECE Optimizer v4.0 - Cambios cargados');
