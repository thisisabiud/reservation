from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.utils import timezone
from reservations.models import Booth, Contact, Booking
from reservations.serializers import BoothSerializer, ContactSerializer, BookingSerializer

class BoothViewSet(viewsets.ModelViewSet):
    queryset = Booth.objects.all()
    serializer_class = BoothSerializer

    def get_queryset(self):
        event_id = self.request.query_params.get('event_id')
        if event_id:
            return self.queryset.filter(event_id=event_id)
        return self.queryset

    @action(detail=False, methods=['get'])
    def floor_map(self, request):
        """Return booth data formatted for floor map display"""
        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response({"error": "event_id is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)

        booths = self.get_queryset().select_related('reserved_by')
        
        data = []
        for booth in booths:
            booth_data = {
                'booth_number': booth.booth_number,
                'booth_type': booth.booth_type,
                'status': booth.status,
                'price': booth.price,
                'reservation_info': None
            }
            
            if booth.reserved_by:
                booth_data['reservation_info'] = {
                    'company': booth.reserved_by.company,
                    'contact': booth.reserved_by.contact,
                    'reservation_date': booth.booking_set.first().confirmation_date
                }
            
            data.append(booth_data)
        
        return Response(data)

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # Extract booth IDs and contact information
        booths = request.data.get('booths', [])
        contact_data = {
            'company': request.data.get('company'),
            'contact': request.data.get('contact'),
            'email': request.data.get('email'),
            'phone': request.data.get('phone')
        }

        # Create or get contact
        contact, _ = Contact.objects.get_or_create(
            email=contact_data['email'],
            defaults=contact_data
        )

        bookings = []
        for booth_id in booths:
            booth = Booth.objects.get(id=booth_id)
            
            # Check if booth is available
            if booth.status != 'available':
                return Response(
                    {'error': f'Booth {booth.number} is not available'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create booking
            booking_data = {
                'booth': booth,
                'contact': contact,
                'status': 'pending'
            }
            
            booking = Booking.objects.create(**booking_data)
            
            # Update booth status
            booth.status = 'reserved'
            booth.save()
            
            bookings.append(booking)

        return Response({
            'bookings': BookingSerializer(bookings, many=True).data,
            'message': 'Bookings created successfully'
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        booking = self.get_object()
        if booking.status == 'pending':
            booking.is_confirmed = True
            booking.save()
            return Response({'status': 'success'})
        return Response(
            {'error': 'Booking cannot be confirmed'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.status != 'confirmed':
            booking.status = 'cancelled'
            booking.booth.status = 'available'
            booking.booth.save()
            booking.save()
            return Response({'status': 'success'})
        return Response(
            {'error': 'Confirmed bookings cannot be cancelled'},
            status=status.HTTP_400_BAD_REQUEST
        )