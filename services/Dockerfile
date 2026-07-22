FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 8080

# Each compose service overrides this command (api / attestation / reserve-oracle / orchestrator).
CMD ["npx", "tsx", "src/api/server.ts"]
