from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from .models import Booth, Contact, Booking, Event
from .models.choices import BoothStatus

class EventSerializer(serializers.ModelSerializer):
    is_ongoing = serializers.ReadOnlyField()
    available_booths = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'start_date', 'end_date',
            'location', 'is_active', 'image', 'created_at', 'updated_at',
            'is_ongoing', 'available_booths'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_ongoing', 'available_booths']

    def get_available_booths(self, obj):
        return obj.available_booths().count()

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
