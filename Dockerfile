# ── Multi-stage build: Node → nginx:alpine ────────────────────────────────
# Stage 1: Build the Vite/React app
# ────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Cache npm dependencies separately
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ────────────────────────────────────────────────────────────────────────────
# Stage 2: Serve with nginx:alpine
# ────────────────────────────────────────────────────────────────────────────
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]