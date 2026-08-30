# ==========================================
# STAGE 1: Build & Compile React Assets
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install ALL dependencies (including devDependencies like Vite/PostCSS/Tailwind)
RUN npm ci

# Copy the rest of your frontend project source code
COPY . .

# Set production environment flags for Vite compilation optimization
ENV NODE_ENV=production

# Vite replaces VITE_* variables while building the static bundle. Runtime
# environment variables in the Nginx container cannot configure it afterwards.
ARG VITE_API_BASE_URL=http://localhost:3000/api
ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_SOCKET_URL=http://localhost:3000
ARG VITE_GOOGLE_CLIENT_ID=620332349787-8elql0hf7t3c0mh6kom6md1pt9prdq3q.apps.googleusercontent.com
ARG VITE_JITSI_DOMAIN=meet.jit.si

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_URL=$VITE_API_URL \
    VITE_SOCKET_URL=$VITE_SOCKET_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_JITSI_DOMAIN=$VITE_JITSI_DOMAIN

# Compile React 19 source code into optimized /dist static bundle folder
RUN npm run build

# ==========================================
# STAGE 2: High-Performance Production Nginx Server
# ==========================================
FROM nginx:1.25-alpine AS runner

# BrowserRouter routes do not have matching files in the static build. Route
# unknown paths to index.html so React can render the requested page.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled static files from Stage 1 into Nginx default serving folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 (Standard Nginx distribution port)
EXPOSE 80

# Run Nginx in the foreground so the Docker container remains active
CMD ["nginx", "-g", "daemon off;"]
