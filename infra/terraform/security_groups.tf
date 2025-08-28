#########################
# Security Groups (SGs)
#########################

# ALB expuesto a Internet (HTTP 80). Luego podrás agregar HTTPS (443) con ACM.
resource "aws_security_group" "alb" {
  name        = "${var.project}-${var.env}-alb-sg"
  description = "ALB ingress 80"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP desde Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

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

# SG para las tasks ECS (backend). Solo acepta tráfico desde el SG del ALB al puerto 8000.
resource "aws_security_group" "ecs_service" {
  name        = "${var.project}-${var.env}-ecs-sg"
  description = "Permite trafico del ALB al backend"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "ALB to backend port ${var.backend_container_port}"
    from_port       = var.backend_container_port
    to_port         = var.backend_container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

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

