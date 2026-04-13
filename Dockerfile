# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY frontend/package.json ./frontend/
WORKDIR /app/frontend
RUN env -u NPM_CONFIG_PRODUCTION -u npm_config_production npm install

FROM base AS build
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY frontend ./frontend
WORKDIR /app/frontend
RUN env -u NPM_CONFIG_PRODUCTION -u npm_config_production npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/frontend/.next/standalone ./frontend/.next/standalone
COPY --from=build /app/frontend/.next/static ./frontend/.next/static
COPY --from=build /app/frontend/public ./frontend/public
COPY --from=build /app/frontend/scripts/validate-runtime-env.mjs ./frontend/scripts/validate-runtime-env.mjs

EXPOSE 3000
CMD ["sh", "-c", "node frontend/scripts/validate-runtime-env.mjs && node frontend/.next/standalone/server.js"]
