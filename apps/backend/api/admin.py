from django.contrib import admin
from django.contrib import admin
from .models import Component, Cloud, Network, NetworkComponent, Interface, Router, Switch, Workstation, RoutingTable
# from .models import  User, Component, Cloud, Network, NetworkComponent, Interface, Router, Switch, Workstation, RoutingTable


# admin.site.register(User)
admin.site.register(Component)
admin.site.register(Cloud)
admin.site.register(Network)
admin.site.register(NetworkComponent)
admin.site.register(Interface)
admin.site.register(Router)
admin.site.register(Switch)
admin.site.register(Workstation)
admin.site.register(RoutingTable)
