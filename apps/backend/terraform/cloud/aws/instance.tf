resource "aws_instance" "[[NAME]]" {
  ami           = "ami-0a2bf868f9c25cd7e"
  instance_type = "t2.micro"
  # the VPC subnet
  subnet_id = aws_subnet.[[SUBNET_NAME]].id
  # the security group
  vpc_security_group_ids = [aws_security_group.allow-ssh.id]
  # the public SSH key
  key_name = aws_key_pair.mykeypair.key_name
  private_ip = "[[IP_ADDRESS]]"
}