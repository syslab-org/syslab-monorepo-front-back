# /infra/terraform/iam_task_role.tf
# Rol que asumen los contenedores (boto3 lo usará para firmar llamadas a S3)
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project}-${var.env}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = { Service = "ecs-tasks.amazonaws.com" },
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# Permisos para ECS Exec (SSM Messages) en el TASK ROLE
resource "aws_iam_role_policy_attachment" "ecs_task_role_ssm_core" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}


# Permiso mínimo: subir objetos al bucket de planes
resource "aws_iam_role_policy" "ecs_task_s3_put" {
  name = "${var.project}-${var.env}-ecs-task-s3-put"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect   = "Allow",
      Action   = ["s3:PutObject", "s3:PutObjectAcl"],
      Resource = "${aws_s3_bucket.plans.arn}/*"
    }]
  })
}

# --------------------------------------------------------
# Permisos adicionales: que Terraform (ejecutado dentro ECS)
# pueda crear/modificar recursos de red (VPC, subnets, rutas).
# --------------------------------------------------------
data "aws_iam_policy_document" "ecs_tf_network_dev" {
  statement {
    sid    = "EC2VpcCrudBasic"
    effect = "Allow"
    actions = [
      # CRUD básico de red
      "ec2:CreateVpc",
      "ec2:DeleteVpc",
      "ec2:ModifyVpcAttribute",
      "ec2:CreateSubnet",
      "ec2:DeleteSubnet",
      "ec2:ModifySubnetAttribute",
      "ec2:CreateInternetGateway",
      "ec2:DeleteInternetGateway",
      "ec2:AttachInternetGateway",
      "ec2:DetachInternetGateway",
      "ec2:CreateRouteTable",
      "ec2:DeleteRouteTable",
      "ec2:AssociateRouteTable",
      "ec2:DisassociateRouteTable",
      "ec2:CreateRoute",
      "ec2:ReplaceRoute",
      "ec2:DeleteRoute",
      "ec2:CreateTags",
      "ec2:DeleteTags",

      # Lecturas que Terraform usa en plan/apply
      "ec2:DescribeVpcs",
      "ec2:DescribeSubnets",
      "ec2:DescribeInternetGateways",
      "ec2:DescribeRouteTables",
      "ec2:DescribeAvailabilityZones",
      "ec2:DescribeTags",

      "ec2:DescribeVpcAttribute",
      "ec2:DescribeAccountAttributes",

      "ec2:CreateVpcPeeringConnection",
      "ec2:AcceptVpcPeeringConnection",
      "ec2:DeleteVpcPeeringConnection",
      "ec2:DescribeVpcPeeringConnections",



      # útil si luego usas prefix lists (no estorba)
      "ec2:GetManagedPrefixListEntries",

      #NAT Gateway + Elastic IP (no usado aquí, pero puede ser útil)
      "ec2:AllocateAddress",
      "ec2:ReleaseAddress",
      "ec2:CreateNatGateway",
      "ec2:DeleteNatGateway",
      "ec2:DescribeNatGateways",

      #Opciones de peering (DNS-resolution entre VPCs)
      "ec2:ModifyVpcPeeringConnectionOptions",
      #Lecturas extra que TF/plan suele consultar (harmless y evitan warnings)
      "ec2:DescribeNetworkInterfaces",
      "ec2:DescribeSecurityGroups",
      "ec2:DescribeSecurityGroupRules",


    ]
    resources = ["*"]
  }
}


resource "aws_iam_policy" "ecs_tf_network_dev" {
  name   = "${var.project}-${var.env}-ecs-tf-network-dev"
  policy = data.aws_iam_policy_document.ecs_tf_network_dev.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_role_tf_network_dev" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_tf_network_dev.arn
}


# Lee el secret desde un ARN externo si viene por variable
resource "aws_iam_role_policy" "ecs_task_secrets_read_external" {
  count = var.database_url_secret_arn != "" ? 1 : 0

  name = "${var.project}-${var.env}-ecs-task-secrets-read"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect   = "Allow",
      Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = var.database_url_secret_arn
    }]
  })
}

# Lee el secret local creado por este stack (índice [0])
resource "aws_iam_role_policy" "ecs_task_secrets_read_local" {
  count = var.database_url_secret_arn == "" ? 1 : 0

  name = "${var.project}-${var.env}-ecs-task-secrets-read"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect   = "Allow",
      Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      Resource = aws_secretsmanager_secret.db_url[0].arn
    }]
  })
}

