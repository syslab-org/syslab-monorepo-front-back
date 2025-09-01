#########################
# Security Groups (SGs)
#########################

# ALB expuesto a Internet (HTTP 80 y HTTPS 443)
resource "aws_security_group" "alb" {
  name        = "${var.project}-${var.env}-alb-sg"
  description = "ALB ingress 80/443"
  vpc_id      = aws_vpc.main.id

  # HTTP desde Internet (útil en dev o para redirección 80->443)
  ingress {
    description = "HTTP desde Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS desde Internet
  ingress {
    description = "HTTPS desde Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Salida libre (para health checks, resoluciones, etc.)
  egress {
    description = "Salida a cualquier destino"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project}-${var.env}-alb-sg"
    Project = var.project
    Env     = var.env
  }
}

# SG para las tasks ECS (backend/celery).
# No declaramos ingress inline: lo hacemos con aws_security_group_rule.
resource "aws_security_group" "ecs_service" {
  name        = "${var.project}-${var.env}-ecs-sg"
  description = "Permite trafico del ALB al backend"
  vpc_id      = aws_vpc.main.id

  # Salida libre (hacia Redis, Internet vía NAT, etc.)
  egress {
    description = "Salida a cualquier destino"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project}-${var.env}-ecs-sg"
    Project = var.project
    Env     = var.env
  }
}

# Regla: ALB -> ECS (puerto backend_container_port)
resource "aws_security_group_rule" "ecs_ingress_from_alb" {
  type                     = "ingress"
  description              = "ALB to backend ${var.backend_container_port}"
  from_port                = var.backend_container_port
  to_port                  = var.backend_container_port
  protocol                 = "tcp"
  security_group_id        = aws_security_group.ecs_service.id
  source_security_group_id = aws_security_group.alb.id
}

# SG para Redis (ElastiCache): no declaramos ingress inline
resource "aws_security_group" "redis" {
  name        = "${var.project}-${var.env}-redis-sg"
  description = "Acceso a Redis solo desde ECS"
  vpc_id      = aws_vpc.main.id

  # Salida libre (para métricas internas, etc.)
  egress {
    description = "Salida a cualquier destino"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project}-${var.env}-redis-sg"
    Project = var.project
    Env     = var.env
  }
}

# Regla: ECS -> Redis (6379)
resource "aws_security_group_rule" "redis_ingress_from_ecs" {
  type                     = "ingress"
  description              = "ECS to Redis 6379"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.redis.id
  source_security_group_id = aws_security_group.ecs_service.id
}
