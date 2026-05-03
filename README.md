# ♟️ Chess Clash - Professional Edition

Un juego de ajedrez profesional powered by **Stockfish**, con IA adaptativa, sistema ELO personalizable y estadísticas avanzadas.

## ⚡ Características Destacadas

- 🧠 **Motor Stockfish**: El mismo motor usado por profesionales y plataformas como Chess.com
- 🎯 **ELO Inicial Personalizable**: Elige tu nivel de partida (400/800/1200/1600)
- 📊 **Sistema FIDE Oficial**: Ranking ELO profesional con ajustes dinámicos
- 🎮 **5 Niveles de IA**: Desde principiante (400) hasta maestro (2400)

## 🚀 Ejecutar en Local

### Prerrequisitos

- Node.js 18+ o Bun
- npm, pnpm o bun

### Instalación

```bash
# 1. Instalar dependencias
npm install
# O con bun/pnpm:
bun install
pnpm install

# 2. Iniciar servidor de desarrollo
npm run dev
# O con bun/pnpm:
bun run dev
pnpm dev
```

El juego estará disponible en **`http://localhost:5173`**

### Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Compilar para producción |
| `npm run preview` | Previsualizar build de producción |
| `npm run lint` | Verificar código |

## ⚙️ Configuración de Desarrollo

El juego usa `@seaverse/data-sdk` para persistencia de datos. En desarrollo local, necesitas configurar un `appId`:

### Opción 1: Usar `.env.local` (Recomendado)

Ya existe un archivo `.env.local` con configuración de desarrollo:

```env
VITE_APP_ID=chess-clash-dev-local
VITE_DEV_MODE=true
```

### Opción 2: Cambiar el appId

Edita `.env.local` y cambia el `VITE_APP_ID`:

```env
VITE_APP_ID=tu-app-id-personalizado
```

### ⚠️ Nota Importante

- **En desarrollo (localhost)**: Se usa el appId de `.env.local`
- **En producción (SeaVerse iframe)**: El appId se obtiene automáticamente del parent

Los datos se guardan localmente en desarrollo y no interfieren con producción.

## 📱 Acceso desde Dispositivos Móviles

Para jugar desde tu teléfono en la misma red WiFi:

```bash
# 1. Encuentra tu IP local
# Windows:
ipconfig

# Mac/Linux:
ifconfig
```

Busca algo como `192.168.1.100`, luego abre en tu móvil:
```
http://192.168.1.100:5173
```

## 🎮 Características

### 🎯 Sistema de Juego
- ✅ **Motor de ajedrez**: Powered by **Stockfish** (motor de código abierto de nivel mundial)
- ✅ **IA con 5 niveles de dificultad** (400-2400 ELO)
- ✅ **ELO inicial personalizable**: El usuario elige su nivel inicial (400/800/1200/1600)
- ✅ **Sistema ELO profesional** (FIDE) con ajustes dinámicos
- ✅ **Detección de jaque mate** correcta
- ✅ **Movimientos especiales**: Enroque, captura al paso, promoción

### 📊 Estadísticas y Progreso
- ✅ **Estadísticas de piezas** detalladas
- ✅ **Historial de partidas** completo
- ✅ **Tabla de clasificación** global
- ✅ **Seguimiento de progreso** por nivel de IA

### 🎨 Experiencia de Usuario
- ✅ **Nombres de usuario personalizados**
- ✅ **Múltiples temas visuales**
- ✅ **Efectos de sonido** profesionales
- ✅ **100% Responsive** (móvil + tablet + escritorio)
- ✅ **Animaciones fluidas** y feedback visual

## 🔧 Solución de Problemas

### Error: "appId is required"

Asegúrate de que existe el archivo `.env.local` con:
```env
VITE_APP_ID=chess-clash-dev-local
```

Si el error persiste, reinicia el servidor de desarrollo:
```bash
# Ctrl+C para detener
npm run dev
```

### Error: "Port 5173 already in use"

```bash
# Mata el proceso que usa el puerto
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5173 | xargs kill -9
```

### Error: "Cannot find module"

```bash
# Borra node_modules y reinstala
rm -rf node_modules package-lock.json
npm install
```

## 📦 Compilar para Producción

```bash
npm run build
```

Los archivos optimizados estarán en `./dist/`:
- `index.html` (2.21 KB)
- `assets/index-*.css` (49 KB)
- `assets/index-*.js` (332 KB)

Total: ~384 KB | Comprimido (gzip): ~116 KB

## 🏗️ Tecnologías Utilizadas

### Frontend
- **React 19** - UI framework moderno
- **TypeScript** - Type safety y developer experience
- **Vite** - Build tool ultrarrápido
- **Tailwind CSS** - Utility-first styling

### Chess Engine
- **Stockfish.js** - Motor de ajedrez de código abierto (nivel Gran Maestro)
- **Evaluación posicional** avanzada
- **Algoritmo Minimax** con poda alfa-beta

### Servicios y Persistencia
- **@seaverse/data-sdk** - Persistencia de datos en la nube
- **@seaverse/auth-sdk** - Autenticación segura de usuarios

## 📁 Estructura del Proyecto

```
chess-clash/
├── src/
│   ├── components/       # Componentes reutilizables
│   │   └── ProfileSetup.tsx
│   ├── hooks/           # Custom React hooks
│   │   └── useChessGame.ts
│   ├── pages/           # Páginas principales
│   │   └── Home.tsx
│   ├── services/        # Lógica de negocio
│   │   ├── authService.ts
│   │   ├── dataService.ts
│   │   ├── openingBook.ts
│   │   └── victoryImageService.ts
│   ├── App.tsx          # Componente raíz
│   ├── main.tsx         # Entry point
│   └── index.css        # Estilos globales
├── .env.local           # Variables de entorno (desarrollo)
├── package.json         # Dependencias
├── vite.config.ts       # Configuración de Vite
└── tsconfig.json        # Configuración de TypeScript
```

## 🎯 Flujo de Autenticación y Configuración

1. **Autenticación**: Usuario se autentica vía SeaVerse (iframe)
2. **Perfil de Usuario**: Elige nombre de usuario personalizado
3. **Nivel Inicial**: Selecciona ELO inicial entre 4 opciones:
   - **400 ELO**: Principiante (aprendiendo los movimientos)
   - **800 ELO**: Básico (conoce las reglas)
   - **1200 ELO**: Intermedio (entiende estrategia básica) ⭐ Recomendado
   - **1600 ELO**: Avanzado (jugador experimentado)
4. **Persistencia**: Sistema crea perfil con `@seaverse/data-sdk`
5. **¡A jugar!**: Listo para enfrentar a la IA powered by Stockfish

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

---

**¿Preguntas?** Revisa este README o contacta al equipo de desarrollo.
