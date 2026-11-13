# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
COPY src ./src
RUN --mount=type=cache,target=/root/.gradle,sharing=locked sed -i 's/\r$//' gradlew \
    && sh gradlew --no-daemon bootJar \
    && cp build/libs/*.jar /app.jar

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl \
    && addgroup -S app \
    && adduser -S -G app app
WORKDIR /app
COPY --from=build /app.jar ./app.jar
USER app
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
