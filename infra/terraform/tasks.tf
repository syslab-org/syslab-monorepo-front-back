#########################
# Task Definitions
#########################
locals {
  # DNS del ALB (recurso definido en alb.tf)
  alb_dns = aws_lb.app.dns_name

  # Mezcla la lista que ya pasas por var.allowed_hosts con el DNS del ALB
  allowed_hosts_merged = distinct(concat(var.allowed_hosts, [local.alb_dns]))

  # Para CSRF: agregamos http y https del ALB y lo mezclamos con lo que ya venga por var.csrf_trusted_origins
  csrf_trusted_origins_merged = distinct(
    concat(
      var.csrf_trusted_origins,
      ["http://${local.alb_dns}", "https://${local.alb_dns}"]
    )
  )
}

# Backend Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project}-${var.env}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

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
      environment = [
        { name = "DJANGO_SETTINGS_MODULE", value = "teg.settings" },
        { name = "SECRET_KEY", value = var.secret_key },
        { name = "DEBUG", value = tostring(var.django_debug) },


        { name = "ALLOWED_HOSTS", value = join(",", local.allowed_hosts_merged) },
        { name = "CSRF_TRUSTED_ORIGINS", value = join(",", local.csrf_trusted_origins_merged) },

        { name = "CORS_ALLOWED_ORIGINS", value = join(",", var.cors_allowed_origins) },
        { name = "REDEPLOY_AT", value = timestamp() },

        # Redis/Celery
        { name = "CELERY_BROKER_URL", value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}/0" },
        { name = "CELERY_RESULT_BACKEND", value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}/0" },
        { name = "REDIS_URL", value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}/0" }
      ]



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

# Celery Task Definition (sin broker por ahora; dejamos environment preparado)
resource "aws_ecs_task_definition" "celery" {
  family                   = "${var.project}-${var.env}-celery"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.celery_cpu
  memory                   = var.celery_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "celery"
      image     = "${aws_ecr_repository.celery.repository_url}:dev-latest"
      essential = true
      command   = ["celery", "-A", "teg.celery:app", "worker", "-E", "--loglevel=INFO", "--pool=solo"]
      environment = [
        { name = "DJANGO_SETTINGS_MODULE", value = "teg.settings" },
        { name = "SECRET_KEY", value = var.secret_key },
        { name = "DEBUG", value = tostring(var.django_debug) },

        # coherencia (no imprescindible para el worker)
        { name = "ALLOWED_HOSTS", value = join(",", local.allowed_hosts_merged) },
        { name = "CSRF_TRUSTED_ORIGINS", value = join(",", local.csrf_trusted_origins_merged) },

        { name = "CORS_ALLOWED_ORIGINS", value = join(",", var.cors_allowed_origins) },

        # Redis
        { name = "CELERY_BROKER_URL", value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}/0" },
        { name = "CELERY_RESULT_BACKEND", value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}/0" },
        { name = "REDIS_URL", value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}/0" }
      ]


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
