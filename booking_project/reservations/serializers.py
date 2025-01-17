from rest_framework import serializers

from reservations.models.event import PaymentMethod
from .models import Booth, Contact, Event


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ['id', 'name', 'number']
        read_only_fields = ['id']

class EventSerializer(serializers.ModelSerializer):
    payment_methods = PaymentMethodSerializer(many=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'payment_methods'
        ]
        read_only_fields = ['id', 'title', 'payment_methods']


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'company', 'contact', 'email', 'phone']
        read_only_fields = ['id']

class BoothSerializer(serializers.ModelSerializer):
    # reservation_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Booth
        fields = [
            'id', 'booth_number', 'booth_type', 'status',
            'price'
        ]
        read_only_fields = ['id']
    
   
