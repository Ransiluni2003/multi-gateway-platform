FROM node:18-alpine AS builder
WORKDIR /app

# Install full dependencies and build the project
FROM node:20.10.0-alpine
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built output
COPY --from=builder /app/dist ./dist

EXPOSE 5000
ENV NODE_ENV=production

# Run the compiled gateway server
CMD ["node", "dist/server.js"]
