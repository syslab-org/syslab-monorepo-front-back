# /infra/terraform/rds.tf
#########################
# RDS Postgres (dev)
#########################

# SG de RDS (solo 5432 desde runtimes autorizados)
resource "aws_security_group" "rds" {
  name        = "${var.project}-${var.env}-rds-sg"
  description = "Permite acceso a Postgres solo desde runtimes autorizados"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Salida a cualquier destino"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project}-${var.env}-rds-sg"
    Project = var.project
    Env     = var.env
  }
}

# Regla: runtime de app -> RDS (5432)
resource "aws_security_group_rule" "rds_ingress_from_app_runtime" {
  type                     = "ingress"
  description              = "App runtime to Postgres 5432"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = aws_security_group.app_runtime.id
}

# Subnet group para RDS (para dev usamos subnets públicas)
resource "aws_db_subnet_group" "rds" {
  name        = "${var.project}-${var.env}-rds-subnets"
  description = "RDS subnets (dev)"
  subnet_ids  = [for s in aws_subnet.public : s.id]

  # ❗ Evita que Terraform intente cambiar las subnets de un grupo ya existente/en uso
  lifecycle {
    ignore_changes = [subnet_ids]
  }

  tags = {
    Name    = "${var.project}-${var.env}-rds-subnets"
    Project = var.project
    Env     = var.env
  }
}


# Password aleatorio para RDS (sin / @ " ' ni espacios)
resource "random_password" "rds_master_password" {
  length      = 24
  lower       = true
  upper       = true
  numeric     = true
  special     = true
  min_lower   = 1
  min_upper   = 1
  min_numeric = 1
  min_special = 1

  # Importante: excluir los no permitidos por RDS
  override_special = "!#$%^&*()-_=+[]{}:,.?|~" # <- NO incluye / @ " ' ni espacio
  keepers = {
    static = 1 # cambia a 2 si QUIERES rotarlo
  }
}

# Instancia RDS (SIN engine_version -> usa la última estable de la región)
resource "aws_db_instance" "rds" {
  identifier = "${var.project}-${var.env}-pg"
  engine     = "postgres"
  # ❗ No seteamos engine_version para que RDS use la default más reciente.

  instance_class    = "db.t3.micro"
  allocated_storage = 20

  username = "teg"
  password = random_password.rds_master_password.result
  db_name  = "teg"

  db_subnet_group_name       = aws_db_subnet_group.rds.name
  vpc_security_group_ids     = [aws_security_group.rds.id]
  publicly_accessible        = true # dev; en prod -> false con subnets privadas
  skip_final_snapshot        = true
  apply_immediately          = true
  auto_minor_version_upgrade = true
  deletion_protection        = false

  tags = {
    Name    = "${var.project}-${var.env}-rds"
    Project = var.project
    Env     = var.env
  }
}

# Exponer el endpoint (útil para debug)
output "rds_endpoint" {
  value = aws_db_instance.rds.address
}

output "rds_master_password" {
  value     = random_password.rds_master_password.result
  sensitive = true
}

variable "allow_rds_from_my_ip" {
  type    = bool
  default = false # ponlo en false cuando termines
}

variable "my_ip_cidr" {
  type = string
  # cambia por tu IP pública /32, ej: "203.0.113.45/32"
  default = "MI.IP.PUBLICA/32"
}

resource "aws_security_group_rule" "rds_ingress_from_me" {
  count             = var.allow_rds_from_my_ip ? 1 : 0
  type              = "ingress"
  description       = "TEMP DEV: my IP to Postgres 5432"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  security_group_id = aws_security_group.rds.id
  cidr_blocks       = [var.my_ip_cidr]
}
