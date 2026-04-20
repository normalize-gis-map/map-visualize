# Base
FROM node:20-alpine AS base
WORKDIR /app

# install pnpm
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build
FROM base AS build

ARG NEXT_PUBLIC_API_URI
ENV NEXT_PUBLIC_API_URI=$NEXT_PUBLIC_API_URI

COPY . .
RUN pnpm build

# Production
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]