from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random
from reservations.models import Event, Booth, Contact, Booking, BoothType, BoothStatus

class Command(BaseCommand):
    help = 'Creates test data for events, booths, contacts, and bookings'

    def handle(self, *args, **options):
        self.stdout.write('Creating test data...')
        
        # Clear existing data
        self.stdout.write('Clearing existing data...')
        Booking.objects.all().delete()
        Booth.objects.all().delete()
        Contact.objects.all().delete()
        Event.objects.all().delete()

        # Create events
        events = [
            {
                'title': 'Tech Summit 2024',
                'description': 'Annual technology conference featuring the latest innovations',
                'location': 'Silicon Valley Convention Center',
                'days': 3
            },
            {
                'title': 'Green Energy Expo',
                'description': 'Sustainable energy solutions showcase',
                'location': 'Renewable Energy Complex',
                'days': 2
            },
            {
                'title': 'Digital Marketing Conference',
                'description': 'Latest trends in digital marketing and SEO',
                'location': 'Marketing Hub',
                'days': 2
            },
            {
                'title': 'Healthcare Innovation Forum',
                'description': 'Medical technology and healthcare solutions',
                'location': 'Medical Sciences Center',
                'days': 4
            },
            {
                'title': 'Startup Showcase 2024',
                'description': 'Platform for emerging startups to present their ideas',
                'location': 'Innovation Hub',
                'days': 2
            }
        ]

        # Sample company names
        companies = [
            'TechCorp Solutions',
            'Green Energy Inc',
            'Digital Dynamics',
            'Health Innovations',
            'Smart Systems',
            'Future Technologies',
            'Cloud Solutions Ltd',
            'Data Dynamics',
            'AI Solutions Corp',
            'Innovative Systems'
        ]

        # Create contacts
        contacts = []
        for company in companies:
            contact = Contact.objects.create(
                company=company,
                contact=f"{random.choice(['John', 'Jane', 'Mike', 'Sarah', 'David'])} {random.choice(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'])}",
                email=f"contact@{company.lower().replace(' ', '')}.com",
                phone=f"{random.randint(1000000000, 9999999999)}"
            )
            contacts.append(contact)
            self.stdout.write(f'Created contact: {contact}')

        # Create events and booths
        start_date = timezone.now() + timedelta(days=30)
        
        for event_data in events:
            event = Event.objects.create(
                title=event_data['title'],
                description=event_data['description'],
                start_date=start_date,
                end_date=start_date + timedelta(days=event_data['days']),
                location=event_data['location'],
                is_active=True
            )
            self.stdout.write(f'Created event: {event.title}')

            # Create booths for each event
            booth_types = list(BoothType)
            for i in range(1, random.randint(10, 20)):
                booth_type = random.choice(booth_types)
                status = random.choice([BoothStatus.AVAILABLE, BoothStatus.AVAILABLE, BoothStatus.RESERVED])
                price = round(random.uniform(100, 1000), 2)
                
                booth = Booth.objects.create(
                    event=event,
                    booth_number=f"{chr(65 + (i-1)//10)}{i%10 + 1}",  # A1, A2, ..., B1, B2, etc.
                    booth_type=booth_type,
                    status=status,
                    price=price
                )
                
                if status == BoothStatus.RESERVED:
                    # Randomly assign a contact to reserved booths
                    contact = random.choice(contacts)
                    booth.reserved_by = contact
                    booth.save()
                    
                    # Create a booking with new fields
                    is_confirmed = random.choice([True, False])
                    confirmation_date = timezone.now() - timedelta(days=random.randint(1, 14)) if is_confirmed else None
                    
                    Booking.objects.create(
                        booth=booth,
                        contact=contact,
                        is_confirmed=is_confirmed,
                        confirmation_date=confirmation_date
                    )
                
                self.stdout.write(f'Created booth: {booth}')
            
            # Move start date for next event
            start_date += timedelta(days=random.randint(15, 30))

        self.stdout.write(self.style.SUCCESS('Successfully created test data'))