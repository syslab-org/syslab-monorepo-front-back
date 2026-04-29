# Matriz de Managed Egress AWS

Este documento resume las pruebas manuales y hallazgos funcionales del caso `Enable managed egress` en AWS, con foco en cómo se comporta el producto al modelar una VPC con zonas públicas/privadas y salida administrada por NAT Gateway.

## Alcance

- Provider probado: `aws`
- Región: `us-east-1`
- Modo de trabajo: validación previa + deploy real + lectura desde `Plan Detail`
- Objetivo pedagógico: explicar cuándo `managed egress` tiene sentido, cuándo no y qué debe bloquear la UI

## Qué significa `Enable managed egress`

En el modelo actual del producto, `managed egress` es una decisión a nivel de `Network Segment`/VPC.

Traducción AWS esperada:
- `Internet Edge = ON` permite crear `Internet Gateway`
- `Enable managed egress = ON` crea un `NAT Gateway` dentro de una zona pública elegida
- las zonas privadas de esa VPC salen a Internet a través del NAT
- las zonas públicas siguen saliendo por `IGW`

Importante:
- el NAT no da acceso entrante desde Internet
- el NAT sirve para salida desde zonas privadas
- hoy el producto modela un solo NAT por VPC

## Caso 1: `public + private + NAT`

### Topología

- 1 VPC
- 1 zona pública
- 1 zona privada
- 2 workloads
  - 1 bastion pública
  - 1 app privada
- `Internet Edge = ON`
- `Enable managed egress = ON`

Ejemplo probado:
- VPC: `10.50.0.0/16`
- `public-a1`: `10.50.1.0/24`
- `private-a1`: `10.50.2.0/24`
- `bastion-a1`: `10.50.1.10` con IP pública
- `app-a1`: `10.50.2.10` sin IP pública

### Señales esperadas en Validate

- `IGW` en 1 VPC
- `NAT` en 1 VPC
- 1 subnet pública
- 1 subnet privada
- 2 instancias

### Resultado observado

Deploy exitoso con outputs consistentes:
- `igw_ids` con valor
- `nat_gateway_ids` con valor
- `nat_eip_allocation_ids` con valor
- `instance_public_ips`
  - bastion con IP pública
  - app privada sin IP pública
- `instance_private_ips`
  - bastion `10.50.1.10`
  - app `10.50.2.10`

### Interpretación

Este es el caso correcto y más útil para tesis/demo.

Permite explicar:
- separación entre exposición pública y salida privada
- bastion pública + workload privada
- por qué NAT no equivale a hacer pública una instancia

### Estado final

- Clasificación: `válido y pedagógicamente fuerte`

## Caso 2: `public only + NAT`

### Topología

- 1 VPC
- 1 sola zona pública
- sin zonas privadas
- `Internet Edge = ON`
- `Enable managed egress = ON`

### Qué se quería probar

Validar si el producto permite una configuración técnicamente posible pero pedagógicamente débil.

### Resultado observado

La UI permitió configurar el caso y mostró un warning correcto:
- `Managed egress está activo, pero todavía no hay zonas privadas que aprovechen ese NAT.`

El deploy fue exitoso y creó:
- `IGW`
- `NAT Gateway`
- `NAT EIP`
- bastion pública con IP pública

Outputs observados:
- `nat_gateway_ids` con valor
- `nat_eip_allocation_ids` con valor
- una sola subnet pública
- sin workloads privadas

### Ajustes realizados en la aplicación

Se reforzó la UX para que este caso no pase desapercibido:
- warning en el formulario de `Network Segment`
- guía en `Plan Detail -> Pruebas`
- explicación en el modal de consola

### Interpretación

El caso es técnicamente válido, pero el NAT no aporta valor real si no existen zonas privadas.

Sirve para enseñar:
- costo vs beneficio
- por qué no todo lo que AWS permite es una buena decisión pedagógica

### Estado final

- Clasificación: `válido pero pedagógicamente débil`

## Caso 3: `private only + managed egress`

### Topología

- 1 VPC
- 1 sola zona privada
- sin zonas públicas
- intento de activar `Enable managed egress`

### Qué se quería probar

Verificar que el producto no deje una configuración incoherente para AWS.

### Resultado observado

La UI bloqueó correctamente el caso:
- mensaje mostrado:
  - `No hay subnets públicas en esta VPC. Crea una para poder habilitar la salida gestionada.`
- `Enable managed egress` quedó deshabilitado
- `Public Zone for Egress` quedó sin opciones útiles

El payload final quedó consistente:
- `nat_gateway.enabled = false`
- `public_subnet = ""`
- no se generó NAT inválido

### Interpretación

Este es el comportamiento correcto para el MVP.

Una VPC con solo zonas privadas no tiene dónde alojar un NAT público en AWS.

### Estado final

- Clasificación: `bloqueado correctamente por UX/validación`

## Hallazgos de UX y pedagogía

### 1. No conviene autoactivar `managed egress`

Aunque el usuario cree una zona pública, no es recomendable encender NAT automáticamente porque:
- el NAT tiene costo real
- no toda zona pública necesita NAT
- es mejor que la intención sea explícita

Decisión tomada:
- mantener activación manual
- acompañar con mensajes guía

### 2. La UI debe enseñar intención, no solo permitir combinaciones

Mejoras incorporadas:
- mensaje en `Network Segment` cuando ya existe una topología apta para `managed egress`
- hint en `private zone` explicando que la salida a Internet se habilita desde el segmento
- warning cuando hay NAT pero no hay zonas privadas que lo aprovechen

### 3. Las pruebas guiadas no deben limitarse a peering/TGW

Mejora incorporada en `Plan Detail -> Pruebas`:
- soporte para casos single-VPC con NAT
- soporte para casos `public-only + NAT`
- modal de consola más general y pedagógico

### 4. Exposición efectiva no es lo mismo que `Internet Edge` declarado

Mejora incorporada en el modal de validación:
- ya no se confunde `IGW` declarado con exposición pública efectiva
- si no hay subnets públicas, el copy lo aclara explícitamente

## Conclusión general

`Managed egress` quedó suficientemente cubierto para tesis y demo en tres planos:

1. funcional
- el caso correcto `public + private + NAT` despliega bien

2. pedagógico
- el caso `public-only + NAT` no se oculta; se permite, pero se explica por qué es un diseño débil

3. preventivo
- el caso `private-only + managed egress` se bloquea correctamente antes de derivar en una configuración inválida

## Recomendación para usar en la tesis

Si necesitas resumir este bloque en pocas líneas:

- el sistema modela `managed egress` como una decisión explícita a nivel de segmento/VPC
- su traducción a AWS crea `NAT Gateway` en una zona pública para dar salida a zonas privadas
- la interfaz no solo permite configurar, sino que también guía al usuario sobre cuándo la decisión tiene sentido y cuándo no
- se validaron casos correctos, casos débiles y casos inválidos bloqueados por la propia UI
