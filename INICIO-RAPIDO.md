# 🚀 INICIO RÁPIDO - DECE Optimizer v7.0

## ⏱️ En 3 Pasos (2 minutos)

### 1️⃣ Abre la Terminal/CMD

**Windows:**
- Presiona `Win + R`
- Escribe `cmd` y presiona Enter

**Mac:**
- Presiona `Cmd + Espacio`
- Escribe `Terminal` y presiona Enter

**Linux:**
- Presiona `Ctrl + Alt + T`

### 2️⃣ Navega a la Carpeta del Proyecto

```bash
cd ruta/a/DECE_PRODUCCION-main
```

**💡 Tip:** Arrastra la carpeta a la terminal para obtener la ruta automáticamente

### 3️⃣ Inicia el Servidor

```bash
python servidor.py
```

**✨ ¡Listo!** El navegador se abrirá automáticamente

---

## 🎯 Si Tienes Problemas

### ❌ "python no se reconoce"

**Windows:**
1. Descarga Python desde: https://www.python.org/downloads/
2. Durante la instalación, marca ✅ "Add Python to PATH"
3. Reinicia la terminal

**Mac/Linux:**
Python ya viene instalado. Prueba:
```bash
python3 servidor.py
```

### ❌ "El servidor no inicia"

Prueba con el comando básico:
```bash
python -m http.server 8000
```

Luego abre manualmente: http://localhost:8000/index-mejorado.html

### ❌ "CSV vacío"

1. ✅ Verifica que `DECE_CRUCE_X_Y_NUC_SAT.csv` esté en la carpeta
2. ✅ Verifica que estés usando un servidor (no file://)
3. ✅ Abre la consola del navegador (F12) para ver errores

---

## 🎨 Primera Vez Usando la App

### Al Abrir la Aplicación Verás:

1. **Mapa de Ecuador** con instituciones educativas
2. **Puntos azules** = Núcleos DECE seleccionados
3. **Puntos verdes** = Satélites cubiertos
4. **Puntos naranjas** = Satélites sin cobertura
5. **Círculos azules** = Áreas de cobertura (7.5 km)

### Botones Principales:

| Botón | Función |
|-------|---------|
| 📊 | Abre panel de estadísticas |
| ℹ️ | Abre leyenda explicativa |
| 💾 | Guarda cambios |

### Interacción Básica:

```
🖱️ CLICK en un punto     → Ver información de la institución
🖱️ ZOOM con rueda       → Acercar/alejar mapa
🖱️ ARRASTRAR mapa       → Navegar
```

---

## 📊 Qué Significan los Números

```
╔════════════════════════════════════════╗
║  Núcleos Activos:        ~220         ║  ← Instituciones que darán servicio
║  Satélites Totales:      ~1,415       ║  ← Instituciones que reciben servicio
║  Estudiantes Cubiertos:  ~170,000     ║  ← Total de estudiantes con acceso
║  Cobertura:              ~97%         ║  ← Porcentaje objetivo alcanzado
╚════════════════════════════════════════╝
```

---

## 🔍 Búsqueda de Instituciones

En desarrollo - próximamente podrás buscar por:
- Código AMIE
- Nombre de institución
- Distrito

---

## 💾 Guardar Cambios

Si mueves buffers o haces modificaciones:

1. El botón **💾 Guardar** se iluminará en naranja
2. Click en **💾 Guardar** para persistir los cambios
3. Al recargar la página, tus cambios se mantendrán

---

## 🆘 Ayuda Rápida

### En la Aplicación:

1. Click en el botón **ℹ️** (esquina superior derecha)
2. Lee la **Leyenda** con explicaciones
3. Si dice "CSV vacío", revisa la sección **🚀 Servidor Local**

### En la Consola (F12):

Los mensajes siguen este formato:
```
[LOAD] 🚀 Iniciando carga...        ← Todo bien
[ERROR] ❌ No se pudo cargar        ← Hay un problema
[PARSE] 📊 Procesando...            ← Progreso
[OK] ✅ Completado                  ← Éxito
```

---

## 📱 Compatibilidad

✅ **Navegadores Soportados:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

❌ **No Soportado:**
- Internet Explorer

---

## 🎯 Próximos Pasos

Una vez que la app esté funcionando:

1. 📖 Lee el [README-MEJORADO.md](README-MEJORADO.md) completo
2. 🔍 Explora el panel de estadísticas
3. 🗺️ Interactúa con el mapa
4. 💾 Prueba a mover buffers (próximamente)

---

## 📞 ¿Problemas?

1. Abre consola (F12)
2. Copia los errores
3. Verifica:
   - ✅ Python instalado
   - ✅ CSV en la carpeta
   - ✅ Servidor corriendo
   - ✅ Puerto 8000 libre

---

**¿Todo funcionando?** 🎉 ¡Excelente! Ahora explora la aplicación.

**¿Sigues con problemas?** Lee el README completo para troubleshooting avanzado.
