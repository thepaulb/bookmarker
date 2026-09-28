# --- server dependencies (production only) ---
# better-sqlite3 compiles a native addon, so this stage needs a build
# toolchain; it's discarded after `npm ci`, so the final image stays slim.
FROM node:22-alpine AS server-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- client build ---
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- runtime ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p /data && chown node:node /data
COPY --from=server-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
USER node
EXPOSE 3001
VOLUME /data
CMD ["node", "server/index.js"]
