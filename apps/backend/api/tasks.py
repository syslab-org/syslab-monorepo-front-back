# apps/backend/api/tasks.py
from celery import shared_task
import time

@shared_task(bind=True)
def prueba_larga(self, n=5):
    """Duerme n segundos y devuelve un resultado simple."""
    for i in range(n):
        time.sleep(1)
    return {"ok": True, "n": n}
