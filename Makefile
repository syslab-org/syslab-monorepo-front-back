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

  #############################################
# ECR: login, tag y push de imágenes
#############################################

# Parámetros (puedes overridear al invocar: make push TAG=v1 AWS_REGION=us-east-2)
AWS_REGION ?= us-east-1
AWS_PROFILE ?= tesis
TAG ?= dev-latest

# Descubre dinámicamente tu Account ID
AWS_ACCOUNT_ID := $(shell aws sts get-caller-identity --query Account --output text --profile $(AWS_PROFILE))

# Repos de ECR (coinciden con los creados por Terraform)
ECR_BACKEND := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/tesis-dev-backend
ECR_CELERY  := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/tesis-dev-celery

# Imágenes locales (nombres que construyes con docker compose)
LOCAL_BACKEND := tesis-container-backend:latest
LOCAL_CELERY  := tesis-container-celery:latest

.PHONY: ecr-login tag-backend tag-celery push-backend push-celery push check-images

ecr-login:
	@echo "🔐 Login en ECR para $(AWS_ACCOUNT_ID) (perfil: $(AWS_PROFILE), región: $(AWS_REGION))"
	aws ecr get-login-password --region $(AWS_REGION) --profile $(AWS_PROFILE) | \
	docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com

check-images:
	@echo "🔎 Verificando que existen las imágenes locales..."
	@if ! docker image inspect $(LOCAL_BACKEND) >/dev/null 2>&1; then \
		echo "❌ No existe la imagen local $(LOCAL_BACKEND). Ejecuta 'make up' o construye la imagen antes."; exit 1; \
	fi
	@if ! docker image inspect $(LOCAL_CELERY) >/dev/null 2>&1; then \
		echo "❌ No existe la imagen local $(LOCAL_CELERY). Ejecuta 'make up' o construye la imagen antes."; exit 1; \
	fi
	@echo "✅ Imágenes locales encontradas."

tag-backend: check-images
	@echo "🏷️  Tag backend -> $(ECR_BACKEND):$(TAG)"
	docker tag $(LOCAL_BACKEND) $(ECR_BACKEND):$(TAG)

tag-celery: check-images
	@echo "🏷️  Tag celery  -> $(ECR_CELERY):$(TAG)"
	docker tag $(LOCAL_CELERY) $(ECR_CELERY):$(TAG)

push-backend: ecr-login tag-backend
	@echo "⬆️  Push backend -> $(ECR_BACKEND):$(TAG)"
	docker push $(ECR_BACKEND):$(TAG)

push-celery: ecr-login tag-celery
	@echo "⬆️  Push celery  -> $(ECR_CELERY):$(TAG)"
	docker push $(ECR_CELERY):$(TAG)

# Push de ambas imágenes
push: push-backend push-celery
	@echo "🎉 Push completado. Etiqueta: $(TAG)"

