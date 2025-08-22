resource "aws_network_acl" "subnet_publica_acl" {
  vpc_id     = aws_vpc.mi_red_vpc.id
  subnet_ids = [aws_subnet.subnet_publica.id]

  

  tags = {
    Name = "subnet_publica"
  }
}
