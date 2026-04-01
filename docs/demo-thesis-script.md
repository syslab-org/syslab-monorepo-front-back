# Guion Oficial de Demo para Tesis

Este guion está pensado para una demo de 5 a 8 minutos mostrando el valor del MVP sin depender de AWS Console.

## Objetivo de la demo

Mostrar que el sistema permite:

1. modelar una topología neutral en un canvas
2. validar antes de desplegar
3. desplegar infraestructura real en AWS
4. inspeccionar resultados desde la propia aplicación
5. redeployar cambios de forma guiada
6. destruir la infraestructura al finalizar

## Escenario recomendado

- laboratorio con 2 VPCs públicas
- 1 workload por VPC
- conectividad inicial entre segmentos
- una prueba guiada de ping
- un redeploy menor no destructivo
- un destroy final

## Preparación previa

Antes de presentar:

- iniciar sesión con usuario de demo
- confirmar que el backend esté operativo
- abrir `LabsPage`
- tener listo un laboratorio de demo o crear uno nuevo
- verificar que AWS tenga credenciales válidas para deploy
- confirmar que la app muestre `Outputs`, `Logs` y `Pruebas`

## Guion narrado

### 1. Contexto inicial

Mensaje sugerido:

“Este sistema permite modelar topologías de red en un canvas neutral y traducirlas a infraestructura real en AWS. La idea es validar antes de desplegar y luego operar el laboratorio desde la misma interfaz.”

Pantalla:

- `LabsPage`

Acción:

- abrir un laboratorio existente o crear uno nuevo

### 2. Modelado en canvas

Pantalla:

- `CanvasFlowPage`

Acción:

- mostrar dos segmentos
- mostrar sus zonas y workloads
- mostrar el nodo de conectividad si aplica

Mensaje sugerido:

“Aquí no estamos dibujando recursos AWS directamente. Estamos modelando intención neutral: segmentos, zonas, workloads y conectividad.”

### 3. Validación previa

Acción:

- abrir `Preparar deploy`
- ejecutar validación

Qué mostrar:

- resumen `Add / Change / Destroy / Replace`
- acción principal visible `DEPLOY` o `REDEPLOY`
- mensajes de riesgo

Mensaje sugerido:

“Antes de aplicar cambios, Terraform se usa en modo de validación para anticipar si el cambio es seguro, destructivo o implica reemplazos.”

### 4. Deploy real

Acción:

- aplicar deploy

Pantalla posterior:

- `PlanDetailPage`

Qué mostrar:

- estado `SUCCESS`
- lifecycle `ACTIVE` / `REAL`
- `Outputs`

Mensaje sugerido:

“Después del deploy ya no necesitamos ir directo a la consola de AWS para entender qué se creó. La app centraliza IDs, IPs y estado operativo.”

### 5. Pruebas guiadas

Pantalla:

- pestaña `Pruebas`

Qué mostrar:

- comandos sugeridos de ping
- topología implicada

Mensaje sugerido:

“Además de desplegar, el sistema guía la validación funcional post-deploy. En este caso, propone pruebas de conectividad entre segmentos.”

### 6. Redeploy menor

Cambio sugerido:

- rename de segmento
- o cambio de `allowed_ssh_cidr`
- o cambio de `instance_type` si quieres mostrar impacto operativo

Acción:

- volver al canvas
- hacer el cambio
- mostrar estado `OUTDATED`
- revalidar
- aplicar redeploy

Mensaje sugerido:

“Un punto importante del trabajo fue diferenciar deploy inicial y redeploy. La UI ahora avisa cuando el canvas ya no coincide con el último plan validado y obliga a revalidar antes de aplicar.”

### 7. Destroy

Acción:

- ir a `PlanDetailPage`
- ejecutar `Destroy`

Mensaje sugerido:

“Finalmente, el laboratorio puede destruirse desde la misma plataforma, evitando dejar costo abierto en AWS.”

## Orden de pantallas recomendado

1. `LabsPage`
2. `CanvasFlowPage`
3. modal `Confirmar infraestructura`
4. `PlanDetailPage -> Outputs`
5. `PlanDetailPage -> Pruebas`
6. volver al canvas para redeploy
7. `PlanDetailPage` para destroy

## Cambios recomendados para el redeploy en demo

Los más seguros para demo:

- rename de segmento
- cambio de `allowed_ssh_cidr`

Útil si quieres mostrar impacto operativo:

- cambio de `instance_type`

Evitar en demo si no hace falta:

- cambio de `private_ip`
- cambio de `CIDR` de subnet
- cambios que fuercen reemplazo amplio

## Riesgos de demo

- que el entorno AWS no tenga estado limpio
- que el plan quede corriendo y el canvas se bloquee
- que falten outputs para explicar TGW
- que el presenter haga un cambio destructivo no previsto

## Plan B si AWS falla

Si AWS no está disponible o el deploy no conviene durante la presentación:

- mostrar la validación y el resumen del plan
- mostrar `Plan Detail` de una ejecución ya exitosa
- mostrar `Outputs`, `Logs` y `Pruebas`
- apoyarte en la matriz de redeploy para explicar comportamiento real observado

## Checklist de demo rápida

- laboratorio correcto abierto
- canvas entendible
- validación funcional
- deploy o plan exitoso disponible
- outputs cargando
- pruebas visibles
- redeploy menor definido
- destroy disponible o explicado
