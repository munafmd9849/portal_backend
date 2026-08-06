# Multi-stage build for Node.js backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy Prisma schema first (needed for npm ci postinstall)
COPY prisma ./prisma

# Install dependencies (runs Prisma generate via postinstall)
RUN npm ci

# Final stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init and OpenSSL for Prisma
RUN apk add --no-cache dumb-init openssl

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy source code
COPY src ./src
COPY package.json package-lock.json ./

# Expose port
EXPOSE 5000

# Run schema sync on startup (project uses db push; no migrate history), then start server
CMD ["dumb-init", "sh", "-c", "npx prisma db push && npm run start"]
