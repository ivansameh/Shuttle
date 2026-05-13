FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations
COPY package*.json ./

# Copy the rider-web package.json
COPY apps/rider-web/package.json apps/rider-web/

# Copy the entire monorepo
COPY . .

# Install dependencies
RUN npm ci

# Build the rider-web
RUN npm run build -w rider-web

FROM nginx:alpine AS runner

# Copy the built assets to nginx's default serve directory
COPY --from=builder /app/apps/rider-web/dist /usr/share/nginx/html

# Add a custom nginx configuration to handle React Router (SPA)
RUN echo "server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
