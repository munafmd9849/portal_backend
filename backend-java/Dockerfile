FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src src
RUN apk add --no-cache maven && mvn -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/placement-portal-1.0.0.jar app.jar
EXPOSE 3000 3001
ENV PORT=3000
ENTRYPOINT ["java", "-jar", "app.jar"]
