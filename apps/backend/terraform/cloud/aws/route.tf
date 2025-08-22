resource "aws_route" "[[NAME]]" {
  route_table_id         = aws_route_table.[[ROUTETABLE_NAME]].id
  destination_cidr_block = "[[DEST_CIDR]]"
  gateway_id             = "local"
}