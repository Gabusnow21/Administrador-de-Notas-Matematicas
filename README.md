# Administrador-de-Notas-Matematicas
Sistema web para administrar calificaciones por maestro de manera offline usando electron 

# 📋 Reporte de Avance: Sistema de Gestión de Calificaciones

> **Fase 2:** Reportes Avanzados, UX y Seguridad Administrativa  
> **Estado:** ✅ Completado  
> **Fecha:** 29 de Noviembre, 2024

---

## 1. Resumen Ejecutivo
En esta fase se transformó el prototipo funcional en una aplicación profesional. Se implementó un motor de reportes oficial (PDF), se mejoró drásticamente la experiencia de usuario (UX) mediante selectores dinámicos y navegación fluida, y se estableció un sistema de seguridad jerárquico que distingue entre Administradores y Profesores.

## 2. Nuevas Tecnologías Integradas

| Componente | Tecnología | Uso Principal |
| :--- | :--- | :--- |
| **Reportes** | JasperReports 6.20 | Motor de generación de PDFs *pixel-perfect*. |
| **Seguridad** | JWT Claims | Inyección de roles (Claims) dentro del token. |
| **Frontend** | jwt-decode | Decodificación del token en cliente para leer permisos. |
| **API** | Blob Responses | Manejo de archivos binarios (PDF) en la comunicación HTTP. |

## 3. Logros del Backend (Spring Boot)

### 📄 Motor de Reportes (Boletines)
* **Diseño `.jrxml`:** Se creó una plantilla XML compleja con diseño de "Tabla Cruzada" para mostrar asignaturas, notas por trimestre y promedios calculados.
* **Lógica de Negocio (`ReporteService`):** Algoritmo en Java que extrae las calificaciones planas, las agrupa por Materia, filtra por Trimestre y calcula los promedios aritméticos antes de enviarlos al reporte.
* **Endpoint Binario:** Controlador capaz de devolver un flujo de bytes (`byte[]`) con cabeceras `application/pdf` para descarga directa.

### 👮‍♂️ Gestión de Usuarios y Roles
* **Inyección de Roles:** Se modificó el `JwtService` para que, al generar el token, incluya el rol del usuario (`ADMIN` o `USER`) en el payload.
* **Controlador Administrativo:** Nuevos endpoints protegidos para listar todos los usuarios y crear cuentas nuevas asignando roles específicos (evitando el registro público).
* **DTOs Robustos:** Refactorización de controladores (`ActividadController`) para usar DTOs planos y estáticos, solucionando problemas de deserialización JSON en operaciones de escritura.

## 4. Logros del Frontend (Angular 17+)

### 🖨️ Descargas y Archivos
* **Manejo de BLOBs:** Implementación de un servicio capaz de recibir datos binarios del backend, crear una URL temporal (`window.URL.createObjectURL`) y forzar la descarga del archivo PDF en el navegador del usuario sin abrir nuevas pestañas.

### 🎨 Experiencia de Usuario (UX) Mejorada
* **Selectores en Cascada:** Reemplazo de inputs manuales por listas desplegables inteligentes. Al seleccionar una Materia y un Trimestre, el sistema carga automáticamente las actividades correspondientes.
* **Navegación Fluida:** * Implementación de botones de retorno contextuales ("Volver al Grado", "Volver al Dashboard").
    * Validación de parámetros de URL para evitar errores tipo `NaN` al navegar entre pantallas.
* **Dashboard Interactivo:** * Diseño de tarjetas cuadradas con acciones rápidas.
    * Acceso directo visualmente destacado para la "Carga Masiva" (Planilla).

### 🛡️ Seguridad en el Cliente
* **Guards por Rol (`adminGuard`):** Protección de rutas administrativas. Si un profesor intenta acceder a `/configuracion/usuarios`, es redirigido automáticamente.
* **Menú Adaptativo:** El Navbar se renderiza condicionalmente. Los botones de "Usuarios", "Materias" y "Actividades" se muestran u ocultan según el rol del usuario logueado.

## 5. Estado Actual del Sistema
El sistema es ahora un **Producto Mínimo Viable (MVP) Completo**:

* **Administrador:** Puede configurar el año escolar (Materias, Grados, Actividades) y gestionar el personal (Crear usuarios).
* **Profesor:** Puede entrar, ver sus grados, registrar notas masivamente y descargar los boletines oficiales de sus alumnos.
* **Datos:** Todo persiste en PostgreSQL y los cálculos de promedios son automáticos en el reporte.

## 6. Próximos Pasos (Fase 3 - Futura)
El siguiente gran salto es la **Independencia de Conexión**:

1. **Empaquetado Desktop:** Configuración final de Electron.js para correr como ejecutable `.exe`.
2. **Base de Datos Local:** Integración de SQLite en el cliente Electron.
3. **Mecanismo de Sincronización:** Implementación de lógica offline-first.
