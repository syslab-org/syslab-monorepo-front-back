# =============================================================================
# Makefile · tesis-monorepo
# Runbooks organizados: Local, ECR, AWS+RDS, Smoke, Utilidades
# =============================================================================

# -------- Variables comunes --------
COMPOSE       = docker compose -f tools/docker/compose.dev.yml
COMPOSE_PUBLIC = docker compose -f tools/docker/compose.dev.yml -f tools/docker/compose.public.yml
COMPOSE_SERVER = docker compose -f tools/docker/compose.server.yml
BASE_TF_IMAGE = base-tf:latest
SVC_FRONTEND  = frontend
SVC_BACKEND   = backend
SVC_CELERY    = celery
SVC_FLOWER    = flower
SVC_REDIS     = redis
SVC_PG        = postgres

TF            = AWS_PROFILE=$(AWS_PROFILE) AWS_REGION=$(AWS_REGION) terraform -chdir=infra/terraform
SMOKE_TIMEOUT ?= 60
PLAN_FILE     ?= plan.json
PLAN_API      ?= http://localhost:8000

# -------- AWS/ECR (overrideables) --------
AWS_REGION    ?= us-east-1
AWS_PROFILE   ?= tesis
TAG           ?= dev-latest

AWS_ACCOUNT_ID = $(shell command -v aws >/dev/null 2>&1 && aws sts get-caller-identity --query Account --output text --profile $(AWS_PROFILE) 2>/dev/null || true)
ECR_REG        = $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com

ECR_BACKEND    := $(ECR_REG)/tesis-dev-backend
ECR_CELERY     := $(ECR_REG)/tesis-dev-celery

LOCAL_BACKEND  := tesis-container-backend:latest
LOCAL_CELERY   := tesis-container-celery:latest

BACKEND_DOCKERFILE := tools/docker/backend.Dockerfile
CELERY_DOCKERFILE  := tools/docker/celery.Dockerfile
ifeq ("$(wildcard $(CELERY_DOCKERFILE))","")
  CELERY_DOCKERFILE := $(BACKEND_DOCKERFILE)
endif

.PHONY: \
  help \
  up down restart restart-frontend frontend-reset-deps start stop up-nobuild recreate ps ps-healthy logs \
  server-up server-down server-restart server-frontend-reset-deps server-logs server-ps \
  server-quick-tunnel-up server-quick-tunnel-down server-quick-tunnel-logs \
  server-tunnel-up server-tunnel-down server-tunnel-logs \
  public-up public-down public-restart public-logs public-ps tunnel-up tunnel-down tunnel-logs quick-tunnel-up quick-tunnel-down quick-tunnel-logs \
  logs-backend logs-frontend logs-celery logs-flower logs-redis \
  rm-stopped ps-paused unpause build-base-tf build build-nc pull prune nuke \
  setup lint test migrate makemigrations-api migrate-all migrate-api createsuperuser sh-backend sh-frontend sh-celery sh-flower sh-redis \
  dbshell psql plan-outputs \
  ecr-login check-images build-backend build-celery tag-backend tag-celery push-backend push-celery push \
  aws-down aws-status tf-outputs \
  smoke-local \
  aws-db-bootstrap aws-db-up aws-db-down secret-db \
  tf-destroy tf-destroy-last tf-destroy-plan

## Runbook A: Local
## Runbook B: ECR
## Runbook C: AWS infra auxiliar
## Runbook D: Smoke

# =============================================================================
# HELP
# =============================================================================
help:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo " RUNBOOK A · DESARROLLO LOCAL"
	@echo "  make up            # levanta dev stack (frontend, backend, celery, redis, postgres)"
	@echo "  make migrate       # aplica migraciones (DB: Postgres local)"
	@echo "  make migrate-api   # makemigrations api + migrate (útil cuando cambias models)"
	@echo "  make plan-outputs PLAN_ID=<uuid> # imprime Plan.outputs desde la DB local"
	@echo "  make smoke-local   # healthz + tarea Celery + /api/network/plan"
	@echo "  make logs          # logs de todos los servicios"
	@echo "  make frontend-reset-deps # recrea node_modules del frontend local"
	@echo "  make public-up     # expone la app por Caddy en :80"
	@echo "  make server-up     # despliegue Ubuntu compartido, publicado solo en localhost para proxy central"
	@echo "  make server-frontend-reset-deps # recrea node_modules del frontend del stack server"
	@echo "  make server-quick-tunnel-up # URL temporal trycloudflare.com para el stack server"
	@echo "  make server-tunnel-up # Cloudflare Tunnel estable para el stack server (requiere .env.public)"
	@echo "  make quick-tunnel-up # publica la app con URL temporal trycloudflare.com"
	@echo "  make tunnel-up     # publica la app via Cloudflare Tunnel estable (requiere token)"
	@echo ""
	@echo " RUNBOOK B · PUBLICAR IMÁGENES EN ECR"
	@echo "  make push          # tag & push backend+celery al ECR (usa TAG=$(TAG))"
	@echo ""
	@echo " RUNBOOK C · INFRA AWS AUXILIAR"
	@echo "  make tf-outputs    # outputs del Terraform auxiliar"
	@echo "  make aws-status    # recursos en state"
	@echo "  make aws-down      # destruye infra"
	@echo ""
	@echo " RUNBOOK D · PRUEBAS (Smoke)"
	@echo "  make smoke-local   # smoke contra localhost:8000"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# =============================================================================
# RUNBOOK A · DESARROLLO LOCAL (docker compose)
# =============================================================================
up: build-base-tf       ## Levanta dev stack (build si hace falta)
	$(COMPOSE) up -d --build

down:      ## Baja dev stack
	$(COMPOSE) down


restart: build-base-tf   ## Reinicia dev stack (con build)
	$(COMPOSE) down
	$(COMPOSE) up -d --build

restart-frontend: ## Reinicia SOLO el servicio frontend
	$(COMPOSE) restart $(SVC_FRONTEND)

frontend-reset-deps: ## Reinstala dependencias del frontend local recreando su volumen node_modules
	$(COMPOSE) stop $(SVC_FRONTEND) || true
	$(COMPOSE) rm -f $(SVC_FRONTEND) || true
	docker volume rm tesis-container_frontend_node_modules || true
	$(COMPOSE) up -d --build $(SVC_FRONTEND)

start:     ## Arranca contenedores existentes (sin build); si no existen, los crea con up -d
	@if [ -n "$$($(COMPOSE) ps -a -q 2>/dev/null)" ]; then \
		$(COMPOSE) start; \
	else \
		echo "ℹ️  No hay contenedores creados para compose.dev; levantando stack con 'up -d'..."; \
		$(COMPOSE) up -d; \
	fi

stop:      ## Detiene contenedores (sin borrar)
	$(COMPOSE) stop

up-nobuild: ## Levanta sin reconstruir imágenes
	$(COMPOSE) up -d

recreate:  ## Re-crear contenedores sin rebuild
	$(COMPOSE) up -d --force-recreate

ps:        ## Lista servicios
	$(COMPOSE) ps
	$(COMPOSE) ps --services --filter "status=running"

ps-healthy: ## Servicios healthy
	$(COMPOSE) ps --format '{{.Name}}\t{{.Status}}' | grep -i healthy || true

logs:      ## Logs de todo
	$(COMPOSE) logs -f

public-up: ## Levanta stack con Caddy en :80
	$(COMPOSE_PUBLIC) up -d --build caddy

server-up: ## Levanta stack Ubuntu para host compartido, publicado en localhost:${SERVER_HTTP_PORT}
	$(COMPOSE_SERVER) up -d --build

server-down: ## Baja stack Ubuntu
	$(COMPOSE_SERVER) down

server-restart: ## Reinicia stack Ubuntu
	$(COMPOSE_SERVER) down
	$(COMPOSE_SERVER) up -d --build

server-frontend-reset-deps: ## Reinstala dependencias del frontend del stack server recreando su volumen node_modules
	$(COMPOSE_SERVER) stop $(SVC_FRONTEND) || true
	$(COMPOSE_SERVER) rm -f $(SVC_FRONTEND) || true
	docker volume rm tesis-server_frontend_node_modules || true
	$(COMPOSE_SERVER) up -d --build $(SVC_FRONTEND)

server-logs: ## Logs del stack Ubuntu
	$(COMPOSE_SERVER) logs -f

server-ps: ## Estado del stack Ubuntu
	$(COMPOSE_SERVER) ps

server-quick-tunnel-up: ## Publica el stack server por Quick Tunnel apuntando a localhost:${SERVER_HTTP_PORT}
	@PORT=$$(awk -F= '/^SERVER_HTTP_PORT=/{print $$2}' .env.server 2>/dev/null | tail -n1); \
	if [ -z "$$PORT" ]; then PORT=18080; fi; \
	docker rm -f syslab-cloudflared-quick >/dev/null 2>&1 || true; \
	docker run -d --network host --name syslab-cloudflared-quick cloudflare/cloudflared:2025.4.2 \
	  tunnel --no-autoupdate --url http://127.0.0.1:$$PORT; \
	echo "Quick Tunnel levantado. Revisa la URL con: make server-quick-tunnel-logs"

server-quick-tunnel-down: ## Baja el Quick Tunnel del stack server
	docker rm -f syslab-cloudflared-quick || true

server-quick-tunnel-logs: ## Logs del Quick Tunnel del stack server
	docker logs -f syslab-cloudflared-quick

server-tunnel-up: ## Publica el stack server por Cloudflare Tunnel estable (requiere .env.public)
	@set -a; \
	if [ ! -f .env.public ]; then \
	  echo "Falta .env.public. Copia .env.public.example y define CLOUDFLARE_TUNNEL_TOKEN."; \
	  exit 1; \
	fi; \
	. ./.env.public; \
	set +a; \
	if [ -z "$$CLOUDFLARE_TUNNEL_TOKEN" ]; then \
	  echo "CLOUDFLARE_TUNNEL_TOKEN no definido en .env.public"; \
	  exit 1; \
	fi; \
	docker rm -f syslab-cloudflared >/dev/null 2>&1 || true; \
	docker run -d --network host --name syslab-cloudflared cloudflare/cloudflared:2025.4.2 \
	  tunnel --no-autoupdate run --token "$$CLOUDFLARE_TUNNEL_TOKEN"; \
	echo "Tunnel estable levantado. Revisa logs con: make server-tunnel-logs"

server-tunnel-down: ## Baja el Cloudflare Tunnel estable del stack server
	docker rm -f syslab-cloudflared || true

server-tunnel-logs: ## Logs del Cloudflare Tunnel estable del stack server
	docker logs -f syslab-cloudflared

public-down: ## Baja Caddy y cloudflared
	$(COMPOSE_PUBLIC) stop caddy cloudflared

public-restart: ## Reinicia capa publica
	$(COMPOSE_PUBLIC) up -d --build --force-recreate caddy

public-logs: ## Logs de Caddy y cloudflared
	$(COMPOSE_PUBLIC) logs -f caddy cloudflared

public-ps: ## Estado de Caddy y cloudflared
	$(COMPOSE_PUBLIC) ps caddy cloudflared cloudflared-quick

tunnel-up: ## Publica via Cloudflare Tunnel (requiere CLOUDFLARE_TUNNEL_TOKEN)
	$(COMPOSE_PUBLIC) up -d cloudflared

tunnel-down: ## Baja Cloudflare Tunnel
	$(COMPOSE_PUBLIC) stop cloudflared

tunnel-logs: ## Logs de Cloudflare Tunnel
	$(COMPOSE_PUBLIC) logs -f cloudflared

quick-tunnel-up: ## Publica via Quick Tunnel sin dominio
	$(COMPOSE_PUBLIC) up -d cloudflared-quick

quick-tunnel-down: ## Baja Quick Tunnel
	$(COMPOSE_PUBLIC) stop cloudflared-quick

quick-tunnel-logs: ## Logs de Quick Tunnel
	$(COMPOSE_PUBLIC) logs -f cloudflared-quick

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

rm-stopped: ## Limpia contenedores detenidos del proyecto
	$(COMPOSE) rm -f || true

ps-paused:
	@echo "🔎 Contenedores pausados:"
	@docker ps --filter status=paused --format "table {{.ID}}\t{{.Names}}\t{{.Status}}" || true

unpause:
	@echo "▶️  Reanudando contenedores pausados..."
	@docker ps --filter status=paused -q | xargs -r docker unpause
	@echo "✅ Listo."

build-base-tf:
	docker build -f tools/docker/base.terraform.Dockerfile -t $(BASE_TF_IMAGE) .

build: build-base-tf
	$(COMPOSE) build

build-nc: build-base-tf
	$(COMPOSE) build --no-cache

pull:
	$(COMPOSE) pull

prune:     ## Limpieza de builder/volúmenes no usados
	docker builder prune -af || true
	docker volume prune -f || true

nuke:      ## Baja todo y borra volúmenes del proyecto
	$(COMPOSE) down -v --remove-orphans

setup:     ## Instala deps (frontend/backend) dentro de contenedores
	$(COMPOSE) exec -T $(SVC_FRONTEND) pnpm install --frozen-lockfile || true
	$(COMPOSE) exec -T $(SVC_BACKEND) pip install -r requirements.txt || true

lint:
	$(COMPOSE) exec -T $(SVC_FRONTEND) pnpm lint || true
	$(COMPOSE) exec -T $(SVC_BACKEND) ruff /app || true

test:
	$(COMPOSE) exec -T $(SVC_FRONTEND) pnpm test -- --run || true
	$(COMPOSE) exec -T $(SVC_BACKEND) pytest || true

migrate:
	$(COMPOSE) exec $(SVC_BACKEND) bash -lc "python manage.py migrate"

makemigrations:
	$(COMPOSE) exec $(SVC_BACKEND) bash -lc "python manage.py makemigrations"

makemigrations-api:
	$(COMPOSE) exec $(SVC_BACKEND) bash -lc "python manage.py makemigrations api"

migrate-all: makemigrations-api migrate

migrate-api: migrate-all

createsuperuser:
	$(COMPOSE) exec $(SVC_BACKEND) bash -lc "python manage.py createsuperuser"

sh-backend:  ; $(COMPOSE) exec $(SVC_BACKEND)  bash
sh-frontend: ; $(COMPOSE) exec $(SVC_FRONTEND) sh
sh-celery:   ; $(COMPOSE) exec $(SVC_CELERY)  bash
sh-flower:   ; $(COMPOSE) exec $(SVC_FLOWER)  sh
sh-redis:    ; $(COMPOSE) exec $(SVC_REDIS)   sh

# ---- DB local helpers ----
dbshell:    ## Django dbshell (usa psql dentro del backend)
	$(COMPOSE) exec $(SVC_BACKEND) python manage.py dbshell

psql:       ## psql directo en el contenedor Postgres
	$(COMPOSE) exec $(SVC_PG) psql -U teg -d teg

plan-outputs: ## Imprime outputs/status/last_action de un Plan (DB local). Uso: make plan-outputs PLAN_ID=<uuid>
	@[ -n "$(PLAN_ID)" ] || { echo "❌ PLAN_ID vacío. Ej: make plan-outputs PLAN_ID=<uuid>"; exit 1; }
	$(COMPOSE) exec -T $(SVC_BACKEND) bash -lc "python manage.py shell -c \"from api.models import Plan; p=Plan.objects.get(id='$(PLAN_ID)'); import json; print(json.dumps({'id':str(p.id),'status':p.status,'last_action':p.last_action,'applied':p.applied,'outputs':(p.outputs or {})}, indent=2, default=str))\""

# =============================================================================
# RUNBOOK B · PUBLICAR IMÁGENES EN ECR
# =============================================================================
ecr-login:
	@echo "🔐 ECR login: acct=$(AWS_ACCOUNT_ID) region=$(AWS_REGION) profile=$(AWS_PROFILE)"
	aws ecr get-login-password --region $(AWS_REGION) --profile $(AWS_PROFILE) \
	| docker login --username AWS --password-stdin $(ECR_REG)

build-backend:
	@echo "🧱 Build backend -> $(LOCAL_BACKEND)"
	docker build -f $(BACKEND_DOCKERFILE) -t $(LOCAL_BACKEND) .

build-celery:
	@echo "🧱 Build celery  -> $(LOCAL_CELERY) (Dockerfile: $(CELERY_DOCKERFILE))"
	docker build -f $(CELERY_DOCKERFILE) -t $(LOCAL_CELERY) .

check-images:
	@echo "🔎 Verificando imágenes locales…"
	@docker image inspect $(LOCAL_BACKEND) >/dev/null 2>&1 || (echo "❌ Falta $(LOCAL_BACKEND). Ejecuta 'make up' o 'make build'."; exit 1)
	@docker image inspect $(LOCAL_CELERY)  >/dev/null 2>&1 || (echo "❌ Falta $(LOCAL_CELERY). Ejecuta 'make up' o 'make build'."; exit 1)
	@echo "✅ Ok."

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

push: push-backend push-celery
	@echo "🎉 Push completado. TAG=$(TAG)"

# =============================================================================
# RUNBOOK C · AWS infra auxiliar (Terraform)
# =============================================================================
aws-down:
	$(TF) destroy -auto-approve

aws-status:
	$(TF) state list || true

tf-outputs:
	@$(TF) output

# =============================================================================
# RUNBOOK D · Smoke / pruebas
# =============================================================================
# Smoke LOCAL (localhost:8000)
smoke-local:
	@URL=http://localhost:8000; \
	echo "🔎 Healthcheck: $$URL/healthz/"; \
	H=$$(curl -fsS $$URL/healthz/ || true); \
	echo "$$H" | jq . >/dev/null 2>&1 || { echo "❌ Healthz no es JSON o falló"; echo "$$H"; exit 1; }; \
	[ "$$(echo "$$H" | jq -r .status)" = "ok" ] || { echo "❌ Healthz != ok"; echo "$$H"; exit 1; }; \
	echo "✅ Healthz OK"; \
	N=$${N:-3}; \
	echo "🚀 Celery demo (n=$$N)…"; \
	RUN=$$(curl -fsS -X POST $$URL/api/tasks/run/ -H "Content-Type: application/json" -d "{\"n\": $$N}" | tee /tmp/smoke_celery_task.json); \
	TID=$$(echo "$$RUN" | jq -r .task_id); \
	[ -n "$$TID" ] || { echo "❌ Sin task_id (celery)"; echo "$$RUN"; exit 1; }; \
	echo "⏳ Esperando Celery $$TID …"; \
	EL=0; while [ $$EL -lt $(SMOKE_TIMEOUT) ]; do \
	  RES=$$(curl -fsS $$URL/api/tasks/status/$$TID/ || true); \
	  STATE=$$(echo "$$RES" | jq -r .state); \
	  [ "$$STATE" = "SUCCESS" ] && { echo "$$RES" | jq .; echo "✅ Celery OK"; break; }; \
	  [ "$$STATE" = "FAILURE" ] && { echo "$$RES" | jq .; echo "❌ Celery FAILURE"; exit 1; }; \
	  sleep 2; EL=$$((EL+2)); \
	done; \
	[ $$EL -lt $(SMOKE_TIMEOUT) ] || { echo "⚠️ Timeout Celery"; exit 1; }; \
	[ -f "$(PLAN_FILE)" ] || { echo "❌ Falta $(PLAN_FILE)"; exit 1; }; \
	echo "🌐 Enviando plan local: $(PLAN_FILE)"; \
	NP=$$(curl -fsS -X POST $$URL/api/network/plan/ -H "Content-Type: application/json" --data-binary @"$(PLAN_FILE)" | tee /tmp/smoke_np_task.json); \
	NPID=$$(echo "$$NP" | jq -r .task_id); \
	[ -n "$$NPID" ] || { echo "❌ Sin task_id (network_plan)"; echo "$$NP"; exit 1; }; \
	EL=0; while [ $$EL -lt $(SMOKE_TIMEOUT) ]; do \
	  RES=$$(curl -fsS $$URL/api/tasks/status/$$NPID/ || true); \
	  STATE=$$(echo "$$RES" | jq -r .state); \
	  [ "$$STATE" = "SUCCESS" ] && { echo "$$RES" | jq .; echo "✅ NetworkPlan OK"; break; }; \
	  [ "$$STATE" = "FAILURE" ] && { echo "$$RES" | jq .; echo "❌ NetworkPlan FAILURE"; exit 1; }; \
	  sleep 2; EL=$$((EL+2)); \
	done; \
	echo "🎉 SMOKE LOCAL PASS"

# ===== RDS / DB en AWS =====
aws-db-bootstrap:
	$(TF) apply -auto-approve \
	  -var="allow_rds_from_my_ip=false"

aws-db-up:
	$(TF) apply -auto-approve \
	  -var="allow_rds_from_my_ip=false"

aws-db-down:
	$(TF) destroy -auto-approve \
	  -target=aws_db_instance.rds \
	  -target=aws_db_subnet_group.rds \
	  -target=aws_security_group.rds \
	  -target=aws_secretsmanager_secret.database_url

secret-db:
	@DBU="$$(read -p 'DB URL (codificada): ' v; echo $$v)"; \
	ARN=$$($(TF) output -raw database_url_secret_arn); \
	[ -n "$$ARN" ] || { echo "❌ database_url_secret_arn vacío"; exit 1; }; \
	echo "🔐 Actualizando secret $$ARN"; \
	aws secretsmanager put-secret-value \
	  --secret-id "$$ARN" \
	  --secret-string "$$DBU" \
	  --region $(AWS_REGION) --profile $(AWS_PROFILE); \
	echo "✅ Secret actualizado."


DC := docker compose -f tools/docker/compose.dev.yml

# make tf-destroy DIR=/tmp/tf-multi-xxxxx
tf-destroy:
	$(DC) exec celery bash -lc 'set -e; cd "$(DIR)"; \
	export AWS_DEFAULT_REGION=$${AWS_DEFAULT_REGION:-us-east-1}; \
	terraform init -input=false -no-color >/dev/null; \
	terraform destroy -auto-approve -no-color'

# make tf-destroy-last
tf-destroy-last:
	@set -e; \
	URL="$(PLAN_API)/api/network/plans/destroy-last/"; \
	echo "POST $$URL"; \
	HTTP=$$(curl -sS -o /tmp/tf_destroy_last_resp.json -w "%{http_code}" -X POST "$$URL"); \
	cat /tmp/tf_destroy_last_resp.json | jq . 2>/dev/null || cat /tmp/tf_destroy_last_resp.json; \
	echo "HTTP $$HTTP"; \
	[ "$$HTTP" -lt 400 ] || exit 1

# make tf-destroy-plan PLAN_ID=<uuid>
tf-destroy-plan:
	@[ -n "$(PLAN_ID)" ] || { echo "❌ PLAN_ID vacío. Ej: make tf-destroy-plan PLAN_ID=<uuid>"; exit 1; }
	@set -e; \
	URL="$(PLAN_API)/api/network/plans/$(PLAN_ID)/destroy/"; \
	echo "POST $$URL"; \
	HTTP=$$(curl -sS -o /tmp/tf_destroy_plan_resp.json -w "%{http_code}" -X POST "$$URL"); \
	cat /tmp/tf_destroy_plan_resp.json | jq . 2>/dev/null || cat /tmp/tf_destroy_plan_resp.json; \
	echo "HTTP $$HTTP"; \
	[ "$$HTTP" -lt 400 ] || exit 1
