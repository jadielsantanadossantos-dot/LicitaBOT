# LicitaBOT API — Playwright precisa de browser + SO completo.
# Imagem oficial já traz Chromium + deps (casa com playwright ^1.49.0).
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# 1) manifests p/ cache de npm
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/portal/package.json packages/portal/
COPY packages/engine/package.json packages/engine/
COPY apps/api/package.json apps/api/

RUN npm ci --workspace=api --include-workspace-root

# 2) código + build
COPY tsconfig.json ./
COPY packages/shared packages/shared
COPY packages/portal packages/portal
COPY packages/engine packages/engine
COPY apps/api apps/api

RUN npm run build --workspace=@licitabot/shared \
 && npm run build --workspace=@licitabot/portal \
 && npm run build --workspace=@licitabot/engine \
 && npm run build --workspace=api

ENV NODE_ENV=production
ENV PORT=3001

# storageState por CNPJ (login persistente) — montar volume aqui
VOLUME ["/app/apps/api/storage"]

EXPOSE 3001
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
