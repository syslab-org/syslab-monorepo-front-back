# Subnets
resource "aws_subnet" "[[NAME]]" {
  vpc_id                  = aws_vpc.[[VPC_NAME]].id
  cidr_block              = "[[CIDR]]"
  map_public_ip_on_launch = "true"
  availability_zone       = "us-east-2a"

  tags = {
    Name = "[[NAME]]"
  }
}