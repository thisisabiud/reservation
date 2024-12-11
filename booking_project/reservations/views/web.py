from django.shortcuts import get_object_or_404, render

from rest_framework.views import APIView

from reservations.models import Contact, Booking
from reservations.serializers import BookingSerializer, BoothSerializer, ContactSerializer

from rest_framework.response import Response

from reservations.models import Event, Booth

from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger


def events_list(request):
    events = Event.objects.order_by('-start_date')
    paginator = Paginator(events, 3) 

    page = request.GET.get('page')
    try:
        events_page = paginator.page(page)
    except PageNotAnInteger:
        events_page = paginator.page(1)
    except EmptyPage:
        events_page = paginator.page(paginator.num_pages)

    context = {'events': events_page}
    return render(request, 'reservations/events_list.html', context)




def floor_plan(request, event_id):
    event = get_object_or_404(Event, id=event_id)
    booths = Booth.objects.filter(event=event)
    return render(request, 'reservations/floor_plan.html', {
        'event': event,
        'booths': booths
    })
    # return render(request, 'reservations/floor.html',)

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
        
        # Add your booking logic here
        # Update booth statuses in database
        # Create reservation records
        # Send confirmation emails, etc.
        
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

