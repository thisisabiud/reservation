from django.http import HttpResponse
from django.shortcuts import get_object_or_404, render, redirect
from django.template.loader import get_template
from django.contrib import messages
from weasyprint import HTML
from django.db.models import Count, Q
from django.core.exceptions import ObjectDoesNotExist



from reservations.models.choices import BoothType
from reservations.models.order import Order


from reservations.models import Event, Booth

from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger



def custom_404(request, exception):
    return render(request, 'reservations/page_not_found.html', status=404)

def custom_error(request):
    return render(request, 'reservations/error.html', {
        'error_title': 'Server Error',
        'error_message': 'Something went wrong on our end.'
    }, status=500)

def custom_403(request, exception):
    return render(request, 'reservations/error.html', {
        'error_title': 'Access Denied',
        'error_message': 'You don\'t have permission to access this page.'
    }, status=403)

def orders_list(request):
    if not request.session.session_key:
        request.session.create()
    orders = Order.objects.filter(session_key=request.session.session_key)
    return render(request, 'reservations/orders_list.html', {'orders': orders})


def generate_receipt(request, order_id):
    order = get_object_or_404(Order, id=order_id)
    items = order.items.all()
    
    # Collect distinct exhibitor names
    exhibitors_set = set()
    for item in items:
        exhibitors_set.update(item.exhibitors_list)
    
    # Convert set to sorted list
    distinct_exhibitors = sorted(exhibitors_set)
    
    template_path = 'reservations/receipt_template.html'
    context = {
        'order': order,
        'items': items,
        'exhibitors': distinct_exhibitors
    }
    
    template = get_template(template_path)
    html = template.render(context)
    
    if 'download' in request.GET:
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="receipt_{order.order_number}.pdf"'
        HTML(string=html).write_pdf(response)
        return response
    else:
        return HttpResponse(html)

def events_list(request):
    if not request.user:
        return render(request, 'reservations/error.html', {
            'error_title': 'Access Denied',
            'error_message': 'Only administrators can access this page.',
            'error_details': 'Please contact your administrator if you need access.'
        }, status=403)
    
    try:
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
    except Exception as e:
        return render(request, 'reservations/error.html', {
            'error_title': 'Server Error',
            'error_message': 'An error occurred while processing your request.',
            'error_details': str(e)
        }, status=500)

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
            available_standard=Count('id', filter=Q(booth_type='standard') & Q(status='available')),
            available_premium=Count('id', filter=Q(booth_type='premium') & Q(status='available'))
        )
        
        context = {
            'event': event,
            'booth_stats': booth_stats,
            'booths': {
                'standard': event.booths.filter(booth_type=BoothType.STANDARD),
                'premium': event.booths.filter(booth_type=BoothType.PREMIUM)
            }
        }

        print(f"Standard features: {', '.join(event.get_standard_features)}")
        print(f"Premium features: {', '.join(event.get_premium_features)}")
        
        return render(request, 'reservations/event_details.html', context)
        
    except ObjectDoesNotExist:
        messages.error(request, 'Event not found.')
        return redirect('event_list')


def floor_plan(request, event_id):
    # Create a new session key if it doesn't exist
    if not request.session.session_key:
        request.session.create()
    
    orders = Order.objects.filter(session_key=request.session.session_key)
    event = get_object_or_404(Event, id=event_id)
    booths = Booth.objects.filter(event=event)
    return render(request, 'reservations/floor_plan.html', {
        'event': event,
        'booths': booths,
        'orders': orders
    })
