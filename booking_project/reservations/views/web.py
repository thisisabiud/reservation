from django.shortcuts import get_object_or_404, render, redirect
# from django.views.decorators.cache import cache_page
from django.contrib import messages
from django.db.models import Count, Q
from django.core.exceptions import ObjectDoesNotExist

from rest_framework.views import APIView

from reservations.models import Contact, Booking
from reservations.models.choices import BoothType
from reservations.serializers import BookingSerializer, BoothSerializer, ContactSerializer

from rest_framework.response import Response

from reservations.models import Event, Booth

from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger


def events_list(request):
    events = Event.objects.order_by('-start_date')
    per_page = 3  # Increased items per page for grid layout
    paginator = Paginator(events, per_page)

    page = request.GET.get('page', 1)
    try:
        events_page = paginator.page(page)
    except PageNotAnInteger:
        events_page = paginator.page(1)
    except EmptyPage:
        events_page = paginator.page(paginator.num_pages)

    # Add pagination info
    pagination_info = {
        'has_other_pages': events_page.has_other_pages(),
        'current_page': events_page.number,
        'total_pages': paginator.num_pages,
        'page_range': paginator.page_range,
        'has_previous': events_page.has_previous(),
        'has_next': events_page.has_next(),
        'previous_page': events_page.previous_page_number() if events_page.has_previous() else None,
        'next_page': events_page.next_page_number() if events_page.has_next() else None,
    }

    context = {
        'events': events_page,
        'pagination': pagination_info
    }
    return render(request, 'reservations/events_list.html', context)

# @cache_page(60 * 15)
def event_details(request, event_id):
    """
    Display event details with booth and exhibitor information.
    
    Args:
        request: HTTP request object
        event_id: ID of the event to display
    
    Returns:
        Rendered event details template with context
    """
    try:
        # Get event with prefetched booths
        event = get_object_or_404(Event.objects.prefetch_related('booths'), id=event_id)
        
        # Get booth statistics
        booth_stats = event.booths.aggregate(
            total_booths=Count('id'),
            standard_booths=Count('id', filter=Q(booth_type='standard')),
            premium_booths=Count('id', filter=Q(booth_type='premium')),
            available_booths=Count('id', filter=Q(status='available'))
        )
        
        context = {
            'event': event,
            'booth_stats': booth_stats,
            'booths': {
                'standard': event.booths.filter(booth_type=BoothType.STANDARD),
                'premium': event.booths.filter(booth_type=BoothType.PREMIUM)
            }
        }
        
        return render(request, 'reservations/event_details.html', context)
        
    except ObjectDoesNotExist:
        messages.error(request, 'Event not found.')
        return redirect('event_list')


def floor_plan(request, event_id):
    event = get_object_or_404(Event, id=event_id)
    booths = Booth.objects.filter(event=event)
    return render(request, 'reservations/floor_plan.html', {
        'event': event,
        'booths': booths
    })

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
import json

@require_http_methods(["POST"])
@csrf_protect
def book_booths(request):
    try:
        data = json.loads(request.body)
        booth_ids = data.get('booths', [])
        event_id = data.get('event_id')

        
        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


class BoothListAPIView(APIView):
    def get(self, request, event_id):
        event = get_object_or_404(Event, id=event_id)
        booths = Booth.objects.filter(event=event)
        serializer = BoothSerializer(booths, many=True)
        return Response(serializer.data)

class BoothDetailUpdateAPIView(APIView):
    def get(self, request, event_id, booth_id):
        event = get_object_or_404(Event, id=event_id)
        booth = get_object_or_404(Booth, event=event, id=booth_id)
        serializer = BoothSerializer(booth)
        return Response(serializer.data)

    def patch(self, request, event_id, booth_id):
        event = get_object_or_404(Event, id=event_id)
        booth = get_object_or_404(Booth, event=event, id=booth_id)
        serializer = BoothSerializer(booth, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class ContactView(APIView):
    def get(self, request):
        contacts = Contact.objects.all()
        serializer = ContactSerializer(contacts, many=True)
        return Response(serializer.data)
    
class BookingListView(APIView):
    def get(self, request):
        bookings = Booking.objects.filter(booth__event__id=request.query_params.get('event_id'))
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)

class BookingView(APIView):
    def post(self, request):
        serializer = BookingSerializer(data=request.data, context={'event_id': request.data.get('event_id')})
        if serializer.is_valid():
            booking = serializer.save()
            return Response(BookingSerializer(booking).data, status=201)
        return Response(serializer.errors, status=400)
