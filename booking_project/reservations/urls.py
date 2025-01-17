#create routes
from django.urls import path
from .views import web as views
from .views.api import BookingAPIView, BoothFloorMapView, EventAPIView

app_name = 'reservations'


urlpatterns = [
    path(
        '', 
        views.events_list, 
        name='events_list'
    ),
    path(
        '<int:event_id>', 
        views.event_details, 
        name='event_details'
    ),
    path(
        '<int:event_id>/floor-plan', 
        views.floor_plan, 
        name='floor_plan'
    ),
    path(
        'orders/',
        views.orders_list,
        name='orders_list'
    ),
    path(
        'order/<int:order_id>/receipt/', 
        views.generate_receipt, 
        name='view_receipt'
    ),
    path(
        'order/<int:order_id>/receipt/download/',
        views.generate_receipt, 
        name='download_receipt'
    ),
    path(
        'api/booking/',
        BookingAPIView.as_view(),
        name='booking_create'
    ),
    path(
        'api/events/<int:event_id>/',
        EventAPIView.as_view(),
        name='event_details_api'
    ),
    path(
        'api/booths',
        BoothFloorMapView.as_view(),
        name='event_booths'
    ),
]