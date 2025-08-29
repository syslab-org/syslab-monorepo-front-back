output "tfstate_bucket" { value = aws_s3_bucket.tfstate.bucket }
output "tfstate_region" { value = var.region }
output "tf_lock_table" { value = aws_dynamodb_table.locks.name }
