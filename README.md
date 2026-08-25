# PetMatch 🐾

**Plataforma web full-stack de gestión y adopción responsable de mascotas.**

PetMatch conecta a personas que quieren adoptar con refugios que necesitan encontrar
hogar para sus rescatados, y le da a cada uno las herramientas que necesita: un
catálogo con búsqueda y filtros, un proceso de adopción con estados y entrevistas,
y paneles de gestión para refugios y administradores.

> Proyecto académico del curso de **Herramientas de Desarrollo**.
> Implementa la especificación funcional completa de `PETMATCH.pdf` (versión 1.0).

---

## Tabla de contenidos

1. [Descripción](#descripción)
2. [Objetivos](#objetivos)
3. [Funcionalidades](#funcionalidades)
4. [Tecnologías](#tecnologías)
5. [Arquitectura](#arquitectura)
6. [Instalación](#instalación)
7. [Configuración](#configuración)
8. [Variables de entorno](#variables-de-entorno)
9. [Base de datos](#base-de-datos)
10. [Ejecución](#ejecución)
11. [API REST](#api-rest)
12. [Usuarios de prueba](#usuarios-de-prueba)
13. [Testing](#testing)
14. [Flujo de trabajo con Git](#flujo-de-trabajo-con-git)
15. [Deployment](#deployment)
16. [Estructura del repositorio](#estructura-del-repositorio)
17. [Equipo](#equipo)
18. [Licencia](#licencia)

---

## Descripción

PetMatch no es un catálogo de mascotas: es un sistema de adopción completo con tres
roles, un flujo de estados real y trazabilidad de cada acción administrativa.

| Rol | Qué puede hacer |
| --- | --- |
| **ADOPTANTE** | Explorar, buscar y filtrar mascotas, guardar favoritos, enviar solicitudes de adopción, consultar sus entrevistas, adopciones y notificaciones. |
| **REFUGIO** | Administrar su perfil, registrar y editar mascotas con galería de fotos, revisar solicitudes, programar entrevistas, registrar adopciones y consultar estadísticas. |
| **ADMINISTRADOR** | Supervisar usuarios, refugios, mascotas, solicitudes y adopciones; verificar o suspender refugios; consultar reportes y el registro de auditoría. |

## Objetivos

**General.** Desarrollar una plataforma web full-stack que facilite la adopción
responsable de mascotas y permita a los refugios gestionar digitalmente sus animales
y solicitudes.

**Específicos.** Registro y autenticación con JWT, autorización por roles, CRUD de
mascotas con imágenes, búsqueda y filtros combinables, favoritos, solicitudes con
máquina de estados, entrevistas, adopciones, notificaciones, dashboards, reportes,
auditoría, API REST documentada, validaciones, manejo de errores, pruebas
automatizadas, uso profesional de Git/GitHub y despliegue.

## Funcionalidades

### Área pública
- Página de inicio con estadísticas reales de la plataforma y mascotas destacadas.
- Exploración con **búsqueda** por nombre, raza, ciudad o refugio.
- **Filtros combinables**: especie, sexo, edad, tamaño, estado, ciudad, región,
  refugio y ocho características (vacunado, esterilizado, desparasitado,
  compatible con niños/perros/gatos, sociable, cuidados especiales).
- **Ordenamiento** (recientes, antiguos, A-Z, Z-A) y **paginación** de 12 por página.
- Perfil completo de la mascota con galería, información médica y compatibilidad.
- Directorio de refugios verificados y perfil público con contadores.

### Adoptante
- Favoritos con aviso cuando una mascota guardada deja de estar disponible.
- Formulario de solicitud con datos personales, vivienda, experiencia, motivación
  y declaración de veracidad.
- Seguimiento del estado, cancelación cuando corresponde, agenda de entrevistas,
  historial de adopciones y bandeja de notificaciones.

### Refugio
- Alta del perfil y verificación por parte de un administrador.
- CRUD de mascotas con galería de fotografías y cambio de estado.
- Bandeja de solicitudes con el flujo completo: revisión → entrevista →
  aprobación/rechazo → registro de la adopción.
- Dashboard con métricas y sección de estadísticas propias.

### Administrador
- Dashboard global, gestión de usuarios (suspender/reactivar/eliminar),
  verificación y suspensión de refugios, supervisión de mascotas y solicitudes.
- Reportes de adopciones (por mes, ciudad y especie), mascotas, solicitudes y
  refugios, incluido el ranking de refugios con más adopciones.
- Registro de auditoría con autor, acción, entidad y fecha.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19 · React Router 7 · Vite 6 · lucide-react |
| Backend | Node.js 22 · Express 5 |
| Base de datos | PostgreSQL 16+ (SQL nativo con `pg`, sin ORM) |
| Autenticación | JWT (`jsonwebtoken`) · `bcryptjs` |
| Validación | Zod |
| Seguridad | Helmet · CORS · express-rate-limit |
| Documentación | OpenAPI 3.0.3 · Swagger UI |
| Testing | `node:test` + Supertest (backend) · Vitest + Testing Library (frontend) |
| Infraestructura | Docker Compose · Render · Vercel |

> **Nota sobre el runner de pruebas.** La especificación sugiere Jest; el proyecto
> usa el runner nativo de Node (`node --test`) junto a Supertest. Cubre lo mismo
> sin necesidad de transpilar ni configurar ESM, y no añade dependencias.

## Arquitectura

Arquitectura en capas, con una regla clara: **las reglas de negocio viven en una
sola capa**. Los modelos sólo leen y escriben datos; los servicios deciden.

```
Petición HTTP
   ↓  routes/        Definen endpoints y encadenan middlewares
   ↓  middleware/    Autenticación, autorización, validación, errores
   ↓  validators/    Esquemas Zod de body, query y params
   ↓  controllers/   Traducen HTTP ↔ dominio (sin lógica de negocio)
   ↓  services/      Reglas de negocio, permisos, notificaciones, auditoría
   ↓  models/        Acceso a datos (PostgreSQL o memoria)
   ↓  PostgreSQL
```

**Doble motor de persistencia.** Si `DATABASE_URL` está definida, la API usa
PostgreSQL; si no, arranca con un almacén en memoria precargado con datos de
demostración. Como las reglas viven en los servicios y no en los modelos, ambos
modos se comportan igual: **la misma suite de pruebas pasa contra los dos**.

Documentación ampliada:
- [`docs/architecture/`](docs/architecture/README.md) — capas, decisiones y flujos.
- [`docs/database/`](docs/database/README.md) — modelo relacional y diagrama ER.
- [`docs/api/`](docs/api/README.md) — referencia de endpoints.
- [`docs/deployment.md`](docs/deployment.md) — despliegue paso a paso.

## Instalación

### Requisitos
- Node.js **20.11 o superior** (recomendado 22 LTS)
- npm 10+
- PostgreSQL 14+ *(opcional: sin él la API funciona en modo memoria)*

### Pasos

```bash
git clone <url-del-repositorio>
cd petmatch

# 1. Dependencias (monorepo con workspaces: instala backend y frontend)
npm install

# 2. Variables de entorno
cp .env.example .env      # en Windows: copy .env.example .env

# 3. Base de datos (omitir para probar en modo memoria)
npm run db:migrate
npm run db:seed

# 4. Arrancar backend y frontend a la vez
npm run dev
```

Abre <http://localhost:5173>. La API queda en <http://localhost:4000/api> y la
documentación interactiva en <http://localhost:4000/api/docs>.

> Atajo: `npm run setup` hace la instalación, las migraciones y el seed de una vez.

### Con Docker

```bash
# Sólo PostgreSQL (recomendado para desarrollar)
docker compose up -d db

# Todo el stack: base de datos + API + frontend en http://localhost:8080
docker compose --profile full up --build
```

## Configuración

`npm install` desde la raíz instala ambos workspaces. El frontend en desarrollo no
necesita `VITE_API_URL`: Vite hace **proxy** de `/api` hacia el backend, así que no
hay URLs de `localhost` incrustadas en el código.

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). Las esenciales:

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | En producción | Cadena de conexión de PostgreSQL. Vacía ⇒ modo memoria. |
| `JWT_SECRET` | En producción | Secreto para firmar los tokens. |
| `PORT` | No | Puerto de la API (por defecto `4000`). |
| `FRONTEND_URL` | No | Origen autorizado por CORS. |
| `API_URL` | No | URL pública de la API mostrada en Swagger. |
| `BCRYPT_ROUNDS` | No | Coste del hash de contraseñas (por defecto `12`). |
| `VITE_API_URL` | En producción | URL de la API que consume el frontend. |

En producción la aplicación **se niega a arrancar** sin `DATABASE_URL` y
`JWT_SECRET`, para no usar el secreto de desarrollo por descuido.
El archivo `.env` está en `.gitignore` y nunca debe subirse al repositorio.

## Base de datos

Doce tablas relacionadas: `roles`, `users`, `shelters`, `pets`, `pet_images`,
`pet_attributes`, `favorites`, `adoption_requests`, `adoption_interviews`,
`adoptions`, `notifications` y `audit_logs`.

```bash
npm run db:migrate   # aplica las migraciones pendientes (idempotente)
npm run db:seed      # carga datos de demostración
npm run db:reset     # borra todo y vuelve a sembrar
```

Las migraciones viven en [`database/migrations/`](database/migrations/) y se
registran en la tabla `schema_migrations`: cada archivo se aplica una sola vez y
dentro de su propia transacción. El detalle del modelo está en
[`docs/database/README.md`](docs/database/README.md).

## Ejecución

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Backend con recarga + frontend con Vite |
| `npm run dev:api` | Sólo la API (`http://localhost:4000`) |
| `npm run dev:web` | Sólo el frontend (`http://localhost:5173`) |
| `npm run build` | Compila el frontend en `frontend/dist` |
| `npm start` | Arranca la API en modo producción |
| `npm test` | Ejecuta las pruebas de backend y frontend |

## API REST

Formato de respuesta uniforme:

```jsonc
// Éxito
{ "success": true, "data": { "id": 25, "name": "Luna" } }

// Listado paginado
{ "success": true, "data": [], "pagination": { "page": 1, "limit": 12, "total": 124, "totalPages": 11 } }

// Error
{ "success": false, "message": "La mascota no existe" }
```

Códigos usados: `200` `201` `204` `400` `401` `403` `404` `409` `422` `500`.

### Endpoints principales

| Recurso | Endpoints |
| --- | --- |
| Autenticación | `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` · `PATCH /auth/password` |
| Usuarios | `GET /users` · `GET /users/:id` · `PUT /users/:id` · `PATCH /users/:id/status` · `DELETE /users/:id` |
| Mascotas | `GET /pets` · `GET /pets/:id` · `POST /pets` · `PUT /pets/:id` · `PATCH /pets/:id/status` · `DELETE /pets/:id` |
| Imágenes | `GET /pets/:id/images` · `POST /pets/:id/images` · `DELETE /pets/:id/images/:imageId` |
| Favoritos | `GET /favorites` · `GET /favorites/ids` · `POST /favorites/:petId` · `DELETE /favorites/:petId` |
| Solicitudes | `GET /adoptions/requests` · `GET /adoptions/requests/:id` · `POST /adoptions/requests` · `PATCH /adoptions/requests/:id/status` · `DELETE /adoptions/requests/:id` |
| Entrevistas | `GET /adoptions/requests/:id/interviews` · `POST /adoptions/requests/:id/interviews` · `GET /interviews` · `PUT /interviews/:id` |
| Adopciones | `GET /adoptions` · `GET /adoptions/:id` · `POST /adoptions` |
| Refugios | `GET /shelters` · `GET /shelters/me` · `GET /shelters/:id` · `GET /shelters/:id/pets` · `POST /shelters` · `PUT /shelters/:id` · `PATCH /shelters/:id/status` |
| Notificaciones | `GET /notifications` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all` |
| Reportes | `GET /reports/adoptions` · `GET /reports/pets` · `GET /reports/requests` · `GET /reports/shelters` |
| Administración | `GET /admin/dashboard` · `GET /admin/audit` · `GET /admin/users` · `GET /admin/shelters` |
| Generales | `GET /health` · `GET /stats` · `GET /workspace` |

Ejemplos de filtros:

```http
GET /api/pets?species=Perro&size=Mediano&status=DISPONIBLE
GET /api/pets?city=arequipa&vaccinated=true&goodWithChildren=true
GET /api/pets?search=labrador&sort=name-asc&page=2&limit=12
```

**Documentación interactiva:** <http://localhost:4000/api/docs> ·
**OpenAPI JSON:** <http://localhost:4000/api/docs/openapi.json>

## Usuarios de prueba

Disponibles tras ejecutar `npm run db:seed`:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@petmatch.com` | `Admin123` |
| Refugio (verificado) | `refugio.esperanza@petmatch.com` | `Demo1234` |
| Refugio (verificado) | `huellitas@petmatch.com` | `Demo1234` |
| Refugio (pendiente) | `patitas@petmatch.com` | `Demo1234` |
| Adoptante | `juan.perez@petmatch.com` | `Demo1234` |
| Adoptante | `maria.torres@petmatch.com` | `Demo1234` |

El refugio *Patitas del Sol* queda **pendiente de verificación** a propósito: sirve
para demostrar el flujo de aprobación desde el panel administrativo.

> El rol `ADMINISTRADOR` no se puede obtener desde el registro público: sólo lo
> crea el seed. Es una decisión de seguridad, no una limitación.

## Testing

```bash
npm test           # backend + frontend
npm run test:api   # 86 pruebas de API
npm run test:web   # 25 pruebas de interfaz
```

**Backend (86 pruebas).** Autenticación, roles y permisos, CRUD de mascotas,
búsqueda/filtros/orden/paginación, galería, favoritos, flujo completo de adopción,
transiciones inválidas, notificaciones, auditoría, reportes y contrato de la API.
Incluye los casos negativos que pide la especificación: email duplicado, contraseña
incorrecta, token inválido, mascota inexistente, mascota adoptada, solicitud
duplicada, usuario sin permisos y datos incompletos.

**Frontend (25 pruebas).** Componentes reutilizables, tarjetas de mascota, tabla de
datos, paginación, protección de rutas y las páginas de exploración y acceso.

Las pruebas de backend corren contra el almacén en memoria por defecto. Para
verificarlas contra PostgreSQL real:

```bash
createdb petmatch_test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/petmatch_test npm run db:migrate
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/petmatch_test npm run test:api
```

> Las pruebas se ejecutan en serie (`--test-concurrency=1`) porque todos los
> archivos comparten la misma base de datos y cada uno la limpia antes de empezar.

## Flujo de trabajo con Git

Ramas: `main` (estable) y `develop` (integración); el trabajo se hace en
`feature/*` y se integra con merges sin *fast-forward* para conservar la historia.

```
Issue → feature/<nombre> → Commits → Push → Pull Request → Code Review → Merge → Release
```

Se usan **Conventional Commits**:

```
feat: agregar módulo de mascotas
fix: corregir filtro por especie
docs: actualizar README
refactor: reorganizar servicio de adopciones
test: agregar pruebas de autenticación
chore: actualizar dependencias
```

## Deployment

Guía completa en [`docs/deployment.md`](docs/deployment.md).

| Componente | Servicio | Notas |
| --- | --- | --- |
| API + PostgreSQL | Render (`render.yaml`) | Blueprint listo para importar |
| Frontend | Vercel (`frontend/vercel.json`) | Root directory `frontend`, salida `dist` |
| Alternativa | Docker Compose | `docker compose --profile full up --build` |

## Estructura del repositorio

```
petmatch/
├── backend/
│   ├── src/
│   │   ├── config/        # Entorno y conexión a la base de datos
│   │   ├── models/        # Acceso a datos (PostgreSQL y memoria)
│   │   ├── services/      # Reglas de negocio
│   │   ├── controllers/   # Manejadores HTTP
│   │   ├── routes/        # Definición de endpoints
│   │   ├── middleware/    # Auth, autorización, validación, errores
│   │   ├── validators/    # Esquemas Zod
│   │   ├── utils/         # Errores, paginación, SQL, fechas
│   │   ├── docs/          # Especificación OpenAPI
│   │   └── scripts/       # Migraciones y datos de demostración
│   └── test/              # Pruebas unitarias y de integración
├── frontend/
│   └── src/
│       ├── components/    # ui/ · layout/ · pets/
│       ├── pages/         # Públicas · adopter/ · shelter/ · admin/
│       ├── layouts/       # PublicLayout · DashboardLayout
│       ├── context/       # Sesión y avisos
│       ├── hooks/         # useAsync · useDebouncedValue · useFavorites
│       ├── services/      # Cliente HTTP de la API
│       ├── utils/         # Constantes y formateo
│       ├── styles/        # Sistema de diseño
│       └── tests/         # Pruebas de interfaz
├── database/
│   └── migrations/        # Migraciones SQL versionadas
├── docker/                # Dockerfiles y configuración de nginx
├── docs/                  # api/ · database/ · architecture/ · deployment
├── docker-compose.yml
├── render.yaml
├── .env.example
└── README.md
```

## Equipo

| Nombre | Rol |
| --- | --- |
| Luis Aragón | Desarrollo full-stack |

## Licencia

Distribuido bajo licencia [MIT](LICENSE).
