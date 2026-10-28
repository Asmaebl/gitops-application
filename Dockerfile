# Build stage: install production dependencies only.
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Runtime stage: production dependencies only, no tests, no build cache.
FROM node:24-alpine
WORKDIR /app

ARG GIT_SHA=dev

ENV NODE_ENV=production
ENV GIT_SHA=$GIT_SHA

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# The node image ships an unprivileged `node` user (uid 1000). Running as it
# lets the Deployment set runAsNonRoot: true.
USER node

EXPOSE 3000
CMD ["node", "src/server.js"]