FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps ./apps
COPY packages ./packages
RUN npm install
ENV DATABASE_URL="file:./dev.db"
ENV JWT_SECRET="change-me"
ENV DEMO_MODE="true"
ENV WEB_ORIGIN="http://localhost:3000"
ENV NEXT_PUBLIC_API_URL="http://localhost:4000"
WORKDIR /app/apps/api
RUN npx prisma generate && npx prisma db push --skip-generate
WORKDIR /app
EXPOSE 3000 4000
CMD ["npm", "run", "start"]
