FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
RUN npm test && npm run check && npm run build

FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5
ARG SOURCE_REVISION
LABEL org.opencontainers.image.source="https://github.com/z0rgoyok/cogerentor-factory.git" \
      org.opencontainers.image.revision="${SOURCE_REVISION}"
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates openssh-client gh \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /app/.mastra/output ./
ENV NODE_ENV=production MASTRA_HOST=0.0.0.0 PORT=4111 MASTRA_TELEMETRY_DISABLED=1
USER node
EXPOSE 4111
CMD ["node", "index.mjs"]
