# 📦 Guía para Subir a GitHub

Esta guía te mostrará paso a paso cómo subir tu proyecto DECE Optimizer a GitHub.

---

## 📋 Checklist Pre-GitHub

Antes de subir, verifica que tengas todos estos archivos:

### ✅ Archivos Principales
- [ ] `README.md` - README principal
- [ ] `index-mejorado.html` - Página HTML
- [ ] `app-mejorado.js` - JavaScript consolidado
- [ ] `style.css` - Estilos CSS
- [ ] `servidor.py` - Servidor local
- [ ] `DECE_CRUCE_X_Y_NUC_SAT.csv` - Dataset

### ✅ Documentación
- [ ] `README-MEJORADO.md` - Documentación técnica
- [ ] `INICIO-RAPIDO.md` - Guía rápida
- [ ] `COMPARACION-VERSIONES.md` - Changelog detallado
- [ ] `INSTRUCCIONES-FINALES.md` - Guía completa
- [ ] `CONTRIBUTING.md` - Guía de contribución
- [ ] `CHANGELOG.md` - Historial de versiones

### ✅ Configuración
- [ ] `.gitignore` - Archivos a ignorar
- [ ] `LICENSE` - Licencia del proyecto

### ⚠️ Archivos Opcionales (Backup)
- [ ] `backup_original/` - Versión original (opcional)

---

## 🚀 Opción 1: GitHub Desktop (Más Fácil)

### Paso 1: Instalar GitHub Desktop

1. Descarga desde: https://desktop.github.com/
2. Instala y abre la aplicación
3. Inicia sesión con tu cuenta de GitHub

### Paso 2: Crear Repositorio

1. Click en **"File" → "New Repository"**
2. Llena el formulario:
   ```
   Name: DECE_PRODUCCION-main
   Description: Sistema de Optimización de Cobertura DECE
   Local Path: [ruta donde está tu proyecto]
   Initialize with README: NO (ya tienes uno)
   Git Ignore: None (ya tienes .gitignore)
   License: None (ya tienes LICENSE)
   ```
3. Click **"Create Repository"**

### Paso 3: Agregar Archivos

1. GitHub Desktop detectará automáticamente todos los archivos
2. Verifica que estén todos marcados
3. En "Summary" escribe:
   ```
   Initial commit - DECE Optimizer v7.0
   ```
4. Click **"Commit to main"**

### Paso 4: Publicar en GitHub

1. Click **"Publish Repository"**
2. Configura:
   ```
   Name: DECE_PRODUCCION-main
   Description: Sistema de Optimización de Cobertura DECE
   Keep this code private: [tu elección]
   Organization: [si aplica]
   ```
3. Click **"Publish Repository"**

### ✅ ¡Listo! Tu proyecto está en GitHub

---

## 💻 Opción 2: Línea de Comandos (Git)

### Paso 1: Instalar Git

**Windows:**
- Descarga desde: https://git-scm.com/download/win
- Instala con opciones por defecto

**Mac:**
```bash
# Git ya viene instalado
git --version

# Si no está, instala con Homebrew
brew install git
```

**Linux:**
```bash
sudo apt-get install git  # Ubuntu/Debian
sudo yum install git      # CentOS/RHEL
```

### Paso 2: Configurar Git (Primera vez)

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

### Paso 3: Inicializar Repositorio Local

```bash
# 1. Navega a la carpeta del proyecto
cd /ruta/a/DECE_PRODUCCION-main

# 2. Inicializa Git
git init

# 3. Agrega todos los archivos
git add .

# 4. Verifica qué archivos se agregarán
git status

# 5. Haz el primer commit
git commit -m "Initial commit - DECE Optimizer v7.0"
```

### Paso 4: Crear Repositorio en GitHub

1. Ve a: https://github.com/new
2. Llena el formulario:
   ```
   Repository name: DECE_PRODUCCION-main
   Description: Sistema de Optimización de Cobertura DECE
   Public/Private: [tu elección]
   Initialize with README: NO
   Add .gitignore: None
   Add license: None
   ```
3. Click **"Create repository"**

### Paso 5: Conectar y Subir

GitHub te mostrará comandos, usa estos:

```bash
# 1. Agrega el repositorio remoto
git remote add origin https://github.com/TU-USUARIO/DECE_PRODUCCION-main.git

# 2. Verifica que se agregó
git remote -v

# 3. Sube los archivos
git push -u origin main
```

Si te pide credenciales:
- Usuario: tu username de GitHub
- Password: tu Personal Access Token (no tu contraseña)

**Crear Personal Access Token:**
1. Ve a: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Selecciona scope: `repo`
4. Copia el token generado

### ✅ ¡Listo! Archivos subidos

---

## 🔐 Configurar Personal Access Token

### Generar Token

1. Ve a GitHub → Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Dale un nombre: `DECE Optimizer`
4. Selecciona permisos:
   - ✅ `repo` (todos los sub-permisos)
5. Click "Generate token"
6. **COPIA EL TOKEN** (solo se muestra una vez)

### Usar Token

Cuando Git pida contraseña, usa el token en lugar de tu contraseña de GitHub.

**Guardar credenciales (opcional):**
```bash
# Para no tener que ingresar el token cada vez
git config --global credential.helper store

# En el próximo push, ingresa el token
# Se guardará automáticamente
```

---

## 📊 Verificar Qué se Subirá

### Antes del Commit

```bash
# Ver archivos modificados
git status

# Ver cambios específicos
git diff

# Ver qué archivos se ignorarán
git status --ignored
```

### Archivos que NO se subirán (según .gitignore)

- `__pycache__/`
- `*.pyc`
- `node_modules/`
- `.DS_Store`
- `Thumbs.db`
- `.vscode/`
- `backup/`
- Otros temporales

---

## 🎯 Estructura Final en GitHub

```
https://github.com/TU-USUARIO/DECE_PRODUCCION-main/
│
├── README.md                     ← Se muestra en homepage
├── LICENSE                       ← Tipo de licencia
├── .gitignore                    ← Archivos ignorados
│
├── 📄 index-mejorado.html
├── 📜 app-mejorado.js
├── 🎨 style.css
├── 🐍 servidor.py
├── 📊 DECE_CRUCE_X_Y_NUC_SAT.csv (si no es muy grande)
│
├── 📁 docs/
│   ├── README-MEJORADO.md
│   ├── INICIO-RAPIDO.md
│   ├── COMPARACION-VERSIONES.md
│   ├── INSTRUCCIONES-FINALES.md
│   ├── CONTRIBUTING.md
│   └── CHANGELOG.md
│
└── 📁 backup_original/ (opcional)
```

---

## ⚠️ Consideraciones Importantes

### Tamaño del CSV

El archivo `DECE_CRUCE_X_Y_NUC_SAT.csv` es de 6.5 MB.

**Opciones:**

1. **Subirlo a GitHub** (Recomendado si <50 MB)
   - Funciona bien para este tamaño
   - Usuarios pueden clonar y usar directamente

2. **No subirlo** (si prefieres)
   - Agrégalo a `.gitignore`:
     ```
     DECE_CRUCE_X_Y_NUC_SAT.csv
     ```
   - Provee link de descarga en README:
     ```markdown
     ## Descarga de Datos
     
     El archivo CSV debe descargarse por separado:
     [Descargar CSV](https://link-a-drive/archivo.csv)
     ```

3. **GitHub LFS** (si el archivo crece >50 MB en el futuro)
   ```bash
   git lfs install
   git lfs track "*.csv"
   git add .gitattributes
   ```

### Archivos Sensibles

**¿El CSV contiene datos sensibles?**

Si SÍ:
- No lo subas a GitHub público
- Usa repositorio privado
- O provee dataset de ejemplo (datos ficticios)

Si NO:
- Súbelo normalmente

---

## 📝 Configurar el README de GitHub

El archivo `README.md` ya está optimizado para GitHub y mostrará:

- 🎯 Descripción del proyecto
- ⭐ Badges (estrellas, forks, etc.)
- 🚀 Instrucciones de instalación
- 📊 Capturas de pantalla (necesitas agregarlas)
- 📖 Documentación
- 🤝 Cómo contribuir

### Agregar Capturas de Pantalla

1. Crea carpeta: `docs/screenshots/`
2. Agrega imágenes:
   ```
   docs/screenshots/
   ├── dashboard.png
   ├── mapa.png
   └── estadisticas.png
   ```
3. Commit y push:
   ```bash
   git add docs/screenshots/
   git commit -m "docs: agrega capturas de pantalla"
   git push
   ```

---

## 🏷️ Crear Releases

### Primera Release (v7.0.0)

1. Ve a tu repo en GitHub
2. Click en **"Releases"** → **"Create a new release"**
3. Llena:
   ```
   Tag version: v7.0.0
   Release title: DECE Optimizer v7.0 - Refactorización Completa
   Description: [copia desde CHANGELOG.md]
   ```
4. Puedes adjuntar archivos ZIP si quieres
5. Click **"Publish release"**

### Releases Futuras

```bash
# Cuando hagas cambios importantes
git tag -a v7.1.0 -m "Release v7.1.0"
git push origin v7.1.0
```

Luego crea el release en GitHub apuntando a ese tag.

---

## 🌟 Configurar GitHub Pages (Opcional)

Para tener una demo online:

1. Ve a Settings → Pages
2. Source: Deploy from branch
3. Branch: `main` → `/` (root)
4. Save

Tu app estará en:
```
https://TU-USUARIO.github.io/DECE_PRODUCCION-main/index-mejorado.html
```

**⚠️ Importante:** El CSV debe estar en el repo para que funcione.

---

## 🔄 Workflow Después de Subir

### Hacer Cambios

```bash
# 1. Haz tus cambios en el código

# 2. Ve qué cambió
git status
git diff

# 3. Agrega cambios
git add .

# 4. Commit
git commit -m "feat: agrega nueva funcionalidad X"

# 5. Sube a GitHub
git push
```

### Actualizar desde GitHub

```bash
# Si alguien más hizo cambios
git pull
```

---

## 🎨 Personalizar README en GitHub

Edita `README.md` y actualiza:

1. **Badges** (línea 6-9):
   ```markdown
   [![Python](https://img.shields.io/badge/Python-3.6+-blue.svg)]
   ```

2. **Tu usuario** (busca y reemplaza):
   ```
   Buscar: tu-usuario
   Reemplazar: TU-GITHUB-USERNAME
   ```

3. **Contacto** (final del README):
   ```markdown
   - 📧 Email: tu-email@ejemplo.com
   ```

4. **Screenshots** (cuando las tengas):
   ```markdown
   ![Dashboard](docs/screenshots/dashboard.png)
   ```

---

## ✅ Checklist Final

Antes de compartir el repositorio:

- [ ] Todos los archivos están subidos
- [ ] README.md se ve bien en GitHub
- [ ] LICENSE está configurada correctamente
- [ ] .gitignore funciona (no hay archivos sensibles)
- [ ] Capturas de pantalla agregadas (opcional)
- [ ] Release v7.0.0 creada
- [ ] Descripción del repo está completa
- [ ] Topics/tags agregados al repo
- [ ] Repo es público/privado según tu preferencia

### Agregar Topics al Repo

En GitHub:
1. Click en ⚙️ junto al "About"
2. Agrega topics:
   ```
   gis, optimization, ecuador, education, leaflet, 
   geospatial, set-cover, dece, educational-software
   ```

---

## 🆘 Problemas Comunes

### "Repository not found"
```bash
# Verifica la URL
git remote -v

# Si está mal, corrige
git remote set-url origin https://github.com/TU-USUARIO/DECE_PRODUCCION-main.git
```

### "Permission denied"
- Verifica que estés usando el token correcto
- Verifica que el token tenga permisos de `repo`

### "Large files detected"
```bash
# Si el CSV es muy grande (>100 MB)
# Usa Git LFS
git lfs install
git lfs track "*.csv"
```

### "Unable to push"
```bash
# Primero pull, luego push
git pull
git push
```

---

## 📚 Recursos Adicionales

- [GitHub Docs](https://docs.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Markdown Guide](https://www.markdownguide.org/)
- [GitHub Desktop Docs](https://docs.github.com/en/desktop)

---

## 🎉 ¡Listo!

Tu proyecto DECE Optimizer ahora está en GitHub y listo para compartir con el mundo! 🚀

**Próximos pasos:**
1. Comparte el link del repo
2. Invita colaboradores
3. Acepta contribuciones
4. ¡Disfruta del proyecto open source!
