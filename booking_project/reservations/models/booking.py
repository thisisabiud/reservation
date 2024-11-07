from django.utils import timezone
from django.db import models

class Booking(models.Model):
    booth = models.ForeignKey('reservations.Booth', on_delete=models.CASCADE, related_name='bookings')
    contact = models.ForeignKey('reservations.Contact', on_delete=models.CASCADE, related_name='bookings')
    is_confirmed = models.BooleanField(default=False)
    confirmation_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('booth', 'contact')

    def __str__(self):
        return f"{self.contact} booked {self.booth}"

    @property
    def event(self):
        return self.booth.event

    def save(self, *args, **kwargs):
        if self.is_confirmed:
            if not self.confirmation_date:
                self.confirmation_date = timezone.now()
        else:
            self.confirmation_date = None
        super().save(*args, **kwargs)
