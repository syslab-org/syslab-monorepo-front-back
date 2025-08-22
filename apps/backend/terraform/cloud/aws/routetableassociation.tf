resource "aws_route_table_association" "[[NAME]]" {
  subnet_id      = aws_subnet.[[SUBNET_NAME]].id
  route_table_id = aws_route_table.[[ROUTETABLE_NAME]].id
}