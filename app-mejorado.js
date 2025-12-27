<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DECE Optimizer - Sistema Funcional</title>
    
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Estilos propios -->
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- Barra Superior -->
    <div class="topbar">
        <div class="topbar-left">
            <div class="logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.8"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>DECE Optimizer v7.1</span>
            </div>
        </div>

        <div class="topbar-center">
            <h1 class="topbar-title">Sistema de Optimización de Cobertura DECE</h1>
        </div>

        <div class="topbar-right">
            <button class="btn-icon" id="toggleStats" title="Estadísticas">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                </svg>
            </button>
            <button class="btn-icon" id="toggleLegend" title="Leyenda">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                </svg>
            </button>
        </div>
    </div>

    <!-- Contenedor Principal -->
    <div class="container">
        <div id="map" class="map"></div>

        <!-- Panel Estadísticas -->
        <div class="panel panel-left" id="statsPanel">
            <div class="panel-header">
                <h2>📊 Dashboard DECE</h2>
                <button class="panel-close" onclick="document.getElementById('statsPanel').classList.remove('active')">×</button>
            </div>
            <div class="panel-content">
                <!-- Métricas principales -->
                <div class="stats-grid">
                    <div class="stat-box stat-nucleo">
                        <div class="stat-icon">🏛️</div>
                        <div class="stat-content">
                            <div class="stat-value" id="nucleosCount">-</div>
                            <div class="stat-label">Núcleos Activos</div>
                        </div>
                    </div>

                    <div class="stat-box stat-satellite">
                        <div class="stat-icon">📍</div>
                        <div class="stat-content">
                            <div class="stat-value" id="satellitesCount">-</div>
                            <div class="stat-label">Satélites</div>
                        </div>
                    </div>
                </div>

                <div class="student-count-box">
                    <div class="student-icon">👥</div>
                    <div class="student-info">
                        <div class="student-value" id="totalStudents">-</div>
                        <div class="student-label">Estudiantes Totales</div>
                    </div>
                </div>

                <div class="divider"></div>

                <h3 class="section-title">🗺️ Capas</h3>
                <div class="layer-toggles">
                    <label class="toggle-row">
                        <input type="checkbox" id="toggleNucleos" checked>
                        <span>Núcleos DECE</span>
                    </label>
                    <label class="toggle-row">
                        <input type="checkbox" id="toggleSatellites" checked>
                        <span>Satélites</span>
                    </label>
                    <label class="toggle-row">
                        <input type="checkbox" id="toggleBuffers" checked>
                        <span>Buffers (7.5 km)</span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Panel Leyenda -->
        <div class="panel panel-right" id="legendPanel">
            <div class="panel-header">
                <h2>📖 Leyenda</h2>
                <button class="panel-close" onclick="document.getElementById('legendPanel').classList.remove('active')">×</button>
            </div>
            <div class="panel-content">
                <div class="legend-section">
                    <div class="legend-title">Instituciones</div>
                    <div class="legend-item">
                        <span class="legend-dot nucleo-dot"></span>
                        <span>Núcleo DECE (COD 3,4,5)</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-dot sat-covered-dot"></span>
                        <span>Satélite (COD 2)</span>
                    </div>
                </div>

                <div class="legend-section">
                    <div class="legend-title">Cobertura</div>
                    <div class="legend-item">
                        <span class="legend-circle buffer-legend"></span>
                        <span>Buffer 7.5 km</span>
                    </div>
                </div>
                
                <div class="legend-section">
                    <div class="legend-title">ℹ️ Información</div>
                    <div class="legend-help">
                        <p><strong>Núcleos DECE:</strong> Instituciones con 121+ estudiantes.</p>
                        <p><strong>Satélites:</strong> Instituciones con 51-120 estudiantes.</p>
                        <p><strong>Buffer:</strong> Área de cobertura de 7.5 km.</p>
                    </div>
                </div>

                <div class="legend-section">
                    <div class="legend-title">🚀 Solución de Problemas</div>
                    <div class="legend-help">
                        <p><strong>Si ves "Error HTTP 404":</strong></p>
                        <ol style="font-size: 13px; line-height: 1.6; margin: 8px 0;">
                            <li>Verifica que <code>DECE_CRUCE_X_Y_NUC_SAT.csv</code> esté en la misma carpeta</li>
                            <li>Usa servidor local: <code>python servidor.py</code></li>
                            <li>NO abras el HTML directamente (file://)</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>

        <!-- Overlay de Carga -->
        <div class="loading-overlay" id="loadingOverlay">
            <div class="loading-spinner"></div>
            <div class="loading-text">Cargando datos geoespaciales...</div>
            <div class="loading-subtext" id="loadingSubtext"></div>
        </div>
    </div>

    <!-- Scripts -->
    <!-- Leaflet -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    
    <!-- PapaParse para CSV -->
    <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
    
    <!-- Script Funcional (NUEVO - reemplaza app-mejorado.js) -->
    <script src="app-funcional.js"></script>
</body>
</html>
