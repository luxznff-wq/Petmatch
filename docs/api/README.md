# API REST

Base: `http://localhost:4000/api` · Documentación interactiva: `/api/docs` ·
Especificación OpenAPI: `/api/docs/openapi.json`

## Convenciones

**Autenticación.** Cabecera `Authorization: Bearer <token>`. El token se obtiene
en `/auth/login` o `/auth/register` y dura 8 horas.

**Respuestas.**

```jsonc
{ "success": true, "data": { "id": 25, "name": "Luna" } }
{ "success": true, "data": [], "pagination": { "page": 1, "limit": 12, "total": 124, "totalPages": 11 } }
{ "success": false, "message": "La mascota no existe" }
{ "success": false, "message": "Datos inválidos", "errors": [{ "field": "email", "message": "Ingresa un correo válido" }] }
```

**Códigos.** `200` OK · `201` Creado · `204` Sin contenido · `400` Petición
inválida · `401` No autenticado · `403` Sin permisos · `404` No encontrado ·
`409` Conflicto · `422` Datos inválidos · `500` Error interno.

---

## Autenticación

### `POST /auth/register`

```jsonc
{
  "firstName": "Ana",
  "lastName": "Pérez",
  "email": "ana@example.com",
  "password": "Clave123",     // 8+ caracteres, mayúscula, minúscula y número
  "phone": "+51 999 888 777", // opcional
  "city": "Lima",
  "role": "ADOPTANTE"          // ADOPTANTE | REFUGIO
}
```

`201` → `{ user, token }`. `409` si el correo ya existe, `422` si los datos no
cumplen las reglas. El rol `ADMINISTRADOR` **no** se acepta.

### `POST /auth/login`

`{ "email": "...", "password": "..." }` → `200` con `{ user, token }`.
`401` si las credenciales no coinciden, `403` si la cuenta está suspendida.

### `GET /auth/me` 🔒

Devuelve el perfil del usuario en sesión. Si es un refugio, incluye su objeto
`shelter` para que el panel sepa si ya tiene perfil y si está verificado.

### `POST /auth/logout`

Con JWT sin estado el cierre ocurre en el cliente al descartar el token. El
endpoint existe para completar el contrato de la API.

### `PATCH /auth/password` 🔒

`{ "currentPassword": "...", "newPassword": "..." }` → `200`. `401` si la
contraseña actual no es correcta.

---

## Mascotas

### `GET /pets`

Público. Búsqueda, filtros combinables, ordenamiento y paginación.

| Parámetro | Valores |
| --- | --- |
| `search` | Texto libre: nombre, raza, ciudad o refugio |
| `species` | `Perro` `Gato` `Conejo` `Ave` `Roedor` `Otro` |
| `sex` | `Macho` `Hembra` |
| `size` | `Pequeño` `Mediano` `Grande` |
| `ageGroup` | `Cachorro` `Joven` `Adulto` `Senior` |
| `status` | `DISPONIBLE` `EN_PROCESO` `ADOPTADA` `NO_DISPONIBLE` |
| `city`, `region` | Texto (sin distinguir mayúsculas) |
| `shelterId` | Entero |
| `vaccinated`, `sterilized`, `dewormed` | `true` |
| `goodWithChildren`, `goodWithDogs`, `goodWithCats` | `true` |
| `sociable`, `specialCare` | `true` |
| `sort` | `recent` (por defecto) `oldest` `name-asc` `name-desc` |
| `page`, `limit` | `limit` por defecto 12, máximo 50 |

```http
GET /api/pets?species=Perro&size=Mediano&vaccinated=true&sort=name-asc&page=2
```

Un valor fuera del catálogo devuelve `422`, no lo ignora en silencio.

### `GET /pets/:id`

Público. Perfil completo con atributos, galería y datos del refugio.

### `POST /pets` 🔒 REFUGIO · ADMINISTRADOR

```jsonc
{
  "name": "Toby",
  "species": "Perro",
  "breed": "Beagle",
  "sex": "Macho",
  "size": "Mediano",
  "birthDate": "2022-06-15",   // si se envía, la edad se calcula sola
  "color": "Tricolor",
  "weightKg": 12,
  "description": "...",
  "story": "...",
  "city": "Arequipa",
  "region": "Arequipa",
  "image": "https://…",
  "attributes": { "vaccinated": true, "goodWithChildren": true },
  "status": "DISPONIBLE"
}
```

`409` si el refugio aún no tiene perfil · `403` si está pendiente o suspendido.

### `PUT /pets/:id` · `PATCH /pets/:id/status` · `DELETE /pets/:id` 🔒

Sólo el refugio propietario o un administrador. Al pasar una mascota a `ADOPTADA`
o `NO_DISPONIBLE` se notifica a quienes la tenían en favoritos. No se puede
eliminar una mascota ya adoptada (`409`): forma parte del historial.

### Galería

- `GET /pets/:id/images` — público
- `POST /pets/:id/images` 🔒 — `{ "url": "https://…", "isPrimary": false }`
- `DELETE /pets/:id/images/:imageId` 🔒

Marcar una imagen como principal desmarca la anterior en la misma transacción.

---

## Refugios

| Endpoint | Acceso | Descripción |
| --- | --- | --- |
| `GET /shelters` | Público | Verificados. Un administrador ve todos y puede filtrar por `status`. |
| `GET /shelters/me` | 🔒 REFUGIO | Refugio del usuario en sesión |
| `GET /shelters/:id` | Público | Perfil con contadores y mascotas disponibles |
| `GET /shelters/:id/pets` | Público | Mascotas del refugio, paginadas |
| `POST /shelters` | 🔒 REFUGIO | Alta del perfil (`409` si ya administra uno) |
| `PUT /shelters/:id` | 🔒 propietario o admin | Edición |
| `PATCH /shelters/:id/status` | 🔒 ADMINISTRADOR | `PENDIENTE` `VERIFICADO` `SUSPENDIDO` |

Todo refugio nace `PENDIENTE` y sólo publica tras ser `VERIFICADO`.

---

## Favoritos 🔒 ADOPTANTE

`GET /favorites` (mascotas completas) · `GET /favorites/ids` (sólo ids) ·
`POST /favorites/:petId` · `DELETE /favorites/:petId`

Agregar dos veces la misma mascota es idempotente.

---

## Solicitudes de adopción 🔒

### `POST /adoptions/requests` — ADOPTANTE

```jsonc
{
  "petId": 3,
  "applicant": {
    "name": "Juan Pérez Vega",
    "age": 34,                 // mínimo 18
    "phone": "+51 988 777 666",
    "email": "juan@example.com",
    "address": "Av. Primavera 145",
    "city": "Lima"
  },
  "housing": {
    "type": "Departamento",    // Casa | Departamento | Otro
    "hasYard": false,
    "livesAlone": false,
    "hasOtherPets": false,
    "hasChildren": true
  },
  "hadPetsBefore": true,
  "experience": "Tuve una gata durante 12 años.",  // obligatorio si hadPetsBefore
  "motivation": "Quiero darle un hogar tranquilo y permanente.",  // mínimo 20 caracteres
  "declarationAccepted": true  // debe ser exactamente true
}
```

Errores posibles: `404` mascota inexistente · `409` mascota no disponible o ya
adoptada · `409` solicitud duplicada activa · `422` formulario incompleto.

### `GET /adoptions/requests`

Cada rol ve lo suyo: el adoptante sus solicitudes, el refugio las de sus mascotas,
el administrador todas. Filtros: `status`, `search`, `page`, `limit`.

### `GET /adoptions/requests/:id`

Detalle con datos del solicitante, vivienda, experiencia, motivación, mascota e
historial de entrevistas.

### `PATCH /adoptions/requests/:id/status` — REFUGIO propietario · ADMINISTRADOR

`{ "status": "EN_REVISION", "reviewNotes": "..." }`

Transiciones permitidas:

| Desde | Hacia |
| --- | --- |
| `PENDIENTE` | `EN_REVISION` · `RECHAZADA` |
| `EN_REVISION` | `ENTREVISTA` · `APROBADA` · `RECHAZADA` |
| `ENTREVISTA` | `APROBADA` · `RECHAZADA` |
| `APROBADA` | `RECHAZADA` |

Cualquier otra combinación devuelve `409`. `ADOPCION_COMPLETADA` se alcanza
únicamente registrando la adopción.

### `DELETE /adoptions/requests/:id` — ADOPTANTE

Cancela la solicitud propia. Permitido desde `PENDIENTE` y `EN_REVISION`; en
cualquier otro estado devuelve `409`.

---

## Entrevistas 🔒

| Endpoint | Acceso |
| --- | --- |
| `GET /adoptions/requests/:id/interviews` | Partes de la solicitud |
| `POST /adoptions/requests/:id/interviews` | REFUGIO propietario · ADMINISTRADOR |
| `GET /interviews` | Agenda propia según el rol |
| `PUT /interviews/:id` | REFUGIO propietario · ADMINISTRADOR |

```jsonc
{
  "scheduledAt": "2026-09-01T15:00:00.000Z",  // ISO 8601 con zona horaria
  "modality": "Videollamada",                  // Presencial | Videollamada | Telefónica
  "notes": "Primera conversación"
}
```

Sólo se puede agendar si la solicitud está en `ENTREVISTA` (`409` en caso
contrario) y la fecha no puede estar en el pasado (`422`).
`PUT` acepta `result`: `Pendiente` · `Aprobada` · `No aprobada`.

---

## Adopciones 🔒

`GET /adoptions` (alcance por rol) · `GET /adoptions/:id` ·
`POST /adoptions` — `{ "requestId": 12, "notes": "..." }`

Al registrar la adopción, en una sola transacción: se crea la fila en `adoptions`
con un código `ADP-00042`, la solicitud pasa a `ADOPCION_COMPLETADA` y la mascota
a `ADOPTADA`. Después se rechazan las solicitudes rivales que seguían vivas y se
notifica a sus autores. La solicitud debe estar `APROBADA` (`409` si no lo está).

---

## Usuarios 🔒

| Endpoint | Acceso |
| --- | --- |
| `GET /users` | ADMINISTRADOR. Filtros `search`, `role`, `status`, `page`, `limit` |
| `GET /users/:id` | El propio usuario o un administrador |
| `PUT /users/:id` | El propio usuario o un administrador |
| `PATCH /users/:id/status` | ADMINISTRADOR (`ACTIVO` / `SUSPENDIDO`) |
| `DELETE /users/:id` | ADMINISTRADOR |

Un administrador no puede suspender ni eliminar su propia cuenta (`409`).

---

## Notificaciones 🔒

`GET /notifications` → `{ "items": [...], "unread": 3 }` ·
`PATCH /notifications/:id/read` · `PATCH /notifications/read-all`

Eventos que generan aviso: solicitud enviada (adoptante) y recibida (refugio),
cambios de estado, entrevista programada, adopción completada, favorito que deja
de estar disponible, verificación o suspensión del refugio y de la cuenta.

---

## Reportes 🔒 REFUGIO · ADMINISTRADOR

Un refugio ve sólo sus datos; un administrador, los de toda la plataforma.

| Endpoint | Contenido |
| --- | --- |
| `GET /reports/adoptions` | `byMonth`, `byCity`, `bySpecies`, `total` |
| `GET /reports/pets` | `bySpecies`, `byStatus`, `byCity` |
| `GET /reports/requests` | `byStatus`, `total` |
| `GET /reports/shelters` | Sólo ADMINISTRADOR: `byStatus`, `topByAdoptions`, `total` |

Cada agrupación es una lista de `{ "label": "...", "total": 0 }`.

---

## Administración 🔒 ADMINISTRADOR

`GET /admin/dashboard` · `GET /admin/audit` (filtros `entityType`, `page`,
`limit`) · `GET /admin/users` · `GET /admin/shelters` ·
`PATCH /admin/users/:id/status` · `PATCH /admin/shelters/:id/status`

---

## Generales

| Endpoint | Acceso | Descripción |
| --- | --- | --- |
| `GET /health` | Público | Estado y motor de persistencia activo |
| `GET /stats` | Público | Totales de la portada: mascotas, adopciones, refugios, ciudades |
| `GET /workspace` | 🔒 | Datos completos del panel según el rol, en una sola petición |

`/workspace` no está en la especificación funcional: existe para que cada panel se
pinte con una llamada en lugar de seis.
