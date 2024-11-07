#create routes
from django.urls import path
from .views import web as views

app_name = 'reservations'


urlpatterns = [
    path(
        '', 
        views.events_list, 
        name='events_list'
    ),
    path(
        '<int:event_id>/floor-plan/', 
        views.floor_plan, 
        name='floor_plan'
    )
]