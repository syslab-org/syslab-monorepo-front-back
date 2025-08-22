import os
from django.contrib.auth.models import User
from rest_framework import viewsets
from rest_framework import permissions
from api.serializers import NetworkSerializer, CloudSerializer, ComponentSerializer
# from api.serializers import NetworkSerializer, CloudSerializer, ComponentSerializer, UserSerializer
from api.models import Cloud, Network, Component
# from api.models import Cloud, Network, Component, User
from rest_framework.response import Response
import shutil
import json

class NetworkViewSet(viewsets.ModelViewSet):
    serializer_class = NetworkSerializer
    # permission_classes = [permissions.IsAuthenticated]

    def __init__(self, *args, **kwargs):
        self.cloud = None
        self.rule_no = 100

    def get(self, pk=None):

        # print("TEST GET")

        # self.postProcessAWS("Test")

        return Response(True)    

    def create(self, request):
        
        data = json.loads(request.body) #Recibir estructura tipo JSON
        self.cloud = data["cloud"]
        self.postProcessAWS(data)

        self.cloud = "aws"

        #self.postProcessAWS("test")

        os.system("terraform -chdir=generated init")
        os.system("terraform -chdir=generated apply -auto-approve")

        #os.system("terraform -chdir=generated destroy -auto-approve")

        return Response(request.body)

    def postProcessAWS(self, data):

        os.system(f'rm -Rf generated/*')

        #json = self.jsonStructureAWS()

        self.createTerraformCode(data)

        return True

    def jsonStructureAWS(self):

        data = {
            "cloud": "aws",
            "vpcs": [
                {
                    "name"       : "main",
                    "cidr_block" : "10.0.0.0/16",
                    "subnets": [
                        {
                            "name"       : "main-public-1",
                            "cidr_block" : "10.0.1.0/24",
                            "zone"       : "us-east-2a",
                            "public_ip"  : "true",
                            "route_table": "table1",                          
                            "instances": [
                                {   
                                    "id"           : "<string>",    
                                    "ami"          : "ami-0a2bf868f9c25cd7e",
                                    "instance_type": "t2.micro",
                                    "ip_address"   : "10.0.1.100",
                                    "name"         : "example-s1",
                                    "ssh_access"   : "true"                          
                                },
                                {   
                                    "id"           : "<string>",    
                                    "ami"          : "ami-0a2bf868f9c25cd7e",
                                    "instance_type": "t2.micro",
                                    "ip_address"   : "10.0.1.101",
                                    "name"         : "example2-s1",
                                    "ssh_access"   : "true"                          
                                }
                            ]
                        },
                        {
                            "name"       : "main-public-2",
                            "cidr_block" : "10.0.2.0/24",
                            "zone"       : "us-east-2a",
                            "public_ip"  : "true",
                            "route_table": "table1",                           
                            "instances": [
                                {   
                                    "id"           : "<string>",    
                                    "ami"          : "ami-0a2bf868f9c25cd7e",
                                    "instance_type": "t2.micro",
                                    "ip_address"   : "10.0.2.100",
                                    "name"         : "example-s2",
                                    "ssh_access"   : "true"                          
                                },
                                {   
                                    "id"           : "<string>",    
                                    "ami"          : "ami-0a2bf868f9c25cd7e",
                                    "instance_type": "t2.micro",
                                    "ip_address"   : "10.0.2.101",
                                    "name"         : "example2-s2",
                                    "ssh_access"   : "true"                          
                                }
                            ]
                        },
                        {
                            "name"       : "main-public-3",
                            "cidr_block" : "10.0.3.0/24",
                            "zone"       : "us-east-2a",
                            "public_ip"  : "true",
                            "route_table": "table2",                           
                            "instances": [
                                {   
                                    "id"           : "<string>",    
                                    "ami"          : "ami-0a2bf868f9c25cd7e",
                                    "instance_type": "t2.micro",
                                    "ip_address"   : "10.0.3.100",
                                    "name"         : "example-s3",
                                    "ssh_access"   : "true"                          
                                },
                                {   
                                    "id"           : "<string>",    
                                    "ami"          : "ami-0a2bf868f9c25cd7e",
                                    "instance_type": "t2.micro",
                                    "ip_address"   : "10.0.3.101",
                                    "name"         : "example2-s3",
                                    "ssh_access"   : "true"                          
                                }
                            ]
                        },
                        {
                            "name"       : "main-public-2",
                            "cidr_block" : "10.0.4.0/24",
                            "zone"       : "us-east-2a",
                            "public_ip"  : "true",
                            "route_table": "table1",                           
                            "instances": [
                                {   
                                    "id"           : "<string>",    
                                    "ami"          : "ami-0a2bf868f9c25cd7e",
                                    "instance_type": "t2.micro",
                                    "ip_address"   : "10.0.4.100",
                                    "name"         : "example-s4",
                                    "ssh_access"   : "true"                          
                                },
                                {   
                                    "id"           : "<string>",    
                                    "ami"          : "ami-0a2bf868f9c25cd7e",
                                    "instance_type": "t2.micro",
                                    "ip_address"   : "10.0.4.101",
                                    "name"         : "example2-s4",
                                    "ssh_access"   : "true"                          
                                }
                            ]
                        }
                    ],
                    "route_tables": [
                        {
                            "name": "table1",
                            "routes": [
                                {
                                    "name": "to_subnet3",
                                    "dest_cidr": "10.0.3.0/24"
                                }
                            ]
                        },
                        {
                            "name": "table2",
                            "routes": [
                                {
                                    "name": "to_subnet4",
                                    "dest_cidr": "10.0.4.0/24"
                                }
                            ]
                        }
                    ]
                }
            ]    
        }

        return data

    def copyKeys(self):

        with open(f'terraform/cloud/{self.cloud}/mykey', 'r') as file:
            filedata = file.read()
            file.close()

        with open('generated/mykey', 'w') as file:
            file.write(filedata)
            file.close()

        with open(f'terraform/cloud/{self.cloud}/mykey.pub', 'r') as file:
            filedata = file.read()
            file.close()

        with open('generated/mykey.pub', 'w') as file:
            file.write(filedata)
            file.close()    

        with open(f'terraform/cloud/{self.cloud}/key.tf', 'r') as file:
            filedata = file.read()
            file.close()

        with open('generated/key.tf', 'w') as file:
            file.write(filedata)
            file.close()            

    def copyVars(self):

        with open(f'terraform/cloud/{self.cloud}/vars.tf', 'r') as file:
            filedata = file.read()
            replaced = filedata.replace('[[REGION]]', 'us-east-2')
            file.close()

        with open('generated/vars.tf', 'w') as file:
            file.write(replaced)
            file.close()

    def setProvider(self):

        with open(f'terraform/cloud/{self.cloud}/provider.tf', 'r') as file:
            filedata = file.read()
            file.close()

        with open('generated/provider.tf', 'w') as file:
            file.write(filedata)
            file.close()

    def createInstances(self, instances, subnet):

        for instance in instances:

            with open(f'terraform/cloud/{self.cloud}/instance.tf', 'r') as file:
                filedata = file.read()
                replaced = filedata.replace('[[AMI]]', instance["ami"])
                replaced = replaced.replace('[[NAME]]', instance["name"])
                replaced = replaced.replace('[[IP_ADDRESS]]', instance["ip_address"])
                replaced = replaced.replace('[[SUBNET_NAME]]', subnet)
                file.close()

            with open('generated/instance.tf', 'a') as file:
                file.write(replaced+"\n")
                file.close()

    def createSubnets(self, subnets, vpc_name):
        
        for subnet in subnets:

            with open(f'terraform/cloud/{self.cloud}/subnet.tf', 'r') as file: 
                filedata = file.read()
                replaced = filedata.replace('[[NAME]]', subnet["name"])
                replaced = replaced.replace('[[CIDR]]', subnet["cidr_block"])
                replaced = replaced.replace('[[VPC_NAME]]', vpc_name)
                file.close()

            with open('generated/subnet.tf', 'a') as file: 
                file.write(replaced+"\n")
                file.close()

            #with open(f'terraform/cloud/{self.cloud}/routetableassociation.tf', 'r') as file:
            #    filedata = file.read()
            #    replaced = filedata.replace('[[NAME]]', subnet["name"] + "_routetable_association")
            #    replaced = replaced.replace('[[SUBNET_NAME]]', subnet["name"])
            #    replaced = replaced.replace('[[ROUTETABLE_NAME]]', subnet["route_table"])
            #    file.close()

            #with open('generated/routetableassociation.tf', 'a') as file:
            #    file.write(replaced+"\n")
            #    file.close()
            
            self.createInstances(subnet["instances"], subnet["name"])
            self.routing(subnet["name"], vpc_name, subnet["denied_cidrs"])

    def createVpcs(self, vpcs):
        
        for vpc in vpcs:
            with open(f'terraform/cloud/{self.cloud}/vpc.tf', 'r') as file: # READ VPC TEMPLATE
                filedata = file.read()
                replaced = filedata.replace('[[NAME]]', vpc["name"])
                replaced = replaced.replace('[[CIDR]]', vpc["cidr_block"])
                file.close()

            with open('generated/vpc.tf', 'a') as file: # WRITE VPC TF
                file.write(replaced+"\n")
                file.close()

            with open(f'terraform/cloud/{self.cloud}/securitygroup.tf', 'r') as file: # READ SECURITYGROUP TEMPLATE
                filedata = file.read()
                replaced = filedata.replace('[[VPC_NAME]]', vpc["name"])
                file.close()

            with open('generated/securitygroup.tf', 'w') as file: # WRITE SECURITYGROUP TF
                file.write(replaced+"\n")
                file.close()

            self.createSubnets(vpc["subnets"], vpc["name"])
            #self.createRouteTables(vpc["name"], vpc["route_tables"])

    def createRouteTables(self, vpc_name, route_tables):
        
        for route_table in route_tables:
            with open(f'terraform/cloud/{self.cloud}/routetable.tf', 'r') as file:
                filedata = file.read()
                replaced = filedata.replace('[[NAME]]', route_table["name"])
                replaced = replaced.replace('[[VPC_NAME]]', vpc_name)
                file.close()

            with open('generated/routetable.tf', 'a') as file:
                file.write(replaced+"\n")
                file.close()
            
            for route in route_table["routes"]:
                with open(f'terraform/cloud/{self.cloud}/route.tf', 'r') as file:
                    filedata = file.read()
                    replaced = filedata.replace('[[NAME]]', route["name"])
                    replaced = replaced.replace('[[ROUTETABLE_NAME]]', route_table["name"])
                    replaced = replaced.replace('[[DEST_CIDR]]', route["dest_cidr"])
                    file.close()

                with open('generated/route.tf', 'a') as file:
                    file.write(replaced+"\n")
                    file.close()

    def routing(self, subnet_name, vpc_name, denied_cidrs):
        rules = ""
        for cidr in denied_cidrs:
            rules+= f"""
                ingress {{
                    rule_no     = {self.rule_no}
                    protocol    = "-1"
                    action = "deny"
                    cidr_block  = "{cidr}"
                    from_port   = 0
                    to_port     = 0
                }}
            
            """
            self.rule_no+=10

        with open(f'terraform/cloud/{self.cloud}/nacl.tf', 'r') as file: 
                filedata = file.read()
                replaced = filedata.replace('[[NAME]]', subnet_name)
                replaced = replaced.replace('[[VPC_NAME]]', vpc_name)
                replaced = replaced.replace('[[SUBNET_NAME]]', subnet_name)
                replaced = replaced.replace('[[RULES]]', rules)
                file.close()

        with open('generated/nacl.tf', 'a') as file: 
            file.write(replaced+"\n")
            file.close()

        self.rule_no+=100
        
        
    
    def createTerraformCode(self, data):
        self.copyKeys()
        self.copyVars()
        self.setProvider()
        self.createVpcs(data["vpcs"])
        
    

