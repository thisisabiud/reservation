from django.shortcuts import get_object_or_404
from reservations.models.choices import BoothStatus
from rest_framework import viewsets, status
from django.db.models import Q
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db import transaction
from django.utils import timezone
from reservations.models import Booth, Contact, Booking, Event
from reservations.models.contact import Exhibitor
from reservations.serializers import BoothSerializer, ContactSerializer, BookingSerializer, EventSerializer


class EventSearchAPIView(APIView):
    def get(self, request, *args, **kwargs):
        query = request.query_params.get('q', '')
        events = Event.objects.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(location__icontains=query)
        )
        serializer = EventSerializer(events, many=True)
        return Response(serializer.data)

class BookingAPIView(APIView):
    def post(self, request, *args, **kwargs):
        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response({"error": "event_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        data = request.data
        selected_booths = data.get('booths')
        exhibitors_data = data.get('exhibitors', [])  # Get exhibitors array from request
        
        contact_data = {
            'company': data.get('company'),
            'contact': data.get('contact'),
            'email': data.get('email'),
            'phone': data.get('phone')
        }
        
        contact_serializer = ContactSerializer(data=contact_data)
        if not contact_serializer.is_valid():
            return Response(contact_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Create or get contact
            contact, created = Contact.objects.get_or_create(
                email=contact_data['email'],
                defaults=contact_data
            )

            # Check booth availability
            booths = Booth.objects.select_for_update().filter(
                event_id=event_id,
                id__in=selected_booths,
                status=BoothStatus.AVAILABLE
            )
            if booths.count() != len(selected_booths):
                return Response({"error": "One or more booths are not available"}, status=status.HTTP_400_BAD_REQUEST)

            # Create bookings
            bookings = []
            for booth in booths:
                booth.status = BoothStatus.PROCESSING
                booth.reserved_by = contact
                booth.save()

                booking = Booking(
                    booth=booth,
                    contact=contact,
                    is_confirmed=False,
                    confirmation_date=None
                )
                bookings.append(booking)

            # Bulk create bookings
            Booking.objects.bulk_create(bookings)

            # Create exhibitors
            exhibitors = []
            for exhibitor_name in exhibitors_data:
                exhibitor = Exhibitor(
                    company=contact,
                    event_id=event_id,
                    name=exhibitor_name
                )
                exhibitors.append(exhibitor)

            # Bulk create exhibitors if there are any
            if exhibitors:
                Exhibitor.objects.bulk_create(exhibitors)

        redirection_url = f"/{event_id}/floor-plan"
        return Response({
            "bookings": BookingSerializer(bookings, many=True).data,
            "redirection_url": redirection_url
        }, status=status.HTTP_201_CREATED)

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

        booths = Booth.objects.filter(event_id=event_id)
        
        data = []
        for booth in booths:
            booth_data = {
                'booth_number': booth.booth_number,
                'booth_type': booth.booth_type,
                'status': booth.status,
                'price': booth.price,
            }            
            data.append(booth_data)
        
        return Response(data)


class BoothFloorMapView(APIView):
    """API View for booth floor map data"""
    
    def get(self, request):
        # Get query parameters
        event_id = request.query_params.get('event_id')
        booth_type = request.query_params.get('booth_type')

        # Validate event_id
        if not event_id:
            return Response(
                {"error": "event_id is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get event or return 404
        event = get_object_or_404(Event, id=event_id)

        # Filter booths
        booths = Booth.objects.filter(event=event)
        if booth_type and booth_type in ['standard', 'premium']:
            booths = booths.filter(booth_type=booth_type)

        # Serialize data
        serializer = BoothSerializer(booths, many=True)
        
        return Response(serializer.data)

    def post(self, request):
        return Response(
            {"error": "Method not allowed"}, 
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
