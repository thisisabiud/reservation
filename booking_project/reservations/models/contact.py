from datetime import timezone
from django.db import models
from django.db import transaction

from reservations.models.booking import Booking
from .choices import BoothStatus

class Contact(models.Model):
    company = models.CharField(max_length=200)
    contact = models.CharField(max_length=200)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company} - {self.contact}"

    def reserve_booths(self, booth_ids):
        """Reserve multiple booths for this contact"""
        from .booth import Booth  
        
        with transaction.atomic():
            booths = Booth.objects.select_for_update().filter(
                id__in=booth_ids,
                status=BoothStatus.AVAILABLE
            )
            
            if booths.count() != len(booth_ids):
                raise ValueError("Some booths are not available or don't exist")
            
            booths.update(
                reserved_by=self,
                status=BoothStatus.RESERVED
            )
            
            # Create booking records
            Booking.objects.bulk_create([
                Booking(booth=booth, contact=self)
                for booth in booths
            ])
            
            return booths

    def get_active_bookings(self):
        """Get all active bookings for this contact"""
        return self.bookings.filter(
            booth__event__end_date__gte=timezone.now()
        )
    

class Exhibitor(models.Model):
    company = models.ForeignKey("Contact", on_delete=models.CASCADE, related_name='exhibitors')
    event = models.ForeignKey('reservations.Event', on_delete=models.CASCADE, related_name='exhibitors')
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.company.company})"
    class Meta:
        ordering = ['name']
        verbose_name = 'Exhibitor'
        verbose_name_plural = 'Exhibitors'
        unique_together = [['event', 'company', 'name']]
        indexes = [
            models.Index(fields=['event', 'company']),
        ]