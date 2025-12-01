FROM node:18-alpine AS builder
WORKDIR /app

# Install full dependencies for build
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20.10.0-alpine AS runner
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --production

# Copy built output
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=4002
EXPOSE 4002

CMD ["node", "dist/services/analytics/server.js"]
