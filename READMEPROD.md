# Gestor de Calificaciones - Administrador de Notas Matemáticas

Aplicación web para gestión de calificaciones con Angular + Spring Boot + PostgreSQL, desplegada con Docker y expuesta a internet mediante Traefik + Cloudflare Tunnel.

---

## Arquitectura de producción

```
Usuario → Cloudflare (SSL) → Cloudflare Tunnel → Traefik (puerto 80)
                                                      ├── gestor.edumathsv.work  → Frontend (Angular/Nginx)
                                                      └── api.gestor.edumathsv.work → Backend (Spring Boot :8080)
```

## Cambios realizados (debugging inicial)

### 1. Base de datos no existía
**Problema:** PostgreSQL creó una DB llamada `gestor` en lugar de `gestor_calificaciones` por un error en variables de entorno.

**Solución:**
- Creada la DB faltante: `CREATE DATABASE gestor_calificaciones`
- Creado archivo `.env` para que docker-compose lea las variables automáticamente
- `setup_env.sh` se deja como alternativa para desarrollo local

### 2. Perfil de Spring Boot incorrecto en Docker
**Problema:** `spring.profiles.active=dev` forzaba puerto `8081` y configuración de DB local, incompatible con el contenedor.

**Solución:** Cambiado a `spring.profiles.active=prod` en `application.properties`, lo que usa variables de entorno y puerto `8080`.

### 3. Traefik v2.10 incompatible con Docker API
**Problema:** `traefik:v2.10` usaba Docker API v1.24 (obsoleta), el daemon requería ≥ v1.40. Traefik no podía leer labels de los contenedores.

**Solución:** Actualizado a `traefik:latest` (v3.7.5). Requiere añadir `DOCKER_API_VERSION=1.41` en el entorno.

### 4. Sin archivo `.env`
**Problema:** El docker-compose depende de variables de entorno que no estaban definidas al hacer `docker compose up`.

**Solución:** Creado `.env` en el directorio raíz del proyecto.

---

## Archivos que debes subir al repo

### Contenido de `proxy-global/` (infraestructura compartida)

```
proxy-global/
├── docker-compose.yml   # Traefik reverse proxy
├── traefik.yml           # Configuración de Traefik
└── .gitignore            # Ignorar acme.json
```

**`.gitignore`** sugerido para `proxy-global/`:
```
acme.json
```

### Contenido del proyecto app

```
Administrador-de-Notas-Matematicas/
├── .env                   # ← NUEVO: variables de entorno para Docker
├── docker-compose.yml     # ← MODIFICADO: se quitó version obsoleto
├── setup_env.sh           # Alternativa local
├── deploy.sh              # Script de despliegue
├── backend/
│   └── src/main/resources/
│       └── application.properties   # ← MODIFICADO: prod como perfil default
└── frontend/
```

---

## Comandos útiles

### Despliegue en servidor
```bash
cd proxy-global && docker compose up -d                     # Iniciar Traefik
cd ../Administrador-de-Notas-Matematicas
docker compose up -d --build                                 # Construir y levantar todo
```

### Ver logs
```bash
docker logs gestor_backend -f
docker logs gestor_frontend -f
docker logs traefik_proxy -f
```

### Acceso local (sin Cloudflare)
```bash
curl -H "Host: gestor.edumathsv.work" http://localhost/          # Frontend
curl -H "Host: api.gestor.edumathsv.work" http://localhost/      # Backend
```

### Dashboard Traefik
```
http://localhost:8080
```

---

## Notas para desarrollo local

- Para desarrollo sin Docker: usar el perfil `dev` (cambiar `application.properties` a `spring.profiles.active=dev`) y ejecutar backend con `mvn spring-boot:run`
- El frontend en desarrollo usa `ng serve` con `environment.ts` que apunta a `localhost:8081`
- Para probar el build local: `docker compose up -d --build`

## Cloudflare Tunnel

El tunnel se gestiona desde el dashboard de **Cloudflare Zero Trust**:
1. Ir a https://one.dash.cloudflare.com/ → Access → Tunnels
2. Configurar **Public Hostnames**:
   - `gestor.edumathsv.work` → `http://localhost:80`
   - `api.gestor.edumathsv.work` → `http://localhost:80`
3. Ambos apuntan al puerto 80 porque Traefik rutea por Host header

> No subas el token del tunnel al repo. El servicio `cloudflared` se instaló con `--token` y se gestiona aparte.
