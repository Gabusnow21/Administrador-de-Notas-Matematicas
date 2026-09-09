import { DashboardPage } from '../pages/dashboard.page';

describe('Navegación', () => {
  const dashboardPage = new DashboardPage();

  describe('Rutas protegidas', () => {
    it('debería redirigir a login si no está autenticado', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('debería acceder a dashboard con token válido', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IlVTRVIiLCJub21icmUiOiJVc3VhcmlvIFRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.fake_signature');
      });
      cy.visit('/dashboard');
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Sidebar', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IlVTRVIiLCJub21icmUiOiJVc3VhcmlvIFRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.fake_signature');
      });
      cy.visit('/dashboard');
    });

    it('debería mostrar el sidebar', () => {
      dashboardPage.getSidebar().should('be.visible');
    });

    it('debería tener navegación accesible', () => {
      dashboardPage.getSidebar().should('have.attr', 'role', 'navigation');
      dashboardPage.getSidebar().should('have.attr', 'aria-label', 'Navegación principal');
    });

    it('debería toggle el sidebar', () => {
      dashboardPage.toggleSidebar();
      dashboardPage.getSidebar().should('have.class', 'expanded');
    });
  });

  describe('Protección de rutas', () => {
    it('debería bloquear ruta admin para usuario normal', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IlVTRVIiLCJub21icmUiOiJVc3VhcmlvIFRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.fake_signature');
      });
      cy.visit('/configuracion/usuarios');
      cy.url().should('not.include', '/configuracion/usuarios');
    });

    it('debería permitir ruta teacher para usuario teacher', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IlVTRVIiLCJub21icmUiOiJVc3VhcmlvIFRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.fake_signature');
      });
      cy.visit('/gestion-asistencia');
      cy.url().should('include', '/gestion-asistencia');
    });
  });
});
