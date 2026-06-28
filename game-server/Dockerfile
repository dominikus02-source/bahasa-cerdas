FROM node:20-slim AS base

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build
RUN npx tsc

# Expose port
EXPOSE 3001

# Start
CMD ["node", "dist/server.js"]
