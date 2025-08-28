#########################
# Task Definitions
#########################


# Descubre los repos ECR por nombre
data "aws_ecr_repository" "backend" {
  name = "${var.project}-${var.env}-backend" # -> tesis-dev-backend
}

data "aws_ecr_repository" "celery" {
  name = "${var.project}-${var.env}-celery"  # -> tesis-dev-celery
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
      image = "${data.aws_ecr_repository.backend.repository_url}:dev-latest"
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
        { name = "DEBUG", value = "true" },
        { name = "ALLOWED_HOSTS", value = "*" },
        { name = "REDEPLOY_AT", value = timestamp() },
        { name = "CELERY_BROKER_URL",     value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}/0" },
        { name = "CELERY_RESULT_BACKEND", value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}/0" }
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
      image = "${data.aws_ecr_repository.celery.repository_url}:dev-latest"
      essential = true
      command   = ["celery", "-A", "teg", "worker", "-E", "--loglevel=INFO", "--pool=solo"]
      environment = [
        { name = "DJANGO_SETTINGS_MODULE", value = "teg.settings" },
        { name = "SECRET_KEY", value = var.secret_key },
        { name = "DEBUG",                  value = "true" },
        { name = "ALLOWED_HOSTS",          value = "*" },
        { name = "CELERY_BROKER_URL",      value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}/0" },
        { name = "CELERY_RESULT_BACKEND",  value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}/0" }
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
