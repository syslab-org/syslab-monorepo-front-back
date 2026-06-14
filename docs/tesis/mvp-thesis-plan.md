# Plan de Cierre del MVP para Tesis

Este plan busca cerrar un MVP presentable del sistema con foco en demostración funcional, estabilidad de flujo y evidencia técnica suficiente para la tesis.

## Objetivo del MVP

Demostrar de punta a punta que un usuario puede:

1. crear o abrir un laboratorio
2. modelar una topología neutral en el canvas
3. validarla antes de desplegar
4. desplegar o redeplegar infraestructura en AWS
5. inspeccionar outputs, logs y pruebas guiadas
6. destruir infraestructura cuando ya no la necesita

## Qué ya está suficientemente maduro

- flujo `Canvas -> Validate -> Deploy/Redeploy -> Plan Detail`
- distinción visual entre `DEPLOY`, `REDEPLOY`, `DESTROY`, `REVALIDAR` y estado `OUTDATED`
- matriz de redeploy con casos reales en AWS
- conectividad por `peering`, `TGW` e `isolated`
- pruebas guiadas desde `Plan Detail -> Pruebas`
- destroy del laboratorio

## Criterio de “MVP listo para presentar”

El MVP queda listo cuando se cumplan estas 4 condiciones:

1. Demo funcional
   - se puede hacer una demo completa sin editar código ni usar workarounds manuales
2. Flujo entendible
   - el usuario entiende qué hacer desde la UI sin depender de explicación oral constante
3. Estabilidad razonable
   - no hay bugs conocidos que rompan deploy/redeploy/destroy en el camino principal
4. Evidencia documentada
   - la tesis puede apoyarse en una narrativa clara con pruebas, límites y decisiones de producto

## Camino crítico restante

### 1. Cerrar el camino principal de demo

Meta:

- dejar una demo oficial, simple y repetible

Escenario recomendado:

1. abrir laboratorio desde `LabsPage`
2. entrar al `CanvasFlowPage`
3. modelar 2 VPCs con 2 workloads y conectividad
4. validar
5. desplegar
6. revisar `PlanDetailPage`
7. ejecutar pruebas guiadas
8. hacer un redeploy menor
9. destruir

Entregable:

- un guion de demo de 5-8 minutos

### 1.1. Definir el modelo de ejecución cloud del MVP

Meta:

- dejar explícito quién puede desplegar, con qué credenciales y bajo qué alcance

Hallazgo actual:

- el runtime real hoy está implementado solo para `AWS`
- `GCP` y `Azure` aparecen como providers previstos, pero no tienen executor runtime real
- la plataforma ya soporta `CloudConnection` personal y compartida por curso
- `AWS` ya soporta autenticación por `Static Keys` y `AssumeRole`
- el deploy real sigue dependiendo de una identidad base válida del backend para resolver `AssumeRole`

Resolución recomendada:

- presentar el MVP como `AWS-first`
- tratar multi-cloud como extensión de arquitectura, no como capacidad cerrada del MVP
- separar permisos académicos de permisos cloud reales:
  - usuarios autenticados en la plataforma crean y editan laboratorios
  - el deploy real queda asociado al owner del laboratorio y a su conexión cloud
  - revisión y validación en modo `PLAN` pueden abrirse a profesor/curso sin tocar infraestructura real
  - `APPLY`/`DESTROY` sobre cuentas ajenas requieren delegación explícita o una cuenta compartida del curso

Opciones de producto:

1. ya implementado en el MVP
   - `AWS` como único provider desplegable real
   - owner de laboratorio = owner de ejecución por defecto
   - conexiones cloud por usuario y curso
   - bloqueo explícito para que un profesor no despliegue infraestructura personal del alumno por accidente
   - habilitación docente cuando la conexión efectiva es `course_shared`
   - snapshot auditado del último `APPLY` real
2. siguiente iteración
   - identidades técnicas dedicadas para backend en vez de depender de credenciales locales/de entorno
   - scopes mínimos por role y por curso
   - mejoras de onboarding para registrar la conexión desde la UI
3. largo plazo
   - bring-your-own-cloud multi-provider
   - roles asumibles en AWS, service accounts en GCP, service principals en Azure
   - almacenamiento seguro de secretos + políticas finas de autorización

Entregable:

- decisión de alcance explícita: `deploy real AWS-first con owner de ejecución y separación entre revisión y apply real`
- nota de tesis sobre extensibilidad multi-cloud vía adapters/executors
- referencia detallada: `docs/tesis/validacion/cloud-execution-model.md`
- playbook operativo para repetir pruebas `Static Keys` y `AssumeRole`: `docs/tesis/validacion/aws-cloud-connections-playbook.md`

### 1.2. Hacer útil la opción “Plantilla de laboratorio”

Meta:

- que la plantilla no sea solo metadata, sino un punto de partida real del laboratorio

Hallazgo actual:

- el formulario guiado guarda `lab_template`
- hoy esa opción solo cambia descripción y sugiere un `recommendedCidr`
- no precarga nodos, edges, zonas, workloads ni policies
- el backend sí soporta persistir `flow` al crear `Lab`
- ya existen escenarios reutilizables en:
  - `apps/frontend/examples/network-scenarios/*.json`
  - `apps/frontend/examples/network-scenarios/generated-canvas/*.canvas.json`

Decisión recomendada para tesis/MVP:

- convertir `Plantilla de laboratorio` en un `starter flow`
- al crear el laboratorio, si se eligió plantilla, inicializar `flow` con un canvas preconstruido acorde al caso

Opciones de implementación:

1. MVP corto y sólido
   - mapear cada `lab_template` a un archivo `generated-canvas/*.canvas.json`
   - crear el laboratorio ya con `flow` precargado
   - si hace falta, ajustar nombre/CIDR/región al crear
2. fallback conservador
   - crear el laboratorio vacío
   - al abrir el canvas por primera vez, cargar la plantilla si `flow` está vacío
3. versión más ambiciosa
   - convertir la plantilla en un wizard generativo paso a paso
   - generar el canvas desde metadata estructurada en vez de cargar un flow estático

Recomendación:

- elegir la opción `1` para el MVP
- deja una experiencia entendible y defendible en tesis:
  - “crear desde plantilla” realmente significa “abrir un laboratorio ya prearmado para el caso elegido”

Entregable:

- al menos 2 plantillas funcionales precargadas:
  - `1 segmento (bastion + app privada)` o equivalente simple
  - `2 segmentos conectados` o `3 segmentos con hub`, según cuál sea más estable para demo

### 2. Harden del flujo principal

Meta:

- que el camino principal aguante uso de presentación sin comportamientos ambiguos

Checklist:

- revisar estado de botones tras refresh de página
- revisar polling durante `plan`, `apply` y `destroy`
- revisar mensajes de error si backend falla
- revisar carga de `Outputs`, `Logs` y `Pruebas`
- revisar que `Plan Detail` y canvas no se contradigan

Entregable:

- lista corta de bugs bloqueantes en cero

### 3. Completar observabilidad mínima

Meta:

- que la demo no dependa de ir a consola AWS para entender qué pasó

Mejoras recomendadas:

- exponer outputs de TGW:
  - TGW id
  - attachment ids
  - TGW route table id
- mejorar trazabilidad en `Plan Detail`
  - qué cambió
  - qué se creó
  - qué se destruyó

Entregable:

- outputs suficientes para explicar conectividad sin abrir AWS Console

### 4. Cerrar casos pendientes solo si aportan valor

Pendientes reales:

- cambio de `AMI`
- cambio de `CIDR` de VPC

Decisión recomendada:

- no bloquear el MVP por estos dos casos
- dejarlos como trabajo futuro o limitación conocida si la UI actual no los hace prácticos

Entregable:

- sección “alcances y límites del MVP” explícita

### 5. Preparar el relato de tesis

Meta:

- convertir lo técnico en historia de producto + evidencia

Ejes sugeridos:

- problema:
  - desplegar topologías cloud es complejo para aprendizaje y experimentación
- propuesta:
  - canvas neutral + traducción a AWS + validación previa + redeploy guiado
- aporte:
  - una fuente de verdad visual y operacional
- validación:
  - matriz de redeploy real sobre AWS
- límites:
  - algunos cambios siguen siendo destructivos por naturaleza de Terraform/AWS

Entregable:

- 6-10 diapositivas con screenshots reales del sistema

## Orden recomendado de ejecución

### Fase 1. Demo cerrada

1. definir escenario oficial de demo
2. probarlo completo de punta a punta
3. documentar el paso a paso

### Fase 2. Estabilidad UX/flujo

1. corregir cualquier bug residual del camino principal
2. revisar copy y consistencia visual final
3. verificar estados tras refresh y navegación

### Fase 3. Observabilidad

1. mejorar outputs para TGW y conectividad
2. asegurar que `Pruebas` muestre instrucciones suficientes

### Fase 4. Cierre de presentación

1. preparar screenshots definitivos
2. redactar narrativa de demo
3. dejar una lista corta de limitaciones conocidas

## Qué no debería bloquear la presentación

- automatización total de pruebas de red
- soporte perfecto para todos los cambios destructivos
- cubrir todas las mutaciones posibles del canvas
- soportar todos los providers o regiones

## Riesgos principales a vigilar

- que el estado del plan y el canvas diverjan tras refresh
- que `Outputs` no muestren suficiente información para explicar la demo
- que un cambio de conectividad deje la UI ambigua
- que el entorno AWS quede con costos abiertos por olvido

## Definición de terminado

Se puede considerar MVP listo cuando:

- existe una demo repetible de 5-8 minutos
- el flujo principal funciona sin intervención manual externa
- deploy, redeploy y destroy están claros visualmente
- `Plan Detail` permite explicar el resultado
- la matriz de redeploy y las limitaciones están documentadas

## Checklist operativo

### Hoy

- dejar cerrada la matriz de redeploy
- dejar documentado el guion oficial de demo
- validar que el camino principal no tenga bugs bloqueantes obvios
- dejar el entorno AWS apagado o controlado para no abrir costo innecesario

### Mañana

- ejecutar demo completa de punta a punta con cronómetro
- anotar cualquier fricción real del presentador
- corregir solo bugs del camino principal
- capturar screenshots definitivos

### Antes de presentar

- probar login y acceso al laboratorio
- probar `Canvas -> Validate -> Deploy`
- probar `Plan Detail -> Outputs / Logs / Pruebas`
- probar un `Redeploy` menor
- probar `Destroy`
- confirmar que no haya dependencias manuales ocultas

## Backlog priorizado

### Prioridad 1. Camino principal

- demo end-to-end estable
- refresh de página sin pérdida de estado operativo
- polling consistente en `plan`, `apply` y `destroy`
- mensajes de error entendibles
- definir explícitamente el modelo de ejecución cloud del MVP (`AWS` real, multi-cloud como roadmap)
- hacer que `Plantilla de laboratorio` cree un laboratorio realmente precargado

### Prioridad 2. Observabilidad para demo

- exponer outputs de TGW
- resumir mejor qué se creó / cambió / destruyó
- asegurar que `Pruebas` alcance para la explicación sin AWS Console

### Prioridad 3. Empaquetado para tesis

- guion de demo
- screenshots finales
- límites conocidos del MVP
- narrativa de aporte y validación

### Prioridad 4. Trabajo futuro

- cambio de `AMI`
- cambio de `CIDR` de VPC
- ampliar cobertura de mutaciones destructivas
- credenciales cloud por tenant/curso/usuario
- multi-cloud runtime real (`GCP`, `Azure`)
- plantillas generativas más allá de flows estáticos
