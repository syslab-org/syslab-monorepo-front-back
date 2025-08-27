resource "aws_ecr_repository" "backend" {
  name                 = "${var.project}-${var.env}-backend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
  force_delete = true
}

resource "aws_ecr_repository" "celery" {
  name                 = "${var.project}-${var.env}-celery"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
  force_delete = true
}
