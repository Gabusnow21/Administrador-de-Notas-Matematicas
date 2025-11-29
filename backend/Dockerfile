# ETAPA 1: Construcción (Build)
# Usamos una imagen de Maven con Java 17 para compilar el proyecto
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copiamos el archivo de dependencias primero (para aprovechar caché de Docker)
COPY pom.xml .
# Descargamos dependencias (esto se guarda en caché si pom.xml no cambia)
RUN mvn dependency:go-offline

# Copiamos el código fuente
COPY src ./src
# Compilamos y empaquetamos el JAR (saltando tests para rapidez en deploy)
RUN mvn clean package -DskipTests

# ETAPA 2: Ejecución (Run)
# Usamos una imagen ligera de Java 17 solo para correr la app
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copiamos el JAR generado en la etapa anterior
COPY --from=build /app/target/*.jar app.jar

# Exponemos el puerto 8080
EXPOSE 8080

# Comando para iniciar la aplicación
ENTRYPOINT ["java", "-jar", "app.jar"]