from django.db import models


class Contact(models.Model):
    company = models.CharField(max_length=200)
    contact = models.CharField(max_length=200)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company} - {self.contact}"

