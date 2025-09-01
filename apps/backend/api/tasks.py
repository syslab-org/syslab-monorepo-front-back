# apps/backend/api/tasks.py
from celery import shared_task

@shared_task
def prueba_larga(n: int = 5):
    import time
    time.sleep(n)
    return {"ok": True, "n": n}

@shared_task(name="api.tasks.process_network_plan", bind=True)
def process_network_plan(self, payload: dict):
    """
    Recibe el dict validado por la vista.
    Haz aquí lo que necesites (crear VPCs, subnets, etc. o solo simular).
    """
    # TODO: lógica real. Por ahora, devolvemos un OK de prueba:
    return {"ok": True, "received": payload}
