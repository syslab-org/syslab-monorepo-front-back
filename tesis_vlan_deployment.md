## ✅ Checkpoint de la Tesis: Plataforma para Simular y Desplegar VLANs en AWS

### 🎯 Objetivo General
Desarrollar una plataforma web que permita **simular y desplegar infraestructuras de red en AWS** a partir de un modelo visual, integrando un frontend interactivo para construir topologías (Canvas) y un backend automatizado (Terraform + Celery) que gestione validaciones, despliegues y monitoreo en tiempo real.

---

## 🧠 Modelo Conceptual de Simulación

### 1. VLAN Master (modal inicial)
- El usuario crea una **VLAN principal** desde un modal.
- Define:
  - `vlanName`
  - `cidrBlock` (e.g. `10.0.0.0/16`)
  - `region` (e.g. `us-east-1`)
- No se crea como recurso AWS, sino que sirve como **espacio de direccionamiento base** para la simulación.

### 2. VPCs como "subredes VLAN"
- Cada VPC creada en el canvas representa **una subred VLAN lógica**.
- Justificación:
  - En AWS, subnets dentro de una misma VPC están totalmente conectadas.
  - Para simular VLANs con aislamiento y control de tráfico, se usan **VPCs separadas**.
- Se asigna a cada VPC:
  - Subnet CIDR derivado del bloque maestro
  - Región o AZ (e.g. `us-east-1a`)

### 3. Subnets dentro de cada VPC
- El usuario crea subnets públicas o privadas:
  - `cidr_block`
  - `availability_zone`
  - `subnet_type`
- Estas subnets sí se traducen directamente a recursos `aws_subnet`.

### 4. Instancias dentro de subnets
- Cada subnet puede tener:
  - Uno o más nodos EC2
  - Propiedades como tipo, AMI, acceso SSH
- Representadas como `aws_instance` en Terraform.

### 5. Ruteo entre VPCs (router lógico)
- Se permite simular comunicación entre VPCs:
  - Se representa con un **router lógico**
  - Se define como `link` tipo `peering`
- Backend lo traduce a:
  - `aws_vpc_peering_connection`
  - `aws_route` en ambas direcciones

---

## 🔧 Backend y Terraform
- Terraform usa plantilla `main.tf.j2`
- En modo `simulate_only=true` se ejecuta `terraform plan`
- En modo `simulate_only=false`, si las credenciales lo permiten, ejecuta `terraform apply`
- Resultado: log de tarea + estado (pending, running, success, failure)
- Logs y estado almacenados en S3 + base de datos (Plan model)

---

## 🚀 Pasos Detallados para Desplegar una VLAN Completa

### ✅ Fase 1: Preparación
1. Ingresar al modal y crear VLAN master (`10.1.0.0/16`, `us-east-1`)
2. Crear múltiples VPCs representando subredes VLAN:
   - VPC A → `10.1.0.0/20`
   - VPC B → `10.1.16.0/20`
   - VPC C → `10.1.32.0/20`
3. Dentro de cada VPC:
   - Agregar subnets (ej. pública `10.1.0.0/24`, privada `10.1.1.0/24`)
   - Opcionalmente: agregar instancias EC2
4. Agregar enlaces entre VPCs (router):
   - Conectar VPC A ↔ VPC B con tipo `peering`
   - Agregar ruta a `10.1.16.0/20` en A y `10.1.0.0/20` en B

### ✅ Fase 2: Simulación (terraform plan)
1. Abrir modal de confirmación de despliegue
2. Toggle activado en modo "Simular solamente"
3. Enviar el plan → se ejecuta `terraform plan`
4. Ver estado y log de simulación desde frontend
5. Validar estructura de recursos y ruteo

### ✅ Fase 3: Despliegue real
1. Volver al modal, desactivar toggle de simulación
2. Verificar que `ALLOW_LOCAL_APPLY=1` y credenciales AWS están presentes
3. Enviar el plan → se ejecuta `terraform apply`
4. Infraestructura es creada en AWS:
   - VPCs
   - Subnets
   - IGWs (si hay subnets públicas)
   - Routing Tables
   - Peering
   - EC2 (opcional)
5. Confirmar estado en backend (tarea SUCCESS)
6. Verificar en AWS Console (VPC, EC2, etc.)

### ✅ Fase 4: Monitoreo y limpieza
1. Consultar estado de cada despliegue desde el historial
2. Validar estructura en canvas vs AWS
3. Si es una simulación de laboratorio:
   - Ejecutar `terraform destroy` o `make aws-down`

---

## 🧾 Recomendaciones
- Mantener VPCs pequeñas para evitar costos innecesarios
- Evitar instancias EC2 si no se requieren
- Implementar lógica para `terraform destroy` desde el frontend (futuro)
- Revisar límites de VPC peering en región

---

¿Deseas que este documento se genere como entregable académico o como guía de desarrollo interna?
Puedo ayudarte a exportarlo en PDF, resumirlo o convertirlo en un plan de pruebas.

