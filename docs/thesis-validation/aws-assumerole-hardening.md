# Hardening de AssumeRole e IAM Mínimo

Este documento baja a decisiones operativas lo que falta para endurecer el flujo `AssumeRole` del MVP sin cambiar su modelo funcional.

## 1. Identidad técnica dedicada del backend

## Problema actual

Hoy `AssumeRole` funciona, pero depende de una identidad base válida en backend para llamar `sts:AssumeRole`.

En local esa identidad puede ser una cuenta humana, por ejemplo:

- `arn:aws:iam::034739223309:user/tesis-admin`

Eso sirve para validación del MVP, pero no es el estado ideal para producción ni para una tesis que quiera dejar clara la separación entre usuario humano y principal técnico.

## Estado recomendado

Crear un principal técnico dedicado, por ejemplo:

- `arn:aws:iam::034739223309:user/syslab-backend-assumer`

o mejor aún:

- `arn:aws:iam::034739223309:role/syslab-backend-runtime`

Ese principal debería ser:

- exclusivo de la plataforma
- no usado por personas
- rotado o gobernado por infraestructura
- el único que puede asumir roles de laboratorio/curso

## Qué cambia en la práctica

La trust policy de los roles destino ya no confiaría en un usuario humano, sino en el principal técnico del backend.

Ejemplo:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::034739223309:role/syslab-backend-runtime"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "syslab-curso-redes1"
        }
      }
    }
  ]
}
```

## 2. Roles separados por contexto

No conviene reutilizar un mismo role para todo.

Separación recomendada:

- un role por cuenta personal del alumno cuando aplique
- un role por cuenta compartida del curso
- opcionalmente un role distinto por curso o por plantilla de laboratorio si el alcance cambia

Esto mejora:

- trazabilidad
- revocación
- principio de mínimo privilegio

## 3. Permisos IAM mínimos

## Qué se usó en la validación

Para validar rápido el flujo end-to-end, primero se permitió temporalmente `AdministratorAccess` en el role destino.

Eso fue útil para la primera prueba, pero no quedó como configuración final del caso compartido validado.

## Política mínima orientativa para el runtime actual

El runtime actual opera sobre recursos de red y cómputo básicos en AWS. Una política mínima inicial debería cubrir, como mínimo:

- `ec2:CreateVpc`
- `ec2:DeleteVpc`
- `ec2:DescribeVpcs`
- `ec2:CreateSubnet`
- `ec2:DeleteSubnet`
- `ec2:DescribeSubnets`
- `ec2:CreateRouteTable`
- `ec2:DeleteRouteTable`
- `ec2:CreateRoute`
- `ec2:ReplaceRoute`
- `ec2:DeleteRoute`
- `ec2:AssociateRouteTable`
- `ec2:DisassociateRouteTable`
- `ec2:CreateInternetGateway`
- `ec2:AttachInternetGateway`
- `ec2:DetachInternetGateway`
- `ec2:DeleteInternetGateway`
- `ec2:CreateSecurityGroup`
- `ec2:DeleteSecurityGroup`
- `ec2:AuthorizeSecurityGroupIngress`
- `ec2:RevokeSecurityGroupIngress`
- `ec2:AuthorizeSecurityGroupEgress`
- `ec2:RevokeSecurityGroupEgress`
- `ec2:RunInstances`
- `ec2:TerminateInstances`
- `ec2:DescribeInstances`
- `ec2:CreateTags`
- `ec2:DeleteTags`
- `ec2:AllocateAddress`
- `ec2:ReleaseAddress`
- `ec2:CreateNatGateway`
- `ec2:DeleteNatGateway`
- `ec2:DescribeNatGateways`
- `ec2:CreateVpcPeeringConnection`
- `ec2:AcceptVpcPeeringConnection`
- `ec2:DeleteVpcPeeringConnection`
- `ec2:DescribeVpcPeeringConnections`
- `ec2:CreateTransitGateway`
- `ec2:DeleteTransitGateway`
- `ec2:DescribeTransitGateways`
- `ec2:CreateTransitGatewayVpcAttachment`
- `ec2:DeleteTransitGatewayVpcAttachment`
- `ec2:DescribeTransitGatewayVpcAttachments`
- `ec2:CreateTransitGatewayRouteTable`
- `ec2:DeleteTransitGatewayRouteTable`
- `ec2:SearchTransitGatewayRoutes`
- `ec2:CreateTransitGatewayRoute`
- `ec2:DeleteTransitGatewayRoute`
- `ec2:EnableTransitGatewayRouteTablePropagation`
- `ec2:DisableTransitGatewayRouteTablePropagation`
- `ec2:GetTransitGatewayRouteTableAssociations`
- `ec2:GetTransitGatewayRouteTablePropagations`
- `sts:GetCallerIdentity`

## Recomendación práctica

Definir dos policies administradas por la plataforma:

1. `syslab-course-shared-network-builder`
   - usada por cuentas compartidas del curso
2. `syslab-personal-network-builder`
   - usada por cuentas personales de alumnos

La primera puede tener más holgura operativa.

La segunda debería ser más conservadora y, si es posible, acotada por tags o naming convention.

## Caso ya validado con policy mínima

El role compartido del curso:

- `syslab-course-redes1-role`

ya fue probado exitosamente sin `AdministratorAccess`, usando una policy mínima alineada con el runtime real del repositorio.

El caso validado cubrió:

- conexión `course_shared`
- autenticación `AWS AssumeRole`
- principal técnico dedicado del backend
- `APPLY` real exitoso
- reconciliación correcta entre:
  - `Próxima ejecución real`
  - `Evidencia del último APPLY real`
  - `Reconciliación de cuenta cloud`

Esto permite afirmar que el flujo compartido del curso ya no depende de privilegios administrativos totales para funcionar en el camino principal.

## Policy mínima validada para el role compartido

La policy usada y validada para `syslab-course-redes1-role` fue:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Ec2DescribeReadOnly",
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "VpcCoreLifecycle",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVpc",
        "ec2:DeleteVpc",
        "ec2:ModifyVpcAttribute",
        "ec2:CreateSubnet",
        "ec2:DeleteSubnet",
        "ec2:ModifySubnetAttribute",
        "ec2:CreateRouteTable",
        "ec2:DeleteRouteTable",
        "ec2:AssociateRouteTable",
        "ec2:DisassociateRouteTable",
        "ec2:CreateRoute",
        "ec2:ReplaceRoute",
        "ec2:DeleteRoute",
        "ec2:CreateInternetGateway",
        "ec2:AttachInternetGateway",
        "ec2:DetachInternetGateway",
        "ec2:DeleteInternetGateway",
        "ec2:CreateSecurityGroup",
        "ec2:DeleteSecurityGroup",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupIngress",
        "ec2:AuthorizeSecurityGroupEgress",
        "ec2:RevokeSecurityGroupEgress",
        "ec2:CreateTags",
        "ec2:DeleteTags"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Ec2InstanceLifecycle",
      "Effect": "Allow",
      "Action": [
        "ec2:RunInstances",
        "ec2:TerminateInstances",
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:RebootInstances"
      ],
      "Resource": "*"
    },
    {
      "Sid": "NatAndElasticIpLifecycle",
      "Effect": "Allow",
      "Action": [
        "ec2:AllocateAddress",
        "ec2:ReleaseAddress",
        "ec2:AssociateAddress",
        "ec2:DisassociateAddress",
        "ec2:CreateNatGateway",
        "ec2:DeleteNatGateway"
      ],
      "Resource": "*"
    },
    {
      "Sid": "VpcPeeringLifecycle",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVpcPeeringConnection",
        "ec2:AcceptVpcPeeringConnection",
        "ec2:DeleteVpcPeeringConnection"
      ],
      "Resource": "*"
    },
    {
      "Sid": "TransitGatewayLifecycle",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateTransitGateway",
        "ec2:DeleteTransitGateway",
        "ec2:CreateTransitGatewayVpcAttachment",
        "ec2:DeleteTransitGatewayVpcAttachment",
        "ec2:CreateTransitGatewayRouteTable",
        "ec2:DeleteTransitGatewayRouteTable",
        "ec2:AssociateTransitGatewayRouteTable",
        "ec2:DisassociateTransitGatewayRouteTable",
        "ec2:EnableTransitGatewayRouteTablePropagation",
        "ec2:DisableTransitGatewayRouteTablePropagation",
        "ec2:CreateTransitGatewayRoute",
        "ec2:DeleteTransitGatewayRoute",
        "ec2:SearchTransitGatewayRoutes"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ReadAmiFromSsm",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter"
      ],
      "Resource": [
        "arn:aws:ssm:*::parameter/aws/service/ami-amazon-linux-latest/*"
      ]
    },
    {
      "Sid": "ReadTgwQuota",
      "Effect": "Allow",
      "Action": [
        "servicequotas:GetServiceQuota"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ReadCallerIdentity",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

## Nota de alcance

Esta policy mínima validada es adecuada para el runtime actual del repositorio y sus recursos Terraform principales.

No debe interpretarse todavía como policy universal ni definitiva para cualquier topología futura; si el runtime agrega más recursos AWS, la policy deberá ajustarse.

## 4. Quién crea la cuenta compartida

En un entorno académico, la cuenta compartida del curso probablemente la cree:

- el profesor
- o un `platform_admin`

Eso implica esta separación:

- el profesor/admin crea la cuenta compartida y su role
- la plataforma registra esa conexión como `course_shared`
- alumnos y profesor pueden usarla según reglas del curso

## 5. Delegación explícita

La delegación explícita implementada en backend permite un caso fino:

- el laboratorio sigue usando una conexión `personal`
- el alumno autoriza temporalmente al profesor
- la ejecución queda auditada con `delegation_id`

Este patrón sirve cuando:

- no se quiere usar una cuenta compartida del curso
- se necesita revisión o corrección real puntual

## 6. Historial completo

El histórico agregado en este corte cubre:

- quién pidió la ejecución
- acción solicitada
- si fue `preview` o `real`
- conexión cloud usada
- cuenta AWS y `ARN`
- error si falló
- delegación utilizada si aplica

Modelo:

- `PlanExecutionRecord`

## 7. Orden recomendado de hardening

1. mover `AssumeRole` a un principal técnico dedicado del backend
2. reemplazar `AdministratorAccess` por policies mínimas
3. separar roles `personal` y `course_shared`
4. completar UI de delegación
5. extender el mismo patrón a otros providers
