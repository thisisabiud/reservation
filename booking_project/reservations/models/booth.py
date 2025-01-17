from django.db import models
from django.core.exceptions import ValidationError
from .choices import BoothStatus, BoothType


class Booth(models.Model):
    event = models.ForeignKey('reservations.Event', on_delete=models.CASCADE, related_name='booths')
    booth_number = models.CharField(max_length=10)
    # price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    booth_type = models.CharField(
        max_length=20,
        choices=BoothType.choices,
        default=BoothType.STANDARD
    )
    status = models.CharField(
        max_length=20,
        choices=BoothStatus.choices,
        default=BoothStatus.AVAILABLE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def price(self):
        if self.booth_type == BoothType.STANDARD:
            return self.event.standard_price
        elif self.booth_type == BoothType.PREMIUM:
            return self.event.premium_price
    class Meta:
        unique_together = ('event', 'booth_number')
        ordering = ['event', 'booth_number']

    def __str__(self):
        return f"{self.event.title} - Booth {self.booth_number}"

    @property
    def is_available(self):
        return self.status == BoothStatus.AVAILABLE