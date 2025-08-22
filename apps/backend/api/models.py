from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

# class Group(models.Model):
#     group_id    = models.AutoField(primary_key=True)
#     name        = models.CharField(max_length=20)
#     permissions = models.CharField(max_length=50) #POR DEFINIR

#     def __str__(self):
#         return self.name

# class User(models.Model):
#     user_id     = models.AutoField(primary_key=True)
#     first_name  = models.CharField(max_length=50)
#     last_name   = models.CharField(max_length=50)
#     password    = models.CharField(max_length=20)
#     username    = models.CharField(max_length=254, unique=True)
#     email       = models.EmailField()
#     last_login  = models.DateTimeField(default=timezone.now)
#     # group       = models.ManyToManyField(Group)
#     is_active   = models.BooleanField(default=False)
    
#     def __str__(self):
#         return self.name

class Component(models.Model):
    component_id = models.AutoField(primary_key=True)
    name         = models.CharField(max_length=50) 
    image        = models.ImageField()
    # position_x   = models.CharField(max_length=10)
    # position_y   = models.CharField(max_length=10)

    def __str__(self):
        return self.name

class Cloud(models.Model):
    cloud_id    = models.AutoField(primary_key=True)
    name        = models.CharField(max_length=50)
    parameters  = models.CharField(max_length=250)

    def __str__(self):
        return self.name

class Network(models.Model):
    network_id  = models.AutoField(primary_key=True)
    name        = models.CharField(max_length=50)
    # user        = models.ForeignKey(User, on_delete=models.CASCADE)
    cloud       = models.ForeignKey(Cloud, on_delete=models.CASCADE)

    def __str__(self):
        return self.name

class NetworkComponent(models.Model):
    network_component_id = models.AutoField(primary_key=True)
    network              = models.ForeignKey(Network, on_delete=models.CASCADE)
    component            = models.ForeignKey(Component, on_delete=models.CASCADE)
    position_x           = models.CharField(max_length=50)
    position_y           = models.CharField(max_length=50)
    mac_address          = models.CharField(max_length=50)
    
    def __str__(self):
        return self.network_component_id

class Interface(models.Model):
    interface_id      = models.AutoField(primary_key=True)
    name              = models.CharField(max_length=50)
    ip_address        = models.CharField(max_length=50)
    mask              = models.CharField(max_length=50)
    gateway           = models.CharField(max_length=50)
    network_component = models.ForeignKey(NetworkComponent, on_delete=models.CASCADE)

    def __str__(self):
        return self.name

class Router(Component):
    router_id        = models.AutoField(primary_key=True)
    operative_system = models.CharField(max_length=50)

    def __str__(self):
        return self.router_id

class Switch(Component):
    switch_id = models.AutoField(primary_key=True)

    def __str__(self):
            return self.switch_id

class Workstation(Component):
    workstation_id   = models.AutoField(primary_key=True)
    operative_system = models.CharField(max_length=50)

    def __str__(self):
        return self.workstation_id

class RoutingTable(models.Model):
    route_table_id = models.AutoField(primary_key=True)
    subnet_mask    = models.CharField(max_length=50)
    destination    = models.CharField(max_length=50) #Evaluar crear fk al router
    metric         = models.IntegerField()
    interface      = models.ForeignKey(Interface, on_delete=models.CASCADE)
    
    def __str__(self):
        return self.route_table_id