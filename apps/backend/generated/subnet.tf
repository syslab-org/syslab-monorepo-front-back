# Subnets
resource "aws_subnet" "subnet_publica" {
  vpc_id                  = aws_vpc.mi_red_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = "true"
  availability_zone       = "us-east-2a"

  tags = {
    Name = "subnet_publica"
  }
}
