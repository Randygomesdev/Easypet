# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
ENV VITE_API_URL=/api/v1 \
    VITE_INTERNAL_PILOT=true
RUN npm run build

FROM nginx:stable-alpine
COPY nginx.homolog.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
