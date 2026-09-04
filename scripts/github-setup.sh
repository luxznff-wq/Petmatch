#!/usr/bin/env bash
#
# Publica PetMatch en GitHub y crea Milestones, Issues y Releases (§79-§83).
#
# Requiere la CLI de GitHub autenticada:
#   winget install GitHub.cli
#   gh auth login
#
# Uso:
#   bash scripts/github-setup.sh [nombre-del-repo] [--public]
#
# Es idempotente: si algo ya existe, lo salta en lugar de fallar. Puedes
# ejecutarlo varias veces sin duplicar nada.

set -euo pipefail

REPO_NAME="${1:-petmatch}"
VISIBILITY="--private"
[[ "${2:-}" == "--public" ]] && VISIBILITY="--public"

cd "$(dirname "$0")/.."

info() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
ok()   { printf '  \033[0;32m✔\033[0m %s\n' "$1"; }
skip() { printf '  \033[0;33m·\033[0m %s\n' "$1"; }

# --------------------------------------------------------------- Requisitos

command -v gh >/dev/null || {
  echo "Falta la CLI de GitHub. Instálala con: winget install GitHub.cli"
  exit 1
}
gh auth status >/dev/null 2>&1 || {
  echo "No has iniciado sesión. Ejecuta: gh auth login"
  exit 1
}

# ------------------------------------------------- 1. Repositorio y ramas

info "Repositorio remoto"
if git remote get-url origin >/dev/null 2>&1; then
  skip "El remoto 'origin' ya existe: $(git remote get-url origin)"
else
  gh repo create "$REPO_NAME" $VISIBILITY --source=. --remote=origin
  ok "Repositorio creado ($REPO_NAME)"
fi

info "Subiendo ramas y etiquetas"
# main primero: así queda como rama por defecto.
git push -u origin main
git push origin develop
git push origin --tags
ok "main, develop y $(git tag | wc -l | tr -d ' ') etiquetas subidas"

OWNER_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# ---------------------------------------------------------- 2. Milestones

info "Milestones"

# Crea un milestone y devuelve su número; si ya existe, devuelve el existente.
milestone() {
  local title="$1" description="$2" existing
  existing=$(gh api "repos/$OWNER_REPO/milestones?state=all" \
    --jq ".[] | select(.title == \"$title\") | .number" 2>/dev/null || true)

  if [[ -n "$existing" ]]; then
    skip "$title (ya existía)"
    echo "$existing"
    return
  fi
  gh api "repos/$OWNER_REPO/milestones" -f title="$title" -f description="$description" --jq .number
  ok "$title" >&2
}

M1=$(milestone "v0.1 — BASE"            "Repositorio, frontend, backend y base de datos")
M2=$(milestone "v0.2 — USUARIOS"        "Registro, login, roles y perfiles")
M3=$(milestone "v0.3 — MASCOTAS"        "CRUD, imágenes, búsqueda, filtros y perfil")
M4=$(milestone "v0.4 — ADOPCIONES"      "Favoritos, solicitudes, estados, entrevistas y adopciones")
M5=$(milestone "v0.5 — REFUGIOS"        "Perfil, gestión y estadísticas")
M6=$(milestone "v0.6 — ADMINISTRACIÓN"  "Usuarios, refugios, mascotas, solicitudes y reportes")
M7=$(milestone "v0.7 — CALIDAD"         "Validaciones, errores, notificaciones, auditoría y testing")
M8=$(milestone "v1.0 — FINAL"           "Documentación, despliegue, README y release")

# -------------------------------------------------------------- 3. Issues

info "Issues (§82)"

# Cada issue corresponde a trabajo ya entregado: sirven de trazabilidad del
# proceso, así que se crean y se cierran indicando que están implementados.
crear_issue() {
  local titulo="$1" cuerpo="$2" hito="$3" existing

  existing=$(gh issue list --state all --search "\"$titulo\" in:title" \
    --json number,title --jq ".[] | select(.title == \"$titulo\") | .number" 2>/dev/null | head -1 || true)

  if [[ -n "$existing" ]]; then
    skip "$titulo (ya existía)"
    return
  fi

  local numero
  numero=$(gh issue create --title "$titulo" --body "$cuerpo" --milestone "$hito" --json number --jq .number 2>/dev/null) \
    || numero=$(gh issue create --title "$titulo" --body "$cuerpo" --milestone "$hito" | grep -oE '[0-9]+$')

  gh issue close "$numero" --comment "Implementado. Ver el historial de \`develop\` y la documentación del repositorio." >/dev/null
  ok "$titulo"
}

REF="Parte de la especificación funcional de PETMATCH.pdf."

crear_issue "#001 Configurar repositorio"        "Monorepo con workspaces, ramas main y develop, ESLint y scripts. $REF" "v0.1 — BASE"
crear_issue "#002 Crear frontend"                "Proyecto React con Vite, router y sistema de diseño. $REF"            "v0.1 — BASE"
crear_issue "#003 Crear backend"                 "API Express con arquitectura en capas. $REF"                          "v0.1 — BASE"
crear_issue "#004 Configurar PostgreSQL"         "Conexión, pool y ejecutor de migraciones idempotente. $REF"           "v0.1 — BASE"
crear_issue "#005 Crear modelos"                 "Trece tablas relacionadas con tipos, índices y triggers. $REF"        "v0.1 — BASE"

crear_issue "#006 Registro"                      "Alta de adoptantes y refugios con validación y consentimiento legal. $REF" "v0.2 — USUARIOS"
crear_issue "#007 Login"                         "Autenticación con JWT y revalidación del usuario en cada petición. $REF"  "v0.2 — USUARIOS"
crear_issue "#008 Roles"                         "ADOPTANTE, REFUGIO y ADMINISTRADOR con autorización por endpoint. $REF"   "v0.2 — USUARIOS"
crear_issue "#009 Protección de rutas"           "Guardias en el frontend y comprobación real en el backend. $REF"          "v0.2 — USUARIOS"

crear_issue "#010 CRUD mascotas"                 "Alta, edición, cambio de estado y baja con reglas de propiedad. $REF"     "v0.3 — MASCOTAS"
crear_issue "#011 Imágenes"                      "Galería con subida de archivos y validación por firma de bytes. $REF"     "v0.3 — MASCOTAS"
crear_issue "#012 Búsqueda"                      "Texto libre indexable sobre nombre, raza, ciudad y refugio. $REF"         "v0.3 — MASCOTAS"
crear_issue "#013 Filtros"                       "Especie, sexo, edad, tamaño, estado, ciudad y ocho características. $REF"  "v0.3 — MASCOTAS"
crear_issue "#014 Paginación"                    "Doce resultados por página con ordenamiento. $REF"                        "v0.3 — MASCOTAS"
crear_issue "#015 Perfil mascota"                "Ficha completa con galería, datos médicos y compatibilidad. $REF"         "v0.3 — MASCOTAS"

crear_issue "#016 Favoritos"                     "Guardar mascotas y avisar cuando dejan de estar disponibles. $REF"        "v0.4 — ADOPCIONES"
crear_issue "#017 Solicitudes"                   "Formulario completo con validación condicional y declaración. $REF"       "v0.4 — ADOPCIONES"
crear_issue "#018 Estados"                       "Máquina de estados con transiciones válidas y estado de la mascota. $REF" "v0.4 — ADOPCIONES"
crear_issue "#019 Entrevistas"                   "Programación, modalidad y registro del resultado. $REF"                   "v0.4 — ADOPCIONES"
crear_issue "#020 Adopciones"                    "Cierre transaccional del proceso con código de adopción. $REF"            "v0.4 — ADOPCIONES"

crear_issue "#021 Refugios"                      "Alta del perfil y verificación por parte del administrador. $REF"         "v0.5 — REFUGIOS"
crear_issue "#022 Perfil refugio"                "Página pública con contadores y mascotas disponibles. $REF"               "v0.5 — REFUGIOS"
crear_issue "#023 Dashboard adoptante"           "Resumen de favoritos, solicitudes, entrevistas y adopciones. $REF"        "v0.5 — REFUGIOS"
crear_issue "#024 Dashboard refugio"             "Métricas del refugio y bandeja de solicitudes recientes. $REF"            "v0.5 — REFUGIOS"

crear_issue "#025 Dashboard administrador"       "Resumen global, actividad reciente y refugios pendientes. $REF"           "v0.6 — ADMINISTRACIÓN"
crear_issue "#028 Reportes"                      "Adopciones por mes, ciudad y especie; mascotas, solicitudes, refugios. $REF" "v0.6 — ADMINISTRACIÓN"

crear_issue "#026 Notificaciones"                "Avisos internos ante cada cambio relevante del proceso. $REF"             "v0.7 — CALIDAD"
crear_issue "#027 Auditoría"                     "Registro de acciones administrativas con autor y fecha. $REF"             "v0.7 — CALIDAD"
crear_issue "#029 Validaciones"                  "Esquemas Zod en cuerpo, query y parámetros con errores por campo. $REF"   "v0.7 — CALIDAD"
crear_issue "#030 Errores"                       "Manejo central con códigos correctos y sin filtrar detalles internos. $REF" "v0.7 — CALIDAD"
crear_issue "#031 Testing backend"               "Pruebas de API contra los dos motores de persistencia. $REF"              "v0.7 — CALIDAD"
crear_issue "#032 Testing frontend"              "Pruebas de componentes, páginas y accesibilidad. $REF"                    "v0.7 — CALIDAD"

crear_issue "#033 Swagger"                       "Especificación OpenAPI 3.0.3 servida en /api/docs. $REF"                  "v1.0 — FINAL"
crear_issue "#034 README"                        "Documentación de instalación, uso, API y arquitectura. $REF"              "v1.0 — FINAL"
crear_issue "#035 Deploy"                        "Guía de despliegue en Render y Vercel, y Docker Compose. $REF"            "v1.0 — FINAL"
crear_issue "#036 Release"                       "Versionado con etiquetas y notas de publicación. $REF"                    "v1.0 — FINAL"

# ------------------------------------------------------------ 4. Releases

info "Releases"

release() {
  local tag="$1" titulo="$2" notas="$3"
  if gh release view "$tag" >/dev/null 2>&1; then
    skip "$tag (ya existía)"
  else
    gh release create "$tag" --title "$titulo" --notes "$notas"
    ok "$tag"
  fi
}

release v1.0.0 "PetMatch v1.0.0" "Versión completa: tres roles, flujo de adopción, reportes, auditoría y API documentada."
release v1.0.1 "PetMatch v1.0.1" "Correcciones de la auditoría de calidad y ESLint integrado en la suite."
release v1.0.2 "PetMatch v1.0.2" "Carga correcta de variables de entorno y aislamiento de las pruebas."
release v1.0.3 "PetMatch v1.0.3" "Búsqueda indexable, foco del modal, pantalla de error y límites de peticiones."
release v1.1.0 "PetMatch v1.1.0" "Recuperación de contraseña, verificación de correo, subida de imágenes, documentos legales e integración continua."
release v1.2.0 "PetMatch v1.2.0" "Carga por ruta, cobertura de los tres paneles y script de publicación en GitHub."
release v1.2.1 "PetMatch v1.2.1" "Documentos legales alcanzables desde la barra lateral de los paneles."
release v1.3.0 "PetMatch v1.3.0" "Refugio suspendido bloqueado en el flujo, fechas de entrevista y comodines de LIKE."
release v1.4.0 "PetMatch v1.4.0" "Cambios de estado atómicos, fechas en UTC y correo sin credenciales."
release v1.4.1 "PetMatch v1.4.1" "Diagnóstico claro cuando la base de datos no responde."

# --------------------------------------------------- 5. Protección de main

info "Protección de la rama main"
if gh api "repos/$OWNER_REPO/branches/main/protection" \
     --method PUT \
     --input - >/dev/null 2>&1 <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["Lint y pruebas"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null
}
JSON
then
  ok "main exige Pull Request y que CI pase"
else
  skip "No se pudo proteger main (los repositorios privados requieren plan de pago)"
fi

# ------------------------------------------------------------------ Final

info "Listo"
echo "  Repositorio: $(gh repo view --json url -q .url)"
echo "  Revisa la pestaña Actions: el flujo de CI debería estar ejecutándose."
