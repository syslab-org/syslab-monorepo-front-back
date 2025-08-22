#Route Table
resource "aws_route_table" "[[NAME]]" {
  vpc_id = aws_vpc.[[VPC_NAME]].id
}