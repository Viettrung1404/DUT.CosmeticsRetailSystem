# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=development
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
ENV PORT=8081

# Cài đặt dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Sao chép mã nguồn ứng dụng
COPY . .

# Đảm bảo quyền sở hữu thư mục cho user node
RUN mkdir -p /app/.expo && chown -R node:node /app

USER node

EXPOSE 8081

# Khởi chạy Metro Bundler kèm giao diện Web trên cổng 8081
CMD ["npx", "expo", "start", "--web", "--port", "8081"]
