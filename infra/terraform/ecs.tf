#########################
# ECS Cluster + IAM + Logs
#########################

resource "aws_ecs_cluster" "this" {
  name = "${var.project}-${var.env}-cluster"

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# Log groups (CloudWatch)
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project}/${var.env}/backend"
  retention_in_days = 14
  tags = {
    Project = var.project
    Env     = var.env
  }
}

resource "aws_cloudwatch_log_group" "celery" {
  name              = "/ecs/${var.project}/${var.env}/celery"
  retention_in_days = 14
  tags = {
    Project = var.project
    Env     = var.env
  }
}

# IAM Role para ejecución de tasks (pull de ECR, logs, etc.)
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project}-${var.env}-ecs-task-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
  tags = {
    Project = var.project
    Env     = var.env
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
