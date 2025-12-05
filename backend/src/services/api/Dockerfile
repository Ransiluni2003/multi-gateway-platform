FROM node:20.19.0-alpine AS builder
WORKDIR /app

# Install dependencies and build
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm ci
COPY . .
RUN npm run build

FROM node:20.19.0-alpine AS runner
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm ci --production

# Copy built output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Run the compiled gateway API (adjust path if needed)
CMD ["node", "dist/gateway/server.js"]
