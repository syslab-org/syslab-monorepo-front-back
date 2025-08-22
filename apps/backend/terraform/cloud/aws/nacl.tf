resource "aws_network_acl" "[[NAME]]_acl" {
  vpc_id     = aws_vpc.[[VPC_NAME]].id
  subnet_ids = [aws_subnet.[[SUBNET_NAME]].id]

  [[RULES]]

  tags = {
    Name = "[[NAME]]"
  }
}