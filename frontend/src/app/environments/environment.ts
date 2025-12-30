export const environment = {
    production: false,
    apiUrl: 'http://localhost:8081/api',
    auth: {
      domain: 'AUTH0_DOMAIN', // Reemplaza con tu Dominio de Auth0
      clientId: 'AUTH0_CLIENT_ID', // Reemplaza con tu Client ID de Auth0
      authorizationParams: {
        audience: 'API_IDENTIFIER', // Reemplaza con el Identificador (Audience) de tu API
        redirect_uri: window.location.origin,
      },
      namespace: 'https://minibooking.com/roles', // Reemplaza con tu Namespace de Auth0 para roles
    }
}
