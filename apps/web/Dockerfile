FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN npm install
RUN npm --workspace=packages/shared run build
RUN npm --workspace=packages/market-data run build
RUN npm --workspace=packages/strategies run build
RUN npm --workspace=packages/broker-adapters run build
RUN npm --workspace=packages/trading-engine run build
RUN npm --workspace=apps/web run build

FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
