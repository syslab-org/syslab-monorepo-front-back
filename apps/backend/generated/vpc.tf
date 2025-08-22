# Internet VPC
resource "aws_vpc" "mi_red_vpc" {
  cidr_block           = "10.0.0.0/16"
  instance_tenancy     = "default"
  enable_dns_support   = "true"
  enable_dns_hostnames = "true"
  tags = {
    Name = "mi_red_vpc"
  }
}

#Gateway
resource "aws_internet_gateway" "mi_red_vpc_igw" {
  vpc_id = aws_vpc.mi_red_vpc.id 
}

# Route Table
resource "aws_route_table" "mi_red_vpc_route_table" {
  vpc_id = aws_vpc.mi_red_vpc.id
}

# Route
resource "aws_route" "internet_route" {
  route_table_id          = aws_route_table.mi_red_vpc_route_table.id
  destination_cidr_block  = "0.0.0.0/0"
  gateway_id              = aws_internet_gateway.mi_red_vpc_igw.id
}
