# Arquitectura

## Capas del backend

Cada capa tiene una responsabilidad y sólo conoce a la de abajo.

```
routes/        Endpoints y encadenado de middlewares
middleware/    Autenticación, autorización, validación, manejo de errores
validators/    Esquemas Zod (body, query, params)
controllers/   Traducen HTTP ↔ dominio. Sin lógica de negocio.
services/      Reglas de negocio, permisos, notificaciones y auditoría
models/        Acceso a datos. Sin reglas de negocio.
config/        Entorno y conexión a la base de datos
utils/         Errores, respuestas, paginación, SQL, fechas
```

**La regla que sostiene todo lo demás:** las reglas de negocio viven en
`services/` y en ningún otro sitio. Los modelos leen y escriben; los controladores
traducen. Cuando esa frontera se difumina, la misma regla acaba escrita dos veces
y las dos versiones divergen.

## Doble motor de persistencia

La API funciona con PostgreSQL o con un almacén en memoria:

```js
if (!isPostgres) {
  // Operación equivalente sobre el almacén en memoria
}
// Consulta SQL
```

Esa bifurcación existe **sólo dentro de `models/`**. Como las reglas están en los
servicios, ambos modos aplican exactamente las mismas validaciones, los mismos
permisos y las mismas transiciones de estado. La consecuencia práctica es que la
suite de pruebas completa se ejecuta contra los dos motores sin cambiar una línea:
si el modo memoria pasa y el de PostgreSQL no, el fallo está en el SQL, no en una
regla olvidada.

Sin `DATABASE_URL` la API arranca en memoria con datos de demostración: se puede
mostrar el proyecto sin instalar PostgreSQL.

## Flujo de una petición

`POST /api/adoptions/requests` con sesión de adoptante:

```
1. helmet + cors            Cabeceras de seguridad y origen permitido
2. express.json()           Cuerpo JSON (errores de parseo → 400)
3. authenticate             Verifica el JWT y RECARGA el usuario de la BD
4. authorize('ADOPTANTE')   Comprueba el rol
5. validateBody(schema)     Zod valida y normaliza el formulario
6. controller               Extrae req.user y req.body
7. service                  Aplica §35: mascota existente, disponible,
                            sin duplicados activos; crea la solicitud;
                            notifica al adoptante y al refugio
8. model                    INSERT en adoption_requests
9. created(res, data)       201 { success: true, data }
```

Cualquier error lanzado en el camino llega al manejador central, que traduce
`ApiError`, errores de PostgreSQL y errores del parser a la respuesta adecuada.

### Por qué `authenticate` vuelve a leer el usuario

Un JWT es válido hasta que expira. Si un administrador suspende una cuenta, su
token sigue siendo criptográficamente correcto. Por eso el middleware lee el
usuario en cada petición y comprueba su estado: el corte es inmediato, sin esperar
a que caduque el token.

## Máquina de estados de la solicitud

```
                 ┌──────────────┐
                 │  PENDIENTE   │
                 └──────┬───────┘
            ┌───────────┼────────────┐
            ▼           ▼            ▼
      EN_REVISION   RECHAZADA    CANCELADA
            │
      ┌─────┼──────┬──────────┐
      ▼     ▼      ▼          ▼
 ENTREVISTA APROBADA RECHAZADA CANCELADA
      │       │
      ├───────┤
      ▼       ▼
  APROBADA  RECHAZADA
      │
      ▼  (POST /adoptions)
ADOPCION_COMPLETADA
```

Las transiciones se declaran una sola vez, en
`services/adoption-request.service.js`, y el frontend sólo muestra los botones
que corresponden al estado actual. `ADOPCION_COMPLETADA` no se alcanza cambiando
el estado a mano: hay que registrar la adopción, porque además crea la fila en
`adoptions` y actualiza la mascota, todo en una transacción.

### Estado de la mascota

La mascota sigue el estado de sus solicitudes (§22):

| Evento | Efecto sobre la mascota |
| --- | --- |
| Solicitud pasa a `EN_REVISION`, `ENTREVISTA` o `APROBADA` | `EN_PROCESO` |
| Solicitud rechazada o cancelada **y no queda ninguna otra viva** | `DISPONIBLE` |
| Solicitud rechazada o cancelada **pero queda otra en curso** | sigue `EN_PROCESO` |
| Adopción registrada | `ADOPTADA` |

Esa distinción importa: varias personas pueden solicitar la misma mascota. Si al
rechazar una se liberara la mascota sin mirar el resto, quedaría marcada como
disponible mientras otro proceso sigue abierto.

Al registrar una adopción, las solicitudes rivales que seguían vivas se rechazan
automáticamente y se notifica a sus autores, porque una mascota adoptada no puede
seguir recibiendo solicitudes (§35.6).

## Seguridad

| Medida | Implementación |
| --- | --- |
| Contraseñas | bcrypt con 12 rondas; el hash nunca sale de la capa de servicios |
| Sesiones | JWT firmado, expiración de 8 h, usuario revalidado en cada petición |
| Autorización | `authorize(...roles)` en las rutas y comprobación de propiedad en los servicios |
| Inyección SQL | Consultas parametrizadas; `QueryBuilder` nunca interpola valores |
| Reportes | Consultas literales: ningún identificador de tabla o columna viene de la petición |
| Fuerza bruta | Límite de 30 intentos por IP cada 15 minutos en login y registro |
| CORS | Lista blanca de orígenes |
| Cabeceras | Helmet |
| Errores | Los errores no operacionales se responden como 500 genérico |
| Enumeración de cuentas | El login compara siempre contra un hash, exista o no el correo |
| Escalada de privilegios | El registro público no admite el rol `ADMINISTRADOR` |

Las comprobaciones del frontend (`ProtectedRoute`) son una comodidad de la
interfaz. La autoridad está en el backend: cada endpoint vuelve a verificar sesión,
rol y propiedad (§88.10, §88.11).

## Frontend

```
main.jsx        BrowserRouter → AuthProvider → ToastProvider → App
App.jsx         Definición de rutas y guardias por rol
layouts/        PublicLayout (público) · DashboardLayout (paneles)
pages/          Una página por ruta
components/     ui/ (reutilizables) · layout/ · pets/ (dominio)
context/        Sesión y avisos
hooks/          useAsync · useDebouncedValue · useFavorites
services/api.js Cliente HTTP único
```

### Decisiones

**Los filtros viven en la URL.** `ExplorePage` lee y escribe `useSearchParams`, no
estado local. Así una búsqueda filtrada se puede compartir, queda en el historial
del navegador y sobrevive a una recarga.

**Búsqueda y filtros en el servidor.** El listado pide sólo la página actual. Si el
filtrado se hiciera en el cliente sobre las 12 mascotas ya descargadas, buscar
"Labrador" sólo encontraría los labradores de esa página.

**`useAsync` descarta respuestas obsoletas.** Cada ejecución lleva un número de
serie; si llega la respuesta de una petición anterior a la última lanzada, se
ignora. Sin eso, teclear rápido en el buscador puede dejar en pantalla el
resultado de una consulta antigua.

**Favoritos optimistas.** El corazón cambia al instante y revierte si la API falla:
la respuesta inmediata importa y el error es poco frecuente.

**Un solo cliente HTTP.** `services/api.js` centraliza la URL base, el token, el
desempaquetado del sobre `{ success, data }` y la conversión de errores en
`ApiError` con los detalles de validación por campo. Un `401` cierra la sesión en
toda la aplicación mediante suscriptores.

**Sin URLs incrustadas.** En desarrollo Vite hace proxy de `/api` al backend; en
producción se define `VITE_API_URL`. No hay ningún `http://localhost` en el código.

## Estructura de las respuestas

```jsonc
{ "success": true, "data": {} }                                    // 200/201
{ "success": true, "data": [], "pagination": { "page": 1, "limit": 12, "total": 124, "totalPages": 11 } }
{ "success": false, "message": "La mascota no existe" }            // 4xx/5xx
{ "success": false, "message": "Datos inválidos", "errors": [{ "field": "email", "message": "…" }] }  // 422
```

El bloque `errors` permite al frontend colocar cada mensaje junto a su campo en
lugar de mostrar un aviso genérico.
