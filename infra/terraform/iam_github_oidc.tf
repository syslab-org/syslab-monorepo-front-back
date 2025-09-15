# Proveedor OIDC de GitHub (global)
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    # thumbprint de GitHub OIDC
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]
}

# Rol que podrá asumir GitHub Actions para desplegar
resource "aws_iam_role" "github_deploy" {
  name = "${var.project}-${var.env}-github-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        },
        StringLike = {
          # Ajusta con owner/repo y branches permitidas
          "token.actions.githubusercontent.com:sub" = [
            "repo:jcaicedo/syslab-monorepo-front-back:ref:refs/heads/deploy-dev"
            # o varios:
            # "repo:TU_ORG/TU_REPO:ref:refs/heads/deploy-*"
          ]
        }
      }
    }]
  })
}

# Permisos mínimos para:
# - ECR: login/push
# - ECS/ELB: actualizar servicios y esperar
# - CloudWatch: logs (lectura)
# - SSM: ECS Exec
# - Terraform en tu carpeta (crea/actualiza recursos existentes)
data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid    = "ECRPush"
    effect = "Allow"
    actions = ["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability", "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer", "ecr:InitiateLayerUpload", "ecr:PutImage", "ecr:UploadLayerPart",
    "ecr:BatchGetImage", "ecr:DescribeRepositories", "ecr:CreateRepository"]
    resources = ["*"]
  }
  statement {
    sid    = "ECSUpdate"
    effect = "Allow"
    actions = ["ecs:Describe*", "ecs:UpdateService", "ecs:RegisterTaskDefinition", "ecs:ListTasks",
    "ecs:ExecuteCommand", "iam:PassRole"]
    resources = ["*"]
  }
  statement {
    sid    = "ELBDescribeCWRead"
    effect = "Allow"
    actions = ["elasticloadbalancing:Describe*", "cloudwatch:GetMetricData", "cloudwatch:GetMetricStatistics",
    "logs:DescribeLogGroups", "logs:DescribeLogStreams", "logs:GetLogEvents", "logs:FilterLogEvents"]
    resources = ["*"]
  }
  statement {
    sid       = "SecretsRead"
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = ["*"]
  }
  statement {
    sid       = "S3StateAndPlans"
    effect    = "Allow"
    actions   = ["s3:*"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "github_deploy" {
  name   = "${var.project}-${var.env}-github-deploy"
  policy = data.aws_iam_policy_document.github_deploy.json
}

resource "aws_iam_role_policy_attachment" "github_deploy" {
  role       = aws_iam_role.github_deploy.name
  policy_arn = aws_iam_policy.github_deploy.arn
}
