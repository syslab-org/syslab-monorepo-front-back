data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "plans" {
  bucket = "${var.project}-${var.env}-plans-${data.aws_caller_identity.current.account_id}"

  force_destroy = true

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# Bloqueo de acceso público
resource "aws_s3_bucket_public_access_block" "plans" {
  bucket                  = aws_s3_bucket.plans.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Cifrado por defecto
resource "aws_s3_bucket_server_side_encryption_configuration" "plans" {
  bucket = aws_s3_bucket.plans.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Versioning (útil para auditoría)
resource "aws_s3_bucket_versioning" "plans" {
  bucket = aws_s3_bucket.plans.id
  versioning_configuration {
    status = "Enabled"
  }
}
