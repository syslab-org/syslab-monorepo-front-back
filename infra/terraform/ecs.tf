# /infra/terraform/ecs.tf
#########################
# ECS Cluster + IAM + Logs
#########################

# Cluster ECS
resource "aws_ecs_cluster" "this" {
  name = "${var.project}-${var.env}-cluster"

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# Log groups (CloudWatch) para backend y celery
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

# -------------------------------------------------------------------
# Execution Role (pull de ECR, logs, y lectura de Secrets Manager)
# -------------------------------------------------------------------
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project}-${var.env}-ecs-task-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = { Service = "ecs-tasks.amazonaws.com" },
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# Attach estándar (ECR auth, CloudWatch logs, etc.)
resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

locals {
  exec_db_secret_arn = var.database_url_secret_arn != "" ? var.database_url_secret_arn : try(aws_secretsmanager_secret.db_url[0].arn, "")
}

resource "aws_iam_role_policy" "exec_read_db_secret" {
  count = local.exec_db_secret_arn != "" ? 1 : 0

  name = "${var.project}-${var.env}-exec-read-dburl"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      Resource = local.exec_db_secret_arn
    }]
  })
}
