"""
Management command to test Gmail email configuration
Usage: python manage.py test_gmail recipient@example.com
"""
from django.core.management.base import BaseCommand, CommandError
from django.core.mail import send_mail
from django.conf import settings


class Command(BaseCommand):
    help = 'Test Gmail email configuration by sending a test email'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            type=str,
            help='Email address to send test email to'
        )
        parser.add_argument(
            '--subject',
            type=str,
            default='YuuSell Logistics - Gmail Test Email',
            help='Subject of the test email'
        )

    def handle(self, *args, **options):
        recipient_email = options['email']
        subject = options['subject']

        # Display current email configuration
        self.stdout.write(self.style.WARNING('\n=== Current Email Configuration ==='))
        self.stdout.write(f'EMAIL_BACKEND: {settings.EMAIL_BACKEND}')
        self.stdout.write(f'EMAIL_HOST: {settings.EMAIL_HOST}')
        self.stdout.write(f'EMAIL_PORT: {settings.EMAIL_PORT}')
        self.stdout.write(f'EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}')
        self.stdout.write(f'EMAIL_USE_SSL: {getattr(settings, "EMAIL_USE_SSL", False)}')
        self.stdout.write(f'EMAIL_HOST_USER: {settings.EMAIL_HOST_USER or "(not set)"}')
        self.stdout.write(f'DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}')
        self.stdout.write(self.style.WARNING('=' * 35 + '\n'))

        # Check if email is configured
        if not settings.EMAIL_HOST_USER:
            raise CommandError(
                'EMAIL_HOST_USER is not set. Please configure it in your .env file.\n'
                'See GMAIL_SETUP.md for instructions.'
            )

        if not settings.EMAIL_HOST_PASSWORD:
            raise CommandError(
                'EMAIL_HOST_PASSWORD is not set. Please configure it in your .env file.\n'
                'See GMAIL_SETUP.md for instructions.'
            )

        # Compose test email
        message = f"""
Hello!

This is a test email from YuuSell Logistics platform.

Your Gmail email backend is configured correctly!

Configuration Details:
- Backend: {settings.EMAIL_BACKEND}
- Host: {settings.EMAIL_HOST}
- Port: {settings.EMAIL_PORT}
- TLS: {settings.EMAIL_USE_TLS}
- From: {settings.DEFAULT_FROM_EMAIL}

If you received this email, your Gmail configuration is working perfectly!

Best regards,
YuuSell Logistics Platform
        """

        try:
            self.stdout.write(self.style.WARNING(f'Sending test email to {recipient_email}...'))
            
            send_mail(
                subject=subject,
                message=message.strip(),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=False,
            )
            
            self.stdout.write(self.style.SUCCESS(
                f'\n✓ Test email sent successfully to {recipient_email}!\n'
                'Please check your inbox (and spam folder) to confirm receipt.'
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f'\n✗ Failed to send email: {str(e)}\n'
            ))
            self.stdout.write(self.style.WARNING(
                'Common issues:\n'
                '1. Wrong App Password - Generate a new one from https://myaccount.google.com/apppasswords\n'
                '2. 2-Step Verification not enabled - Enable it in Google Account settings\n'
                '3. Network/Firewall issues - Check if port 587/465 is blocked\n'
                '4. Incorrect EMAIL_HOST_USER - Should be your full Gmail address\n'
                '\nSee GMAIL_SETUP.md for detailed troubleshooting guide.'
            ))
            raise CommandError('Email sending failed')

