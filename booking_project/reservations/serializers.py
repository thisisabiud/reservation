from rest_framework import serializers

from .models.choices import BoothStatus
from .models import Booth, Contact, Booking
from django.utils import timezone
from django.db import transaction
class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'company', 'contact', 'email', 'phone']
        read_only_fields = ['id']

class ReservationInfoSerializer(serializers.Serializer):
    company = serializers.CharField()
    contact = serializers.CharField()
    reservation_date = serializers.DateTimeField()

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
        """
        Returns reservation details if the booth is reserved.
        """
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

    def create(self, validated_data):
        selected_booths = validated_data.pop('selected_booths')
        contact_data = validated_data.pop('contact')
        
        with transaction.atomic():
            # Create or get contact
            contact, _ = Contact.objects.get_or_create(
                email=contact_data['email'],
                defaults=contact_data
            )

            bookings = []
            for booth_number in selected_booths:
                try:
                    booth = Booth.objects.select_for_update().get(
                        event_id=self.context['event_id'],
                        booth_number=booth_number,
                        status='AVAILABLE'
                    )
                    
                    booth.status = 'RESERVED'
                    booth.reserved_by = contact
                    booth.save()
                    
                    booking = Booking.objects.create(
                        booth=booth,
                        contact=contact,
                        is_confirmed=True,
                        confirmation_date=timezone.now()
                    )
                    bookings.append(booking)
                    
                except Booth.DoesNotExist:
                    raise serializers.ValidationError(
                        f"Booth {booth_number} is not available"
                    )

            return bookings[0] if bookings else None
