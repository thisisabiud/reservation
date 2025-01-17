from django.db import models
from django.utils import timezone
from reservations.models.choices import BoothStatus

class Event(models.Model):
    title = models.CharField(max_length=200)
    standard_features = models.TextField(
        null=True, 
        blank=True,
        help_text="Enter standard features, separated by commas (e.g., 'WiFi, Table, Chairs')"
    )
    premium_features = models.TextField(
        null=True, 
        blank=True,
        help_text="Enter premium features, separated by commas (e.g., 'WiFi, VIP Table, Premium Chairs')"
    )
    description = models.TextField(null=True, blank=True)
    standard_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    premium_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    location = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    image = models.ImageField(upload_to='event_images/', null=True, blank=True)
    floor_plan_standard = models.ImageField(upload_to='floor_plans/', null=True, blank=True)
    floor_plan_premium = models.ImageField(upload_to='floor_plans/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    @property
    def get_standard_features(self):
        return [feature.strip() for feature in (self.standard_features or '').split(',') if feature.strip()]
    
    @property
    def get_premium_features(self):
        return [feature.strip() for feature in (self.premium_features or '').split(',') if feature.strip()]
    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-start_date']
        verbose_name_plural = 'events'

    @property
    def is_ongoing(self):
        now = timezone.now()
        return self.start_date <= now <= self.end_date

    def get_absolute_url(self):
        from django.urls import reverse
        return reverse('event-detail', args=[self.pk])

    def available_booths(self):
        """Get all available booths for this event"""
        return self.booths.filter(status=BoothStatus.AVAILABLE)

class PaymentMethod(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='payment_methods')
    name = models.CharField(max_length=200)
    number = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
