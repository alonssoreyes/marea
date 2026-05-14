# Marea

> Entiende el flujo y reflujo de tu dinero.

Aplicación web de gestión financiera personal centrada en el **ciclo de pago mensual** del usuario. Pensada para personas que cobran un día específico (ej. día 14) y necesitan distribuir su dinero entre cuentas, tarjetas, gastos fijos, deudas y metas a lo largo de la quincena.

## 🎯 Estado actual

- **Frontend completo** con UI funcional ([detalles abajo](#-frontend))
- **Backend completo** con Express + Prisma + Postgres + JWT ([`server/`](server/README.md))
- **Dos modos de operación**:
  - **Demo** (default): datos en `localStorage`, cualquier credencial entra, no requiere backend
  - **Live**: el cliente registra/autentica contra el API, y al iniciar sesión hidrata el estado con los datos reales del usuario desde Postgres
- 🚧 **Migración parcial**: en *live* mode, auth + onboarding ya sincronizan con el backend. Las mutaciones de tarjetas, gastos, deudas y metas aún se quedan en el estado local hasta refrescar — ver [Cómo migrar mutaciones](#-cómo-migrar-mutaciones-pendientes)

### Cómo correr

```bash
# Frontend (usa mock data en localStorage)
npm install
npm run dev                # → http://localhost:5173

# Backend (requiere Podman machine corriendo)
cd server
npm install
podman machine start       # si aún no está
npm run db:up              # Postgres en :5433
npm run prisma:migrate -- --name init
npm run seed
npm run dev                # → http://localhost:4000
```

Credenciales demo (después del seed del backend): `demo@marea.app` / `demo1234`.

## 🗂️ Estructura

```
Marea/
├── src/                   # Frontend (React + Vite)
├── server/                # Backend (Express + Prisma + Postgres)
│   ├── prisma/
│   ├── docker-compose.yml
│   └── README.md          # docs detalladas del API
└── README.md              # este archivo
```

## 🔌 Cómo conecta el cliente al backend

Cuando inicias sesión con el toggle **"Backend real"**:

1. `POST /api/auth/login` devuelve `{ user, token }` — el token se guarda en `useAuth` (Zustand persist)
2. `useBootstrap()` (en `Layout.tsx`) corre y hace **una sola** carga en paralelo de las 9 colecciones (`/auth/me`, `/accounts`, `/cards`, `/fixed-expenses`, `/card-expenses`, `/debit-expenses`, `/loans`, `/msi`, `/goals`)
3. Los adaptadores en [`src/lib/adapters.ts`](src/lib/adapters.ts) convierten los `Decimal` que serializa Prisma (strings) y los renames del schema (`cardLimit`/`limit`, `sourceKind`+`sourceId`/`source`) al shape que usa el cliente
4. `hydrateFromServer()` reemplaza todas las colecciones de Zustand de una sentada
5. Las páginas leen `useFinance` exactamente igual — no saben si vino de localStorage o del API

El proxy de Vite ([`vite.config.ts`](vite.config.ts)) redirige `/api/*` a `http://localhost:4000`, así que no hay CORS en dev.

### Visual: pill "Live" en la topbar
Cuando estás en modo live, aparece un pill azul `🔵 Live` en la barra superior junto al icono de notificaciones — pa' que sepas en qué modo andas.

## 🛠️ Cómo migrar mutaciones pendientes

Hoy, en *live* mode, las mutaciones (`addCard`, `addAccount`, etc.) solo actualizan el estado local. Refrescando se pierden los cambios porque `useBootstrap` vuelve a leer del servidor.

Patrón para migrar cada página (ejemplo con cuentas):

```tsx
// antes:
const addAccount = useFinance((s) => s.addAccount);
// ...
addAccount({ bank, alias, balance });

// después:
const mode = useAuth((s) => s.mode);
const addAccount = useFinance((s) => s.addAccount);
// ...
const handle = async () => {
  if (mode === "live") {
    const { account } = await accountsApi.create({ bank, alias, balance });
    // hidrata con la versión "oficial" del server (lleva id, createdAt, etc)
    addAccount(toAccount(account));   // o un nuevo `injectAccount` que no genere id
  } else {
    addAccount({ bank, alias, balance });
  }
};
```

Mejor todavía: introducir [TanStack Query](https://tanstack.com/query) y dejar que él maneje cache + sync. Lo dejé por simplicidad — Zustand sigue funcionando muy bien para esta escala.

## 🖥️ Frontend

## 🧰 Stack

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** con paleta personalizada blanco/azul (sin verdes ni amarillos)
- **shadcn-style UI** con Radix UI primitives (Dialog, Tabs, Progress, Label)
- **Recharts** para gráficas
- **Zustand** + persist para estado global
- **React Router v6**
- **date-fns** con locale `es`
- **Lucide React** para iconografía

## 🚀 Instalación

```bash
cd Marea
npm install
npm run dev
```

Abre http://localhost:5173

### Credenciales demo
- email: cualquiera (por defecto `demo@marea.app`)
- password: cualquiera

Los datos demo precargados incluyen 3 cuentas de débito, 3 tarjetas, 6 gastos fijos, varios gastos con tarjeta, 2 préstamos, 3 MSI y 3 metas de ahorro.

## 📐 Estructura del proyecto

```
Marea/
├── public/
│   └── marea.svg              # favicon (ondas marea)
├── src/
│   ├── main.tsx               # bootstrap
│   ├── App.tsx                # router
│   ├── index.css              # tailwind + estilos globales
│   ├── components/
│   │   ├── Layout.tsx         # sidebar + topbar
│   │   ├── Sidebar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── ui/                # primitives (Button, Card, Input, Dialog, Tabs, Progress, Badge, EmptyState, Label)
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Onboarding.tsx     # wizard de 5 pasos
│   │   ├── Dashboard.tsx
│   │   ├── Cards.tsx          # módulo de tarjetas + ciclo de facturación
│   │   ├── FixedExpenses.tsx
│   │   ├── Debts.tsx          # préstamos + MSI
│   │   ├── Goals.tsx
│   │   └── Notifications.tsx
│   ├── store/
│   │   ├── auth.ts            # Zustand auth
│   │   └── data.ts            # Zustand finanzas
│   ├── lib/
│   │   ├── utils.ts           # cn(), uid()
│   │   ├── format.ts          # currency, dates (MXN, es-MX)
│   │   └── finance.ts         # ciclo, amortización, clasificación de gastos
│   ├── data/
│   │   └── mock.ts            # seed
│   ├── hooks/
│   │   └── useNotifications.ts
│   └── types/
│       └── index.ts
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

## 🧠 Lógica financiera implementada

### Ciclo del usuario (`getFinancialCycle`)
El "mes financiero" va del día de pago (por defecto 14) al día anterior al siguiente día de pago. Ejemplo: para payday=14, el ciclo de mayo va del 14 de mayo al 13 de junio.

### Clasificación de gastos con tarjeta (`classifyCardExpense`)
Cuando registras un gasto con tarjeta, Marea calcula automáticamente:
- A qué **ciclo de facturación** pertenece (antes/después del corte)
- En qué **fecha vence** el pago
- Te lo muestra explícitamente: *"Este gasto se incluirá en tu estado de cuenta de mayo 2026, con vencimiento el 25 de junio"*

### Proyección de préstamos (`projectLoanPayoff`)
Amortización francesa (mensualidad fija). Simula:
- En cuántos meses terminas con la mensualidad actual
- Cuánto pagarás en intereses
- Si agregas $X extra por mes: cuántos meses ahorras y cuánto pagas menos de intereses

### Saldo disponible real
`Cuentas de débito − Gastos fijos pendientes − Mensualidades de préstamos/MSI`

### Recomendaciones de metas
Si la meta tiene fecha objetivo: calcula cuánto debes apartar por mes/semana. Si no tiene fecha: estima cuántos meses tomaría usando el ~10% del saldo disponible.

## 🎨 Decisiones de diseño

- **Mobile-first**: el sidebar colapsa en móvil con un drawer
- **Sin verdes ni amarillos**: paleta exclusiva blancos + azules (`#1E3A5F`, `#2563EB`, `#EFF6FF`, `#BFDBFE`)
- **Inter** como tipografía
- Sombras y bordes sutiles, animaciones suaves (`fade-in`, `scale-in`)
- Iconografía consistente con **Lucide**

## 🔜 Siguiente iteración (backend)

Cuando armemos el backend:
- Monorepo con `/apps/server` (Node + Express + Prisma + Postgres) y `/apps/client` (este proyecto)
- Schema Prisma con todas las entidades del archivo `src/types/index.ts`
- Endpoints REST con validación Zod
- Auth JWT + bcrypt
- Docker compose con Postgres
- Migrar Zustand de `localStorage` a llamadas HTTP

## 📝 Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Arranca Vite dev server en http://localhost:5173 |
| `npm run build` | Build de producción (output en `dist/`) |
| `npm run preview` | Sirve el build de producción |

## 💡 Tips

- **Restaurar datos demo**: en la sidebar, debajo del menú, hay un botón "Restaurar datos demo" que reinicia el store con los mocks
- **Onboarding**: tras registrarte, el store arranca vacío y el wizard te guía paso a paso
- **Cambiar nombre del proyecto**: si "Marea" no te late, busca y reemplaza globalmente
