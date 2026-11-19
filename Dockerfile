# Build from the dltool/ directory with `docker compose build dltool` (context: ./frontend).

FROM node:22-alpine AS dependencies
WORKDIR /app
# `postinstall` runs `prisma generate`, so the schema must be present before `npm ci`.
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so they must be build args.
ARG NEXT_PUBLIC_SITE_URL=
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=
# Leave empty behind the Caddy/Nginx proxy (the browser uses wss://<site>/live-share-ws). "off" disables Live Share.
ARG NEXT_PUBLIC_LIVE_SHARE_WS_URL=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID \
    NEXT_PUBLIC_LIVE_SHARE_WS_URL=$NEXT_PUBLIC_LIVE_SHARE_WS_URL \
    NEXT_TELEMETRY_DISABLED=1
# Placeholder only so Prisma can generate; the real DATABASE_URL is supplied at runtime.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
# `npm start` is the dev server in this project; `serve` is `next start`.
CMD ["npm", "run", "serve"]
