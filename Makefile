# ============================================================================
# Dev stack (docker-compose) · Frontend/Backend/Celery/Flower/Redis
# ============================================================================

# Variables de conveniencia
COMPOSE       = docker compose -f tools/docker/compose.dev.yml
SVC_FRONTEND  = frontend
SVC_BACKEND   = backend
SVC_CELERY    = celery
SVC_FLOWER    = flower
SVC_REDIS     = redis

.PHONY: help up down logs setup lint test restart restart-tesis ps ps-healthy \
        build build-nc pull prune nuke \
        sh-backend sh-frontend sh-celery sh-flower sh-redis \
        logs-backend logs-frontend logs-celery logs-flower logs-redis \
        migrate createsuperuser

help:
	@echo "Targets principales:"
	@echo "  up / down / restart / restart-tesis / ps / ps-healthy / logs"
	@echo "  setup / lint / test / migrate / createsuperuser"
	@echo "  build / build-nc / pull / prune / nuke"
	@echo "  sh-{backend,frontend,celery,flower,redis}, logs-*"
	@echo ""
	@echo "Targets AWS/ECR/Terraform:"
	@echo "  aws-init / push / aws-up / aws-up-no-celery / aws-redeploy / aws-down / aws-status"
	@echo "  echo-backend-url / tf-outputs / test-celery / deploy-backend / deploy-celery / deploy-all"
	@echo ""
	@echo "Targets Frontend dev:"
	@echo "  frontend (VITE_API_URL=...) / frontend-aws"

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

# --- ciclo rápido sin rebuild ---
start:
	$(COMPOSE) start

stop:
	$(COMPOSE) stop

# Levanta (sin build) por si se cayeron pero existen
up-nobuild:
	$(COMPOSE) up -d

# Re-crear contenedores existentes sin reconstruir imágenes
recreate:
	$(COMPOSE) up -d --force-recreate


rm-stopped:       # opcional: limpia contenedores detenidos del proyecto
	$(COMPOSE) rm -f || true

ps-paused:
	@echo "🔎 Contenedores pausados:"
	@docker ps --filter status=paused --format "table {{.ID}}\t{{.Names}}\t{{.Status}}" || true

unpause:
	@echo "▶️  Reanudando contenedores pausados..."
	@docker ps --filter status=paused -q | xargs -r docker unpause
	@echo "✅ Listo."


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


# ============================================================================
# AWS / ECR / Terraform · Build / Push / Deploy a ECS Fargate
# ============================================================================

# --- Parámetros AWS (overrideables): make ... AWS_REGION=us-east-2 TAG=v1 ---
AWS_REGION  ?= us-east-1
AWS_PROFILE ?= tesis
TAG         ?= dev-latest

# --- Descubre tu AWS Account ID y arma la URL del registry ---
AWS_ACCOUNT_ID := $(shell aws sts get-caller-identity --query Account --output text --profile $(AWS_PROFILE))
ECR_REG        := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com

# --- Repositorios ECR (deben existir; Terraform los crea) ---
ECR_BACKEND    := $(ECR_REG)/tesis-dev-backend
ECR_CELERY     := $(ECR_REG)/tesis-dev-celery

# --- Imágenes locales (las que construyes en dev/compose) ---
LOCAL_BACKEND  := tesis-container-backend:latest
LOCAL_CELERY   := tesis-container-celery:latest

# --- Dockerfiles para build directo (si los usas) ---
BACKEND_DOCKERFILE := tools/docker/backend.Dockerfile
CELERY_DOCKERFILE  := tools/docker/celery.Dockerfile
# Si no existe el de Celery, reutiliza el del backend
ifeq ("$(wildcard $(CELERY_DOCKERFILE))","")
  CELERY_DOCKERFILE := $(BACKEND_DOCKERFILE)
endif

# --- Terraform helper ---
TF := terraform -chdir=infra/terraform

# --- Réplicas por defecto al aplicar ---
BACKEND_DESIRED ?= 1
CELERY_DESIRED  ?= 1

.PHONY: ecr-login check-images build-backend build-celery tag-backend tag-celery \
        push-backend push-celery push \
        aws-init aws-up aws-up-no-celery aws-redeploy aws-down aws-status \
        echo-backend-url tf-outputs test-celery \
        deploy-backend deploy-celery deploy-all

# --------- Login en ECR ----------
ecr-login:
	@echo "🔐 Login en ECR ($(AWS_ACCOUNT_ID)) región $(AWS_REGION) (perfil: $(AWS_PROFILE))"
	aws ecr get-login-password --region $(AWS_REGION) --profile $(AWS_PROFILE) \
	| docker login --username AWS --password-stdin $(ECR_REG)

# --------- Builds locales (útiles si no usas compose para generar imágenes) ----------
build-backend:
	@echo "🧱 Build backend (Dockerfile)-> $(LOCAL_BACKEND)"
	docker build -f $(BACKEND_DOCKERFILE) -t $(LOCAL_BACKEND) .

build-celery:
	@echo "🧱 Build celery (Dockerfile)-> $(LOCAL_CELERY)  (Dockerfile: $(CELERY_DOCKERFILE))"
	docker build -f $(CELERY_DOCKERFILE) -t $(LOCAL_CELERY) .

# --------- Verifica que existan las imágenes locales ----------
check-images:
	@echo "🔎 Verificando imágenes locales…"
	@docker image inspect $(LOCAL_BACKEND) >/dev/null 2>&1 || (echo "❌ Falta $(LOCAL_BACKEND). Ejecuta 'make up' o 'make build' o 'make build-backend'."; exit 1)
	@docker image inspect $(LOCAL_CELERY)  >/dev/null 2>&1 || (echo "❌ Falta $(LOCAL_CELERY). Ejecuta 'make up' o 'make build' o 'make build-celery'."; exit 1)
	@echo "✅ Ok."

# --------- Tag + Push a ECR ----------
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

# --------- Terraform: infra base y despliegue ----------
# Crea/actualiza todo (ALB, VPC, SGs, Redis, ECR, ECS…) pero deja 0/0 tasks
aws-init:
	$(TF) apply -auto-approve \
	  -var="backend_desired_count=0" \
	  -var="celery_desired_count=0"

# Sube las réplicas (por defecto 1/1 — override: make aws-up BACKEND_DESIRED=2 CELERY_DESIRED=0)
aws-up:
	$(TF) apply -auto-approve \
	  -var="backend_desired_count=$(BACKEND_DESIRED)" \
	  -var="celery_desired_count=$(CELERY_DESIRED)"

# Solo backend vivo
aws-up-no-celery:
	$(TF) apply -auto-approve \
	  -var="backend_desired_count=$(BACKEND_DESIRED)" \
	  -var="celery_desired_count=0"

# Redeploy rápido: push + apply (ideal tras cambiar código)
aws-redeploy: push aws-up

# Destruye la infra creada por Terraform
aws-down:
	$(TF) destroy -auto-approve

aws-status:
	$(TF) state list || true

# --------- Outputs & pruebas ----------
echo-backend-url:
	@echo "BACKEND_URL = $$($(TF) output -raw backend_url 2>/dev/null || echo '<no-output>')"

tf-outputs:
	@$(TF) output

# Prueba de Celery usando la URL del ALB (requiere backend y celery vivos)
# Uso: make test-celery N=3
test-celery:
	@URL=$$($(TF) output -raw backend_url); \
	if [ -z "$$URL" ]; then echo "❌ backend_url vacío. Ejecuta 'make tf-outputs'."; exit 1; fi; \
	N=$${N:-3}; \
	echo "🚀 Disparando tarea demo (n=$$N) contra $$URL"; \
	curl -s -X POST $$URL/api/tasks/run/ -H "Content-Type: application/json" -d "{\"n\": $$N}" | tee /tmp/task.json; \
	T=$$(jq -r .task_id /tmp/task.json); \
	echo "⏳ Esperando resultado $${T} …"; \
	sleep 2; curl -s $$URL/api/tasks/status/$${T}/ | jq .

# ============================================================================
# Frontend dev
# ============================================================================

FRONTEND_DIR := apps/frontend
VITE_API_URL ?= http://localhost:8000   # cambia cuando apuntes a AWS

.PHONY: frontend frontend-aws

frontend:
	cd $(FRONTEND_DIR) && VITE_API_URL=$(VITE_API_URL) pnpm dev

# Levanta el frontend apuntando al backend en AWS (ALB)
frontend-aws:
	cd $(FRONTEND_DIR) && VITE_API_URL=$$(terraform -chdir=infra/terraform output -raw backend_url) pnpm dev


# ---------- Deploys convenientes ----------
# Lanza toda la cadena: build/tag/push de backend+celery y sube las réplicas
deploy-all: check-images ecr-login tag-backend tag-celery push-backend push-celery aws-up
	@echo "🎉 Deploy completo (backend=$(BACKEND_DESIRED) celery=$(CELERY_DESIRED), tag=$(TAG))"

# Bootstrap completo desde cero: crea infra en 0/0 y luego deploy-all
aws-bootstrap: aws-init deploy-all
	@echo "🚀 Infra creada y servicios desplegados."

# ---------- Prueba /api/network/plan ----------
# Usa PLAN_FILE (por defecto: plan.json en el repo)
PLAN_FILE ?= plan.json

test-network-plan:
	@URL=$$($(TF) output -raw backend_url); \
	if [ -z "$$URL" ]; then echo "❌ backend_url vacío. Ejecuta 'make tf-outputs'."; exit 1; fi; \
	if [ ! -f "$(PLAN_FILE)" ]; then echo "❌ No existe $(PLAN_FILE). Define PLAN_FILE=... o crea plan.json"; exit 1; fi; \
	echo "🌐 Enviando plan: $(PLAN_FILE) -> $$URL/api/network/plan/"; \
	curl -s -X POST $$URL/api/network/plan/ -H "Content-Type: application/json" -d @$(PLAN_FILE) | tee /tmp/np_task.json; \
	T=$$(jq -r .task_id /tmp/np_task.json 2>/dev/null); \
	if [ -z "$$T" ] || [ "$$T" = "null" ]; then echo "❌ No se obtuvo task_id. Respuesta arriba."; exit 1; fi; \
	echo "⏳ Esperando resultado (task_id=$$T)…"; \
	for i in $$(seq 1 30); do \
	  sleep 2; R=$$(curl -s $$URL/api/tasks/status/$$T/); \
	  echo "$$R" | jq .; \
	  STATE=$$(echo "$$R" | jq -r .state); \
	  if [ "$$STATE" = "SUCCESS" ] || [ "$$STATE" = "FAILURE" ]; then exit 0; fi; \
	done; \
	echo "⚠️ Timeout esperando la tarea $$T"; exit 1


# =======================
# Smoke test end-to-end
# =======================
# Uso:
#   make smoke                      # N=3 y PLAN_FILE=plan.json por defecto
#   make smoke N=10                 # cambia duración de la tarea demo
#   make smoke PLAN_FILE=mi_plan.json
#
SMOKE_TIMEOUT ?= 60     # seg totales para esperar tareas Celery
PLAN_FILE     ?= plan.json

smoke:
	@URL=$$($(TF) output -raw backend_url); \
	if [ -z "$$URL" ]; then echo "❌ backend_url vacío. Ejecuta 'make tf-outputs'."; exit 1; fi; \
	echo "🔎 Healthcheck: $$URL/healthz/"; \
	H=$$(curl -fsS $$URL/healthz/ || true); \
	echo "$$H" | jq . >/dev/null 2>&1 || { echo "❌ Healthz no es JSON o falló"; echo "$$H"; exit 1; }; \
	STATUS=$$(echo "$$H" | jq -r .status); \
	if [ "$$STATUS" != "ok" ]; then echo "❌ Healthz != ok"; echo "$$H"; exit 1; fi; \
	echo "✅ Healthz OK"; \
	\
	N=$${N:-3}; \
	echo "🚀 Disparando tarea Celery demo (n=$$N)…"; \
	RUN=$$(curl -fsS -X POST $$URL/api/tasks/run/ -H "Content-Type: application/json" -d "{\"n\": $$N}" | tee /tmp/smoke_celery_task.json); \
	TID=$$(echo "$$RUN" | jq -r .task_id 2>/dev/null); \
	if [ -z "$$TID" ] || [ "$$TID" = "null" ]; then echo "❌ No se obtuvo task_id (celery)"; echo "$$RUN"; exit 1; fi; \
	echo "⏳ Esperando Celery task $$TID (timeout $(SMOKE_TIMEOUT)s)…"; \
	EL=0; \
	while [ $$EL -lt $(SMOKE_TIMEOUT) ]; do \
	  RES=$$(curl -fsS $$URL/api/tasks/status/$$TID/ || true); \
	  STATE=$$(echo "$$RES" | jq -r .state 2>/dev/null); \
	  if [ "$$STATE" = "SUCCESS" ]; then echo "$$RES" | jq .; echo "✅ Celery OK"; break; fi; \
	  if [ "$$STATE" = "FAILURE" ]; then echo "$$RES" | jq .; echo "❌ Celery FAILURE"; exit 1; fi; \
	  sleep 2; EL=$$((EL+2)); \
	done; \
	if [ $$EL -ge $(SMOKE_TIMEOUT) ]; then echo "⚠️  Timeout esperando Celery $$TID"; exit 1; fi; \
	\
	if [ ! -f "$(PLAN_FILE)" ]; then echo "❌ No existe $(PLAN_FILE). Define PLAN_FILE=... o crea plan.json"; exit 1; fi; \
	echo "🌐 Enviando plan: $(PLAN_FILE) -> $$URL/api/network/plan/"; \
	NP=$$(curl -fsS -X POST $$URL/api/network/plan/ -H "Content-Type: application/json" -d @$(PLAN_FILE) | tee /tmp/smoke_np_task.json); \
	NPID=$$(echo "$$NP" | jq -r .task_id 2>/dev/null); \
	if [ -z "$$NPID" ] || [ "$$NPID" = "null" ]; then echo "❌ No se obtuvo task_id (network_plan)"; echo "$$NP"; exit 1; fi; \
	echo "⏳ Esperando NetworkPlan task $$NPID (timeout $(SMOKE_TIMEOUT)s)…"; \
	EL=0; \
	while [ $$EL -lt $(SMOKE_TIMEOUT) ]; do \
	  RES=$$(curl -fsS $$URL/api/tasks/status/$$NPID/ || true); \
	  STATE=$$(echo "$$RES" | jq -r .state 2>/dev/null); \
	  if [ "$$STATE" = "SUCCESS" ]; then echo "$$RES" | jq .; echo "✅ NetworkPlan OK"; break; fi; \
	  if [ "$$STATE" = "FAILURE" ]; then echo "$$RES" | jq .; echo "❌ NetworkPlan FAILURE"; exit 1; fi; \
	  sleep 2; EL=$$((EL+2)); \
	done; \
	if [ $$EL -ge $(SMOKE_TIMEOUT) ]; then echo "⚠️  Timeout esperando NetworkPlan $$NPID"; exit 1; fi; \
	echo "🎉 SMOKE PASS"
