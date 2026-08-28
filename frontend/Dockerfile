# ETAPA 1: Construcción (Build)
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
WORKDIR /app

# Copiamos package.json, pnpm-lock.yaml e instalamos dependencias
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copiamos el código fuente
COPY . .
# Compilamos la aplicación para producción
RUN pnpm ng build --configuration production

# ETAPA 2: Servidor Web (Nginx)
FROM nginx:alpine

# Copiamos los archivos compilados de Angular a la carpeta pública de Nginx
# NOTA: Ajusta 'dist/gestor-frontend/browser' según tu angular.json (outputPath)
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Copiamos una configuración básica de Nginx (opcional, pero recomendada para SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponemos el puerto 80
EXPOSE 80

# Nginx corre en primer plano por defecto
CMD ["nginx", "-g", "daemon off;"]