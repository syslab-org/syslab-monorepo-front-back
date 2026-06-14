# Catalogo Maestro de Casos de Prueba para Canvas y Deploy

Este documento organiza una bateria presentable y repetible de pruebas para el MVP actual de SysLab.

Aqui "todos los posibles escenarios" significa todos los casos funcionales que hoy aparecen explicitamente en el producto, en los escenarios versionados del frontend y en la evidencia tecnica ya validada en AWS:

- configuracion previa de `cloud connections`
- configuracion previa de `key pairs`
- escenarios validos del canvas con `deploy` exitoso
- escenarios invalidos que deben bloquearse antes del `deploy`
- casos de permisos sobre conexiones `personal` y `course_shared`
- casos de `redeploy`, `destroy` y transiciones de conectividad

## Alcance real

- provider desplegable real del MVP: `AWS`
- regiones observadas en la evidencia actual: principalmente `us-east-1`
- conectividad soportada en canvas: `isolated`, `direct links` traducidos a `peering`, y `hub routing` traducido a `Transit Gateway`
- modelado soportado: `Network Segment` (VPC), `Zone` (subnet), `Workload` (EC2) y `Connectivity Policy` (router)

Fuentes base de este catalogo:

- [Playbook de Conexiones Cloud AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/aws-cloud-connections-playbook.md)
- [Playbook de Key Pairs y Acceso SSH en AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/aws-key-pairs-ssh-playbook.md)
- [Matriz de Managed Egress AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/managed-egress-matrix.md)
- [Matriz de Redeploy AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/operacion/aws/redeploy-matrix.md)
- [Modelo de Ejecucion Cloud por Usuario](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/cloud-execution-model.md)
- [Escenarios versionados del frontend](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/apps/frontend/examples/network-scenarios/README.md)

## Vista rapida de la suite

| ID | Tipo | Caso | Resultado esperado |
|---|---|---|---|
| PF-01 | preflight | Conexion personal `Static Keys` | prueba `sts_ok` |
| PF-02 | preflight | Conexion `course_shared` `Static Keys` | prueba `sts_ok` |
| PF-03 | preflight | Conexion personal `AssumeRole` | `ARN` tipo `assumed-role/...` |
| PF-04 | preflight | Conexion `course_shared` `AssumeRole` | deploy habilitado al docente |
| PF-05 | preflight | Key pair AWS generada y compartida | `PLAN` y `APPLY` exitosos |
| PF-06 | preflight | Public key importada a AWS | `PLAN` y `APPLY` exitosos |
| C-01 | deploy | 1 VPC publica | deploy exitoso |
| C-02 | deploy | 1 VPC publica + privada + NAT | deploy exitoso |
| C-03 | deploy | 2 VPCs aisladas | deploy exitoso |
| C-04 | deploy | 2 VPCs con peering bidireccional | deploy exitoso |
| C-05 | deploy | 3 VPCs con direct links parciales | deploy exitoso |
| C-06 | deploy | 3 VPCs con hub routing/TGW | deploy exitoso |
| C-07 | deploy | public only + NAT | deploy exitoso pero pedagogicamente debil |
| V-01 | validacion | subnets solapadas | bloqueo antes de deploy |
| V-02 | validacion | direct link sin retorno | bloqueo antes de guardar router |
| V-03 | validacion | private only + managed egress | bloqueo de UX |
| P-01 | permisos | docente sobre lab personal del alumno | `APPLY` bloqueado |
| P-02 | permisos | docente sobre lab `course_shared` | `APPLY` habilitado |
| R-01 | redeploy | rename de segmento | `safe` |
| R-02 | redeploy | cambio de `allowed_ssh_cidr` | `safe` |
| R-03 | redeploy | cambio de `instance_type` | `safe con impacto operativo` |
| R-04 | redeploy | cambio de `private_ip` | `destructive acotado a VM` |
| R-05 | redeploy | cambio de CIDR de subnet | `destructive acotado a subnet` |
| R-06 | redeploy | `peering -> TGW` | `destructive pero controlado` |
| R-07 | redeploy | `TGW -> isolated` | `destructive pero controlado` |
| R-08 | cierre | `DESTROY` final | infraestructura eliminada |

## Reglas previas para cualquier caso

Antes de correr cualquier escenario, valida siempre lo siguiente:

1. El laboratorio debe usar `AWS` como `Cloud Provider`.
2. La `Cloud Connection` efectiva debe estar en estado `success`.
3. En `Plan Detail -> Proxima ejecucion real` debe verse:
   - provider
   - source
   - scope
   - region
   - cuenta AWS prevista
   - `ARN` conocido cuando aplique
4. La `key pair` usada por los workloads debe existir en la cuenta y region efectivas.
5. Si habra prueba SSH real, `Allowed SSH CIDR` debe coincidir con la IP publica real del operador.
6. Si el caso usa `AssumeRole`, la trust policy debe confiar en el principal base del backend.
7. Si el caso es de docente, el curso debe estar bien asociado y la conexion `course_shared` debe pertenecer al mismo curso.

## Flujo base comun desde cero

Este flujo se repite en casi todos los casos.

1. Inicia sesion con el actor correcto: alumno, docente o `platform_admin`.
2. En `LabsPage`, pulsa `Crear laboratorio`.
3. Define:
   - `Cloud Provider`: `AWS`
   - `Nombre del laboratorio`
   - `Descripcion, observaciones o notas`, usando el texto sugerido del caso cuando exista
   - `Curso`, si el caso es academico
   - `Conexión cloud`, preferiblemente explicita para la prueba
   - `Rango maestro (CIDR)`
   - `Region`: normalmente `us-east-1`
4. Entra al canvas.
5. Crea nodos en este orden:
   - primero `Network Segment`
   - luego `Zone`
   - luego `Workload`
   - al final `Connectivity Policy` si el caso requiere conectividad entre VPCs
6. Guarda el canvas.
7. Ejecuta `Validar`.
8. Revisa el resumen `Add / Change / Destroy / Replace`.
9. Si el caso es positivo, ejecuta `Deploy`.
10. En `Plan Detail`, valida:
   - `status = SUCCESS`
   - outputs
   - logs
   - pruebas guiadas
   - evidencia del ultimo `APPLY` real

## Suite de prevalidacion

### PF-01. Conexion personal `Static Keys`

Objetivo:
- probar que un alumno puede registrar y usar una conexion personal basada en access keys.

Pasos:
1. Inicia sesion como alumno.
2. Ve a `Settings -> Cloud Connections`.
3. Crea una conexion con:
   - `Scope`: `Personal`
   - `Autenticacion`: `AWS Static Keys`
   - `Region`: `us-east-1`
   - `AWS Access Key ID`
   - `AWS Secret Access Key`
4. Pulsa `Probar`.
5. Confirma banner de conexion valida.

Resultado esperado:
- `Last test = success`
- mensaje `sts_ok`
- aparece cuenta AWS valida en la identidad probada

### PF-02. Conexion `course_shared` `Static Keys`

Objetivo:
- probar que un docente puede crear una conexion compartida de curso.

Pasos:
1. Inicia sesion como docente.
2. Ve a `Settings -> Cloud Connections`.
3. Crea una conexion con:
   - `Scope`: `Curso`
   - `Curso`: el curso objetivo
   - `Autenticacion`: `AWS Static Keys`
   - `Region`: `us-east-1`
   - credenciales AWS validas
4. Ejecuta `Probar`.

Resultado esperado:
- conexion `success`
- visible para labs del mismo curso

### PF-03. Conexion personal `AssumeRole`

Objetivo:
- validar el flujo `AssumeRole` para un alumno.

Pasos:
1. Identifica el principal base del backend con `aws sts get-caller-identity`.
2. En AWS, crea un role destino con trust policy hacia ese principal base.
3. Si aplica, define `External ID`.
4. En `Cloud Connections`, crea:
   - `Scope`: `Personal`
   - `Autenticacion`: `AWS AssumeRole`
   - `AWS Role ARN`
   - `External ID`
   - `Region`
5. Pulsa `Probar`.

Resultado esperado:
- prueba `sts_ok`
- la identidad resultante debe verse como `arn:aws:sts::...:assumed-role/...`

### PF-04. Conexion `course_shared` `AssumeRole`

Objetivo:
- validar el flujo `AssumeRole` compartido para un curso.

Pasos:
1. Repite PF-03, pero creando la conexion como docente y con `Scope: Curso`.
2. Asociala al curso correcto.
3. Ejecuta `Probar`.

Resultado esperado:
- `success`
- disponible para laboratorios `course_shared`
- apta para `APPLY` por parte del docente

### PF-05. Key pair AWS generada y compartida

Objetivo:
- probar el flujo en el que AWS genera el `.pem` y el nombre de la key pair se registra en SysLab.

Pasos:
1. En AWS EC2, crea una key pair:
   - tipo `RSA`
   - formato `.pem`
2. Descarga el archivo privado.
3. En SysLab, ve a `Settings -> Key Pairs`.
4. Registra:
   - `Nombre`
   - `Scope`
   - `Curso`, si es compartida
   - `Region`
   - `Cloud Connection`
5. Usa ese nombre en un workload del canvas.

Resultado esperado:
- la key pair aparece como compatible para el workload
- el deploy encuentra la key pair en AWS

### PF-06. Public key importada a AWS

Objetivo:
- probar el flujo mas sano para curso: el estudiante conserva su clave privada y AWS recibe solo la publica.

Pasos:
1. Genera la clave local con `ssh-keygen`.
2. Importa la `.pub` en `EC2 -> Key Pairs -> Import key pair`.
3. Registra el nombre en `Settings -> Key Pairs`.
4. Usa ese nombre en el workload del canvas.

Resultado esperado:
- `PLAN` y `APPLY` correctos
- SSH real posible si `Allowed SSH CIDR` y la clave privada son correctos

## Suite de escenarios de canvas con deploy exitoso

### C-01. 1 VPC publica

Objetivo:
- demostrar el caso minimo con una sola VPC, una zona publica y un bastion.

Nombre sugerido del laboratorio:
- `lab-single-public`

Descripcion sugerida del laboratorio:
- Laboratorio base con una VPC publica, una subnet publica y un bastion EC2 para validar el flujo minimo de modelado, validacion y deploy en AWS.

Configuracion recomendada:
- actor: alumno
- conexion: `personal`
- key pair: PF-05 o PF-06
- region: `us-east-1`
- CIDR maestro: `10.20.0.0/16`

Paso a paso:
1. Crea un lab nuevo con `AWS`, nombre `lab-single-public`, `CIDR = 10.20.0.0/16`.
2. En el canvas, agrega un `Network Segment`.
3. Configuralo con:
   - `Segment Name`: `VPC-A`
   - `Segment CIDR Block`: `10.20.0.0/16`
   - `Region`: `us-east-1`
   - `Internet Edge`: `Enabled`
   - `Enable managed egress`: `Off`
   - `Allowed SSH CIDR`: tu IP publica real en formato `/32`
4. Agrega una `Zone` dentro del segmento:
   - `Zone Name`: `public-a1`
   - `Zone CIDR Block`: `10.20.1.0/24`
   - `Availability Zone`: `us-east-1a`
   - `Zone Type`: `Public`
5. Agrega un `Workload` dentro de la zona:
   - `Name of Instance`: `bastion-a1`
   - `private IP`: `10.20.1.10`
   - `Instance Type`: `t2.micro`
   - `SSH Access`: nombre de la key pair valida
6. Guarda el canvas.
7. Ejecuta `Validar`.
8. Si el resultado es correcto, ejecuta `Deploy`.

Resultado esperado:
- `PLAN` sin errores
- `APPLY` exitoso
- IP publica en outputs para `bastion-a1`

Evidencia clave:
- `instance_public_ips`
- `instance_private_ips`
- acceso SSH real si quieres cerrar con prueba operativa

### C-02. 1 VPC publica + privada + NAT

Objetivo:
- demostrar separacion entre bastion publica, workload privada y salida gestionada.

Nombre sugerido del laboratorio:
- `lab-single-nat`

Descripcion sugerida del laboratorio:
- Laboratorio con una VPC que combina subnet publica, subnet privada y NAT Gateway para demostrar salida gestionada desde workloads privados.

Configuracion recomendada:
- actor: alumno o docente
- conexion: `personal` o `course_shared`
- puede acelerarse con la plantilla `MVP 1 - 1 segmento (Bastion + App privada)`
- CIDR maestro: `10.30.0.0/16`

Paso a paso manual:
1. Crea un lab nuevo con `CIDR = 10.30.0.0/16`.
2. Agrega un `Network Segment`:
   - `Segment Name`: `VPC-A`
   - `Segment CIDR Block`: `10.30.0.0/16`
   - `Internet Edge`: `Enabled`
   - `Enable managed egress`: `On`
   - `Public Zone for Egress`: `public-a1`
   - `Allowed SSH CIDR`: tu IP publica `/32`
3. Agrega una `Zone` publica:
   - `public-a1`
   - `10.30.1.0/24`
   - `Public`
4. Agrega una `Zone` privada:
   - `private-a1`
   - `10.30.2.0/24`
   - `Private`
5. Agrega un `Workload` en `public-a1`:
   - `bastion-a1`
   - `10.30.1.10`
   - `t2.micro`
   - key pair valida
6. Agrega un `Workload` en `private-a1`:
   - `app-a1`
   - `10.30.2.10`
   - `t2.micro`
   - key pair valida
7. Guarda, valida y despliega.

Resultado esperado:
- `IGW` creado
- `NAT Gateway` creado
- bastion con IP publica
- `app-a1` sin IP publica

Evidencia clave:
- `nat_gateway_ids`
- `nat_eip_allocation_ids`
- `instance_public_ips`
- `instance_private_ips`

### C-03. 2 VPCs aisladas

Objetivo:
- tener una linea base con dos segmentos sin conectividad entre si.

Nombre sugerido del laboratorio:
- `lab-two-vpcs-isolated`

Descripcion sugerida del laboratorio:
- Laboratorio con dos VPCs independientes y sin conectividad entre ellas, usado como linea base para comparar escenarios con peering o TGW.

Configuracion recomendada:
- actor: alumno o docente
- conexion: cualquiera valida
- CIDR maestro: `10.50.0.0/15`

Paso a paso:
1. Crea un lab con `CIDR = 10.50.0.0/15`.
2. Agrega `VPC-A`:
   - CIDR `10.50.0.0/16`
   - `Internet Edge = Enabled`
   - `Allowed SSH CIDR` valido
3. Dentro de `VPC-A`, crea `public-a1` con `10.50.1.0/24`.
4. Dentro de `public-a1`, crea `bastion-a1` con `10.50.1.10`.
5. Agrega `VPC-B`:
   - CIDR `10.51.0.0/16`
   - `Internet Edge = Enabled`
6. Dentro de `VPC-B`, crea `public-b1` con `10.51.1.0/24`.
7. Dentro de `public-b1`, crea `bastion-b1` con `10.51.1.10`.
8. No agregues `Connectivity Policy`.
9. Guarda, valida y despliega.

Resultado esperado:
- ambas VPCs desplegadas
- sin `peering`
- sin `TGW`

### C-04. 2 VPCs con peering bidireccional

Objetivo:
- demostrar conectividad `direct links` correcta entre dos segmentos.

Nombre sugerido del laboratorio:
- `lab-peering-valid`

Descripcion sugerida del laboratorio:
- Laboratorio con dos VPCs unidas por peering bidireccional para validar rutas de ida y vuelta y conectividad entre bastiones.

Configuracion recomendada:
- actor: alumno
- conexion: `personal`
- CIDR maestro: `10.40.0.0/15`

Paso a paso:
1. Repite los pasos estructurales de C-03, pero usando:
   - `VPC-A = 10.40.0.0/16`
   - `public-a1 = 10.40.1.0/24`
   - `bastion-a1 = 10.40.1.10`
   - `VPC-B = 10.41.0.0/16`
   - `public-b1 = 10.41.1.0/24`
   - `bastion-b1 = 10.41.1.10`
2. Agrega un nodo `Connectivity Policy`.
3. Conecta `VPC-A` y `VPC-B` al router.
4. Abre el router y define:
   - `Connectivity model`: `Direct links (AWS: Peering)`
5. Crea dos rutas:
   - origen `VPC-A`, destino `VPC-B`, CIDR `10.41.0.0/16`
   - origen `VPC-B`, destino `VPC-A`, CIDR `10.40.0.0/16`
6. Guarda el router.
7. Guarda el canvas.
8. Ejecuta `Validar` y luego `Deploy`.

Resultado esperado:
- `peering` creado
- `Plan Detail -> Pruebas` sugiere pruebas de ping bidireccional
- no se recrean VPCs base

### C-05. 3 VPCs con direct links parciales

Objetivo:
- mostrar que algunos pares pueden quedar conectados y otros aislados.

Nombre sugerido del laboratorio:
- `lab-peering-partial`

Descripcion sugerida del laboratorio:
- Laboratorio con tres VPCs y conectividad parcial por peering, donde algunos pares se comunican y otros permanecen aislados.

Configuracion recomendada:
- actor: docente o alumno
- puede acelerarse con la plantilla `Caso 3 - 3 segmentos con conectividad parcial`
- CIDR maestro: `10.64.0.0/12`

Paso a paso manual:
1. Crea un lab con `CIDR = 10.64.0.0/12`.
2. Crea tres segmentos:
   - `VPC-A = 10.70.0.0/16`
   - `VPC-B = 10.71.0.0/16`
   - `VPC-C = 10.72.0.0/16`
3. Crea una zona publica en cada VPC:
   - `public-a1 = 10.70.1.0/24`
   - `public-b1 = 10.71.1.0/24`
   - `public-c1 = 10.72.1.0/24`
4. Crea un workload bastion en cada zona:
   - `bastion-a1 = 10.70.1.10`
   - `bastion-b1 = 10.71.1.10`
   - `bastion-c1 = 10.72.1.10`
5. Agrega un router y conecta las tres VPCs.
6. En el router, selecciona `Direct links`.
7. Define cuatro rutas:
   - `VPC-A -> 10.71.0.0/16`
   - `VPC-B -> 10.70.0.0/16`
   - `VPC-B -> 10.72.0.0/16`
   - `VPC-C -> 10.71.0.0/16`
8. Guarda, valida y despliega.

Resultado esperado:
- `VPC-A <-> VPC-B` conectadas
- `VPC-B <-> VPC-C` conectadas
- `VPC-A <-> VPC-C` aisladas

### C-06. 3 VPCs con hub routing/TGW

Objetivo:
- demostrar un caso multipunto con `Transit Gateway`.

Nombre sugerido del laboratorio:
- `lab-tgw-full-mesh`

Descripcion sugerida del laboratorio:
- Laboratorio multipunto con tres VPCs conectadas mediante Transit Gateway para demostrar hub routing y alcance entre todos los segmentos.

Configuracion recomendada:
- actor: docente
- conexion: `course_shared`
- CIDR maestro amplio, por ejemplo `10.0.0.0/8`

Paso a paso:
1. Crea un lab nuevo con `CIDR = 10.0.0.0/8`.
2. Crea tres segmentos:
   - `VPC-A = 10.60.0.0/16`
   - `VPC-B = 10.61.0.0/16`
   - `VPC-C = 10.62.0.0/16`
3. Crea una zona publica en cada segmento:
   - `public-a1 = 10.60.1.0/24`
   - `public-b1 = 10.61.1.0/24`
   - `public-c1 = 10.62.1.0/24`
4. Crea un workload en cada zona:
   - `bastion-a1 = 10.60.1.10`
   - `bastion-b1 = 10.61.1.10`
   - `bastion-c1 = 10.62.1.10`
5. Agrega un router y conecta las tres VPCs.
6. En el router, selecciona `Hub routing (AWS: Transit Gateway)`.
7. Crea rutas de ida y vuelta hacia el hub para cada par:
   - desde `VPC-A` hacia `10.61.0.0/16` y `10.62.0.0/16`
   - desde `VPC-B` hacia `10.60.0.0/16` y `10.62.0.0/16`
   - desde `VPC-C` hacia `10.60.0.0/16` y `10.61.0.0/16`
8. Guarda, valida y despliega.

Resultado esperado:
- 1 `Transit Gateway`
- 1 attachment por VPC
- rutas via `TGW`

### C-07. public only + NAT

Objetivo:
- demostrar un caso tecnicamente valido pero pedagogicamente debil.

Nombre sugerido del laboratorio:
- `lab-public-only-nat`

Descripcion sugerida del laboratorio:
- Laboratorio con una VPC publica y NAT habilitado sin subnets privadas, util para mostrar un caso valido pero poco recomendable en terminos de diseno.

Paso a paso:
1. Crea un lab con una sola VPC.
2. Configura el segmento con:
   - `Internet Edge = Enabled`
   - `Enable managed egress = On`
3. Crea solo una zona publica.
4. Crea un solo bastion publico.
5. Guarda, valida y despliega.

Resultado esperado:
- `IGW` y `NAT Gateway` creados
- warning visible indicando que no hay zonas privadas aprovechando el NAT

## Suite de validaciones negativas

### V-01. Subnets solapadas

Objetivo:
- comprobar que la plataforma detecta solapamiento de CIDR dentro de una misma VPC.

Nombre sugerido del laboratorio:
- `lab-overlap-invalid`

Descripcion sugerida del laboratorio:
- Laboratorio de validacion negativa para comprobar que el sistema bloquea subnets solapadas dentro de una misma VPC antes del deploy.

Paso a paso:
1. Crea un lab con `CIDR = 10.80.0.0/16`.
2. Crea `VPC-A = 10.80.0.0/16`.
3. Crea `public-a1 = 10.80.1.0/24`.
4. Crea `public-a2-overlap = 10.80.1.128/25`.
5. Ejecuta `Validar`.

Resultado esperado:
- error de validacion por solapamiento
- no avanzar a deploy

### V-02. Direct link sin retorno

Objetivo:
- comprobar que un peering directo exige ida y vuelta.

Nombre sugerido del laboratorio:
- `lab-peering-one-way-invalid`

Descripcion sugerida del laboratorio:
- Laboratorio de validacion negativa para demostrar que un peering directo incompleto, sin ruta de retorno, no debe permitirse.

Paso a paso:
1. Construye el caso C-04.
2. En el router, deja solo una ruta:
   - `VPC-A -> 10.41.0.0/16`
3. Intenta guardar el router.

Resultado esperado:
- advertencia `Solo ida`
- guardado bloqueado

### V-03. private only + managed egress

Objetivo:
- comprobar que no se pueda activar NAT sin una subnet publica donde alojarlo.

Nombre sugerido del laboratorio:
- `lab-private-only-egress-invalid`

Descripcion sugerida del laboratorio:
- Laboratorio de validacion negativa para verificar que no se puede activar managed egress cuando la VPC no tiene una subnet publica apta para NAT.

Paso a paso:
1. Crea una sola VPC.
2. Crea solo una zona `Private`.
3. Intenta activar `Enable managed egress` en el segmento.

Resultado esperado:
- mensaje `No hay subnets publicas en esta VPC`
- `Enable managed egress` bloqueado

## Suite de permisos

### P-01. Docente bloqueado sobre conexion personal del alumno

Objetivo:
- demostrar separacion entre revision academica y autoridad cloud real.

Nombre sugerido del laboratorio:
- `lab-student-personal-blocked-for-teacher`

Descripcion sugerida del laboratorio:
- Laboratorio de permisos donde un alumno usa una conexion personal y el docente solo puede validar, pero no ejecutar apply ni destroy.

Preparacion:
- alumno con conexion `personal`
- laboratorio del alumno creado y visible para el docente

Pasos:
1. Como alumno, crea y deja listo un laboratorio con conexion personal explicita.
2. Como docente, abre el lab del alumno.
3. Ejecuta `Validar`.
4. Intenta ejecutar `Deploy` o `Destroy`.

Resultado esperado:
- `PLAN` permitido
- `APPLY` y `DESTROY` bloqueados

### P-02. Docente habilitado sobre conexion `course_shared`

Objetivo:
- demostrar que el docente si puede operar sobre infraestructura del curso.

Nombre sugerido del laboratorio:
- `lab-course-shared-teacher-apply`

Descripcion sugerida del laboratorio:
- Laboratorio de permisos con conexion course_shared, preparado para demostrar que el docente si puede operar infraestructura asociada al curso.

Preparacion:
- curso con conexion `course_shared` valida
- laboratorio asociado a esa conexion

Pasos:
1. Como docente, crea o edita el lab para fijar la conexion `course_shared`.
2. Revisa `Proxima ejecucion real`.
3. Ejecuta `Validar`.
4. Ejecuta `Deploy`.

Resultado esperado:
- `APPLY` habilitado
- evidencia del ultimo apply con la cuenta del curso

## Suite de redeploy y cierre

Usa preferiblemente C-04 como laboratorio base para estos cambios, porque ya existe evidencia real sobre esa topologia.

### R-01. Rename de segmento

Cambio:
- `VPC-A -> VPC-A-V2`

Laboratorio base sugerido:
- `lab-peering-valid`

Descripcion sugerida del laboratorio base:
- Laboratorio con dos VPCs y peering bidireccional, reutilizado como base para probar cambios seguros y redeploys controlados sin rehacer el escenario completo.

Resultado esperado:
- `safe`
- sin reemplazo destructivo de SG ni instancias

### R-02. Cambio de `allowed_ssh_cidr`

Cambio:
- sustituir la IP publica autorizada por otra `/32`

Laboratorio base sugerido:
- `lab-peering-valid`

Descripcion sugerida del laboratorio base:
- Laboratorio con dos VPCs y peering bidireccional, reutilizado como base para probar cambios seguros y redeploys controlados sin rehacer el escenario completo.

Resultado esperado:
- `safe`
- cambios `in-place` sobre `Security Groups`

### R-03. Cambio de `instance_type`

Cambio:
- `t2.micro -> t2.small`

Laboratorio base sugerido:
- `lab-peering-valid`

Descripcion sugerida del laboratorio base:
- Laboratorio con dos VPCs y peering bidireccional, reutilizado como base para probar cambios seguros y redeploys controlados sin rehacer el escenario completo.

Resultado esperado:
- `safe con impacto operativo`
- posible cambio de IP publica
- misma identidad logica de la VM en el canvas

### R-04. Cambio de `private_ip`

Cambio:
- por ejemplo `10.40.1.10 -> 10.40.1.20`

Laboratorio base sugerido:
- `lab-peering-valid`

Descripcion sugerida del laboratorio base:
- Laboratorio con dos VPCs y peering bidireccional, reutilizado como base para probar cambios seguros y redeploys controlados sin rehacer el escenario completo.

Resultado esperado:
- reemplazo de la instancia
- nuevo `instance_id`
- nueva `public_ip`

### R-05. Cambio de CIDR de subnet

Cambio:
- por ejemplo `10.40.1.0/24 -> 10.40.2.0/24`

Laboratorio base sugerido:
- `lab-peering-valid`

Descripcion sugerida del laboratorio base:
- Laboratorio con dos VPCs y peering bidireccional, reutilizado como base para probar cambios seguros y redeploys controlados sin rehacer el escenario completo.

Resultado esperado:
- reemplazo de subnet
- reemplazo de asociacion de route table
- reemplazo de la VM residente

### R-06. Transicion `peering -> TGW`

Cambio:
- reemplazar `Direct links` por `Hub routing`

Laboratorio base sugerido:
- `lab-peering-valid`

Descripcion sugerida del laboratorio base:
- Laboratorio con dos VPCs y peering bidireccional, reutilizado como base para probar cambios seguros y redeploys controlados sin rehacer el escenario completo.

Resultado esperado:
- destruccion solo de conectividad anterior
- creacion de `TGW`, attachments y rutas
- VPCs e instancias conservadas

### R-07. Transicion `TGW -> isolated`

Cambio:
- eliminar el router o dejar `links = []`

Laboratorio base sugerido:
- `lab-peering-valid`

Descripcion sugerida del laboratorio base:
- Laboratorio con dos VPCs y peering bidireccional, reutilizado como base para probar cambios seguros y redeploys controlados sin rehacer el escenario completo.

Resultado esperado:
- eliminacion de `TGW` y rutas
- infraestructura base conservada

### R-08. `Destroy` final

Objetivo:
- demostrar que el laboratorio no deja costo abierto.

Laboratorio base sugerido:
- `lab-peering-valid`

Descripcion sugerida del laboratorio base:
- Laboratorio con dos VPCs y peering bidireccional, reutilizado como base para probar cambios seguros y redeploys controlados sin rehacer el escenario completo.

Pasos:
1. Abre `Plan Detail` del laboratorio activo.
2. Ejecuta `Destroy`.
3. Espera finalizacion.
4. Revisa outputs y estado final.

Resultado esperado:
- infraestructura eliminada
- plan en estado destruido o equivalente

## Orden recomendado para la defensa

Si necesitas una presentacion corta y convincente, no hace falta correr toda la suite en vivo. Este es el orden recomendado:

1. PF-03 o PF-01 para mostrar la conexion cloud valida.
2. PF-05 o PF-06 para mostrar que la key pair esta bien resuelta.
3. C-02 como caso pedagogico fuerte de `public + private + NAT`.
4. C-04 como caso de conectividad con peering.
5. R-02 como redeploy seguro y facil de explicar.
6. P-01 o P-02 para mostrar control de permisos.
7. R-08 como cierre limpio con `Destroy`.

## Evidencias minimas que debes capturar

Para cada caso positivo conviene guardar al menos:

- screenshot del canvas final
- screenshot de `Validar` con `Add / Change / Destroy / Replace`
- screenshot de `Plan Detail`
- screenshot de `Outputs`
- screenshot de `Pruebas`
- screenshot de `Proxima ejecucion real`
- screenshot de `Evidencia del ultimo APPLY real`

Para cada caso negativo:

- screenshot del mensaje de validacion o del bloqueo de UX

## Criterio de cierre

Puedes considerar esta bateria "suficiente para presentar el producto final" si completas al menos:

1. dos casos positivos de deploy:
   - C-02
   - C-04 o C-06
2. un caso negativo de validacion:
   - V-01 o V-02
3. un caso de permisos:
   - P-01 o P-02
4. un caso de redeploy:
   - R-02 o R-03
5. un `Destroy` final:
   - R-08

Con eso cubres:
- modelado en canvas
- validacion previa
- despliegue real
- observabilidad
- seguridad/permisos
- redeploy
- limpieza de infraestructura
