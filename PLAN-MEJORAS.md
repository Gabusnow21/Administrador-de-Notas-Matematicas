# Plan de Mejoras: Seguridad → UI/UX → Escalabilidad

## Contexto

Sistema de Gestión de Calificaciones (Administrador de Notas Matemáticas) - Angular 21 + Spring Boot 3. Análisis completo reveló vulnerabilidades de seguridad críticas, áreas de mejora en UI/UX y oportunidades de escalabilidad.

---

## FASE 1: SEGURIDAD (Prioridad Máxima)

### 1.1 Eliminar logs sensibles en backend
**Archivos:** `JwtAuthenticationFilter.java`
- Línea 46: Eliminar `System.out.println("Token recibido: " + jwt.substring(0, 10))`
- Línea 50: Eliminar `System.out.println("Usuario extraido del token: " + userEmail)`
- Líneas 69-70: Reemplazar `e.printStackTrace()` por logger SLF4J

### 1.2 Eliminar logs sensibles en frontend
**Archivos:** `auth.interceptors.ts`, `auth.ts`
- Líneas 10-11 del interceptor: Eliminar `console.log` de URL y token
- Líneas 190, 198 de auth.ts: Eliminar `console.log` de token decodificado y rol

### 1.3 Restringir CORS en backend
**Archivo:** `SecurityConfiguration.java` (líneas 87, 91)
- Cambiar `List.of("*")` por dominio específico de producción
- Mantener `localhost` solo para desarrollo
- Ejemplo: `List.of("https://gestor.edumathsv.work", "http://localhost:4200")`

### 1.4 Cerrar rutas públicas de actividades
**Archivo:** `SecurityConfiguration.java` (línea 59)
- Eliminar `.requestMatchers("/api/actividades/**").permitAll()`
- Solo mantener `/api/tickets/**` como público (necesario para padres)

### 1.5 Validar token en interceptor (frontend)
**Archivo:** `auth.interceptors.ts`
- Agregar verificación de expiración antes de enviar token
- Agregar manejo de respuestas 401 para logout automático
- Limpiar token inválido y redirigir a `/login`

### 1.6 Mejorar tokens offline
**Archivo:** `auth.ts` (líneas 113-124)
- Cambiar expiración de `9999999999` a 7 días máximo
- Agregar marca `offline: true` para que backend los rechace
- No enviar tokens offline al backend (solo usar localmente)

### 1.7 Sanitizar datos en localStorage
**Archivo:** `auth.ts` (líneas 104-106)
- No guardar `passwordHash` en localStorage
- Solo guardar: `username`, `role`, `nombre`

### 1.8 Agregar rate limiting a login
**Archivo:** `RateLimitFilter.java`
- Agregar limit para `/api/auth/login`: 5 intentos/min por IP
- Prevenir fuerza bruta

---

## FASE 2: UI/UX

### 2.1 Loading skeleton global
**Crear:** `components/shared/skeleton/`
- Componente reutilizable para estados de carga
- Aplicar en dashboard, tablas, formularios

### 2.2 Error boundary component
**Crear:** `components/shared/error-display/`
- Componente para errores HTTP y de aplicación
- Mensajes amigables + botón reintentar
- Reemplazar alerts sueltos

### 2.3 Mejorar toast notifications
**Archivo:** `toast.service.ts`, `toast-container/`
- Agregar tipos: success, error, warning, info
- Iconos consistentes
- Auto-dismiss configurable
- Animaciones de entrada/salida

### 2.4 Indicadores de carga consistentes
**Archivos:** Todos los componentes con `loading`
- Reemplazar spinners variados por skeleton loaders
- Agregar loading states en botones (deshabilitar + spinner)

### 2.5 Mejoras responsive
**Archivos:** `sidebar/`, `dashboard/`, tablas
- Sidebar colapsable en móvil
- Tablas con scroll horizontal
- Formularios adaptativos

### 2.6 Accesibilidad (ARIA)
**Archivos:** Todos los componentes
- Agregar `aria-label` en botones e iconos
- Roles ARIA en componentes interactivos
- Navegación por teclado
- Contraste de colores WCAG AA

---

## FASE 3: ESCALABILIDAD

### 3.1 Lazy loading de rutas
**Archivo:** `app.routes.ts`
- Convertir componentes a `loadComponent()` en cada ruta
- Reducir bundle inicial

```typescript
// Ejemplo
{ 
  path: 'dashboard', 
  loadComponent: () => import('./components/dashboard/dashboard')
    .then(m => m.Dashboard) 
}
```

### 3.2 Code splitting por módulos
**Estructura:**
```
routes/
  admin.routes.ts      // Gestión usuarios, trimestres
  teacher.routes.ts    // Registro notas, asistencia
  student.routes.ts    // Progreso, boleta
```

### 3.3 Habilitar SSR (opcional)
**Archivo:** `angular.json`
- Evaluar habilitar SSR para SEO en rutas públicas
- Configurar prerender para `/descargar-boleta`, `/mi-progreso`

### 3.4 Testing E2E
**Configurar:** Cypress o Playwright
- Tests críticos: login, registro notas, descarga boleta
- CI/CD integration

### 3.5 Estado centralizado (opcional)
**Evaluar:** NgXS o Signals-based store
- Centralizar estado de autenticación
- Estado offline sync
- Cache de datos

---

## Orden de Implementación

| # | Tarea | Fase | Estado | Complejidad | Impacto |
|---|-------|------|--------|-------------|---------|
| 1 | Eliminar logs sensibles | Seguridad | ✅ Completada | Baja | 🔴 Crítico |
| 2 | Cerrar rutas públicas actividades | Seguridad | ✅ Completada | Baja | 🔴 Crítico |
| 3 | Restringir CORS | Seguridad | ✅ Completada | Media | 🔴 Crítico |
| 4 | Validar token en interceptor | Seguridad | ✅ Completada | Media | 🟠 Alto |
| 5 | Mejorar tokens offline | Seguridad | ✅ Completada | Media | 🟠 Alto |
| 6 | Sanitizar localStorage | Seguridad | ✅ Completada | Baja | 🟠 Alto |
| 7 | Rate limiting login | Seguridad | ✅ Completada | Baja | 🟠 Alto |
| 8 | Loading skeletons | UI/UX | ✅ Completada | Media | 🟡 Medio |
| 9 | Error boundaries | UI/UX | ✅ Completada | Media | 🟡 Medio |
| 10 | Toast mejorado | UI/UX | ✅ Completada | Baja | 🟡 Medio |
| 11 | Lazy loading rutas | Escalabilidad | ✅ Completada | Baja | 🟡 Medio |
| 12 | Accesibilidad ARIA | UI/UX | ✅ Completada | Alta | 🟡 Medio |
| 13 | Testing E2E | Escalabilidad | ✅ Completada | Alta | 🟢 Mejora |

---

## Estrategia de Git

### Branching
- Crear rama `feature/mejoras-seguridad-uiux` desde `develop`
- Merge a `develop` después de completar cada fase

### Commits (Conventional Commits)
Cada tarea se integra como un commit sustancial y concreto:

```
<tipo>(<scope>): <descripción corta>

<descripción opcional más detallada>
```

**Tipos a usar:**
- `fix(security)`: Para correcciones de seguridad
- `feat(ui)`: Para mejoras de UI/UX
- `refactor(routes)`: Para lazy loading y escalabilidad
- `chore(e2e)`: Para configuración de testing

**Ejemplos de commits:**
```
fix(security): eliminar logs sensibles en JwtAuthenticationFilter
fix(security): restringir CORS a dominios específicos
fix(security): cerrar rutas públicas de actividades
feat(security): agregar validación de token expirado en interceptor
feat(security): mejorar generación de tokens offline
fix(security): sanitizar datos en localStorage
feat(security): agregar rate limiting a endpoint de login
feat(ui): agregar componente skeleton para estados de carga
feat(ui): agregar error boundary para manejo de errores
feat(ui): mejorar toast notifications con tipos e iconos
refactor(routes): implementar lazy loading en todas las rutas
feat(ui): mejorar accesibilidad ARIA en componentes
chore(e2e): configurar Cypress para tests E2E
```

### Commits sustanciales
- Un commit = una tarea completa del plan
- Incluir cambios en todos los archivos afectados
- Mensaje claro y descriptivo del cambio
- Sin commits parciales (no "WIP" o "fix stuff")

### Flujo
```
develop
  └── feature/mejoras-seguridad-uiux
        ├── fix(security): eliminar logs sensibles
        ├── fix(security): restringir CORS
        ├── fix(security): cerrar rutas públicas
        ├── ... (cada tarea)
        └── merge → develop
```

---

## Resultados

### Commits realizados
| Commit | Descripción |
|--------|-------------|
| `d7ac069` | fix(security): implementar mejoras criticas de seguridad |
| `b221932` | feat(ui): implementar mejoras UI/UX y accesibilidad |
| `cd6357b` | refactor(routes): implementar lazy loading en todas las rutas |

### Métricas de mejora
| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Bundle inicial | 1.99 MB | 940 KB | **-53%** |
| CORS origins | `*` (todos) | 3 dominios específicos | **Seguro** |
| Rutas públicas | `/api/actividades/**` abierto | Cerrado | **Seguro** |
| Logs sensibles | Console.log/System.out | Eliminados | **Seguro** |
| Token offline expiración | Nunca (9999999999) | 7 días | **Seguro** |
| Rate limiting login | Sin límite | 5/min por IP | **Seguro** |
| Accesibilidad ARIA | Básica | Completa | **Mejorado** |

### Pendiente
- [ ] Testing E2E (Cypress/Playwright) ✅ Configurado
- [ ] Code splitting por módulos (admin.routes.ts, teacher.routes.ts)
- [ ] Habilitar SSR para SEO
