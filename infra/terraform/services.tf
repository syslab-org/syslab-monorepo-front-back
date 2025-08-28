#########################
# ECS Services
#########################

variable "backend_desired_count" {
  type        = number
  default     = 1
  description = "Réplicas del backend"
}

variable "celery_desired_count" {
  type        = number
  default     = 1
  description = "Réplicas de celery (0 hasta tener Redis en AWS)"
}

# Backend service
resource "aws_ecs_service" "backend" {
  name            = "${var.project}-${var.env}-svc-backend"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = [for s in aws_subnet.public : s.id]
    security_groups = [aws_security_group.ecs_service.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = var.backend_container_port
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# Celery service (sin ALB)
resource "aws_ecs_service" "celery" {
  name            = "${var.project}-${var.env}-svc-celery"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.celery.arn
  desired_count   = var.celery_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [for s in aws_subnet.public : s.id]
    security_groups  = [aws_security_group.ecs_service.id]
    assign_public_ip = true
  }

  tags = {
    Project = var.project
    Env     = var.env
  }
}
