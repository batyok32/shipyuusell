import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yuusell_logistics.settings')

app = Celery('yuusell_logistics')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

