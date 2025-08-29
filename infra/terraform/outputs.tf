output "ecr_backend_url" { value = aws_ecr_repository.backend.repository_url }
output "ecr_celery_url" { value = aws_ecr_repository.celery.repository_url }
output "alb_dns_name" {
  value       = aws_lb.app.dns_name
  description = "DNS del ALB (URL del backend)"
}

output "backend_url" {
  value       = "http://${aws_lb.app.dns_name}"
  description = "URL HTTP del backend detrás del ALB"
}

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.this.name
  description = "Nombre del cluster ECS"
}

output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID de la VPC"
}

output "redis_endpoint" {
  description = "Endpoint Redis para Celery (host:port)"
  value       = "${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}"
}
