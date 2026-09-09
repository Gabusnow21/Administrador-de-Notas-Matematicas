export class LoginPage {
  private readonly emailInput = 'input[type="email"]';
  private readonly passwordInput = 'input[type="password"]';
  private readonly submitButton = 'button[type="submit"]';
  private readonly errorMessage = '.alert-danger';
  private readonly title = 'h3';

  visit() {
    cy.visit('/login');
    return this;
  }

  getEmailInput() {
    return cy.get(this.emailInput);
  }

  getPasswordInput() {
    return cy.get(this.passwordInput);
  }

  getSubmitButton() {
    return cy.get(this.submitButton);
  }

  getErrorMessage() {
    return cy.get(this.errorMessage);
  }

  getTitle() {
    return cy.get(this.title);
  }

  login(username: string, password: string) {
    this.getEmailInput().clear().type(username);
    this.getPasswordInput().clear().type(password);
    this.getSubmitButton().click();
    return this;
  }

  toggleToRegister() {
    cy.contains('Regístrate aquí').click();
    return this;
  }

  toggleToLogin() {
    cy.contains('Inicia Sesión').click();
    return this;
  }

  register(nombre: string, apellido: string, email: string, password: string) {
    cy.get('#regNombre').clear().type(nombre);
    cy.get('#regApellido').clear().type(apellido);
    cy.get('#regEmail').clear().type(email);
    cy.get('#regPass').clear().type(password);
    cy.get('button[type="submit"]').click();
    return this;
  }
}
