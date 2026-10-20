# Dockerfile for OpenWA Baileys WhatsApp Gateway
FROM node:20-alpine
WORKDIR /app

# Install build tools if native compilation is needed
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# Environment configuration
ENV PORT=2785
ENV NODE_ENV=production
EXPOSE 2785

# Persist multi-device WhatsApp auth keys across container restarts
VOLUME ["/app/auth_info_baileys"]

CMD ["node", "src/main.js"]
