# Makefile for Multi-Gateway Platform
# Provides convenient shortcuts for Docker and development commands

.PHONY: help setup up down restart logs clean build test seed migrate

# Default target
help:
	@echo "Multi-Gateway Platform - Available Commands"
	@echo ""
	@echo "Setup & Management:"
	@echo "  make setup      - Initial setup (copy .env and install deps)"
	@echo "  make up         - Start all services (docker-compose up -d)"
	@echo "  make dev        - Start with logs (docker-compose up)"
	@echo "  make down       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View all logs"
	@echo "  make clean      - Remove all containers and volumes"
	@echo "  make build      - Rebuild all images"
	@echo ""
	@echo "Database:"
	@echo "  make migrate    - Run database migrations"
	@echo "  make seed       - Seed demo data"
	@echo "  make db-reset   - Reset database and reseed"
	@echo ""
	@echo "Testing:"
	@echo "  make test       - Run E2E tests"
	@echo "  make test-wh    - Test webhooks"
	@echo ""
	@echo "Utilities:"
	@echo "  make health     - Check service health"
	@echo "  make ps         - Show running containers"
	@echo "  make shell      - Shell into commerce-web container"

# Setup
setup:
	@echo "Setting up environment..."
	@if [ ! -f .env ]; then cp .env.example .env && echo "✅ Created .env file - please edit with your credentials"; fi
	@echo "✅ Setup complete! Edit .env with your API keys, then run: make up"

# Docker management
up:
	@echo "Starting all services..."
	docker-compose up --build -d
	@echo "✅ Services started! Check status with: make ps"

dev:
	@echo "Starting services with logs..."
	docker-compose up --build

down:
	@echo "Stopping all services..."
	docker-compose down
	@echo "✅ Services stopped"

restart:
	@echo "Restarting all services..."
	docker-compose down
	docker-compose up --build -d
	@echo "✅ Services restarted"

logs:
	docker-compose logs -f

clean:
	@echo "⚠️  WARNING: This will delete all data!"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	docker-compose down -v
	@echo "✅ All containers and volumes removed"

build:
	@echo "Building all images..."
	docker-compose build --no-cache
	@echo "✅ Build complete"

# Database operations
migrate:
	@echo "Running database migrations..."
	docker-compose exec commerce-web npx prisma migrate deploy
	@echo "✅ Migrations complete"

seed:
	@echo "Seeding demo data..."
	docker-compose exec commerce-web npm run seed
	@echo "✅ Seeding complete"

db-reset:
	@echo "Resetting database..."
	docker-compose exec commerce-web npx prisma migrate reset --force
	docker-compose exec commerce-web npm run seed
	@echo "✅ Database reset and seeded"

# Testing
test:
	@echo "Running E2E tests..."
	cd commerce-web && npm run test:e2e

test-wh:
	@echo "Testing webhooks..."
	cd commerce-web && npm run test:webhooks

# Utilities
health:
	@echo "Checking service health..."
	@curl -s http://localhost:3001/api/health | python -m json.tool || echo "❌ Commerce web not responding"
	@curl -s http://localhost:5002/health || echo "❌ API gateway not responding"
	@curl -s http://localhost:5003/api/payments/health || echo "❌ Payments service not responding"

ps:
	docker-compose ps

shell:
	@echo "Opening shell in commerce-web container..."
	docker-compose exec commerce-web sh

# Additional shortcuts
mongo:
	@echo "Opening MongoDB shell..."
	docker-compose exec mongo mongosh -u admin -p mongo-secure-password-dev

redis:
	@echo "Opening Redis CLI..."
	docker-compose exec redis redis-cli -a redis-secure-password-dev
