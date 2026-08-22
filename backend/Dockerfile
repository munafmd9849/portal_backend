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
# Compose startup seeds (users, academic structure, jobs, assessments).
COPY --from=builder /app/seed-all.js ./seed-all.js
COPY --from=builder /app/seed-users.js ./seed-users.js
COPY --from=builder /app/seed-student-profile.js ./seed-student-profile.js
COPY --from=builder /app/seed-admin-data.js ./seed-admin-data.js
COPY --from=builder /app/credentials.js ./credentials.js
COPY --from=builder /app/prisma.js ./prisma.js
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
