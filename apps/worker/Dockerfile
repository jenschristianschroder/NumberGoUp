FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/domain/package.json packages/domain/
COPY packages/application/package.json packages/application/
COPY packages/contracts/package.json packages/contracts/
COPY packages/infrastructure/package.json packages/infrastructure/
COPY apps/worker/package.json apps/worker/
RUN npm ci --legacy-peer-deps

FROM base AS build
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts/
COPY packages/domain packages/domain/
COPY packages/application packages/application/
COPY packages/infrastructure packages/infrastructure/
COPY apps/worker apps/worker/
RUN npm run build --workspace=packages/contracts \
 && npm run build --workspace=packages/domain \
 && npm run build --workspace=packages/application \
 && npm run build --workspace=packages/infrastructure \
 && npm run build --workspace=apps/worker

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/packages/domain/dist ./packages/domain/dist
COPY --from=build /app/packages/application/dist ./packages/application/dist
COPY --from=build /app/packages/infrastructure/dist ./packages/infrastructure/dist
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/domain/package.json ./packages/domain/
COPY packages/application/package.json ./packages/application/
COPY packages/infrastructure/package.json ./packages/infrastructure/
COPY apps/worker/package.json ./apps/worker/
COPY package.json ./

CMD ["node", "apps/worker/dist/index.js"]
