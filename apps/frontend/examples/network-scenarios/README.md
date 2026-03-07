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
