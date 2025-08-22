resource "aws_instance" "instancia1" {
  ami           = "ami-0a2bf868f9c25cd7e"
  instance_type = "t2.micro"
  # the VPC subnet
  subnet_id = aws_subnet.subnet_publica.id
  # the security group
  vpc_security_group_ids = [aws_security_group.allow-ssh.id]
  # the public SSH key
  key_name = aws_key_pair.mykeypair.key_name
  private_ip = "10.0.1.10"
}
