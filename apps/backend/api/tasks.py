from celery import shared_task
import time

@shared_task
def prueba_larga(segundos):
    time.sleep(segundos)
    result = f"Tarea completada tras {segundos}s"
    print(result)
    return result
