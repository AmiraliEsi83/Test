FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY prisma/ ./prisma/

RUN npm install
RUN npm --workspace=packages/shared run build
RUN npm --workspace=packages/market-data run build
RUN npm --workspace=packages/strategies run build
RUN npm --workspace=packages/broker-adapters run build
RUN npm --workspace=packages/trading-engine run build
RUN npx prisma generate
RUN npm --workspace=apps/api run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/prisma ./prisma

EXPOSE 5001

CMD ["npm", "--workspace=apps/api", "run", "start"]
