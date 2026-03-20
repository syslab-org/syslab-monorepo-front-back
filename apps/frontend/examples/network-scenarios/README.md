# Escenarios de prueba para canvas y planes

Estos archivos siguen el mismo formato base de `plan.demo.json`.

Objetivo:
- cargar ejemplos rápidos de topología,
- validar casos correctos e incorrectos,
- comparar `direct links` vs `hub routing`,
- revisar el flujo de validación, deploy y pruebas post-deploy.

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

Uso recomendado:
1. Crear o sincronizar un plan con uno de estos JSON.
2. Ejecutar validación.
3. Revisar `Preview de rutas`.
4. Si aplica, desplegar y luego revisar `Plan Detail -> Pruebas`.

Nota:
- Los casos de `direct links` y `hub routing` están pensados para comparar la traducción final por provider.
- El caso de error por ruta de una sola vía está documentado en `canvas-recipes.md`, porque ese comportamiento vive en el canvas y en la policy de conectividad, no en el payload final.

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
