output "ecr_backend_url" { value = aws_ecr_repository.backend.repository_url }
output "ecr_celery_url" { value = aws_ecr_repository.celery.repository_url }
