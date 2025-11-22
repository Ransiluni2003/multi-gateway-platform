FROM node:18-alpine AS builder
WORKDIR /app

# Install full dependencies for build (includes devDependencies)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

# Install only production dependencies for smaller final image
COPY package*.json ./
RUN npm ci --production

# Copy built app
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=4001
EXPOSE 4001

CMD ["node", "dist/services/payments/server.js"]
