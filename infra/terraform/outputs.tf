output "ecr_backend_url" { value = aws_ecr_repository.backend.repository_url }
output "ecr_celery_url" { value = aws_ecr_repository.celery.repository_url }

output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID de la VPC"
}

output "redis_endpoint" {
  description = "Endpoint Redis para Celery (host:port)"
  value       = "${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}"
}

output "plans_bucket" {
  value = aws_s3_bucket.plans.bucket
}

output "app_runtime_sg_id" {
  value       = aws_security_group.app_runtime.id
  description = "Security group reservado para runtimes de aplicacion dentro de la VPC"
}
