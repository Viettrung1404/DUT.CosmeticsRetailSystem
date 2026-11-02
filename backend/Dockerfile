# syntax=docker/dockerfile:1
# Image dùng bản debian (glibc) vì bcrypt và sharp tải sẵn bản dựng cho glibc; Prisma cần openssl
ARG NODE_IMAGE=node:22-bookworm-slim

# Giai đoạn build: đủ devDependencies để biên dịch.
# Cũng là image công cụ cho migrate/seed: docker build --target build -t glowup-tools .
FROM ${NODE_IMAGE} AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Giai đoạn phụ thuộc production: bỏ devDependencies
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Giai đoạn chạy: chỉ mã đã biên dịch + node_modules production
FROM ${NODE_IMAGE} AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
# Prisma Client đã generate (gồm query engine) nằm ngoài gói @prisma/client
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
# Nền tảng (Render, Fly, ...) truyền PORT; migrate deploy chạy riêng bằng image công cụ, không chạy ở đây
CMD ["node", "dist/src/main.js"]
