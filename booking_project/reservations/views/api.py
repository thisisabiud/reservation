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
# # class BookingAPIView(APIView): 
# #     def post(self, request, *args, **kwargs): 
# #         serializer = BookingSerializer(data=request.data, context={'event_id': kwargs['event_id']}) 
# #         if serializer.is_valid(): 
# #             serializer.save() 
# #             return Response(serializer.data, status=status.HTTP_201_CREATED) 
# #         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# # class BookingAPIView(APIView): 
# #     def post(self, request, *args, **kwargs): 
# #         event_id = request.query_params.get('event_id') 
# #         if not event_id: 
# #             return Response({"error": "event_id is required"}, status=status.HTTP_400_BAD_REQUEST) 
# #         serializer = BookingSerializer(data=request.data, context={'event_id': event_id}) 
# #         if serializer.is_valid(): 
# #             serializer.save() 
# #             return Response(serializer.data, status=status.HTTP_201_CREATED) 
# #         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# class BookingViewSet(viewsets.ModelViewSet):

#     queryset = Booking.objects.all()
#     serializer_class = BookingSerializer

#     @transaction.atomic
#     def create(self, request, *args, **kwargs):
#         # Extract booth IDs and contact information
#         booths = request.data.get('booths', [])
#         contact_data = {
#             'company': request.data.get('company'),
#             'contact': request.data.get('contact'),
#             'email': request.data.get('email'),
#             'phone': request.data.get('phone')
#         }

#         # Create or get contact
#         contact, _ = Contact.objects.get_or_create(
#             email=contact_data['email'],
#             defaults=contact_data
#         )

#         bookings = []
#         for booth_id in booths:
#             booth = Booth.objects.get(booth_id)
#             print(booth)
            
#             # Check if booth is available
#             if booth.status != 'available':
#                 return Response(
#                     {'error': f'Booth {booth.number} is not available'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#             # Create booking
#             booking_data = {
#                 'booth': booth,
#                 'contact': contact,
#                 'is_confirmed' : False,
#                 'confirmation_date' : timezone.now()
#             }
            
#             booking = Booking.objects.create(**booking_data)
            
#             # Update booth status
#             booth.status = 'reserved'
#             booth.save()
            
#             bookings.append(booking)

#         return Response({
#             'bookings': BookingSerializer(bookings, many=True).data,
#             'message': 'Bookings created successfully'
#         }, status=status.HTTP_201_CREATED)

#     @action(detail=True, methods=['post'])
#     def confirm(self, request, pk=None):
#         booking = self.get_object()
#         if booking.status == 'pending':
#             booking.is_confirmed = True
#             booking.save()
#             return Response({'status': 'success'})
#         return Response(
#             {'error': 'Booking cannot be confirmed'},
#             status=status.HTTP_400_BAD_REQUEST
#         )

#     @action(detail=True, methods=['post'])
#     def cancel(self, request, pk=None):
#         booking = self.get_object()
#         if booking.status != 'confirmed':
#             booking.status = 'cancelled'
#             booking.booth.status = 'available'
#             booking.booth.save()
#             booking.save()
#             return Response({'status': 'success'})
#         return Response(
#             {'error': 'Confirmed bookings cannot be cancelled'},
#             status=status.HTTP_400_BAD_REQUEST
#         )