FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/deepspace-collaboration-protocol/package.json packages/deepspace-collaboration-protocol/package.json
COPY packages/deepspace-relay/package.json packages/deepspace-relay/package.json
RUN npm install --global npm@11.6.2 \
  && npm ci --omit=dev --workspace @deepspace/relay --include-workspace-root=false --no-audit --no-fund

FROM node:24-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY packages/deepspace-collaboration-protocol packages/deepspace-collaboration-protocol
COPY packages/deepspace-relay packages/deepspace-relay
USER node
EXPOSE 8787
CMD ["node", "packages/deepspace-relay/src/server.mjs"]
