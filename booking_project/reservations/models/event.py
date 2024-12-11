from django.db import models
from django.utils import timezone
from reservations.models.choices import BoothStatus

class Event(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    location = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    image = models.ImageField(upload_to='event_images/', null=True, blank=True)  #
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
