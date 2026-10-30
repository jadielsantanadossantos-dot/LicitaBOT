# LicitaBOT WEB — Next.js standalone (ideal p/ Vercel grátis ou Docker)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace=web --include-workspace-root
COPY tsconfig.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
# NEXT_PUBLIC_API_URL é lida no build/dev — informe a URL pública da API
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build --workspace=web

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public 2>/dev/null || true
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
