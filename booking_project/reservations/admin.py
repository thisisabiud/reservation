# reservations/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from reservations.models import Booking, Contact, Booth, Event
from reservations.models.choices import BoothStatus
from reservations.models.contact import Exhibitor
from reservations.models.event import PaymentMethod
from reservations.models.order import Order, OrderItem


@admin.register(PaymentMethod)
class PaymentMethodsAdmin(admin.ModelAdmin):
    list_display = ('name', 'number', 'created_at')
    list_filter = ('created_at', 'event')
    search_fields = ('name', 'number')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'

class PaymentMethodInline(admin.TabularInline):
    model = PaymentMethod
    extra = 1
    
@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('company', 'contact', 'email', 'phone', 'created_at', 'total_bookings')
    list_filter = ('created_at', 'company')
    search_fields = ('company', 'contact', 'email', 'phone')
    readonly_fields = ('created_at',)
    
    def total_bookings(self, obj):
        return obj.bookings.count()
    total_bookings.short_description = 'Total Bookings'

class BookingInline(admin.TabularInline):
    model = Booking
    extra = 0
    readonly_fields = ('created_at',)
    can_delete = True
    show_change_link = True

class BoothInline(admin.TabularInline):
    model = Booth
    extra = 1
    fields = ('booth_number', 'booth_type', 'status')
    #raw_id_fields = ('reserved_by',)
    show_change_link = True

@admin.register(Booth)
class BoothAdmin(admin.ModelAdmin):
    
    @admin.action(description='Mark selected booths as available')
    def mark_as_available(self, request, queryset):
        queryset.update(status=BoothStatus.AVAILABLE)
    
    @admin.action(description='Mark selected booths as standard')
    def mark_as_standard(self, request, queryset):
        queryset.update(booth_type='standard')
        
    @admin.action(description='Mark selected booths as premium')
    def mark_as_premium(self, request, queryset):
        queryset.update(booth_type='premium')
    
    actions = [mark_as_available, mark_as_standard, mark_as_premium]

    list_display = ('booth_number', 'booth_type', 'status', 'created_at')
    list_filter = ('status', 'booth_type', 'event')
    search_fields = ('booth_number', 'event__title')
    readonly_fields = ('created_at', 'updated_at')
    list_select_related = ('event',)
    
    # def event_link(self, obj):
    #     url = reverse('admin:reservations_event_change', args=[obj.event.id])
    #     return format_html('<a href="{}">{}</a>', url, obj.event.title)
    # event_link.short_description = 'Event'

from django.contrib import admin

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'booth_info', 'contact_info', 'is_confirmed', 'confirmation_date','booth__status','created_at')
    list_filter = ('created_at', 'booth__event', 'booth__status', 'is_confirmed')
    search_fields = ('booth__booth_number', 'contact__company', 'contact__email')
    raw_id_fields = ('booth', 'contact')
    list_editable = ('is_confirmed',)
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at')

    def booth_info(self, obj):
        return f"{obj.booth.event.title} - Booth {obj.booth.booth_number}"
    booth_info.short_description = 'Booth'

    def contact_info(self, obj):
        return f"{obj.contact.company} ({obj.contact.contact})"
    contact_info.short_description = 'Contact'

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    
    list_display = ('title', 'start_date', 'end_date', 'location', 'is_active', 'total_booths', 'available_booths')
    list_filter = ('is_active', 'start_date', 'location')
    search_fields = ('title', 'description', 'location')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [PaymentMethodInline,BoothInline]
    date_hierarchy = 'start_date'
    
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'image', 'floor_plan_standard', 'floor_plan_premium')
        }),
        ('Booth Details', {
            'fields': ('standard_price', 'premium_price')
        }),
        ('Event Details', {
            'fields': ('start_date', 'end_date', 'location', 'is_active')
        }),
        ('System Fields', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def total_booths(self, obj):
        return obj.booths.count()
    total_booths.short_description = 'Total Booths'
    
    def available_booths(self, obj):
        return obj.booths.filter(status='available').count()
    available_booths.short_description = 'Available Booths'
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('booths')

@admin.register(Exhibitor)
class ExhibitorAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'event', 'created_at')
    list_filter = ('event', 'created_at')
    search_fields = ('name', 'company__company')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'



@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    pass

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    readonly_fields = ('order_number', 'session_key')
    list_display = ('order_number', 'contact', 'status', 'payment_method', 'created_at')
    search_fields = ('order_number', 'contact__company', 'contact__email')
    list_filter = ('status', 'payment_method', 'created_at')

    def has_add_permission(self, request):
        return True  # Allow adding new orders

    def get_fields(self, request, obj=None):
        fields = super().get_fields(request, obj)
        if obj is None:  # If adding new order
            # Remove readonly fields when adding new order
            return [f for f in fields if f not in self.readonly_fields]
        return fields

