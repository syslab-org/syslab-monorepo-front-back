# Escenarios de prueba para canvas y planes

Estos archivos siguen el mismo formato base de `plan.demo.json`.

Objetivo:
- cargar ejemplos rápidos de topología,
- validar casos correctos e incorrectos,
- comparar peering vs Transit Gateway,
- revisar el flujo de validación, deploy y pruebas post-deploy.

Archivos incluidos:
- `index.json`: catálogo resumido de escenarios.
- `canvas-recipes.md`: recetas manuales para recrear escenarios desde el canvas.
- `01-single-vpc-public.json`: VPC única con subnet pública e IGW.
- `02-single-vpc-public-private-nat.json`: VPC con subnet pública, privada y salida por NAT.
- `03-two-vpcs-peering-bidirectional.json`: dos VPC con peering correcto y conectividad ida/vuelta.
- `04-two-vpcs-isolated-baseline.json`: dos VPC sin conectividad entre sí para comparar contra peering/TGW.
- `05-three-vpcs-tgw-full-mesh.json`: tres VPC conectadas por Transit Gateway.
- `06-three-vpcs-peering-partial.json`: tres VPC con peering parcial para estudiar pares aislados.
- `07-overlapping-subnets-invalid.json`: caso inválido por subnets solapadas.

Uso recomendado:
1. Crear o sincronizar un plan con uno de estos JSON.
2. Ejecutar validación.
3. Revisar `Preview de rutas`.
4. Si aplica, desplegar y luego revisar `Plan Detail -> Pruebas`.

Nota:
- Los casos de peering/TGW están pensados para comparar la infraestructura final.
- El caso de error por ruta de una sola vía está documentado en `canvas-recipes.md`, porque ese comportamiento vive en el canvas/router y no en el payload final.

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

## Cargar canvas en Firestore (vpcs)

Tambien puedes subir los flows generados directamente a Firestore para abrirlos
desde la lista de laboratorios.

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
  un estudiante vea sus labs en `VPCList`).
- `--collection vpcs`: por defecto ya usa `vpcs`.
