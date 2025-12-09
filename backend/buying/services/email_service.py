from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def send_quote_created_user_email(buying_request, quotes):
    """Send email to user when quotes are created"""
    subject = f'YuuSell - Quote Ready for {buying_request.product_name or "Your Product"}'
    
    # Create simple HTML email
    html_message = f"""
    <html>
    <body>
        <h2>Your Quotes Are Ready! 🎉</h2>
        <p>Hello {buying_request.user.get_full_name() or buying_request.user.email},</p>
        <p>Great news! We've created {len(quotes)} quote(s) for your buying request:</p>
        <p><strong>Product:</strong> {buying_request.product_name or buying_request.product_description[:100]}</p>
        
        <h3>Available Shipping Options:</h3>
        <ul>
    """
    
    for quote in quotes:
        html_message += f"""
            <li style="margin-bottom: 10px;">
                <strong>{quote.shipping_mode.name if quote.shipping_mode else 'Standard Shipping'}</strong>
                - <strong>${quote.total_cost}</strong>
                {f'({quote.estimated_delivery_days} days delivery)' if quote.estimated_delivery_days else ''}
                <br>
                <small style="color: #666;">
                    Product: ${quote.product_cost} | 
                    Buying Fee: ${quote.buying_service_fee} | 
                    Shipping: ${quote.shipping_cost}
                </small>
            </li>
        """
    
    html_message += f"""
        </ul>
        <p><strong>Next Steps:</strong></p>
        <ol>
            <li>Review the quotes above</li>
            <li>Choose the shipping option that works best for you</li>
            <li>Approve and pay for your selected quote</li>
        </ol>
        <p><a href="{settings.FRONTEND_URL}/buy-ship/quotes?request_id={buying_request.id}" style="background-color: #417690; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">View & Choose Quote →</a></p>
        <p>Best regards,<br>YuuSell Team</p>
    </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[buying_request.user.email],
        html_message=html_message,
        fail_silently=False,
    )


def send_quote_created_agent_email(buying_request):
    """Send email to agent when new quote request is created"""
    # Get all staff users (agents)
    from accounts.models import User
    agents = User.objects.filter(is_staff=True, is_active=True)
    
    if not agents.exists():
        return
    
    subject = f'New Buying Request - {buying_request.product_name or "Product Request"}'
    
    html_message = f"""
    <html>
    <body>
        <h2>New Buying Request</h2>
        <p>A new buying request has been submitted:</p>
        <ul>
            <li><strong>User:</strong> {buying_request.user.email}</li>
            <li><strong>Product:</strong> {buying_request.product_name or buying_request.product_description[:100]}</li>
            <li><strong>URL:</strong> {buying_request.product_url or 'N/A'}</li>
            <li><strong>Status:</strong> {buying_request.get_status_display()}</li>
        </ul>
        <p>Please create quotes for this request.</p>
        <p><a href="{settings.FRONTEND_URL}/admin/buying/buyingrequest/{buying_request.id}/change/">View in Admin</a></p>
    </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    recipient_list = [agent.email for agent in agents]
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipient_list,
        html_message=html_message,
        fail_silently=False,
    )


def send_payment_received_agent_email(buying_request, quote, payment):
    """Send email to agent when payment is received"""
    from accounts.models import User
    agents = User.objects.filter(is_staff=True, is_active=True)
    
    if not agents.exists():
        return
    
    subject = f'Payment Received - Buying Request #{buying_request.id}'
    
    html_message = f"""
    <html>
    <body>
        <h2>Payment Received</h2>
        <p>Payment has been received for buying request:</p>
        <ul>
            <li><strong>User:</strong> {buying_request.user.email}</li>
            <li><strong>Product:</strong> {buying_request.product_name or buying_request.product_description[:100]}</li>
            <li><strong>Quote:</strong> {quote.shipping_mode.name if quote.shipping_mode else 'Standard'} - ${quote.total_cost}</li>
            <li><strong>Payment Amount:</strong> ${payment.amount}</li>
            <li><strong>Payment ID:</strong> {payment.payment_id}</li>
        </ul>
        <p>Please proceed with purchasing the item.</p>
        <p><a href="{settings.FRONTEND_URL}/admin/buying/buyingrequest/{buying_request.id}/change/">View in Admin</a></p>
    </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    recipient_list = [agent.email for agent in agents]
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipient_list,
        html_message=html_message,
        fail_silently=False,
    )


def send_payment_receipt_user_email(buying_request, quote, payment):
    """Send payment receipt email to user"""
    subject = f'YuuSell - Payment Receipt for {buying_request.product_name or "Your Purchase"}'
    
    html_message = f"""
    <html>
    <body>
        <h2>Payment Receipt</h2>
        <p>Hello {buying_request.user.get_full_name() or buying_request.user.email},</p>
        <p>Thank you for your payment. Your receipt details:</p>
        <ul>
            <li><strong>Payment ID:</strong> {payment.payment_id}</li>
            <li><strong>Amount:</strong> ${payment.amount} {payment.currency}</li>
            <li><strong>Product:</strong> {buying_request.product_name or buying_request.product_description[:100]}</li>
            <li><strong>Shipping Method:</strong> {quote.shipping_mode.name if quote.shipping_mode else 'Standard'}</li>
            <li><strong>Date:</strong> {payment.created_at.strftime('%Y-%m-%d %H:%M:%S')}</li>
        </ul>
        <p>We'll keep you updated on the progress of your purchase.</p>
        <p><a href="{settings.FRONTEND_URL}/dashboard">View in Dashboard</a></p>
        <p>Best regards,<br>YuuSell Team</p>
    </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[buying_request.user.email],
        html_message=html_message,
        fail_silently=False,
    )


def send_purchased_user_email(buying_request):
    """Send email to user when item is marked as purchased"""
    subject = f'YuuSell - Your Item Has Been Purchased!'
    
    html_message = f"""
    <html>
    <body>
        <h2>Item Purchased! 🛒</h2>
        <p>Hello {buying_request.user.get_full_name() or buying_request.user.email},</p>
        <p>Great news! We've successfully purchased your item:</p>
        <ul>
            <li><strong>Product:</strong> {buying_request.product_name or buying_request.product_description[:100]}</li>
            <li><strong>Reference Number:</strong> {buying_request.reference_number or 'Will be assigned soon'}</li>
            <li><strong>Status:</strong> Purchased</li>
        </ul>
        <p><strong>What's Next:</strong></p>
        <ol>
            <li>The item will be shipped to our warehouse</li>
            <li>Once received, we'll ship it internationally to your address</li>
            <li>You'll receive tracking information for both shipments</li>
        </ol>
        <p>We'll keep you updated on the progress!</p>
        <p><a href="{settings.FRONTEND_URL}/dashboard">View in Dashboard</a></p>
        <p>Best regards,<br>YuuSell Team</p>
    </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[buying_request.user.email],
        html_message=html_message,
        fail_silently=False,
    )


def send_delivered_user_email(buying_request):
    """Send email to user when package is delivered"""
    subject = f'YuuSell - Your Package Has Been Delivered!'
    
    # Get package if linked
    package = buying_request.package
    photos_html = ""
    tracking_info = ""
    
    if package:
        if package.delivery_photos:
            for photo_url in package.delivery_photos:
                photos_html += f'<img src="{photo_url}" alt="Delivery Photo" style="max-width: 400px; margin: 10px;"><br>'
        if package.tracking_number:
            tracking_info = f'<li><strong>Tracking Number:</strong> {package.tracking_number}</li>'
    
    # Also check shipment for tracking
    if buying_request.shipment and buying_request.shipment.tracking_number:
        tracking_info = f'<li><strong>Tracking Number:</strong> {buying_request.shipment.tracking_number}</li>'
    
    html_message = f"""
    <html>
    <body>
        <h2>Package Delivered! 🎉</h2>
        <p>Hello {buying_request.user.get_full_name() or buying_request.user.email},</p>
        <p>Great news! Your package has been delivered:</p>
        <ul>
            <li><strong>Product:</strong> {buying_request.product_name or buying_request.product_description[:100]}</li>
            <li><strong>Reference Number:</strong> {buying_request.reference_number or 'N/A'}</li>
            {tracking_info}
        </ul>
        {f'<h3>Delivery Photos:</h3>{photos_html}' if photos_html else ''}
        <p>Thank you for using YuuSell! We hope you're happy with your purchase.</p>
        <p><a href="{settings.FRONTEND_URL}/dashboard">View in Dashboard</a></p>
        <p>Best regards,<br>YuuSell Team</p>
    </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[buying_request.user.email],
        html_message=html_message,
        fail_silently=False,
    )


def send_delivery_photos_user_email(package, buying_request):
    """Send email to user with delivery photos when package is delivered"""
    if not package.delivery_photos:
        return
    
    subject = f'YuuSell - Your Package Has Been Delivered!'
    
    photos_html = ""
    for photo_url in package.delivery_photos:
        photos_html += f'<img src="{photo_url}" alt="Delivery Photo" style="max-width: 400px; margin: 10px;"><br>'
    
    html_message = f"""
    <html>
    <body>
        <h2>Package Delivered!</h2>
        <p>Hello {buying_request.user.get_full_name() or buying_request.user.email},</p>
        <p>Great news! Your package has been delivered:</p>
        <ul>
            <li><strong>Reference Number:</strong> {package.reference_number}</li>
            <li><strong>Tracking Number:</strong> {package.tracking_number or 'N/A'}</li>
            <li><strong>Product:</strong> {buying_request.product_name or buying_request.product_description[:100]}</li>
        </ul>
        <h3>Delivery Photos:</h3>
        {photos_html}
        <p>Thank you for using YuuSell!</p>
        <p><a href="{settings.FRONTEND_URL}/dashboard">View in Dashboard</a></p>
        <p>Best regards,<br>YuuSell Team</p>
    </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[buying_request.user.email],
        html_message=html_message,
        fail_silently=False,
    )

