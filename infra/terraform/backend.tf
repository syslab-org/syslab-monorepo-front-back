terraform {
  backend "s3" {
    bucket         = "tesis-dev-tfstate"
    key            = "envs/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tesis-dev-tf-locks"
    encrypt        = true
  }
}
