export class DashboardPage {
  private readonly dashboardLink = 'a[href="/dashboard"]';
  private readonly sidebar = 'nav[aria-label="Navegación principal"]';
  private readonly userMenu = '[data-cy="user-menu"]';

  visit() {
    cy.visit('/dashboard');
    return this;
  }

  getSidebar() {
    return cy.get(this.sidebar);
  }

  getSidebarLink(text: string) {
    return cy.contains(text);
  }

  clickSidebarLink(text: string) {
    this.getSidebarLink(text).click();
    return this;
  }

  isSidebarExpanded() {
    return this.getSidebar().should('have.class', 'expanded');
  }

  toggleSidebar() {
    cy.get('button[aria-label="Toggle navigation menu"]').click();
    return this;
  }

  getUserName() {
    return cy.get('[data-cy="user-name"]');
  }
}
