# Administrador-de-Notas-Matematicas
Sistema web para administrar calificaciones por maestro de manera offline usando electron 

🏫 Sistema de Gestión de Calificaciones Escolares (Full Stack)Un sistema robusto y escalable para la administración académica, desarrollado con una arquitectura moderna de microservicios (monolito modular) que permite a instituciones educativas gestionar grados, estudiantes, actividades y calificaciones de manera eficiente.🚀 Características Implementadas🛡️ Fase 1: Núcleo y SeguridadAutenticación JWT: Sistema de login seguro con tokens JSON Web Tokens (Stateless).Gestión de Roles: Diferenciación jerárquica entre ADMIN (Director/Coordinador) y USER (Profesor).Base de Datos Relacional: Modelo E-R optimizado en PostgreSQL para integridad referencial.API RESTful: Endpoints documentados y protegidos para todas las operaciones CRUD.📊 Fase 2: Experiencia de Usuario y ReportesDashboard Interactivo: Panel principal con tarjetas resumen y accesos rápidos.Carga Masiva de Notas: Interfaz tipo "hoja de cálculo" para calificar a todo un grado simultáneamente.Selectores Inteligentes: Formularios dinámicos que cargan actividades según la materia y trimestre seleccionados.Motor de Reportes: Generación automática de Boletines de Calificaciones en PDF utilizando JasperReports, con cálculo automático de promedios trimestrales.Seguridad en Frontend: Guards de Angular para proteger rutas administrativas y directivas estructurales para ocultar elementos según el rol.🛠️ Stack TecnológicoBackend (API)Lenguaje: Java 17 (LTS)Framework: Spring Boot 3.2Seguridad: Spring Security 6 + JWTPersistencia: Spring Data JPA (Hibernate)Reportes: JasperReports 6.20Base de Datos: PostgreSQLFrontend (Cliente Web)Framework: Angular 17+ (Standalone Components)Estilos: Bootstrap 5 + SCSSIconos: Bootstrap IconsCliente HTTP: Fetch API nativa (con interceptores para Token)📂 Estructura del ProyectoEl proyecto está organizado como un monorepositorio con carpetas separadas:/
├── backend/            # Código fuente Java (Spring Boot)
│   ├── src/main/java   # Controladores, Servicios, Repositorios
│   ├── src/main/resources
│   │   ├── reports/    # Plantillas .jrxml (JasperReports)
│   │   └── application.properties
│   └── Dockerfile      # Configuración de contenedor Backend
│
├── frontend/           # Código fuente TypeScript (Angular)
│   ├── src/app/        # Componentes, Servicios, Guards
│   └── Dockerfile      # Configuración de contenedor Frontend (Nginx)
│
└── docker-compose.yml  # Orquestación de servicios
⚙️ Instalación y Despliegue (Docker)El proyecto está dockerizado para un despliegue rápido.PrerrequisitosDocker y Docker Compose instalados.PasosClonar el repositorio.Crear un archivo .env en la raíz (ver ejemplo abajo).Ejecutar el comando de construcción:docker-compose up --build
Acceder a la aplicación:Frontend: http://localhost:80Backend API: http://localhost:8080Base de Datos: Puerto 5432📸 Capturas de Pantalla(Espacio reservado para agregar imágenes del Dashboard, Login y Reporte PDF)🔮 Próximos Pasos (Roadmap)[ ] Fase 3: Empaquetado como aplicación de escritorio (Electron).[ ] Fase 3: Base de datos local (SQLite) para modo offline.[ ] Fase 3: Sincronización
