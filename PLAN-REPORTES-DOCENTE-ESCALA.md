# Plan: reportes por docente y escalabilidad por escuelas

> Contexto actual: una única plantilla global `REPORTE_BOLETA` en la tabla
> `reporte_configuracion(clave, valor_json TEXT)`, con `GET` público y
> `PUT` restringido a `ADMIN`. Roles: `ADMIN` y `USER` (= profesor).
> `grado.profesor_id` vincula cada grado con su docente.
> Frontend: `ReporteConfigService` (señal + caché localStorage) y
> `Reporte.generarPdfDesdeDatos(datos, config?)`.

---

## Objetivo 1 — Plantillas asignables por docente

### 1.1 Modelo: ámbitos jerárquicos por clave

La tabla ya usa una clave de texto: basta con usar **claves compuestas**.

| Ámbito            | Clave                              | Quién la edita            |
|-------------------|------------------------------------|---------------------------|
| Global (escuela)  | `REPORTE_BOLETA`                   | ADMIN                     |
| Por grado         | `REPORTE_BOLETA:grado:{id}`        | ADMIN o el docente del grado |
| Por docente       | `REPORTE_BOLETA:usuario:{id}`      | ADMIN o ese docente       |

**Resolución al generar un PDF** (de menos a más específica, fusionando en
cascada con la `fusionarConfig` existente):

```
defecto → global → grado del estudiante → docente que genera
```

La plantilla resuelta nunca se persiste: solo se combinan las capas, así un
cambio global sigue aplicando a los campos que cada docente no personalizó.

### 1.2 Backend

1. **Servicio `ReporteConfiguracionService`** (nuevo, extrae la lógica del
   controller):
   - `obtener(ambito)` / `guardar(ambito, json)` con las claves de la tabla.
   - `resolverParaEstudiante(estudianteId, usuarioGenerador)` → combina capas.
2. **Endpoints** (mismas rutas, parámetro de ámbito):
   - `GET /api/configuracion/reporte-boleta?ambito=global|grado:1|usuario:7`
   - `PUT` idem.
   - Autorización por ámbito:
     - `ADMIN`: cualquiera.
     - `USER`: solo `usuario:{suId}` y `grado:{id}` donde
       `grado.profesor_id == suId` (comprobación en el servicio; si no,
       `403` con el `GlobalExceptionHandler` ya existente).
3. **Lectura pública para padres**: nuevo
   `GET /api/tickets/reporte-config?nie=...` (junto al flujo actual de
   boleta) que resuelve la plantilla por el grado del estudiante. El
   `permitAll` del GET global se mantiene solo para `ambito=global`.
4. **Auditoría**: reutilizar `auditoria_baja`/`AuditoriaBaja` o tabla de
   auditoría existente para registrar quién cambió qué ámbito.

### 1.3 Frontend

1. `ReporteConfigService`:
   - `ensureLoaded(ambito)`, `guardar(ambito, config)`.
   - Caché localStorage con clave `reporteBoletaConfig.v1:{ambito}` (offline
     por ámbito, la vista pública usa `global` + la resuelta del servidor).
2. Módulo `gestion-reportes`:
   - Selector de ámbito arriba (ADMIN: Global / Grado / Docente con
     desplegables; docente: solo "Mi plantilla" + sus grados).
   - Mismo formulario para todos los ámbitos; al guardar se envía el ámbito.
3. El docente llega desde el sidebar ("Mis reportes"); el ADMIN desde
   "Configuración → Reportes".
4. Generación: `generarPdfDesdeDatos(datos, config?)` no cambia; quien
   llama (descargar-boleta docente o público) pasa la plantilla resuelta.

### 1.4 Testing

- Unit: resolución de capas (defecto→global→grado→usuario), autorización por
  ámbito, caché por ámbito.
- Integración: `PUT` de docente A sobre plantilla de docente B → `403`;
  `GET` público resuelve plantilla del grado del NIE.

**Esfuerzo estimado:** 3–4 días.

---

## Objetivo 2 — Escalabilidad por escuelas (multi-tenant)

### 2.1 Modelo

Nueva tabla `escuela`:

```sql
escuela(id PK, nombre, codigo, logo_izquierda BYTEA/TEXT, logo_derecha TEXT,
        lineas_contacto JSONB, activo BOOLEAN, creado_en TIMESTAMP)
```

Y columna `escuela_id FK` en: `_usuario`, `grado`, `estudiante`, `trimestre`
(con `ddl-auto=update` + backfill).

**Jerarquía de plantillas ampliada:**

```
defecto → global → escuela:{id} → grado → docente
```

Las claves pasan a ser `REPORTE_BOLETA:escuela:{id}[:grado:{g}][:usuario:{u}]`.

### 2.2 Aislamiento de datos (tenant filter)

1. **Filtro automático por usuario autenticado**: interceptor que guarda la
   `escuela_id` del `SecurityContext` en un `ThreadLocal` y los repositorios
   agregan `WHERE escuela_id = ?` (vía `@Query` o Spring Data JPA
   Specifications). Evita que un ADMIN de la escuela A lea datos de la B.
2. **Flujo público de padres**: `NIE → estudiante → escuela` para resolver
   plantilla y datos; sin sesión solo se expone esa escuela.
3. **Roles**:
   - `SUPER_ADMIN` (nuevo): gestiona escuelas y ve todo.
   - `ADMIN`: su escuela.
   - `USER` (docente): sus grados.
4. **Opción futura**: si una escuela crece mucho, migrar a *schema por
   escuela* (mismo código, `search_path` por tenant). No recomiendo empezar
   allí: una columna indexada es mucho más simple de operar y migrar.

### 2.3 Migración por etapas (sin ventana de corte)

| Etapa | Cambio | Riesgo |
|-------|--------|--------|
| 1 | Tabla `escuela` + `escuela_id` nullable; crear "Escuela por defecto" y backfill de todas las filas | Bajo (columna nullable) |
| 2 | Filtrado por `escuela_id` en repositorios (apagado con flag) | Medio: probar con datos reales |
| 3 | Plantillas por ámbito de escuela + UI de gestión de escuelas (SUPER_ADMIN) | Bajo |
| 4 | Activar el filtro por defecto; eliminar el flag | Medio |
| 5 | (Opcional) schema por escuela si el volumen lo exige | Alto, sólo si hace falta |

### 2.4 Frontend

- `escuela.service.ts` + módulo `gestion-escuelas` (solo SUPER_ADMIN).
- El logo/encabezado por defecto de cada escuela vive en su plantilla
  (`reporte-assets.ts` queda como fallback del sistema).
- Selector de escuela en la cabecera para SUPER_ADMIN; el resto trabaja
  siempre en su escuela (ya filtrado por backend).

**Esfuerzo estimado:** 5–7 días (etapas 1–4).

---

## Orden de ejecución propuesto

1. **Objetivo 1 completo** (ámbitos por docente) — ya no bloquea nada y
   reutiliza la tabla actual.
2. **Objetivo 2, etapas 1–2** (tabla escuela + filtro) — con el usuario
   verificando en el VPS.
3. **Objetivo 2, etapas 3–4** (plantillas por escuela + UI).
4. Etapa 5 solo si aparece la necesidad real.

Cada etapa se integra a `Production`, se verifica en el VPS y se pasa a
`develop`, igual que el flujo actual.
