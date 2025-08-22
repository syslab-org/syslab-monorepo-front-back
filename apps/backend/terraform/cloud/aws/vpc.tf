# Internet VPC
resource "aws_vpc" "[[NAME]]" {
  cidr_block           = "[[CIDR]]"
  instance_tenancy     = "default"
  enable_dns_support   = "true"
  enable_dns_hostnames = "true"
  tags = {
    Name = "[[NAME]]"
  }
}

#Gateway
resource "aws_internet_gateway" "[[NAME]]_igw" {
  vpc_id = aws_vpc.[[NAME]].id 
}

# Route Table
resource "aws_route_table" "[[NAME]]_route_table" {
  vpc_id = aws_vpc.[[NAME]].id
}

# Route
resource "aws_route" "internet_route" {
  route_table_id          = aws_route_table.[[NAME]]_route_table.id
  destination_cidr_block  = "0.0.0.0/0"
  gateway_id              = aws_internet_gateway.[[NAME]]_igw.id
}