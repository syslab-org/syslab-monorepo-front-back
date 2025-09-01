#########################
# Redis (ElastiCache) - DEV
#########################
data "aws_security_group" "default_vpc_sg" {
  name   = "default"
  vpc_id = aws_vpc.main.id
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
  engine_version       = "7.1"             # versión reciente
  node_type            = "cache.t4g.micro" # barato para dev (ARM)
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"

  subnet_group_name = aws_elasticache_subnet_group.redis.name
  security_group_ids = [
    aws_security_group.redis.id
  ]
  port = 6379

  # Importante: ElastiCache NO tiene IP pública; solo privada dentro del VPC
  # Al estar en el mismo VPC/subnets, tus tareas ECS podrán conectarse.

  tags = {
    Project = var.project
    Env     = var.env
  }
}
