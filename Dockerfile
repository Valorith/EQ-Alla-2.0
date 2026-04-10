FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json tsconfig.base.json vitest.config.ts playwright.config.ts ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/data/package.json ./packages/data/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN npm ci

FROM base AS builder
ENV NODE_ENV=production
ARG EQ_DB_HOST
ARG EQ_DB_PORT
ARG EQ_DB_NAME
ARG EQ_DB_USER
ARG EQ_DB_PASSWORD
ARG MYSQLHOST
ARG MYSQLPORT
ARG MYSQLDATABASE
ARG MYSQLUSER
ARG MYSQLPASSWORD
ARG DATABASE_URL
ARG MYSQL_URL
ENV EQ_DB_HOST=$EQ_DB_HOST
ENV EQ_DB_PORT=$EQ_DB_PORT
ENV EQ_DB_NAME=$EQ_DB_NAME
ENV EQ_DB_USER=$EQ_DB_USER
ENV EQ_DB_PASSWORD=$EQ_DB_PASSWORD
ENV MYSQLHOST=$MYSQLHOST
ENV MYSQLPORT=$MYSQLPORT
ENV MYSQLDATABASE=$MYSQLDATABASE
ENV MYSQLUSER=$MYSQLUSER
ENV MYSQLPASSWORD=$MYSQLPASSWORD
ENV DATABASE_URL=$DATABASE_URL
ENV MYSQL_URL=$MYSQL_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run sync:npc-model-assets && npm run sync:crafted-spells && npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/data ./data

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
