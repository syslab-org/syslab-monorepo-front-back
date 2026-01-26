# =============================================================================
# Makefile · tesis-monorepo
# Runbooks organizados: Local, ECR, AWS+RDS, Smoke, Utilidades
# =============================================================================

# -------- Variables comunes --------
COMPOSE       = docker compose -f tools/docker/compose.dev.yml
SVC_FRONTEND  = frontend
SVC_BACKEND   = backend
SVC_CELERY    = celery
SVC_FLOWER    = flower
SVC_REDIS     = redis
SVC_PG        = postgres

TF            = AWS_PROFILE=$(AWS_PROFILE) AWS_REGION=$(AWS_REGION) terraform -chdir=infra/terraform
SMOKE_TIMEOUT ?= 60
PLAN_FILE     ?= plan.json

# -------- AWS/ECR (overrideables) --------
AWS_REGION    ?= us-east-1
AWS_PROFILE   ?= tesis
TAG           ?= dev-latest

AWS_ACCOUNT_ID := $(shell aws sts get-caller-identity --query Account --output text --profile $(AWS_PROFILE))
ECR_REG        := $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com

ECR_BACKEND    := $(ECR_REG)/tesis-dev-backend
ECR_CELERY     := $(ECR_REG)/tesis-dev-celery

# --- Identificadores AWS de ejecución (ECS/ALB) ---
CLUSTER           ?= tesis-dev-cluster
SVC_BACKEND_AWS   ?= tesis-dev-svc-backend
SVC_CELERY_AWS    ?= tesis-dev-svc-celery
TG_BACKEND_NAME   ?= tesis-dev-tg-backend

LOCAL_BACKEND  := tesis-container-backend:latest
LOCAL_CELERY   := tesis-container-celery:latest

BACKEND_DOCKERFILE := tools/docker/backend.Dockerfile
CELERY_DOCKERFILE  := tools/docker/celery.Dockerfile
ifeq ("$(wildcard $(CELERY_DOCKERFILE))","")
  CELERY_DOCKERFILE := $(BACKEND_DOCKERFILE)
endif

# Réplicas por defecto en ECS
BACKEND_DESIRED ?= 1
CELERY_DESIRED  ?= 1

# Esperas (segundos)
WAIT_ECS_TIMEOUT ?= 600   # 10 min
WAIT_ALB_TIMEOUT ?= 300   # 5 min
SLEEP             ?= 5

.PHONY: \
  help \
  up down restart start stop up-nobuild recreate ps ps-healthy logs \
  logs-backend logs-frontend logs-celery logs-flower logs-redis \
  rm-stopped ps-paused unpause build build-nc pull prune nuke \
  setup lint test migrate makemigrations-api migrate-all migrate-api createsuperuser sh-backend sh-frontend sh-celery sh-flower sh-redis \
  dbshell psql plan-outputs \
  ecr-login check-images build-backend build-celery tag-backend tag-celery push-backend push-celery push \
  aws-init aws-up aws-up-no-celery aws-stop aws-up-safe aws-redeploy aws-redeploy-safe aws-down aws-status tf-outputs echo-backend-url deploy-all aws-bootstrap \
  aws-ecs-status aws-wait-ecs aws-wait-alb aws-migrate \
  smoke smoke-local smoke-quick test-network-plan \
  get-td-backend get-td-celery set-td-backend set-td-celery \
  aws-db-bootstrap aws-db-up aws-db-down secret-db

## Runbook A: Local
## Runbook B: ECR
## Runbook C: AWS + RDS + ECS
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
	@echo ""
	@echo " RUNBOOK B · PUBLICAR IMÁGENES EN ECR"
	@echo "  make push          # tag & push backend+celery al ECR (usa TAG=$(TAG))"
	@echo ""
	@echo " RUNBOOK C · INFRA AWS + RDS + ECS"
	@echo "  make aws-bootstrap # crea infra en 0/0 y luego deploy-all (sube réplicas)"
	@echo "  make aws-redeploy  # push + apply (redeploy rápido)"
	@echo "  make aws-redeploy-safe # apply + esperas + migrate + rollback si falla"
	@echo "  make aws-up-safe   # sube réplicas + esperas + migrate + healthz"
	@echo "  make aws-stop      # escala servicios ECS a 0/0 (NO destruye)"
	@echo "  make aws-down      # destruye infra"
	@echo ""
	@echo " RUNBOOK D · PRUEBAS (Smoke)"
	@echo "  make smoke         # smoke contra ALB (AWS)"
	@echo "  make smoke-local   # smoke contra localhost:8000"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# =============================================================================
# RUNBOOK A · DESARROLLO LOCAL (docker compose)
# =============================================================================
up:        ## Levanta dev stack (build si hace falta)
	$(COMPOSE) up -d --build

down:      ## Baja dev stack
	$(COMPOSE) down

restart:   ## Reinicia dev stack (con build)
	$(COMPOSE) down
	$(COMPOSE) up -d --build

start:     ## Arranca contenedores existentes (sin build)
	$(COMPOSE) start

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

build:
	$(COMPOSE) build

build-nc:
	$(COMPOSE) build --no-cache

pull:
	$(COMPOSE) pull

prune:     ## Limpieza de builder/volúmenes no usados
	docker builder prune -af || true
	docker volume prune -f || true

nuke:      ## Baja todo y borra volúmenes del proyecto
	$(COMPOSE) down -v --remove-orphans

setup:     ## Instala deps (frontend/backend) dentro de contenedores
	$(COMPOSE) exec -T $(SVC_FRONTEND) pnpm install || true
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
# RUNBOOK C · AWS + RDS + ECS (Terraform)
# =============================================================================
aws-init:
	$(TF) apply -auto-approve \
	  -var="backend_desired_count=0" \
	  -var="celery_desired_count=0"

aws-up:
	$(TF) apply -auto-approve \
	  -var="backend_desired_count=$(BACKEND_DESIRED)" \
	  -var="celery_desired_count=$(CELERY_DESIRED)"

aws-up-no-celery:
	$(TF) apply -auto-approve \
	  -var="backend_desired_count=$(BACKEND_DESIRED)" \
	  -var="celery_desired_count=0"

## Fin del día: escala servicios a 0/0 (NO destruye nada)
aws-stop:
	$(TF) apply -auto-approve \
	  -var="backend_desired_count=0" \
	  -var="celery_desired_count=0"

aws-down:
	$(TF) destroy -auto-approve

aws-status:
	$(TF) state list || true

echo-backend-url:
	@echo "BACKEND_URL = $$($(TF) output -raw backend_url 2>/dev/null || echo '<no-output>')"

tf-outputs:
	@$(TF) output

# Deploy “todo” (útil tras terraform init o cambios grandes)
deploy-all: check-images ecr-login tag-backend tag-celery push-backend push-celery aws-up aws-wait-ecs aws-migrate aws-wait-alb smoke-quick
	@echo "🎉 Deploy completo -> backend=$(BACKEND_DESIRED) celery=$(CELERY_DESIRED) tag=$(TAG)"

aws-bootstrap: aws-init deploy-all
	@echo "🚀 Infra creada + servicios desplegados."

## Arranque seguro (sube réplicas + espera + migrate + healthz)
aws-up-safe: aws-up aws-wait-ecs aws-migrate aws-wait-alb
	@echo "🚀 Entorno arriba y saludable"

# =============================================================================
# Estado / Esperas / Migrate
# =============================================================================

aws-ecs-status: ## Snapshot de estado ECS
	@aws ecs describe-services \
	  --cluster $(CLUSTER) \
	  --services $(SVC_BACKEND_AWS) $(SVC_CELERY_AWS) \
	  --region $(AWS_REGION) --profile $(AWS_PROFILE) \
	| jq -r '.services[] | {name:.serviceName, desired:.desiredCount, running:.runningCount, deployments:(.deployments|length)}'



aws-wait-ecs: ## Espera a que backend+celery queden estables
	@echo "⏳ Esperando ECS estable (backend)…"
	aws ecs wait services-stable \
	  --cluster $(CLUSTER) --services $(SVC_BACKEND_AWS) \
	  --region $(AWS_REGION) --profile $(AWS_PROFILE)
	@echo "⏳ Esperando ECS estable (celery)…"
	aws ecs wait services-stable \
	  --cluster $(CLUSTER) --services $(SVC_CELERY_AWS) \
	  --region $(AWS_REGION) --profile $(AWS_PROFILE)
	@echo "✅ ECS estable. Snapshot:"
	$(MAKE) aws-ecs-status

aws-wait-alb: ## Polling al ALB hasta 200 + {"status":"ok"} en /healthz/
	@URL=$$($(TF) output -raw backend_url); \
	[ -n "$$URL" ] || { echo "❌ backend_url vacío. Ejecuta 'make tf-outputs'."; exit 1; }; \
	echo "⏳ Esperando ALB 200/JSON en $$URL/healthz/ …"; \
	end=$$(($(WAIT_ALB_TIMEOUT))); \
	while :; do \
	  R=$$(curl -fsS -m 5 -w ' HTTP_CODE:%{http_code}' "$$URL/healthz/" || true); \
	  CODE=$${R##*HTTP_CODE:}; BODY=$${R% HTTP_CODE:*}; \
	  if [ "$$CODE" = "200" ] && echo "$$BODY" | jq -e '.status=="ok"' >/dev/null 2>&1; then \
	    echo "✅ ALB OK"; echo "$$BODY" | jq .; break; \
	  fi; \
	  [ $$end -le 0 ] && { echo "❌ Timeout esperando ALB (última respuesta):"; echo "$$BODY"; exit 1; }; \
	  sleep $(SLEEP); end=$$((end-$(SLEEP))); \
	done

aws-migrate:
	@echo "🔎 Buscando task RUNNING del backend…"
	@TASK_ID=$$(aws ecs list-tasks \
	  --cluster $(CLUSTER) --service-name $(SVC_BACKEND_AWS) \
	  --desired-status RUNNING --region $(AWS_REGION) --profile $(AWS_PROFILE) \
	  --query 'taskArns[0]' --output text); \
	[ "$$TASK_ID" != "None" ] || { echo "❌ No hay task RUNNING"; exit 1; }; \
	echo "▶️  migrate en task $$TASK_ID"; \
	aws ecs execute-command \
	  --cluster $(CLUSTER) --task "$$TASK_ID" \
	  --container backend --interactive \
	  --command "python manage.py migrate" \
	  --region $(AWS_REGION) --profile $(AWS_PROFILE)

# =============================================================================
# Rollback helpers y redeploy seguro
# =============================================================================
get-td-backend:
	@aws ecs describe-services \
	  --cluster $(CLUSTER) --services $(SVC_BACKEND_AWS) \
	  --region $(AWS_REGION) --profile $(AWS_PROFILE) \
	  --query 'services[0].taskDefinition' --output text

get-td-celery:
	@aws ecs describe-services \
	  --cluster $(CLUSTER) --services $(SVC_CELERY_AWS) \
	  --region $(AWS_REGION) --profile $(AWS_PROFILE) \
	  --query 'services[0].taskDefinition' --output text

set-td-backend:
	@[ -n "$(TD_BACKEND)" ] || { echo "❌ TD_BACKEND vacío"; exit 1; }
	@echo "↩️  Rollback backend -> $(TD_BACKEND)"
	@aws ecs update-service \
	  --cluster $(CLUSTER) --service $(SVC_BACKEND_AWS) \
	  --task-definition "$(TD_BACKEND)" \
	  --region $(AWS_REGION) --profile $(AWS_PROFILE) >/dev/null
	@echo "✅ backend en $(TD_BACKEND)"

set-td-celery:
	@[ -n "$(TD_CELERY)" ] || { echo "❌ TD_CELERY vacío"; exit 1; }
	@echo "↩️  Rollback celery -> $(TD_CELERY)"
	@aws ecs update-service \
	  --cluster $(CLUSTER) --service $(SVC_CELERY_AWS) \
	  --task-definition "$(TD_CELERY)" \
	  --region $(AWS_REGION) --profile $(AWS_PROFILE) >/dev/null
	@echo "✅ celery en $(TD_CELERY)"

aws-redeploy: push
	$(TF) apply -auto-approve \
	  -var="backend_desired_count=$(BACKEND_DESIRED)" \
	  -var="celery_desired_count=$(CELERY_DESIRED)"

aws-redeploy-safe: push
	@echo "🔎 Guardando task definitions actuales…"
	@TD_BACKEND_OLD=$$( $(MAKE) -s get-td-backend ); \
	 TD_CELERY_OLD=$$( $(MAKE) -s get-td-celery ); \
	 echo "backend OLD: $$TD_BACKEND_OLD"; \
	 echo "celery  OLD: $$TD_CELERY_OLD"; \
	 echo "🚀 terraform apply…"; \
	 if ! $(TF) apply -auto-approve \
	       -var="backend_desired_count=$(BACKEND_DESIRED)" \
	       -var="celery_desired_count=$(CELERY_DESIRED)"; then \
	   echo "❌ terraform apply falló. Rollback…"; \
	   $(MAKE) set-td-backend TD_BACKEND="$$TD_BACKEND_OLD"; \
	   $(MAKE) set-td-celery  TD_CELERY="$$TD_CELERY_OLD"; \
	   exit 1; \
	 fi; \
	 echo "⏳ Esperando ECS estable…"; \
	 if ! $(MAKE) -s aws-wait-ecs; then \
	   echo "❌ ECS no estabiliza. Rollback…"; \
	   $(MAKE) set-td-backend TD_BACKEND="$$TD_BACKEND_OLD"; \
	   $(MAKE) set-td-celery  TD_CELERY="$$TD_CELERY_OLD"; \
	   exit 1; \
	 fi; \
	 echo "▶️  Ejecutando migrate…"; \
	 if ! $(MAKE) -s aws-migrate; then \
	   echo "❌ migrate falló. Rollback…"; \
	   $(MAKE) set-td-backend TD_BACKEND="$$TD_BACKEND_OLD"; \
	   $(MAKE) set-td-celery  TD_CELERY="$$TD_CELERY_OLD"; \
	   exit 1; \
	 fi; \
	 echo "⏳ Esperando ALB OK…"; \
	 if ! $(MAKE) -s aws-wait-alb; then \
	   echo "❌ healthz falló. Rollback…"; \
	   $(MAKE) set-td-backend TD_BACKEND="$$TD_BACKEND_OLD"; \
	   $(MAKE) set-td-celery  TD_CELERY="$$TD_CELERY_OLD"; \
	   exit 1; \
	 fi; \
	 echo "✅ Redeploy OK"

# =============================================================================
# RUNBOOK D · Smoke / pruebas
# =============================================================================
smoke-quick:
	@URL=$$($(TF) output -raw backend_url); \
	[ -n "$$URL" ] || { echo "❌ backend_url vacío. Ejecuta 'make tf-outputs'."; exit 1; }; \
	echo "🔎 Healthcheck: $$URL/healthz/"; \
	H=$$(curl -fsS "$$URL/healthz/" || true); \
	echo "$$H" | jq . >/dev/null 2>&1 || { echo "❌ Healthz no es JSON o falló"; echo "$$H"; exit 1; }; \
	[ "$$(echo "$$H" | jq -r .status)" = "ok" ] || { echo "❌ Healthz != ok"; echo "$$H"; exit 1; }; \
	echo "✅ Healthz OK"

# Prueba rápida de la tarea demo de Celery vía ALB
test-celery:
	@URL=$$($(TF) output -raw backend_url); \
	[ -n "$$URL" ] || { echo "❌ backend_url vacío. Ejecuta 'make tf-outputs'."; exit 1; }; \
	N=$${N:-3}; \
	echo "🚀 Demo Celery (n=$$N) -> $$URL"; \
	curl -s -X POST $$URL/api/tasks/run/ -H "Content-Type: application/json" -d "{\"n\": $$N}" | tee /tmp/celery_task.json; \
	T=$$(jq -r .task_id /tmp/celery_task.json); \
	echo "⏳ Esperando $${T} …"; \
	sleep 2; curl -s $$URL/api/tasks/status/$${T}/ | jq .

# Smoke AWS (ALB): healthz + Celery demo + NetworkPlan
smoke:
	@URL=$$($(TF) output -raw backend_url); \
	[ -n "$$URL" ] || { echo "❌ backend_url vacío. Ejecuta 'make tf-outputs'."; exit 1; }; \
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
	echo "🌐 Enviando plan: $(PLAN_FILE)"; \
	NP=$$(curl -fsS -X POST "$$URL/api/network/plan/" -H "Content-Type: application/json" --data-binary @"$(PLAN_FILE)"); \
	echo "$$NP" | tee /tmp/smoke_np_task.json >/dev/null; \
	NPID=$$(echo "$$NP" | jq -r '.task_id // empty'); \
	[ -n "$$NPID" ] || { echo "❌ Sin task_id (network_plan)"; echo "$$NP"; exit 1; }; \
	echo "⏳ Esperando NetworkPlan $$NPID …"; \
	EL=0; while [ $$EL -lt $(SMOKE_TIMEOUT) ]; do \
	  RES=$$(curl -fsS "$$URL/api/tasks/status/$$NPID/" || true); \
	  STATE=$$(echo "$$RES" | jq -r .state); \
	  [ "$$STATE" = "SUCCESS" ] && { echo "$$RES" | jq .; echo "✅ NetworkPlan OK"; break; }; \
	  [ "$$STATE" = "FAILURE" ] && { echo "$$RES" | jq .; echo "❌ NetworkPlan FAILURE"; exit 1; }; \
	  sleep 2; EL=$$((EL+2)); \
	done; \
	[ $$EL -lt $(SMOKE_TIMEOUT) ] || { echo "⚠️ Timeout NetworkPlan"; exit 1; }

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

# Envío directo de un plan al ALB (útil para pruebas manuales)
test-network-plan:
	@URL=$$($(TF) output -raw backend_url); \
	[ -n "$$URL" ] || { echo "❌ backend_url vacío. Ejecuta 'make tf-outputs'."; exit 1; }; \
	[ -f "$(PLAN_FILE)" ] || { echo "❌ Falta $(PLAN_FILE)"; exit 1; }; \
	echo "🌐 POST $(PLAN_FILE) -> $$URL/api/network/plan/"; \
	curl -s -X POST "$$URL/api/network/plan/" -H "Content-Type: application/json" --data-binary @"$(PLAN_FILE)" | jq .

# ===== RDS / DB en AWS =====
aws-db-bootstrap:
	$(TF) apply -auto-approve \
	  -var="enable_rds=true" \
	  -var="backend_desired_count=0" \
	  -var="celery_desired_count=0"

aws-db-up:
	$(TF) apply -auto-approve \
	  -var="enable_rds=true" \
	  -var="backend_desired_count=$(BACKEND_DESIRED)" \
	  -var="celery_desired_count=$(CELERY_DESIRED)"

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
	$(DC) exec celery bash -lc '\
	set -e; DIR=$$(ls -1td /tmp/tf-multi-* 2>/dev/null | head -1); \
	test -n "$$DIR" && test -d "$$DIR" || { echo "No hay /tmp/tf-multi-*"; exit 1; } ; \
	echo "[destroy] $$DIR"; cd "$$DIR"; \
	export AWS_DEFAULT_REGION=$${AWS_DEFAULT_REGION:-us-east-1}; \
	terraform init -input=false -no-color >/dev/null; \
	terraform destroy -auto-approve -no-color'
