# Matriz de Redeploy AWS

Este documento resume las pruebas manuales de redeploy realizadas sobre el laboratorio `lab-peering-valid` y los hallazgos técnicos obtenidos al validar y aplicar cambios sobre infraestructura ya desplegada en AWS.

## Alcance

- Provider probado: `aws`
- Plan validado: `d829ce3b-2da2-41ab-ac2b-fbb2efc53077`
- Canvas/Lab: `6a361285-dacf-4a64-bd30-1863ec54c759`
- Región: `us-east-1`
- Topología base:
  - 2 VPCs públicas
  - 2 subnets públicas
  - 2 instancias EC2
  - 1 peering entre VPCs

## Estado base validado

Se confirmó un despliegue exitoso con:

- `status = SUCCESS`
- `applied = true`
- `last_action = apply`
- `simulate_only = false`
- `can_destroy = true`

Outputs relevantes del estado base:

- `vpc_ids`
  - `0qs41rig -> vpc-076ba7056cb8bba35`
  - `35qwoshy -> vpc-0d0759e000c6fcc6c`
- `instance_ids`
  - `0qs41rig:bastion-a1 -> i-0ba1e50ae8d37987a`
  - `35qwoshy:bastion-b1 -> i-01418fa17d4739a51`
- `peering_ids`
  - `0qs41rig--35qwoshy -> pcx-0cd6f27a65d13a3ce`

## Casos probados

### Caso 1: Rename de segmento

- Cambio en canvas:
  - `VPC-A-V3 -> VPC-A-V4`
- Conectividad:
  - se mantuvo el peering
- JSON neutral validado:
  - `connectivity.mode = "direct"`
  - `links = [direct_link -> peering]`

Resultado del `Validate`:

- `Add: 0`
- `Change: 6`
- `Destroy: 0`
- `Replace: 0`

Interpretación:

- El rename se resolvió como actualización `in-place`.
- No se detectó destrucción de instancias.
- No se detectó reemplazo del `vm_sg`.
- Los cambios esperados son tags/nombres visibles de recursos asociados al segmento.

Conclusión:

- Clasificación: `safe`
- El rename de segmento ya no provoca recreación destructiva del Security Group.

### Caso 2: Eliminación de peering

- Cambio en canvas:
  - se eliminaron las policies del router
- Conectividad:
  - `connectivity.mode = "isolated"`
  - `links = []`
- Se mantuvieron:
  - VPCs
  - subnets
  - instancias
  - SSH CIDR

Resultado esperado del `Validate`:

- `Add: 0`
- `Change > 0`
- `Destroy > 0`
- `Replace: 0`

Resultado observado del `Validate` final:

- `Add: 0`
- `Change: 6`
- `Destroy: 5`
- `Replace: 0`

Recursos destruidos detectados:

- `aws_route.peer_a_to_b[...]`
- `aws_route.peer_b_to_a[...]`
- `aws_security_group_rule.cross_vpc_ping_peering_a[...]`
- `aws_security_group_rule.cross_vpc_ping_peering_b[...]`
- `aws_vpc_peering_connection.peer[...]`

Interpretación:

- La destrucción quedó acotada a conectividad.
- No se destruyeron VPCs.
- No se destruyeron instancias.
- No se destruyeron Security Groups base.

Primer `Apply`:

- Falló con:
  - `InvalidPermission.NotFound`
  - AWS reportó que una regla de ingress ya no existía en el Security Group.

Segundo ciclo:

- `Validate` posterior:
  - `Add: 0`
  - `Change: 2`
  - `Destroy: 0`
  - `Replace: 0`
- `Apply` posterior:
  - `No changes. Your infrastructure matches the configuration.`
  - `Apply complete! Resources: 0 added, 0 changed, 0 destroyed.`

Outputs finales:

- `peering_ids = {}`
- instancias conservadas
- VPCs conservadas
- SG base conservados

Conclusión:

- Clasificación: `destructive pero controlado`
- El redeploy destruye solo conectividad.
- El sistema puede converger tras un fallo transitorio de reconciliación de reglas SG.

### Caso 3: Cambio de `allowed_ssh_cidr`

- Cambio en canvas:
  - `190.20.220.72/32 -> 190.20.215.156/32`
- Conectividad:
  - se mantuvo el estado aislado (`links = []`)
- Se mantuvieron:
  - VPCs
  - subnets
  - instancias
  - nombres de segmentos

Resultado del `Validate`:

- `Add: 0`
- `Change: 4`
- `Destroy: 0`
- `Replace: 0`

Resultado final del `Apply`:

- `Apply complete! Resources: 0 added, 2 changed, 0 destroyed.`

Recursos modificados observados en logs:

- `aws_security_group.vm_sg["0qs41rig"]`
- `aws_security_group.vm_sg["35qwoshy"]`

Interpretación:

- El cambio fue un update `in-place` sobre reglas SSH de los Security Groups.
- No se destruyeron instancias.
- No se reemplazaron Security Groups.
- No hubo cambios en VPCs, subnets o route tables.

Outputs finales relevantes:

- `peering_ids = {}`
- `vm_security_group_ids` sin cambios
- `instance_ids` sin cambios
- `vpc_ids` sin cambios

Conclusión:

- Clasificación: `safe`
- El cambio de `allowed_ssh_cidr` es un redeploy operativo seguro.
- Este caso valida correctamente cambios menores de acceso sin impacto destructivo.

### Caso 4: Cambio de `instance_type` en una sola VM

- Cambio en canvas:
  - `bastion-a1`
  - `t2.micro -> t2.small`
- Conectividad:
  - se mantuvo el estado aislado (`links = []`)
- Se mantuvieron:
  - VPCs
  - subnets
  - Security Groups
  - `allowed_ssh_cidr`
  - IP privada

Resultado del `Validate` real (`simulate_only=false`):

- `Add: 0`
- `Change: 1`
- `Destroy: 0`
- `Replace: 0`

Detalle observado en logs:

- `aws_instance.vm["0qs41rig:bastion-a1"] will be updated in-place`
- `instance_type = "t2.micro" -> "t2.small"`
- `public_ip = "52.23.243.185" -> (known after apply)`

Resultado final del `Apply`:

- `Apply complete! Resources: 0 added, 1 changed, 0 destroyed.`

Outputs finales relevantes:

- `instance_ids`
  - `0qs41rig:bastion-a1` se mantuvo como `i-0ba1e50ae8d37987a`
- `instance_private_ips`
  - `0qs41rig:bastion-a1` se mantuvo como `10.40.1.10`
- `instance_public_ips`
  - `0qs41rig:bastion-a1` cambió de `52.23.243.185` a `98.81.5.40`

Interpretación:

- El cambio de tipo de instancia fue `in-place`.
- No hubo recreación de la instancia.
- No hubo destrucción de VPC, subnet ni Security Group.
- AWS realizó una modificación operativa sobre la instancia y la IP pública rotó.

Conclusión:

- Clasificación: `safe con impacto operativo`
- El cambio de `instance_type` en una VM puede aplicarse sin `replace`, pero debe asumirse posible cambio de IP pública si no existe Elastic IP.

### Caso 5: Cambio de `private_ip` en una sola VM

- Cambio en canvas:
  - `bastion-a1`
  - `10.40.1.10 -> 10.40.1.20`
- Conectividad:
  - se mantuvo el estado aislado (`links = []`)
- Se mantuvieron:
  - VPCs
  - subnets
  - Security Groups
  - `allowed_ssh_cidr`
  - `instance_type = t2.small`

Resultado del `Validate` real (`simulate_only=false`):

- `Add: 1`
- `Change: 0`
- `Destroy: 1`
- `Replace: 1`

Detalle observado en logs:

- `aws_instance.vm["0qs41rig:bastion-a1"] must be replaced`
- `private_ip = "10.40.1.10" -> "10.40.1.20" # forces replacement`

Resultado final del `Apply`:

- `Apply complete! Resources: 1 added, 0 changed, 1 destroyed.`

Secuencia observada:

- `aws_instance.vm["0qs41rig:bastion-a1"]: Destroying...`
- `aws_instance.vm["0qs41rig:bastion-a1"]: Destruction complete`
- `aws_instance.vm["0qs41rig:bastion-a1"]: Creating...`
- `aws_instance.vm["0qs41rig:bastion-a1"]: Creation complete`

Outputs finales relevantes:

- `instance_ids`
  - `0qs41rig:bastion-a1` cambió de `i-0ba1e50ae8d37987a` a `i-07f2eafff1aa36972`
- `instance_private_ips`
  - `0qs41rig:bastion-a1` cambió de `10.40.1.10` a `10.40.1.20`
- `instance_public_ips`
  - `0qs41rig:bastion-a1` cambió de `98.81.5.40` a `35.172.115.250`
- Sin cambios en:
  - `bastion-b1`
  - VPCs
  - subnets
  - Security Groups

Interpretación:

- Cambiar `private_ip` no es un update `in-place`.
- Terraform destruye y recrea la instancia.
- El impacto quedó acotado a una sola VM, pero con downtime y nueva identidad del recurso.

Conclusión:

- Clasificación: `destructive acotado a VM`
- El cambio de `private_ip` debe tratarse como reemplazo explícito de instancia.

### Caso 6: Cambio de `CIDR` de subnet con VM dentro

- Cambio en canvas:
  - subnet `public-a1`
  - `10.40.1.0/24 -> 10.40.2.0/24`
  - `bastion-a1 private_ip`
  - `10.40.1.20 -> 10.40.2.20`
- Conectividad:
  - se mantuvo el estado aislado (`links = []`)
- Se mantuvieron:
  - VPCs
  - Security Groups
  - route table nombrada `public`
  - `allowed_ssh_cidr`
  - `instance_type = t2.small`

Resultado del `Validate` real (`simulate_only=false`):

- `Add: 3`
- `Change: 0`
- `Destroy: 3`
- `Replace: 3`

Recursos reemplazados detectados:

- `aws_subnet.this["0qs41rig:public-a1"]`
- `aws_route_table_association.assoc["0qs41rig:public-a1"]`
- `aws_instance.vm["0qs41rig:bastion-a1"]`

Detalle observado en logs:

- `cidr_block = "10.40.1.0/24" -> "10.40.2.0/24" # forces replacement`
- `subnet_id = "subnet-03c9577e94044ae88" -> (known after apply) # forces replacement`
- `private_ip = "10.40.1.20" -> "10.40.2.20" # forces replacement`

Resultado final del `Apply`:

- `Apply complete! Resources: 3 added, 0 changed, 3 destroyed.`

Secuencia observada:

- destrucción de `aws_route_table_association.assoc["0qs41rig:public-a1"]`
- destrucción de `aws_instance.vm["0qs41rig:bastion-a1"]`
- destrucción de `aws_subnet.this["0qs41rig:public-a1"]`
- creación de nueva subnet
- recreación de asociación de route table
- creación de nueva instancia

Outputs finales relevantes:

- `subnet_ids`
  - `0qs41rig:public-a1` cambió de `subnet-03c9577e94044ae88` a `subnet-025aa6e6e6bd2c73b`
- `instance_ids`
  - `0qs41rig:bastion-a1` cambió de `i-07f2eafff1aa36972` a `i-0748fa9cb798af68d`
- `instance_private_ips`
  - `0qs41rig:bastion-a1` cambió de `10.40.1.20` a `10.40.2.20`
- `instance_public_ips`
  - `0qs41rig:bastion-a1` cambió de `35.172.115.250` a `13.217.92.66`
- Sin cambios en:
  - `bastion-b1`
  - VPCs
  - IGWs
  - Security Groups base

Interpretación:

- Cambiar el `CIDR` de una subnet no es un update `in-place`.
- Terraform reemplaza la subnet.
- Ese replace arrastra la asociación de route table y la VM residente en esa subnet.
- El impacto es fuerte, pero localizado al slice de red afectado.

Conclusión:

- Clasificación: `destructive acotado a subnet`
- El cambio de `CIDR` de subnet debe tratarse como reemplazo encadenado de subnet + asociación + VM(s) residentes.

## Hallazgos técnicos

### 1. Rename del segmento y Security Group

Problema original:

- El nombre visible del segmento se usaba para el atributo `name` del `aws_security_group.vm_sg`.
- Renombrar la VPC forzaba reemplazo del SG.

Corrección aplicada:

- Se estabilizó `name` y `description` del SG usando `each.key`.
- El nombre humano quedó solo en `tags.Name`.

Resultado:

- El rename de segmento dejó de forzar `replace` del `vm_sg`.

### 2. Preview (`simulate_only=true`) proponía destrucciones falsas

Problema original:

- En preview, el template omitía:
  - `aws_security_group.vm_sg`
  - `aws_instance.vm`
- Terraform interpretaba que había que destruir esos recursos.

Corrección aplicada:

- En preview, el template sigue renderizando instancias y SG.
- Solo se evitó la consulta real de AMI por SSM.

Resultado:

- El `Validate` dejó de mostrar destrucciones falsas de instancias y SG base.

### 3. Lifecycle del plan activo se perdía al revalidar

Problema original:

- Al actualizar un plan existente desde el canvas, el backend hacía `plan.applied = False`.
- El plan pasaba a verse como `PREVIEW` aunque la infraestructura siguiera activa en AWS.

Corrección aplicada:

- Se preserva `applied=True` al sincronizar cambios de canvas sobre un plan ya desplegado.

Resultado:

- El `Plan Detail` mantiene correctamente:
  - `ACTIVE`
  - `REAL`
  - última acción `plan` o `apply` según corresponda

## Clasificación actual de cambios

### Safe

- Rename de segmento/VPC
- Cambios de tags o nombre visible
- Cambio de `allowed_ssh_cidr`

### Safe con impacto operativo

- Cambiar tipo de instancia en una VM
- Riesgo esperado: rotación de `public_ip` si no existe Elastic IP

### Destructive pero controlado

- Eliminar peering
- Eliminar rutas de conectividad
- Eliminar reglas cross-VPC asociadas a peering

### Destructive acotado a VM

- Cambiar `private_ip` de una instancia
- Riesgo esperado:
  - nuevo `instance_id`
  - nueva `public_ip`
  - downtime durante destroy/create

### Destructive acotado a subnet

- Cambiar `CIDR` de una subnet con workloads dentro
- Riesgo esperado:
  - nueva subnet
  - nueva asociación de route table
  - recreación de VM(s) dentro de la subnet
  - nueva `public_ip` e `instance_id` en las VM afectadas

### Pendiente por probar

- Cambiar AMI
- Cambiar CIDR de VPC
- Transición peering -> TGW
- Transición TGW -> isolated

## Recomendación operativa

Cuando el plan indique:

- `Destroy = 0`
- `Replace = 0`

se puede tratar como redeploy seguro `in-place`.

Cuando el plan indique:

- destrucción de conectividad pero no de recursos base

se puede tratar como cambio destructivo controlado.

Cuando el plan indique:

- destrucción o reemplazo de instancias / SG base / subnets / VPCs

debe revisarse con más cuidado antes de aplicar.
