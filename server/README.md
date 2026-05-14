# Marea — Server

Backend REST API para [Marea](../README.md): Node + Express + TypeScript + Prisma + PostgreSQL + JWT.

## 🚀 Setup

```bash
# 1. Asegúrate de que tu Podman machine está corriendo
podman machine start         # solo la primera vez del día

# 2. Desde /server:
cd server
npm install

# 3. Levanta Postgres (puerto 5433, no choca con un Postgres nativo en 5432)
npm run db:up                # corre `podman compose up -d`

# 4. Migra el schema y siembra datos demo
npm run prisma:migrate -- --name init
npm run seed

# 5. Arranca el server en modo dev (con hot-reload)
npm run dev
```

> Si usas Docker en vez de Podman: los scripts `db:up` / `db:down` invocan `podman compose`, pero `compose.yml` es estándar — puedes correr `docker compose up -d` manualmente y todo funciona igual.

API queda en **http://localhost:4000**.

### Credenciales demo (después del seed)

```
email: demo@marea.app
password: demo1234
```

## 📡 Endpoints

Todas las rutas (excepto `/api/auth/register` y `/api/auth/login`) requieren `Authorization: Bearer <token>`.

### Auth
| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | `{ name, email, password }` | Crea usuario y devuelve `{ user, token }` |
| `POST` | `/api/auth/login` | `{ email, password }` | Devuelve `{ user, token }` |
| `GET` | `/api/auth/me` | — | Usuario actual |
| `PATCH` | `/api/auth/me` | `{ name?, payday?, monthlyIncome?, onboardingStep?, ... }` | Actualiza perfil |

### Cuentas de débito
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/accounts` | Lista cuentas |
| `POST` | `/api/accounts` | Crea cuenta |
| `PATCH` | `/api/accounts/:id` | Edita cuenta |
| `DELETE` | `/api/accounts/:id` | Elimina cuenta |

### Tarjetas de crédito
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/cards` | Lista tarjetas |
| `POST` | `/api/cards` | Crea tarjeta |
| `PATCH` | `/api/cards/:id` | Edita tarjeta |
| `DELETE` | `/api/cards/:id` | Elimina tarjeta |

### Gastos
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` `POST` | `/api/fixed-expenses` | Gastos fijos recurrentes |
| `PATCH` `DELETE` | `/api/fixed-expenses/:id` | Edita/elimina |
| `POST` | `/api/fixed-expenses/:id/toggle-paid` | `{ cycle: "2026-05" }` — marca/desmarca pagado |
| `GET` `POST` | `/api/card-expenses` | Gastos con tarjeta de crédito (calcula `billingCycle` y `dueDate` automáticamente) |
| `DELETE` | `/api/card-expenses/:id` | Elimina y reduce saldo |
| `GET` `POST` | `/api/debit-expenses` | Gastos con débito (descuenta del saldo) |
| `DELETE` | `/api/debit-expenses/:id` | Elimina y devuelve el monto |

### Préstamos
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` `POST` | `/api/loans` | — |
| `PATCH` `DELETE` | `/api/loans/:id` | — |
| `POST` | `/api/loans/:id/payments` | `{ extra?: number }` — registra mensualidad con amortización |

### MSI
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` `POST` | `/api/msi` | — |
| `DELETE` | `/api/msi/:id` | — |
| `POST` | `/api/msi/:id/payments` | Incrementa `monthsPaid` |

### Metas
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` `POST` | `/api/goals` | — |
| `PATCH` `DELETE` | `/api/goals/:id` | — |
| `POST` | `/api/goals/:id/contributions` | `{ amount, note? }` — marca `completedAt` cuando se alcanza el objetivo |

### Health
| Método | Ruta |
|--------|------|
| `GET` | `/api/health` |

## 🗄️ Modelo de datos

Ver [`prisma/schema.prisma`](prisma/schema.prisma). Entidades:

- **User** (con hash bcrypt y `onboardingStep`)
- **Account** (cuentas de débito)
- **CreditCard** (con `cutoffDay`, `dueDay`)
- **FixedExpense** (con `sourceKind` + `sourceId` polimórfico)
- **CreditCardExpense** (con `billingCycle` calculado, `dueDate`)
- **DebitExpense**
- **Loan** + **LoanPayment** (con amortización)
- **MSIPurchase** + **MSIPayment**
- **SavingsGoal** + **SavingsContribution**

Borrado en cascada en todas las relaciones a `User`.

## 🔐 Seguridad

- Passwords con `bcryptjs` (cost 10)
- JWT firmado con `JWT_SECRET` (ver `.env.example`)
- Middleware `requireAuth` valida bearer token y agrega `req.userId`
- Todas las queries filtran por `userId` (no hay forma de cruzar datos entre usuarios)
- Validación de input con Zod en cada ruta

## 🧪 Probar manualmente

```bash
# Health
curl http://localhost:4000/api/health

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@marea.app","password":"demo1234"}'

# Listar cuentas (usa el token del login)
TOKEN=...
curl http://localhost:4000/api/accounts -H "Authorization: Bearer $TOKEN"
```

## 📜 Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Hot-reload con `tsx watch` |
| `npm run build` | Compila a `dist/` |
| `npm run start` | Corre el build de producción |
| `npm run db:up` / `db:down` | Levanta/baja Postgres con Docker |
| `npm run prisma:generate` | Regenera el cliente Prisma |
| `npm run prisma:migrate` | Crea/aplica migraciones (dev) |
| `npm run prisma:reset` | Reset completo + reseed |
| `npm run seed` | Solo siembra |

## 🛠️ Estructura

```
server/
├── docker-compose.yml         # Postgres 16 en :5433
├── .env.example
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                # mocks del cliente portados a la BD
└── src/
    ├── index.ts               # bootstrap Express
    ├── lib/
    │   ├── env.ts             # Zod sobre process.env
    │   ├── prisma.ts          # singleton del cliente
    │   ├── jwt.ts
    │   └── finance.ts         # mirror de la lógica de ciclos
    ├── middleware/
    │   ├── auth.ts            # requireAuth (bearer JWT)
    │   └── error.ts           # ZodError + asyncHandler
    └── routes/
        ├── auth.ts
        ├── accounts.ts
        ├── cards.ts
        ├── fixedExpenses.ts
        ├── cardExpenses.ts
        ├── debitExpenses.ts
        ├── loans.ts
        ├── msi.ts
        └── goals.ts
```

## 🔜 Siguiente paso: conectar el cliente

Pendiente cablear el cliente al backend (cambiar Zustand persist por llamadas HTTP). Sugerencia:

1. Crear `src/lib/api.ts` en el cliente con `fetch` wrappers que adjunten el JWT
2. Reemplazar `useFinance` por React Query (TanStack Query) → cachea, sincroniza y maneja loading states
3. Mover el `JWT_SECRET` y `DATABASE_URL` reales a variables de entorno antes de desplegar
