# 🤝 Guía de Contribución - DECE Optimizer

¡Gracias por tu interés en contribuir al proyecto DECE Optimizer! Esta guía te ayudará a entender cómo puedes colaborar.

---

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Puedo Contribuir](#cómo-puedo-contribuir)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Mejoras](#sugerir-mejoras)
- [Pull Requests](#pull-requests)
- [Guía de Estilo](#guía-de-estilo)
- [Proceso de Desarrollo](#proceso-de-desarrollo)

---

## 📜 Código de Conducta

Este proyecto se adhiere a un código de conducta. Al participar, se espera que mantengas este código.

### Nuestros Compromisos

- Usar lenguaje inclusivo y respetuoso
- Respetar diferentes puntos de vista y experiencias
- Aceptar críticas constructivas con gracia
- Enfocarse en lo mejor para la comunidad
- Mostrar empatía hacia otros miembros

---

## 🤔 Cómo Puedo Contribuir

### Tipos de Contribuciones

Aceptamos varios tipos de contribuciones:

1. **🐛 Reportar Bugs** - Encontraste un error? Háznoslo saber!
2. **💡 Sugerir Mejoras** - Tienes ideas para nuevas funcionalidades?
3. **📝 Mejorar Documentación** - Siempre se puede mejorar
4. **💻 Código** - Pull requests con mejoras o correcciones
5. **🎨 Diseño** - Mejoras de UI/UX
6. **🧪 Pruebas** - Agregar tests es siempre bienvenido

---

## 🐛 Reportar Bugs

### Antes de Reportar

1. **Verifica** que estés usando la última versión
2. **Busca** en [issues existentes](../../issues) si ya fue reportado
3. **Reproduce** el error para asegurarte que es consistente

### Cómo Reportar un Bug

Crea un [nuevo issue](../../issues/new) e incluye:

```markdown
## Descripción del Bug
[Descripción clara y concisa]

## Pasos para Reproducir
1. Ve a '...'
2. Haz click en '...'
3. Desplázate hasta '...'
4. Observa el error

## Comportamiento Esperado
[Qué esperabas que sucediera]

## Comportamiento Actual
[Qué sucedió realmente]

## Screenshots
[Si aplica, agrega capturas de pantalla]

## Entorno
- OS: [ej. Windows 10, macOS 12.5, Ubuntu 22.04]
- Navegador: [ej. Chrome 120, Firefox 121]
- Versión: [ej. v7.0]

## Consola del Navegador (F12)
```
[Pega aquí los errores de la consola]
```

## Información Adicional
[Cualquier otro contexto relevante]
```

---

## 💡 Sugerir Mejoras

### Antes de Sugerir

1. **Verifica** que no exista ya como [issue](../../issues)
2. **Considera** si se alinea con los objetivos del proyecto
3. **Piensa** en los detalles de implementación

### Cómo Sugerir una Mejora

Crea un [nuevo issue](../../issues/new) con:

```markdown
## Descripción de la Mejora
[Descripción clara de la mejora propuesta]

## Problema que Resuelve
[Qué problema o necesidad aborda]

## Solución Propuesta
[Cómo se implementaría]

## Alternativas Consideradas
[Otras formas de resolver el problema]

## Beneficios
- [Beneficio 1]
- [Beneficio 2]
- [Beneficio 3]

## Mockups / Ejemplos
[Si aplica, agrega diseños o ejemplos visuales]

## Impacto Esperado
[Usuarios afectados, casos de uso, etc.]
```

---

## 🔀 Pull Requests

### Proceso

1. **Fork** el repositorio
2. **Crea** una rama desde `main`:
   ```bash
   git checkout -b feature/nombre-descriptivo
   # o
   git checkout -b fix/nombre-del-bug
   ```

3. **Haz** tus cambios siguiendo la [guía de estilo](#guía-de-estilo)

4. **Commit** tus cambios:
   ```bash
   git commit -m "feat: agrega funcionalidad X"
   # o
   git commit -m "fix: corrige error en Y"
   ```

5. **Push** a tu fork:
   ```bash
   git push origin feature/nombre-descriptivo
   ```

6. **Abre** un Pull Request hacia `main`

### Template de Pull Request

```markdown
## Descripción
[Descripción clara de los cambios]

## Tipo de Cambio
- [ ] Bug fix (cambio que corrige un issue)
- [ ] Nueva funcionalidad (cambio que agrega funcionalidad)
- [ ] Breaking change (fix o feature que causa cambios incompatibles)
- [ ] Documentación
- [ ] Refactorización
- [ ] Mejora de performance

## Issue Relacionado
Closes #[número del issue]

## Checklist
- [ ] Mi código sigue la guía de estilo del proyecto
- [ ] He realizado una auto-revisión de mi código
- [ ] He comentado mi código, especialmente en áreas complejas
- [ ] He actualizado la documentación correspondiente
- [ ] Mis cambios no generan nuevas advertencias
- [ ] He probado mis cambios localmente
- [ ] Los cambios funcionan en: Chrome [ ], Firefox [ ], Safari [ ]

## Screenshots (si aplica)
[Agrega capturas antes/después]

## Notas Adicionales
[Cualquier información adicional para revisores]
```

---

## 🎨 Guía de Estilo

### JavaScript

```javascript
// ✅ BUENO
/**
 * Calcula la distancia entre dos puntos
 * @param {number} lat1 - Latitud punto 1
 * @param {number} lng1 - Longitud punto 1
 * @param {number} lat2 - Latitud punto 2
 * @param {number} lng2 - Longitud punto 2
 * @returns {number} Distancia en metros
 */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Radio de la Tierra
  // ... implementación
  return distance;
}

// ❌ MALO
function calc(a,b,c,d){
  var r=6371000;
  // sin comentarios, nombres poco descriptivos
  return r*2;
}
```

### Convenciones

- **Nombres de variables:** `camelCase`
- **Nombres de constantes:** `UPPER_SNAKE_CASE`
- **Nombres de funciones:** Verbos descriptivos (`calculate`, `get`, `update`)
- **Indentación:** 2 espacios (no tabs)
- **Strings:** Comillas simples `'string'` o template literals `` `string ${var}` ``
- **Punto y coma:** Siempre terminar statements con `;`

### CSS

```css
/* ✅ BUENO */
.panel-header {
  display: flex;
  justify-content: space-between;
  padding: 24px;
  background: var(--color-background);
}

/* ❌ MALO */
.panel-header{display:flex;justify-content:space-between;padding:24px;}
```

### HTML

```html
<!-- ✅ BUENO -->
<div class="container">
  <h1 class="title">Título</h1>
  <p class="description">Descripción</p>
</div>

<!-- ❌ MALO -->
<div class=container><h1>Título</h1><p>Descripción</p></div>
```

### Comentarios

```javascript
// ✅ BUENO - Explica el "por qué"
// Usamos Set en lugar de Array para búsquedas O(1)
const selected = new Set();

// ❌ MALO - Explica el "qué" (obvio del código)
// Crea un nuevo Set
const selected = new Set();
```

---

## 🔄 Proceso de Desarrollo

### Branch Strategy

```
main (producción)
  ├── develop (desarrollo)
  │   ├── feature/nueva-funcionalidad
  │   ├── feature/otra-funcionalidad
  │   └── fix/correccion-bug
  └── hotfix/error-critico (para emergencias)
```

### Workflow

1. **Develop** - Rama principal de desarrollo
2. **Feature branches** - Para nuevas funcionalidades
3. **Fix branches** - Para correcciones de bugs
4. **Hotfix branches** - Para errores críticos en producción
5. **Main** - Solo código probado y listo para producción

### Testing Local

```bash
# 1. Inicia el servidor
python servidor.py

# 2. Abre en navegadores
# - Chrome
# - Firefox  
# - Safari (si aplica)

# 3. Verifica
# - No hay errores en consola (F12)
# - Funcionalidad trabaja como esperado
# - UI se ve correcta en diferentes tamaños
```

### Convención de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<alcance>): <descripción corta>

<cuerpo opcional>

<footer opcional>
```

**Tipos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan lógica)
- `refactor`: Refactorización de código
- `perf`: Mejoras de performance
- `test`: Agregar o corregir tests
- `chore`: Cambios en build, CI, etc.

**Ejemplos:**

```bash
feat(map): agrega zoom dinámico al mapa
fix(csv): corrige parseo de delimitador
docs(readme): actualiza instrucciones de instalación
refactor(optimizer): simplifica algoritmo greedy
```

---

## 📝 Documentación

### JSDoc para Funciones

```javascript
/**
 * Descripción breve de la función
 * 
 * Descripción más detallada si es necesaria.
 * Puede tener múltiples líneas.
 * 
 * @param {type} paramName - Descripción del parámetro
 * @param {type} [optionalParam] - Parámetro opcional
 * @param {type} [optionalParam=default] - Con valor por defecto
 * @returns {type} Descripción del retorno
 * @throws {ErrorType} Cuándo se lanza este error
 * 
 * @example
 * // Ejemplo de uso
 * const result = functionName(param1, param2);
 */
function functionName(paramName, optionalParam = default) {
  // Implementación
}
```

### README para Nuevas Funcionalidades

Si agregas una funcionalidad importante:

1. Actualiza `README.md`
2. Agrega sección en `README-MEJORADO.md` si es técnico
3. Considera agregar screenshots
4. Actualiza `CHANGELOG.md`

---

## 🧪 Testing

### Testing Manual

Para cada cambio, verifica:

- [ ] Funciona en Chrome
- [ ] Funciona en Firefox
- [ ] Funciona en Safari (si tienes acceso)
- [ ] Funciona en móvil (responsive)
- [ ] No hay errores en consola
- [ ] No rompe funcionalidad existente
- [ ] UI se ve correcta

### Testing de CSV

Si modificas el procesamiento de CSV:

```javascript
// Prueba con diferentes delimitadores
const testCases = [
  { delimiter: ',', file: 'test_comma.csv' },
  { delimiter: ';', file: 'test_semicolon.csv' },
  { delimiter: '\t', file: 'test_tab.csv' }
];

// Prueba con diferentes encodings
// - UTF-8
// - UTF-8 with BOM
// - ISO-8859-1
```

---

## ⚡ Performance

### Consideraciones

Al contribuir código, considera:

1. **Complejidad algorítmica** - O(n) es mejor que O(n²)
2. **Memoria** - Evita copias innecesarias de arrays grandes
3. **DOM** - Minimiza manipulaciones directas del DOM
4. **Rendering** - Usa Canvas para muchos marcadores (>1000)
5. **Debouncing** - Para eventos que disparan frecuentemente

### Ejemplo

```javascript
// ❌ MALO - O(n²)
satellites.forEach(sat => {
  nucleos.forEach(nuc => {
    // Cálculo para cada par
  });
});

// ✅ BUENO - O(n) con índice espacial
const spatialIndex = buildSpatialIndex(nucleos);
satellites.forEach(sat => {
  const nearby = spatialIndex.query(sat.lat, sat.lng, radius);
});
```

---

## 🏷️ Versionado

Seguimos [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH

Ejemplo: 7.0.1
         │ │ └─ PATCH: Correcciones de bugs
         │ └─── MINOR: Nueva funcionalidad (compatible)
         └───── MAJOR: Cambios incompatibles
```

---

## 🎯 Prioridades del Proyecto

Estas son las áreas donde más necesitamos ayuda:

1. **Alta Prioridad:**
   - Exportación a Excel/CSV/JSON
   - Modo edición de buffers (drag & drop)
   - Búsqueda por AMIE/nombre
   - Tests automatizados

2. **Media Prioridad:**
   - Algoritmos alternativos de optimización
   - Mejoras de UI/UX
   - Internacionalización (i18n)
   - Análisis de huérfanos

3. **Baja Prioridad:**
   - Backend opcional
   - Sistema de usuarios
   - API REST
   - Mobile app

---

## 📞 Contacto

¿Preguntas sobre cómo contribuir?

- 💬 Abre un [Discussion](../../discussions)
- 📧 Email: [insertar email del proyecto]
- 💬 Discord/Slack: [si aplica]

---

## 🙏 Reconocimientos

Todos los contribuidores serán agregados a:
- README.md (sección de créditos)
- CONTRIBUTORS.md (próximamente)

---

¡Gracias por contribuir a DECE Optimizer! 🎉
