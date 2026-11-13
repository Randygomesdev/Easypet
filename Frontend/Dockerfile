# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
ARG VITE_INTERNAL_SUPPORT_URL=
ARG VITE_GOOGLE_AUTH_ENABLED=false
ENV VITE_API_URL=/api/v1 \
    VITE_INTERNAL_PILOT=true \
    VITE_WAVE_B_ENABLED=true \
    VITE_AUTH_RECOVERY_ENABLED=true \
    VITE_INTERNAL_SUPPORT_URL=${VITE_INTERNAL_SUPPORT_URL} \
    VITE_GOOGLE_AUTH_ENABLED=${VITE_GOOGLE_AUTH_ENABLED}
RUN npm run build

FROM nginx:stable-alpine
COPY nginx.homolog.conf /etc/nginx/templates/default.conf.template
COPY --from=build /src/dist /usr/share/nginx/html
