FROM node:24-alpine AS base

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@12.4.1

WORKDIR /app

FROM base AS deps

RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV BETTER_AUTH_URL=http://localhost:3000
ENV BETTER_AUTH_SECRET=build-time-only-secret-change-me-32chars
ENV AUTH_REQUIRED=false

RUN node scripts/init-auth-db.mjs
RUN pnpm build

FROM base AS runner

RUN apk add --no-cache ca-certificates libstdc++

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/.data ./.data

RUN chown -R node:node /app

USER node
EXPOSE 3000

CMD ["sh", "-c", "node scripts/init-auth-db.mjs && exec node node_modules/next/dist/bin/next start"]
