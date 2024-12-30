from django.db import models

class BoothStatus(models.TextChoices):
    """Status of a booth in the event"""
    AVAILABLE = 'available', 'Available'
    RESERVED = 'reserved', 'Reserved'
    PROCESSING = 'processing', 'Processing'

class BoothType(models.TextChoices):
    """Type of booth in the event"""
    PREMIUM = 'premium', 'Premium'
    STANDARD = 'standard', 'Standard'