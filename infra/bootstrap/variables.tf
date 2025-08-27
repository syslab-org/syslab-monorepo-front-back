variable "project" { type = string }
variable "env"     { type = string }
variable "region"  { type = string }
variable "aws_profile" {
  type    = string
  default = "tesis"
}
