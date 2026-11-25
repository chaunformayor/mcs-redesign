# MCS website as a long-running server (the Oracle "web" server, see oracle-servers/web).
# Vercel ignores this file. Settings come from the environment (/opt/web/env/mcs.env on the server).
# Debian slim rather than Alpine: Prisma's query engine wants glibc and OpenSSL.
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Install for this machine (ARM64). postinstall runs `prisma generate`, so the schema goes in first.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --include=dev --no-audit --no-fund && npm cache clean --force

COPY . .

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
