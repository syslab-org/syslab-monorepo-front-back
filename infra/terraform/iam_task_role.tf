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
      "ec2:CreateVpc",
      "ec2:DeleteVpc",
      "ec2:ModifyVpcAttribute",
      "ec2:CreateSubnet",
      "ec2:DeleteSubnet",
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
      "ec2:DescribeVpcs",
      "ec2:DescribeSubnets",
      "ec2:DescribeInternetGateways",
      "ec2:DescribeRouteTables",
      "ec2:DescribeAvailabilityZones",
      "ec2:DescribeTags"
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
