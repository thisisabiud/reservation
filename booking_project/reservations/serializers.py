from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from .models import Booth, Contact, Booking
from .models.choices import BoothStatus

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'company', 'contact', 'email', 'phone']
        read_only_fields = ['id']

class BoothSerializer(serializers.ModelSerializer):
    reservation_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Booth
        fields = [
            'id', 'booth_number', 'booth_type', 'status',
            'price', 'reserved_by', 'reservation_info'
        ]
        read_only_fields = ['id', 'reserved_by', 'reservation_info']
    
    def get_reservation_info(self, obj):
        if obj.status == BoothStatus.RESERVED and obj.reserved_by:
            return {
                'company_name': obj.reserved_by.company,
                'contact_person': obj.reserved_by.contact,
                'email': obj.reserved_by.email,
                'phone': obj.reserved_by.phone
            }
        return None

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
