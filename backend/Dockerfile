# ==========================================
# STAGE 1: Build & Compile Dependencies
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install system build dependencies required for compiling native C++ packages
RUN apk add --no-cache python3 make g++ openssl

# Copy package manifests
COPY package*.json ./

# 🌟 CRITICAL MOVE: Copy the Prisma folder BEFORE running npm install
# This satisfies the automatic "postinstall": "prisma generate" hook script.
COPY prisma ./prisma/

# Install locked dependencies. The postinstall script generates only the Prisma
# client; ERD rendering is a development task and needs a browser binary.
RUN npm ci

# Copy the rest of your backend source code
COPY . .

# Keep the runtime image free of development-only tools such as Mermaid CLI.
RUN npm prune --omit=dev

# ==========================================
# STAGE 2: Clean Production Runner
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Ensure node processes run under production optimizations
ENV NODE_ENV=production

# Prisma's Alpine engine requires OpenSSL at runtime.
RUN apk add --no-cache openssl

# Copy production dependencies, generated Prisma client binaries, and source.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
# Email delivery reads these HTML files from disk at runtime.
COPY --from=builder /app/email-templates ./email-templates
# Google Sheets settings are stored as runtime-readable JSON.
COPY --from=builder /app/data ./data

EXPOSE 3000


# Executed in vector form to handle container OS shutdown signals properly
CMD ["npm", "start"]
