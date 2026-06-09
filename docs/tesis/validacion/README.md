# Validación Técnica para Tesis

Esta carpeta reúne la evidencia técnica más útil para redactar la documentación del MVP y preparar la presentación de tesis.

## Qué contiene

### 0. Catalogo maestro de pruebas

Documento de entrada recomendado:
- [Catalogo Maestro de Casos de Prueba para Canvas y Deploy](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/canvas-deploy-test-catalog.md)

Que resume:
- checklist previa de `cloud connections` y `key pairs`
- escenarios positivos de canvas con `deploy` exitoso
- escenarios negativos que deben bloquearse antes del deploy
- casos de permisos `personal` vs `course_shared`
- casos de `redeploy` y `destroy`

Util para:
- preparar la defensa final
- convertir la validacion tecnica en una bateria ordenada de pruebas
- decidir que casos correr en vivo y cuales dejar como evidencia capturada

### 1. Redeploy sobre AWS

Documento fuente principal:
- [Matriz de Redeploy AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/operacion/aws/redeploy-matrix.md)

Qué resume:
- pruebas reales de `deploy`, `redeploy` y `destroy`
- clasificación de cambios `safe` vs `destructive pero controlado`
- transiciones de conectividad entre `peering`, `TGW` e `isolated`
- incidente real de reglas ICMP/`Security Group` y fix aplicado
- estabilización visual de estados como `OUTDATED`, `REDEPLOY` y `Destroy`

Casos ya cubiertos allí:
- rename de segmento
- eliminación de peering
- cambio de `allowed_ssh_cidr`
- cambio de `instance_type`
- `peering -> TGW`
- `TGW -> isolated`

### 2. Managed Egress en AWS

Documento específico:
- [Matriz de Managed Egress AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/managed-egress-matrix.md)

Qué resume:
- cómo se interpreta `Enable managed egress` en el producto
- qué traduce Terraform en AWS
- casos válidos, casos débiles y casos bloqueados por UX/validación
- hallazgos de pedagogía y copy para tesis/demo

Casos cubiertos:
- `public + private + NAT`
- `public only + NAT`
- `private only + managed egress`

### 3. Cierre del MVP

Documento estratégico:
- [Plan de Cierre del MVP para Tesis](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/mvp-thesis-plan.md)

Útil para redactar:
- objetivo del MVP
- alcance real del provider (`AWS-first`)
- decisiones de producto
- prioridades de cierre
- límites conocidos

### 4. Modelo de ejecución cloud

Documento de decisión:
- [Modelo de Ejecución Cloud por Usuario](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/cloud-execution-model.md)

Útil para redactar:
- quién puede hacer `deploy` real
- cómo separar revisión docente de ejecución cloud
- cómo pasar de `AWS-first` a multi-cloud sin rehacer permisos
- cómo registrar conexiones personales y compartidas de curso en el MVP

Playbook operativo complementario:
- [Playbook de Conexiones Cloud AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/aws-cloud-connections-playbook.md)
- [Playbook de Key Pairs y Acceso SSH en AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/aws-key-pairs-ssh-playbook.md)

Útil para redactar y repetir pruebas:
- flujo `Static Keys` vs `AssumeRole`
- diferencia entre principal base y role destino
- validación de `personal` vs `course_shared`
- señales concretas en `Plan Detail` para confirmar qué identidad ejecutó
- escenarios probados para key pairs AWS-generadas vs public key importada
- dependencia práctica de `Allowed SSH CIDR` para SSH real

Documentos de cierre de control de usuarios:
- [Matriz Formal de Permisos y Control de Usuarios](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/user-control-permissions-matrix.md)
- [Hardening de AssumeRole e IAM Mínimo](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/aws-assumerole-hardening.md)
- [Caso Validado: Cambio de Cuenta Cloud tras APPLY Real](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/cloud-target-reconciliation-case.md)

Hallazgo operativo ya validado:
- el role compartido `syslab-course-redes1-role` ya funciona con policy mínima y sin `AdministratorAccess`

### 5. Guion de presentación

Documento operativo:
- [Guion Oficial de Demo para Tesis](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/demo-thesis-script.md)

Útil para redactar:
- narrativa de demo
- orden de pantallas
- cambios recomendados para redeploy en presentación
- riesgos y plan B
- QA pedagógica

## Lectura recomendada para redactar la tesis

### Si quieres escribir la sección de validación técnica

1. leer la [Matriz de Redeploy AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/operacion/aws/redeploy-matrix.md)
2. leer la [Matriz de Managed Egress AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/managed-egress-matrix.md)
3. extraer desde ahí:
   - casos seguros
   - casos destructivos controlados
   - límites del sistema
   - decisiones de UX/validación

### Si quieres escribir la sección de alcance del MVP

1. leer el [Plan de Cierre del MVP para Tesis](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/mvp-thesis-plan.md)
2. leer el [Modelo de Ejecución Cloud por Usuario](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/cloud-execution-model.md)
3. leer el [Playbook de Conexiones Cloud AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/aws-cloud-connections-playbook.md)
4. leer el [Playbook de Key Pairs y Acceso SSH en AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/aws-key-pairs-ssh-playbook.md)
5. leer la [Matriz Formal de Permisos y Control de Usuarios](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/user-control-permissions-matrix.md)
6. leer el [Caso Validado: Cambio de Cuenta Cloud tras APPLY Real](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/cloud-target-reconciliation-case.md)
7. usar como idea central:
   - `AWS-first`
   - conexión cloud por owner de ejecución
   - `course_shared` como caso docente controlado
   - delegación explícita como excepción auditable sobre cuentas personales
   - `AssumeRole` como mejora de seguridad frente a keys permanentes
   - multi-cloud como extensibilidad arquitectónica, no como capacidad cerrada del MVP

### Si quieres preparar la defensa/demo

1. seguir el [Guion Oficial de Demo para Tesis](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/demo-thesis-script.md)
2. complementar con evidencia de:
   - redeploy real
   - outputs
   - logs
   - pruebas guiadas

## Hallazgos transversales ya consolidados

- El flujo `Canvas -> Validate -> Deploy/Redeploy -> Plan Detail` está suficientemente maduro para demo.
- El estado `OUTDATED` ya funciona como guardrail real antes de redeploy.
- `Plan Detail` ya centraliza suficiente observabilidad para no depender tanto de AWS Console.
- `Próxima ejecución real` y `Evidencia del último APPLY real` ya sirven como trazabilidad concreta de qué cuenta/ARN ejecutó.
- la reconciliación de cuenta cloud evita interpretar como vigente en la cuenta actual una infraestructura creada con otra conexión.
- `Managed egress` debe mantenerse como decisión explícita del usuario; no conviene autoactivarlo al crear una zona pública.
- La pedagogía mejora cuando la UI distingue entre:
  - intención neutral
  - traducción AWS
  - exposición efectiva
  - diseño técnicamente válido pero débil

## Recomendación de uso

Usa esta carpeta como punto de entrada de documentación. Los documentos existentes siguen siendo válidos y más detallados; aquí solo quedan organizados con una ruta de lectura clara.
