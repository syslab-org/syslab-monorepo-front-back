# Variables de conveniencia
COMPOSE = docker compose -f tools/docker/compose.dev.yml
SVC_FRONTEND = frontend
SVC_BACKEND  = backend
SVC_CELERY   = celery
SVC_FLOWER   = flower
SVC_REDIS    = redis

.PHONY: help up down logs setup lint test restart restart-tesis ps ps-healthy \
        build build-nc pull prune nuke \
        sh-backend sh-frontend sh-celery sh-flower sh-redis \
        logs-backend logs-frontend logs-celery logs-flower logs-redis \
        migrate createsuperuser

help:
	@echo "Targets: up, down, restart, restart-tesis, logs, ps, ps-healthy, setup, lint, test"
	@echo "         build, build-nc, pull, prune, nuke"
	@echo "         sh-{backend,frontend,celery,flower,redis}, logs-*, migrate, createsuperuser"

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) down
	$(COMPOSE) up -d --build

# Igual que restart (por si quieres llamarlo así)
restart-tesis: restart

ps:
	$(COMPOSE) ps
	$(COMPOSE) ps --services --filter "status=running"

ps-healthy:
	$(COMPOSE) ps --format '{{.Name}}\t{{.Status}}' | grep -i healthy || true

logs:
	$(COMPOSE) logs -f

logs-backend:
	$(COMPOSE) logs -f $(SVC_BACKEND)

logs-frontend:
	$(COMPOSE) logs -f $(SVC_FRONTEND)

logs-celery:
	$(COMPOSE) logs -f $(SVC_CELERY)

logs-flower:
	$(COMPOSE) logs -f $(SVC_FLOWER)

logs-redis:
	$(COMPOSE) logs -f $(SVC_REDIS)

build:
	$(COMPOSE) build

build-nc:
	$(COMPOSE) build --no-cache

pull:
	$(COMPOSE) pull

prune:
	docker builder prune -af || true
	docker volume prune -f || true

# 🔥 Dev-nuke: baja todo y borra volúmenes anclados a este compose
nuke:
	$(COMPOSE) down -v --remove-orphans

setup:
	# Frontend deps (pnpm)
	$(COMPOSE) exec -T $(SVC_FRONTEND) pnpm install || true
	# Backend deps
	$(COMPOSE) exec -T $(SVC_BACKEND) pip install -r requirements.txt || true

lint:
	$(COMPOSE) exec -T $(SVC_FRONTEND) pnpm lint || true
	$(COMPOSE) exec -T $(SVC_BACKEND) ruff /app || true

test:
	$(COMPOSE) exec -T $(SVC_FRONTEND) pnpm test -- --run || true
	$(COMPOSE) exec -T $(SVC_BACKEND) pytest || true

migrate:
	$(COMPOSE) exec $(SVC_BACKEND) bash -lc "python manage.py migrate"

createsuperuser:
	$(COMPOSE) exec $(SVC_BACKEND) bash -lc "python manage.py createsuperuser"

sh-backend:
	$(COMPOSE) exec $(SVC_BACKEND) bash

sh-frontend:
	$(COMPOSE) exec $(SVC_FRONTEND) sh

sh-celery:
	$(COMPOSE) exec $(SVC_CELERY) bash

sh-flower:
	$(COMPOSE) exec $(SVC_FLOWER) sh

sh-redis:
	$(COMPOSE) exec $(SVC_REDIS) sh
