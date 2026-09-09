import '@cypress/angular/support';

declare global {
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<void>;
      loginViaApi(username: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (username: string, password: string) => {
  cy.visit('/login');
  cy.get('input[type="email"]').clear().type(username);
  cy.get('input[type="password"]').clear().type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('loginViaApi', (username: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: { username, password }
  }).then((response) => {
    window.localStorage.setItem('authToken', response.body.token);
  });
});

Cypress.Commands.add('logout', () => {
  window.localStorage.clear();
  cy.visit('/login');
});
