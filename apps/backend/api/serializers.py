from rest_framework import serializers
from .models import Cloud, Network, NetworkComponent, Component, Interface, Router, Switch, Workstation, RoutingTable
# from .models import User, Cloud, Network, NetworkComponent, Component, Interface, Router, Switch, Workstation, RoutingTable

# class GroupSerializer (serializers.HyperlinkedModelSerializer):
#     class Meta:
#         model = Group
#         fields = '__all__'

# class UserSerializer (serializers.HyperlinkedModelSerializer):
#     # group = GroupSerializer(many=True)
#     class Meta:
#         model = User
#         fields = '__all__' 

class ComponentSerializer (serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Component
        fields = '__all__'

class CloudSerializer (serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Cloud
        fields = '__all__'

class NetworkSerializer (serializers.ModelSerializer):
    class Meta:
        model = Network
        allowed_methods = ['get', 'post', 'delete', 'put']
        fields = '__all__'

class NetworkComponentSerializer (serializers.HyperlinkedModelSerializer):
    class Meta:
        model = NetworkComponent
        fields = '__all__'

class InterfaceSerializer (serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Interface
        fields = '__all__'

class RouterSerializer (serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Router
        fields = '__all__'

class SwitchSerializer (serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Switch
        fields = '__all__'

class WorkstationSerializer (serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Workstation
        fields = '__all__'

class RoutingTableSerializer (serializers.HyperlinkedModelSerializer):
    class Meta:
        model = RoutingTable
        fields = '__all__'