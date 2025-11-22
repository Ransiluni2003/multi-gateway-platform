FROM node:18-alpine AS builder
WORKDIR /app

# Install full deps and build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

# Install production deps only
COPY package*.json ./
RUN npm ci --production

# Copy built output
COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Run compiled gateway API (gateway server lives in dist/gateway/server.js)
CMD ["node", "dist/gateway/server.js"]
