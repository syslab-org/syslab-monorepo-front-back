# apps/backend/api/views.py
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from celery.result import AsyncResult
from .tasks import prueba_larga

@csrf_exempt
@require_POST
def run_prueba(request):
    """
    Encola la tarea prueba_larga (5s) y devuelve el task_id.
    Permite cambiar n via JSON: {"n": 10}
    """
    try:
        import json
        body = json.loads(request.body or "{}")
        n = int(body.get("n", 5))
    except Exception:
        n = 5

    async_res = prueba_larga.delay(n)
    return JsonResponse({"task_id": async_res.id}, status=202)

def task_status(request, task_id: str):
    """Consulta estado y, si terminó, devuelve el resultado."""
    res = AsyncResult(task_id)
    payload = {"task_id": task_id, "state": res.state}
    if res.state == "SUCCESS":
        payload["result"] = res.result
    elif res.state == "FAILURE":
        # opcionalmente expón el error de forma segura
        payload["error"] = str(res.info)
    return JsonResponse(payload)
