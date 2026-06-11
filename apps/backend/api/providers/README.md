# Provider Backend Architecture

## English

The backend is now split into four provider-facing layers so adding a new cloud does not require rewriting the orchestration flow:

1. `registry.py`
   Registers the provider adapter and executor.

2. `runtime_registry.py`
   Registers provider runtime hooks:
   - how to build runtime credentials/env from a `CloudConnection`
   - how to inspect runtime identity
   - how to test a connection
   - whether real execution is allowed
   - how to probe live deployed resources for drift reconciliation

3. `connection_registry.py`
   Registers how each provider uses `CloudConnection`:
   - validation rules for create/update
   - supported auth model
   - serialization details for the API
   - how provider-specific connection fields are applied

4. `*/adapter.py`
   Translates the neutral topology intent into the provider payload and validates it.

5. `*/executor.py`
   Prepares the workspace and runs the provider-specific execution flow.

## Current reality

- `AWS` is the only provider with full adapter + executor + runtime hooks.
- `AWS` is also the only provider with a real `CloudConnection` spec today.
- `GCP` and `Azure` already have registered adapters/executors plus runtime/connection placeholders.
- Views, tasks, and serializers now resolve runtime behavior through `runtime_registry.py` instead of calling AWS helpers directly.

## Minimal path to add a new executable provider

1. Add the provider constant/choice in `models.py` if it does not exist yet.
2. Create `providers/<provider>/adapter.py`.
3. Create `providers/<provider>/executor.py`.
4. Register both in `providers/registry.py`.
5. Register runtime hooks in `providers/runtime_registry.py`.
6. Register the connection contract in `providers/connection_registry.py`.
7. If the provider needs new persisted credential fields, extend `CloudConnection` once and keep the view/serializer flow unchanged.

## Important note

The orchestration is now provider-aware, but the `CloudConnection` persistence model is still AWS-shaped. That means:

- adding a planned provider is cheap
- adding a fully executable provider still requires credential storage fields and connection validation for that provider

That remaining work is now isolated mostly to:

- `models.py`
- provider connection specs
- the new provider runtime hooks/executor

---

## Español

El backend ahora está dividido en cuatro capas orientadas por provider para que agregar una nueva nube no implique reescribir todo el flujo de orquestación:

1. `registry.py`
   Registra el adapter y el executor del provider.

2. `runtime_registry.py`
   Registra los hooks de runtime del provider:
   - cómo construir credenciales/env desde una `CloudConnection`
   - cómo inspeccionar la identidad efectiva del runtime
   - cómo probar una conexión
   - si la ejecución real está permitida
   - cómo verificar recursos desplegados para reconciliar drift

3. `connection_registry.py`
   Registra cómo usa cada provider la `CloudConnection`:
   - reglas de validación para create/update
   - modelo de autenticación soportado
   - detalles serializados para la API
   - cómo aplicar campos específicos del provider

4. `*/adapter.py`
   Traduce la topología neutral al payload del provider y la valida.

5. `*/executor.py`
   Prepara el workspace y ejecuta el flujo específico del provider.

## Estado actual

- `AWS` es el único provider con adapter + executor + runtime hooks completos.
- `AWS` también es el único provider con spec real de `CloudConnection` por ahora.
- `GCP` y `Azure` ya tienen adapters/executors registrados y placeholders de runtime/conexión.
- Las vistas, tareas y serializers ahora resuelven el comportamiento de runtime a través de `runtime_registry.py` en vez de llamar helpers AWS de forma directa.

## Camino mínimo para agregar un provider ejecutable

1. Agregar la constante/opción del provider en `models.py` si aún no existe.
2. Crear `providers/<provider>/adapter.py`.
3. Crear `providers/<provider>/executor.py`.
4. Registrar ambos en `providers/registry.py`.
5. Registrar los runtime hooks en `providers/runtime_registry.py`.
6. Registrar el contrato de conexión en `providers/connection_registry.py`.
7. Si el provider necesita nuevos campos persistentes de credenciales, extender `CloudConnection` una vez y mantener intacto el flujo de vistas/serializers.

## Nota importante

La orquestación ya entiende providers, pero el modelo persistente de `CloudConnection` todavía está modelado con forma AWS. Eso significa:

- agregar un provider planeado es barato
- agregar un provider ejecutable real todavía requiere campos de credenciales y validación propios de ese provider

Ese trabajo pendiente ahora queda aislado principalmente en:

- `models.py`
- specs de conexión por provider
- los nuevos runtime hooks/executor del provider
