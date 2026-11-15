# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:22-bookworm-slim

# Giai đoạn 1: Cài đặt dependencies (bao gồm devDependencies cho việc biên dịch)
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Giai đoạn 2: Biên dịch Next.js (production build)
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time environment variables
ARG NEXT_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
ARG NEXT_PUBLIC_MAP_ATTRIBUTION='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SITE_URL=http://localhost:3001
ENV BACKEND_API_BASE_URL=http://backend:3000/api/v1

RUN npm run build

# Giai đoạn 3: Production runner
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

USER node

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json

EXPOSE 3001

CMD ["npx", "next", "start", "--port", "3001", "--hostname", "0.0.0.0"]
