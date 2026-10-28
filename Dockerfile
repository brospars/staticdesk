# StaticDesk app (dashboard, API and widget.js) as a Node server.
# Build: docker build -t staticdesk .   Run it with docker/docker-compose.yml.

FROM node:22-alpine AS build
WORKDIR /repo

# Dependencies first, for layer caching.
COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/widget/package.json packages/widget/
COPY packages/integrations/docusaurus/package.json packages/integrations/docusaurus/
# Scripts are skipped: the Supabase CLI download is not needed, nuxt build prepares the app itself.
RUN npm ci --ignore-scripts

COPY . .
ENV NITRO_PRESET=node-server \
    NUXT_TELEMETRY_DISABLED=1
RUN npx turbo run build --filter=@staticdesk/web

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /repo/apps/web/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1
CMD ["node", ".output/server/index.mjs"]
