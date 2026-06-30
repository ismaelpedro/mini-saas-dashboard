# syntax=docker/dockerfile:1

# 1. Install dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# 2. Build the application
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate the Prisma client fresh, then build Next.js.
RUN npx prisma generate && npm run build

# 3. Runtime image
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Full dependency set is kept so migrations and seeding can run at startup
# (the Prisma CLI and tsx are dev dependencies).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/app/generated ./app/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts /app/next.config.ts ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
