# /infra/terraform/secrets.tf
#########################
# Secrets Manager - DATABASE_URL (condicional)
#########################

locals {
  # Si pasas un ARN externo por variable, NO creamos el secreto.
  use_external_db_secret = var.database_url_secret_arn != ""

  # Datos del RDS (solo se usan si vamos a crear el secret desde este stack)
  rds_host    = aws_db_instance.rds.address
  rds_port    = 5432
  rds_user    = aws_db_instance.rds.username
  rds_db_name = aws_db_instance.rds.db_name

  # Password crudo (viene de random_password o de tu rds.tf)
  rds_password_raw = random_password.rds_master_password.result
  # 👇 IMPORTANTE: codificar para URL
  rds_password_enc = urlencode(local.rds_password_raw)

  # Construimos la URL usando el password codificado
  database_url_local = "postgres://${local.rds_user}:${local.rds_password_enc}@${local.rds_host}:${local.rds_port}/${local.rds_db_name}"
}

# Secret SOLO si NO pasaste un ARN externo
resource "aws_secretsmanager_secret" "db_url" {
  count = local.use_external_db_secret ? 0 : 1
  name  = "${var.project}-${var.env}-database-url"
  tags  = { Project = var.project, Env = var.env }
}

resource "aws_secretsmanager_secret_version" "db_url_v" {
  count         = local.use_external_db_secret ? 0 : 1
  secret_id     = aws_secretsmanager_secret.db_url[0].id
  secret_string = local.database_url_local
}

# Siempre devolvemos un ARN válido
output "database_url_secret_arn" {
  value = local.use_external_db_secret ? var.database_url_secret_arn : aws_secretsmanager_secret.db_url[0].arn
}
