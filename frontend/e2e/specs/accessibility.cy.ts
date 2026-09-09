describe('Accesibilidad', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IlVTRVIiLCJub21icmUiOiJVc3VhcmlvIFRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.fake_signature');
    });
  });

  describe('ARIA Labels', () => {
    it('debería tener aria-label en el sidebar', () => {
      cy.visit('/dashboard');
      cy.get('nav[aria-label="Navegación principal"]').should('exist');
    });

    it('debería tener roles ARIA en navegación', () => {
      cy.visit('/dashboard');
      cy.get('[role="menubar"]').should('exist');
      cy.get('[role="menuitem"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Navegación por teclado', () => {
    it('debería navegar con Tab en el login', () => {
      cy.visit('/login');
      cy.get('body').tab();
      cy.focused().should('have.attr', 'type', 'email');
      cy.focused().tab();
      cy.focused().should('have.attr', 'type', 'password');
    });
  });

  describe('Contraste de colores', () => {
    it('debería tener contraste suficiente en textos principales', () => {
      cy.visit('/login');
      cy.get('h3').should('have.css', 'color').and('not.be.empty');
    });
  });

  describe('Formularios accesibles', () => {
    it('debería tener labels asociados a inputs', () => {
      cy.visit('/login');
      cy.get('label[for="floatingInput"]').should('exist');
      cy.get('label[for="floatingPassword"]').should('exist');
      cy.get('#floatingInput').should('have.attr', 'aria-required', 'true');
    });

    it('debería anunciar errores con aria-live', () => {
      cy.visit('/login');
      cy.get('[role="alert"]').should('exist');
    });
  });
});
