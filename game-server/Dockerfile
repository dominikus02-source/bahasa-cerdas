FROM node:20-slim AS base

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (typescript/tsx are devDeps and are needed to build).
RUN npm ci

# Copy source (includes prisma/schema.prisma)
COPY . .

# Generate the Prisma client BEFORE compiling — without this the runtime throws
# "@prisma/client did not initialize yet".
RUN npx prisma generate

# Compile TypeScript -> dist/
RUN npx tsc

# Drop dev dependencies to slim the runtime image (keeps generated client).
RUN npm prune --omit=dev

# Expose port
EXPOSE 3001

# Container health is independent from the database and checks the realtime HTTP process.
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD node -e "const p=process.env.PORT||process.env.GAME_PORT||3001;fetch('http://127.0.0.1:'+p+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

STOPSIGNAL SIGTERM
USER node

# Start
CMD ["node", "dist/server.js"]
