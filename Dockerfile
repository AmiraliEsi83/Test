FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/market-data/package.json packages/market-data/package.json
COPY packages/strategies/package.json packages/strategies/package.json
COPY packages/trading-engine/package.json packages/trading-engine/package.json
COPY packages/broker-adapters/package.json packages/broker-adapters/package.json
COPY prisma ./prisma
RUN npm install
COPY . .
ARG AUTH_SECRET=build-secret-build-secret-build-secret
ARG ENCRYPTION_KEY=build-encryption-key
ENV AUTH_SECRET=$AUTH_SECRET
ENV ENCRYPTION_KEY=$ENCRYPTION_KEY
ENV DATABASE_URL=file:./prisma/build.db
ENV DEMO_MODE=false
RUN npx prisma generate && npx prisma migrate deploy && npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
