#########################
# Task Definitions
#########################

locals {
  # DNS del ALB para AllowedHosts/CSRF
  alb_dns = aws_lb.app.dns_name

  # Mezcla var.allowed_hosts con el DNS del ALB
  allowed_hosts_merged = distinct(concat(var.allowed_hosts, [local.alb_dns]))

  # CSRF: agrega http/https del ALB y mézclalo con la lista entrante
  csrf_trusted_origins_merged = distinct(
    concat(
      var.csrf_trusted_origins,
      ["http://${local.alb_dns}", "https://${local.alb_dns}"]
    )
  )

  # Strings útiles
  debug_str         = var.django_debug ? "true" : "false"
  allowed_hosts_str = join(",", local.allowed_hosts_merged)
  cors_origins_str  = join(",", var.cors_allowed_origins)
  csrf_trusted_str  = join(",", local.csrf_trusted_origins_merged)

  # Redis URL (ajusta si usas replication group). Aquí usamos aws_elasticache_cluster.redis
  redis_url = try(
    "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}/0",
    ""
  )

  # Bucket S3 opcional (vía variable; si está vacío, no se inyecta)
  s3_bucket = var.s3_plans_bucket != "" ? var.s3_plans_bucket : ""
}

# =========================
# Backend Task Definition
# =========================
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project}-${var.env}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:dev-latest"
      essential = true
      portMappings = [
        {
          containerPort = var.backend_container_port
          hostPort      = var.backend_container_port
          protocol      = "tcp"
        }
      ]

      # El CMD real lo pones en tu Dockerfile (migrate + gunicorn). Aquí solo pasamos envs.
      environment = concat(
        [
          { name = "DJANGO_SETTINGS_MODULE", value = "teg.settings" },
          { name = "SECRET_KEY", value = var.secret_key },
          { name = "DEBUG", value = local.debug_str },

          { name = "ALLOWED_HOSTS", value = local.allowed_hosts_str },
          { name = "CSRF_TRUSTED_ORIGINS", value = local.csrf_trusted_str },
          { name = "CORS_ALLOWED_ORIGINS", value = local.cors_origins_str },

          # Útil para forzar un redeploy sin cambiar imagen
          { name = "REDEPLOY_AT", value = timestamp() }
        ],
        # Redis solo si está disponible
        local.redis_url != "" ? [
          { name = "REDIS_URL", value = local.redis_url },
          { name = "CELERY_BROKER_URL", value = local.redis_url },
          { name = "CELERY_RESULT_BACKEND", value = local.redis_url }
        ] : [],
        # DB solo si se pasó database_url (dev vacío => SQLite)
        var.database_url != "" ? [
          { name = "DATABASE_URL", value = var.database_url },
          { name = "DB_SSL_REQUIRE", value = tostring(var.db_ssl_require) }
        ] : [],
        # S3 solo si hay bucket
        local.s3_bucket != "" ? [
          { name = "S3_PLANS_BUCKET", value = local.s3_bucket }
        ] : []
      )

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend.name
          awslogs-region        = var.region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# =========================
# Celery Task Definition
# =========================
resource "aws_ecs_task_definition" "celery" {
  family                   = "${var.project}-${var.env}-celery"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.celery_cpu
  memory                   = var.celery_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "celery"
      image     = "${aws_ecr_repository.celery.repository_url}:dev-latest"
      essential = true
      command   = ["celery", "-A", "teg.celery:app", "worker", "-E", "--loglevel=INFO", "--pool=solo"]

      environment = concat(
        [
          { name = "DJANGO_SETTINGS_MODULE", value = "teg.settings" },
          { name = "SECRET_KEY", value = var.secret_key },
          { name = "DEBUG", value = local.debug_str },

          # No imprescindibles para worker, pero mantenemos coherencia
          { name = "ALLOWED_HOSTS", value = local.allowed_hosts_str },
          { name = "CSRF_TRUSTED_ORIGINS", value = local.csrf_trusted_str },
          { name = "CORS_ALLOWED_ORIGINS", value = local.cors_origins_str }
        ],
        local.redis_url != "" ? [
          { name = "REDIS_URL", value = local.redis_url },
          { name = "CELERY_BROKER_URL", value = local.redis_url },
          { name = "CELERY_RESULT_BACKEND", value = local.redis_url }
        ] : [],
        var.database_url != "" ? [
          { name = "DATABASE_URL", value = var.database_url },
          { name = "DB_SSL_REQUIRE", value = tostring(var.db_ssl_require) }
        ] : [],
        local.s3_bucket != "" ? [
          { name = "S3_PLANS_BUCKET", value = local.s3_bucket }
        ] : []
      )

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.celery.name
          awslogs-region        = var.region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = {
    Project = var.project
    Env     = var.env
  }
}
