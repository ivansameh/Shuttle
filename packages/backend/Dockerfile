# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install basic build tools
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy root workspace configuration AND all package files for workspaces
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY apps/rider-web/package*.json ./apps/rider-web/
COPY apps/admin-web/package*.json ./apps/admin-web/

# Install dependencies with legacy-peer-deps to handle monorepo conflicts
RUN npm install --legacy-peer-deps

# Copy source code
COPY packages/backend ./packages/backend

# Generate Prisma client
WORKDIR /app/packages/backend
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install openssl and ca-certificates for Prisma and secure connections
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy built artifacts and production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/package.json ./package.json
COPY --from=builder /app/packages/backend/prisma ./prisma
COPY --from=builder /app/packages/backend/certs ./certs
COPY --from=builder /app/packages/backend/tsconfig.json ./tsconfig.json

# Set environment to production
ENV NODE_ENV=production

# Expose the API port (and HTTPS port)
EXPOSE 3001

# Run migrations and start the server with a wait loop for the database
CMD ["sh", "-c", "node -e \"const net = require('net'); const check = () => { const s = net.connect(5432, 'db', () => { s.end(); process.exit(0); }); s.on('error', () => { setTimeout(check, 2000); }); }; check();\" && npx prisma migrate deploy && npx prisma db seed && node dist/index.js"]
