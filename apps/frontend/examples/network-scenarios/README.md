# Escenarios de prueba para canvas y planes

Estos archivos siguen el mismo formato base de `plan.demo.json`.

Objetivo:
- cargar ejemplos rápidos de topología,
- validar casos correctos e incorrectos,
- comparar `direct links` vs `hub routing`,
- revisar el flujo de validación, deploy y pruebas post-deploy,
- contrastar la misma intención de laboratorio entre AWS y GCP.

Archivos incluidos:
- `index.json`: catálogo resumido de escenarios.
- `canvas-recipes.md`: recetas manuales para recrear escenarios desde el canvas.
- `01-single-vpc-public.json`: un segmento con zona pública e internet edge.
- `02-single-vpc-public-private-nat.json`: un segmento con zona pública, zona privada y salida administrada.
- `03-two-vpcs-peering-bidirectional.json`: dos segmentos con `direct links` correctos y conectividad ida/vuelta.
- `04-two-vpcs-isolated-baseline.json`: dos segmentos sin conectividad entre sí para comparar contra `direct links` y `hub routing`.
- `05-three-vpcs-tgw-full-mesh.json`: tres segmentos conectados mediante `hub routing`.
- `06-three-vpcs-peering-partial.json`: tres segmentos con `direct links` parciales para estudiar pares aislados.
- `07-overlapping-subnets-invalid.json`: caso inválido por zonas solapadas.
- `08-single-vpc-public-gcp.json`: baseline GCP con subnet regional y bastion con IP externa.
- `09-single-vpc-public-private-nat-gcp.json`: baseline GCP con subnet pública, privada y salida administrada.
- `10-two-vpcs-peering-bidirectional-gcp.json`: dos segmentos GCP con `VPC Peering` bidireccional.
- `11-three-vpcs-hub-routing-gcp.json`: tres segmentos GCP conectados a un `hub routing` neutral.

Convención recomendada:
- `01` a `07`: escenarios base pensados para AWS.
- `08` a `11`: pares equivalentes en GCP para demo y comparación visual.
- Cada escenario define un solo `cloud`, para que el flujo generado y la carga del laboratorio nazcan ya con el provider correcto.

Uso recomendado:
1. Crear o sincronizar un plan con uno de estos JSON.
2. Ejecutar validación.
3. Revisar `Preview de rutas`.
4. Si aplica, desplegar y luego revisar `Plan Detail -> Pruebas`.

Para demo comparativa:
1. Cargar un escenario AWS y su equivalente GCP.
2. Abrir `Create lab` y confirmar diferencias de provider, región y destino de ejecución.
3. Abrir los nodos de segmento, zona, workload y conectividad para comparar labels y campos.
4. En GCP, esperar validación de diseño y mensajes de runtime planificado.

Nota:
- Los casos de `direct links` y `hub routing` están pensados para comparar la traducción final por provider.
- El caso de error por ruta de una sola vía está documentado en `canvas-recipes.md`, porque ese comportamiento vive en el canvas y en la policy de conectividad, no en el payload final.
- Los escenarios GCP usan `image family`, `image project`, `machine type`, `Cloud NAT`, `Private Google Access` y `flow logs` para que el canvas refleje diferencias reales del provider.

## Generar flows de canvas automaticamente

Se puede convertir cada escenario (`0*.json`) al formato de React Flow que usa el canvas
(`nodes`, `edges`, `viewport`) con el script:

```bash
./scripts/generate_canvas_flows.py --overwrite
```

Salida por defecto:

- `apps/frontend/examples/network-scenarios/generated-canvas/*.canvas.json`
- `apps/frontend/examples/network-scenarios/generated-canvas/index.canvas.json`

Opciones utiles:

```bash
# Cambiar carpeta de origen/salida
./scripts/generate_canvas_flows.py \
  --source-dir apps/frontend/examples/network-scenarios \
  --output-dir apps/frontend/examples/network-scenarios/generated-canvas \
  --overwrite
```

## Carga legacy a Firestore

Tambien puedes subir los flows generados a Firestore para pruebas legacy o
para migrar escenarios viejos. El runtime actual usa backend + PostgreSQL
como fuente de verdad para auth, laboratorios y ejecuciones.

Primero revisa en modo simulacion:

```bash
python3 scripts/upload_canvas_flows_firestore.py \
  --dry-run \
  --input-dir apps/frontend/examples/network-scenarios/generated-canvas \
  --scenario-dir apps/frontend/examples/network-scenarios
```

Luego ejecuta la carga real:

```bash
FIREBASE_EMAIL="tu_email" FIREBASE_PASSWORD="tu_password" \
python3 scripts/upload_canvas_flows_firestore.py \
  --input-dir apps/frontend/examples/network-scenarios/generated-canvas \
  --scenario-dir apps/frontend/examples/network-scenarios \
  --id-prefix seed-canvas
```

Opciones recomendadas:

- `--overwrite`: actualiza documentos existentes con el mismo `docId`.
- `--user-id <users_doc_id>`: asigna propietario del laboratorio (clave para que
  un estudiante vea sus laboratorios en la lista de labs).
- `--collection vpcs`: por defecto ya usa `vpcs`.
