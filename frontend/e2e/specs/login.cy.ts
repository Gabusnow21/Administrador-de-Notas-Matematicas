import { LoginPage } from '../pages/login.page';

describe('Login', () => {
  const loginPage = new LoginPage();

  beforeEach(() => {
    loginPage.visit();
  });

  describe('Formulario de Login', () => {
    it('debería mostrar el formulario de login', () => {
      loginPage.getTitle().should('contain', 'Bienvenido');
      loginPage.getEmailInput().should('be.visible');
      loginPage.getPasswordInput().should('be.visible');
      loginPage.getSubmitButton().should('be.visible');
    });

    it('debería deshababilitar el botón cuando el formulario es inválido', () => {
      loginPage.getSubmitButton().should('be.disabled');
    });

    it('debería habilitar el botón con credenciales válidas', () => {
      loginPage.getEmailInput().type('test@example.com');
      loginPage.getPasswordInput().type('password123');
      loginPage.getSubmitButton().should('not.be.disabled');
    });
  });

  describe('Navegación', () => {
    it('debería alternar a vista de registro', () => {
      loginPage.toggleToRegister();
      loginPage.getTitle().should('contain', 'Crear Cuenta');
    });

    it('debería alternar de vuelta a login', () => {
      loginPage.toggleToRegister();
      loginPage.toggleToLogin();
      loginPage.getTitle().should('contain', 'Bienvenido');
    });
  });

  describe('Validación', () => {
    it('debería mostrar error con credenciales inválidas', () => {
      loginPage.login('wrong@example.com', 'wrongpassword');
      loginPage.getErrorMessage().should('be.visible');
    });

    it('debería validar formato de email', () => {
      loginPage.getEmailInput().type('invalid-email');
      loginPage.getEmailInput().should('have.class', 'is-invalid');
    });
  });

  describe('Accesibilidad', () => {
    it('debería tener labels accesibles', () => {
      cy.get('label[for="floatingInput"]').should('exist');
      cy.get('label[for="floatingPassword"]').should('exist');
    });

    it('debería tener aria-required en campos', () => {
      cy.get('#floatingInput').should('have.attr', 'aria-required', 'true');
      cy.get('#floatingPassword').should('have.attr', 'aria-required', 'true');
    });
  });
});
