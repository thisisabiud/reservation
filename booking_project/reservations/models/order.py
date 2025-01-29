from django.db import models
from django.utils import timezone
from django.db.models import Max, Sum

from reservations.models.choices import BoothStatus, OrderStatus, PaymentMethod


class Order(models.Model):
    session_key = models.CharField(max_length=50, null=True, blank=True)
    order_number = models.CharField(max_length=50, unique=True)
    contact = models.ForeignKey(
        "reservations.Contact",
        on_delete=models.PROTECT,
        related_name='orders'
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['order_number'],
                name='unique_order_number'
            )
        ]

    def __str__(self):
        return f"Order {self.order_number} - {self.contact.company} ({self.contact.contact})"

    @property
    def total_price(self):
        """
        Calculate the total price of all items in the order.
        Returns 0 if no items exist.
        """
        return self.items.aggregate(Sum('price'))['price__sum'] or 0

    def delete(self, *args, **kwargs):
        for item in self.items.all():
            booth = item.booth
            booth.status = BoothStatus.AVAILABLE
            booth.save()
        
        super().delete(*args, **kwargs)
        
    def save(self, *args, **kwargs):
        if not self.order_number:
            # Get current datetime
            now = timezone.now()
            date_str = now.strftime("%Y%m%d")
            time_str = now.strftime("%H%M")
            
            # Find the last order number for today
            today_start = timezone.now().replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            last_order = Order.objects.filter(
                created_at__gte=today_start
            ).order_by('-order_number').first()
            
            # Extract sequence from last order number or start from 1
            if last_order and last_order.order_number:
                last_sequence = int(last_order.order_number.split('-')[-1])
                sequence = str(last_sequence + 1).zfill(5)
            else:
                sequence = '00001'
            
            # Generate order number
            self.order_number = f"ORD-{date_str}-{time_str}-{sequence}"
                
        if self.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
            new_status = BoothStatus.RESERVED if self.status == OrderStatus.COMPLETED else BoothStatus.AVAILABLE
            for item in self.items.all():
                booth = item.booth
                booth.status = new_status
                booth.save()
         
                
        super().save(*args, **kwargs)





class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    booth = models.ForeignKey('Booth', on_delete=models.PROTECT, related_name='order_items')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    exhibitor_names = models.CharField(max_length=1000, null=True, blank=True) 
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.pk:  # New order item
            # Handle exhibitor names if passed as list
            if isinstance(self.exhibitor_names, (list, tuple)):
                self.exhibitor_names = ', '.join(filter(None, self.exhibitor_names))
            # Clean any extra whitespace
            self.exhibitor_names = ', '.join(
                name.strip() for name in self.exhibitor_names.split(',') if name.strip()
            )
            self.price = self.booth.price
            self.booth.status = BoothStatus.PROCESSING
            self.booth.save()
        
        super().save(*args, **kwargs)

    @property
    def exhibitors_list(self):
        """Return exhibitor names as a list"""
        return [name.strip() for name in self.exhibitor_names.split(',') if name.strip()]

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Booth {self.booth.booth_number} - {self.exhibitor_names}"