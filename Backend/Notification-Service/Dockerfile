# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml ./
COPY src ./src
RUN --mount=type=cache,target=/root/.m2,sharing=locked mvn -B -DskipTests package \
    && cp target/notification-service-*.jar /app.jar

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl \
    && addgroup -S app \
    && adduser -S -G app app
WORKDIR /app
COPY --from=build /app.jar ./app.jar
USER app
EXPOSE 8087
HEALTHCHECK --interval=30s --timeout=4s --start-period=30s --retries=3 CMD curl -fsS --max-time 3 http://127.0.0.1:8089/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
