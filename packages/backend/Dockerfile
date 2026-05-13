FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations
COPY package*.json ./

# Copy the backend package.json to preserve workspace structure
COPY packages/backend/package.json packages/backend/

# Copy the entire monorepo
COPY . .

# Install dependencies for all workspaces
RUN npm ci

# Generate Prisma client
RUN cd packages/backend && npx prisma generate

# Build the backend
RUN npm run build -w @shuttle/backend

# Prune dev dependencies from the root
RUN npm prune --production


FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# We need the root package.json and node_modules for hoisted dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Copy backend output and its local node_modules
COPY --from=builder /app/packages/backend/package.json ./packages/backend/package.json
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/prisma ./packages/backend/prisma
# Check if local node_modules exists, otherwise it might fail. Often it does not exist if fully hoisted.
# Using a wildcard prevents failure if the directory doesn't exist
COPY --from=builder /app/packages/backend/node_module[s] ./packages/backend/node_modules

WORKDIR /app/packages/backend

EXPOSE 3001

CMD ["node", "dist/index.js"]
