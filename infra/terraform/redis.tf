#########################
# Redis (ElastiCache) - DEV
#########################

# SG para Redis: permite 6379 solo desde las tareas ECS (SG del servicio)
resource "aws_security_group" "redis" {
  name        = "${var.project}-${var.env}-sg-redis"
  description = "ElastiCache Redis SG"
  vpc_id      = aws_vpc.main.id

  # Inbound: puerto Redis desde el SG de ECS
  ingress {
    description     = "ECS services to Redis"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_service.id]
  }

  # Outbound libre (necesario para mantenimiento interno)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# Subnet Group para Redis (usamos las públicas del VPC en dev)
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project}-${var.env}-redis-subnets"
  subnet_ids = [for s in aws_subnet.public : s.id]

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# Redis (cluster mode disabled), 1 nodo para dev
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.project}-${var.env}-redis"
  engine               = "redis"
  engine_version       = "7.1"        # versión reciente
  node_type            = "cache.t4g.micro"  # barato para dev (ARM)
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"

  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]
  port                 = 6379

  # Importante: ElastiCache NO tiene IP pública; solo privada dentro del VPC
  # Al estar en el mismo VPC/subnets, tus tareas ECS podrán conectarse.

  tags = {
    Project = var.project
    Env     = var.env
  }
}
