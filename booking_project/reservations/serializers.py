from rest_framework import serializers
from django.utils import timezone
from django.db import transaction

from reservations.models.event import PaymentMethod
from .models import Booth, Contact, Booking, Event
from .models.choices import BoothStatus


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
    
   

class BookingSerializer(serializers.ModelSerializer):
    contact = ContactSerializer()
    selected_booths = serializers.ListField(
        child=serializers.CharField(),
        write_only=True
    )

    class Meta:
        model = Booking
        fields = [
            'id', 'booth', 'contact', 'is_confirmed',
            'confirmation_date', 'selected_booths'
        ]
        read_only_fields = ['is_confirmed', 'confirmation_date']
