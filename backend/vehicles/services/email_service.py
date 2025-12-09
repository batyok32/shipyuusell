"""
Email service for vehicle shipping workflow
"""
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings


def send_inspection_report_email(vehicle):
    """Send inspection report and condition report contract to user"""
    subject = f'YuuSell - Vehicle Inspection Report Ready for Review'
    
    # Get inspection photos
    photos = []
    for i in range(1, 21):
        photo = getattr(vehicle, f'inspection_photo_{i}', None)
        if photo:
            photos.append(photo.url)
    
    # If no uploaded photos, use legacy JSONField
    if not photos and vehicle.inspection_photos:
        photos = vehicle.inspection_photos[:20]
    
    html_message = f"""
    <html>
    <body>
        <h2>Vehicle Inspection Report Ready</h2>
        <p>Hello {vehicle.user.get_full_name() or vehicle.user.email},</p>
        <p>Your vehicle inspection has been completed. Please review the inspection report and sign the condition report.</p>
        <ul>
            <li><strong>Vehicle:</strong> {vehicle.year} {vehicle.make} {vehicle.model}</li>
            <li><strong>VIN:</strong> {vehicle.vin or 'N/A'}</li>
            <li><strong>Status:</strong> {vehicle.get_status_display()}</li>
        </ul>
        <h3>Inspection Photos ({len(photos)} photos):</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
    """
    
    for photo_url in photos[:10]:  # Show first 10 in email
        html_message += f'<img src="{photo_url}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 4px;" />'
    
    html_message += f"""
        </div>
        <p><strong>Inspection Report:</strong></p>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px;">{vehicle.inspection_report}</pre>
        <p><a href="{settings.FRONTEND_URL}/vehicles/{vehicle.id}" style="background-color: #417690; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px;">Review & Sign Condition Report →</a></p>
        <p>You can view all inspection photos, download documents, and sign the condition report on the vehicle request page.</p>
        <p>Best regards,<br>YuuSell Team</p>
    </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[vehicle.user.email],
        html_message=html_message,
        fail_silently=False,
    )


def send_condition_report_signed_email(vehicle):
    """Send confirmation when condition report is signed"""
    subject = f'YuuSell - Condition Report Signed Successfully'
    
    html_message = f"""
    <html>
    <body>
        <h2>Condition Report Signed</h2>
        <p>Hello {vehicle.user.get_full_name() or vehicle.user.email},</p>
        <p>Thank you for signing the condition report for your vehicle:</p>
        <ul>
            <li><strong>Vehicle:</strong> {vehicle.year} {vehicle.make} {vehicle.model}</li>
            <li><strong>Signed at:</strong> {vehicle.condition_report_signed_at.strftime("%Y-%m-%d %H:%M") if vehicle.condition_report_signed_at else 'N/A'}</li>
        </ul>
        <p>Your vehicle shipment will proceed to the next stage. You will receive updates as your vehicle moves through the shipping process.</p>
        <p><a href="{settings.FRONTEND_URL}/vehicles/{vehicle.id}" style="background-color: #417690; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px;">View Vehicle Request →</a></p>
        <p>Best regards,<br>YuuSell Team</p>
    </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[vehicle.user.email],
        html_message=html_message,
        fail_silently=False,
    )

