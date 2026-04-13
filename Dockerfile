# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY apps/web/package.json ./apps/web/
WORKDIR /app/apps/web
RUN env -u NPM_CONFIG_PRODUCTION -u npm_config_production npm install

FROM base AS build
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN env -u NPM_CONFIG_PRODUCTION -u npm_config_production npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/apps/web/.next/standalone ./apps/web/.next/standalone
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/scripts/validate-runtime-env.mjs ./apps/web/scripts/validate-runtime-env.mjs

EXPOSE 3000
CMD ["sh", "-c", "node apps/web/scripts/validate-runtime-env.mjs && node apps/web/.next/standalone/server.js"]
