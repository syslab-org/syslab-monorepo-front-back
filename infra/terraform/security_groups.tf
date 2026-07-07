#########################
# Security Groups (SGs)
#########################

# SG reservado para runtimes futuros dentro de la VPC.
resource "aws_security_group" "app_runtime" {
  name        = "${var.project}-${var.env}-app-runtime-sg"
  description = "Salida para runtimes de aplicacion dentro de la VPC"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Salida a cualquier destino"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project}-${var.env}-app-runtime-sg"
    Project = var.project
    Env     = var.env
  }
}

# SG para Redis (ElastiCache): no declaramos ingress inline
resource "aws_security_group" "redis" {
  name        = "${var.project}-${var.env}-redis-sg"
  description = "Acceso a Redis solo desde runtimes autorizados"
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

# Regla: runtimes de app -> Redis (6379)
resource "aws_security_group_rule" "redis_ingress_from_app_runtime" {
  type                     = "ingress"
  description              = "App runtime to Redis 6379"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.redis.id
  source_security_group_id = aws_security_group.app_runtime.id
}
