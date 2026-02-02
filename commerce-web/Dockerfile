# Multi-stage Dockerfile for Next.js commerce-web application
# Stage 1: Dependencies
FROM node:20.19.0-alpine AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm ci

# Stage 2: Builder
FROM node:20.19.0-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy Prisma files and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Build Next.js application
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner (Production)
FROM node:20.19.0-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy database migration and seed scripts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/dev.db* ./

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

# Set hostname to listen on all interfaces
ENV HOSTNAME="0.0.0.0"
ENV PORT=3001

CMD ["node", "server.js"]
