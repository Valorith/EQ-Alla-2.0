FROM node:22-alpine AS base
WORKDIR /app

COPY package.json tsconfig.base.json vitest.config.ts playwright.config.ts ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/data/package.json ./packages/data/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]

