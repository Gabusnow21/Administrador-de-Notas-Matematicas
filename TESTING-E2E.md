# Testing E2E con Cypress

Guía para ejecutar y mantener los tests End-to-End del proyecto.

---

## Instalación

```bash
cd frontend
pnpm install
```

Cypress se instala automáticamente como dependencia de desarrollo.

---

## Ejecución de Tests

### Modo Headless (CI/CD)
```bash
pnpm test:e2e
```

### Modo Interactivo (Desarrollo)
```bash
pnpm test:e2e:open
```

Esto abre la GUI de Cypress para seleccionar y ejecutar tests individualmente.

---

## Estructura de Tests

```
frontend/e2e/
├── support.ts              # Comandos personalizados y configuración
├── pages/                  # Page Object Models
│   ├── login.page.ts       # Página de login
│   └── dashboard.page.ts   # Dashboard principal
└── specs/                  # Tests
    ├── login.cy.ts         # Tests de autenticación
    ├── navigation.cy.ts    # Tests de navegación y rutas
    └── accessibility.cy.ts # Tests de accesibilidad ARIA
```

---

## Page Object Model

Los Page Objects encapsulan la interacción con la página:

### LoginPage
```typescript
import { LoginPage } from '../pages/login.page';

const loginPage = new LoginPage();

// Visitar página
loginPage.visit();

// Login completo
loginPage.login('user@example.com', 'password123');

// Alternar a registro
loginPage.toggleToRegister();
```

### DashboardPage
```typescript
import { DashboardPage } from '../pages/dashboard.page';

const dashboardPage = new DashboardPage();

// Visitar dashboard
dashboardPage.visit();

// Toggle sidebar
dashboardPage.toggleSidebar();

// Click en enlace del sidebar
dashboardPage.clickSidebarLink('Usuarios');
```

---

## Comandos Personalizados

Definidos en `e2e/support.ts`:

| Comando | Descripción |
|---------|-------------|
| `cy.login(username, password)` | Login via UI |
| `cy.loginViaApi(username, password)` | Login via API (más rápido) |
| `cy.logout()` | Limpiar sesión |

### Uso
```typescript
// Login rápido via API (recomendado para tests que no prueban login)
cy.loginViaApi('admin@edumath.com', 'password123');

// Login via UI (para tests de login)
cy.login('admin@edumath.com', 'password123');
```

---

## Tests Incluidos

### 1. Login (`login.cy.ts`)
- Formulario visible y funcional
- Validación de campos obligatorios
- Alternar entre login/registro
- Mensajes de error
- Accesibilidad (labels, aria-required)

### 2. Navegación (`navigation.cy.ts`)
- Rutas protegidas redirigen a login
- Sidebar funcional con roles ARIA
- Protección de rutas por rol (admin/teacher)

### 3. Accesibilidad (`accessibility.cy.ts`)
- ARIA labels en navegación
- Navegación por teclado (Tab)
- Contraste de colores
- Asociación label-input

---

## Configuración

### cypress.config.ts
```typescript
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',    // URL del frontend
    specPattern: 'e2e/**/*.cy.ts',       // Patrón de tests
    viewportWidth: 1280,                 // Ancho viewport
    viewportHeight: 720,                 // Alto viewport
    env: {
      apiUrl: 'http://localhost:8081/api' // URL del backend
    }
  }
});
```

---

## Requisitos

1. **Frontend ejecutándose**: `pnpm start`
2. **Backend ejecutándose**: Necesario para tests de login real
3. **Base de datos**: PostgreSQL con datos de prueba

---

## CI/CD

### GitHub Actions
```yaml
- name: Run E2E Tests
  run: |
    cd frontend
    pnpm install
    pnpm test:e2e
```

### Variables de Entorno
Para CI, configurar URLs via variables de entorno:
```bash
CYPRESS_BASE_URL=https://staging.example.com
CYPRESS_API_URL=https://api-staging.example.com
```

---

## Adding New Tests

1. Crear archivo `e2e/specs/nombre-test.cy.ts`
2. Importar Page Objects si es necesario
3. Usar `beforeEach()` para configuración
4. Seguir patrón AAA (Arrange, Act, Assert)

### Template
```typescript
describe('Nombre del Feature', () => {
  beforeEach(() => {
    // Setup
  });

  it('debería hacer algo', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

---

## Troubleshooting

### Tests fallan con "element not found"
- Verificar selectores CSS
- Agregar `{ timeout: 10000 }` para elementos lentos
- Usar `cy.wait()` solo como último recurso

### Login falla
- Verificar que el backend esté corriendo
- Verificar credenciales de prueba
- Revisar CORS en backend

### Tests lentos
- Usar `cy.loginViaApi()` en vez de `cy.login()`
- Evitar `cy.wait()` innecesarios
- Ejecutar tests en paralelo con `--parallel`
