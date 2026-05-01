# Playbook de Key Pairs y Acceso SSH en AWS

Este documento registra los escenarios validados para entender como se relacionan:

- `Key Pairs` en SysLab
- `ssh_access` en el canvas
- `Allowed SSH CIDR`
- acceso SSH real a instancias EC2 desplegadas desde un laboratorio

El foco aqui no es IAM ni `AssumeRole`, sino el tramo final de acceso operativo a las instancias ya creadas.

## Idea clave

En el MVP actual, SysLab usa solo el **nombre de la key pair en AWS**.

La plataforma:

- no guarda el archivo privado
- no distribuye `.pem`
- no crea acceso SSH por si sola

Para desplegar una instancia con SSH:

1. la key pair debe existir en la cuenta y region AWS efectivas
2. el nodo EC2 debe declarar `ssh_access` con ese nombre
3. el usuario que va a conectarse debe tener la **clave privada** correspondiente en su computador
4. la red debe permitir entrada por SSH segun `Allowed SSH CIDR`

## Qué valida el catalogo de Key Pairs

El catalogo sirve para:

- sugerir nombres correctos en el canvas
- reducir errores de tipeo en `ssh_access`
- contextualizar por curso, region y `Cloud Connection`
- bloquear el `APPLY` si la key pair no existe en la cuenta o region efectivas

No sirve para:

- guardar el `.pem`
- compartir claves privadas
- descargar claves desde AWS

## Escenario A validado: AWS genera la key pair y el profesor comparte la clave privada

### Objetivo

Validar el flujo mas simple:

- el profesor crea la key pair en AWS
- descarga el archivo privado
- registra el nombre en SysLab
- el estudiante usa ese nombre en el canvas
- el estudiante entra por SSH usando la clave privada entregada

### Paso a paso del profesor

#### 1. Crear la key pair en AWS

En `EC2 -> Key Pairs -> Create key pair`:

- nombre: `redes1-demo-aws-generated`
- tipo: `RSA`
- formato: `.pem`

AWS descarga un archivo como:

```text
redes1-demo-aws-generated.pem
```

#### 2. Registrar la key pair en SysLab

En `Key Pairs -> Nueva key pair`:

- `Nombre`: `redes1-demo-aws-generated`
- `Scope`: `Curso compartido`
- `Curso`: `Redes 1`
- `Region`: `us-east-1`
- `Conexion cloud vinculada`: la conexion efectiva del curso

#### 3. Compartir la clave privada al estudiante

Para esta prueba se compartio el archivo privado con el estudiante. Tecnica y funcionalmente funciona, pero no es una practica recomendada para uso real prolongado porque varias personas terminan usando la misma clave privada.

### Paso a paso del estudiante

#### 1. Abrir el laboratorio

Se uso un laboratorio con:

- `bastion-a1` en subnet publica
- `app-a1` en subnet privada

#### 2. Asignar la key pair en el canvas

En el nodo EC2 publico:

- `SSH Access`: `redes1-demo-aws-generated`

Si se quiere acceder tambien a workloads privadas por SSH a traves del bastion, el nodo privado debe usar una key pair compatible.

#### 3. Revisar `Allowed SSH CIDR`

Este punto fue critico en la validacion.

El laboratorio guiado venia con un valor por defecto que no correspondia a la IP publica real desde la que el estudiante estaba probando. El resultado fue:

- `deploy` correcto
- `SSH` fallando con `timeout`

La correccion fue actualizar `Allowed SSH CIDR` para que coincidiera con la IP publica real del estudiante.

#### 4. Ejecutar `PLAN` y `APPLY`

Resultado validado:

- `PLAN` correcto
- `APPLY` correcto
- bastion publica creada con IP publica

#### 5. Probar SSH desde Windows

Ejemplo validado:

```powershell
ssh -i "C:\Users\Julio Caicedo\Documents\redes1-demo-aws-generated.pem" ec2-user@<IP_PUBLICA_BASTION>
```

Resultado esperado:

- acceso exitoso al `bastion-a1`

### Qué demostro este escenario

- SysLab despliega correctamente usando solo el nombre de la key pair
- la clave privada sigue viviendo fuera de la plataforma
- el verdadero problema operativo mas comun no fue la key pair, sino `Allowed SSH CIDR`

## Escenario B validado: el estudiante genera su clave y se importa la public key a AWS

### Objetivo

Validar el flujo mas sano para un curso:

- el estudiante conserva su clave privada
- AWS solo recibe la public key
- SysLab usa el nombre de la key pair importada

### Paso a paso del estudiante

#### 1. Generar la clave localmente en Windows

Ejemplo en PowerShell:

```powershell
ssh-keygen -t rsa -b 4096 -f "$HOME\.ssh\redes1-estudiante-b" -C "estudiante-b"
```

Esto crea:

- privada:
  - `C:\Users\<usuario>\.ssh\redes1-estudiante-b`
- publica:
  - `C:\Users\<usuario>\.ssh\redes1-estudiante-b.pub`

#### 2. Compartir la public key o importarla en AWS

El contenido de `redes1-estudiante-b.pub` se importo en:

- `EC2 -> Key Pairs -> Import key pair`

con nombre:

```text
redes1-estudiante-b
```

### Paso a paso del profesor

#### 3. Registrar la key pair importada en SysLab

En `Key Pairs -> Nueva key pair`:

- `Nombre`: `redes1-estudiante-b`
- `Scope`: `Curso compartido`
- `Curso`: `Redes 1`
- `Region`: `us-east-1`
- `Conexion cloud vinculada`: la conexion efectiva del curso

### Paso a paso del estudiante en el laboratorio

#### 4. Asignar la key pair en el canvas

En el nodo EC2 publico:

- `SSH Access`: `redes1-estudiante-b`

#### 5. Revisar `Allowed SSH CIDR`

Igual que en el escenario A, la IP publica del estudiante debe coincidir con el rango configurado.

#### 6. Ejecutar `PLAN` y `APPLY`

Resultado validado:

- `PLAN` correcto
- `APPLY` correcto

#### 7. Entrar por SSH con la clave privada local

Ejemplo validado:

```powershell
ssh -i "C:\Users\Julio Caicedo\.ssh\redes1-estudiante-b" ec2-user@<IP_PUBLICA_BASTION>
```

Resultado esperado:

- acceso exitoso al `bastion-a1`

### Qué demostro este escenario

- no hace falta repartir un `.pem` comun
- el estudiante puede conservar su propia clave privada
- AWS solo necesita la public key importada
- SysLab sigue funcionando igual, porque solo usa el nombre de la key pair en AWS

## Consideraciones operativas importantes

### 1. `Allowed SSH CIDR` puede romper la prueba aunque el deploy sea correcto

Fue el principal hallazgo practico.

Si `Allowed SSH CIDR` no coincide con la IP publica real del estudiante:

- el `Security Group` queda mal filtrado
- `Test-NetConnection` o `ssh` fallan con `timeout`
- parece un problema de key pair, pero no lo es

### 2. Una instancia publica y una privada no se acceden igual

En el laboratorio validado:

- `bastion-a1` estaba en subnet publica
- `app-a1` estaba en subnet privada

Entonces:

- `bastion-a1` si podia recibir SSH directo desde internet
- `app-a1` no debia ser accesible directo desde internet

Si se quiere acceder a la workload privada:

- se entra primero al bastion
- o se usa `ProxyJump`
- y la workload privada debe tener una key pair compatible y reglas internas de SSH correctas

### 3. Compartir la clave privada del escenario A funciona, pero no es ideal

Tecnica y funcionalmente si sirve para demo.

Pero a nivel operativo:

- varias personas comparten la misma credencial
- no hay trazabilidad individual
- si se filtra, todos quedan comprometidos
- revocar a una persona obliga a rotar la clave para todos

### 4. El nombre en `ssh_access` debe coincidir exactamente con AWS

Si en el canvas se escribe un nombre distinto al de la key pair real:

- el preflight debe bloquear el `APPLY`
- o Terraform fallara porque AWS no encontrara esa key pair

### 5. El catalogo no sustituye a la clave privada

El catalogo ayuda a modelar y validar.

El acceso SSH real sigue dependiendo de que el usuario tenga:

- la clave privada correcta
- el usuario correcto del sistema operativo (`ec2-user`, `ubuntu`, etc.)
- acceso de red al puerto 22

## Recomendacion para pruebas futuras

Orden sugerido:

1. probar primero el escenario A para validar el flujo mas simple
2. luego probar el escenario B para validar el flujo mas sano para curso
3. despues probar un caso de error:
   - typo en `ssh_access`
   - `Allowed SSH CIDR` incorrecto
   - key pair importada en otra region

## Conclusiones consolidadas

- el MVP ya soporta correctamente key pairs registradas por nombre y reutilizadas desde el canvas
- el flujo `profesor registra / estudiante despliega / estudiante entra por SSH` ya fue validado
- el caso mas robusto para curso es importar la public key del estudiante en AWS y registrar ese nombre en SysLab
- la UX debe seguir enfatizando que `Allowed SSH CIDR` es tan importante como la key pair para que SSH funcione

## Documentos relacionados

- [Playbook de Conexiones Cloud AWS](./aws-cloud-connections-playbook.md)
- [AWS runtime y AssumeRole](../../instalacion/servidor-ubuntu/aws-runtime-assumerole.md)
- [Servidor Ubuntu en LAN](../../instalacion/servidor-ubuntu/README.md)
- [Casos de uso del MVP](../../producto/casos-de-uso-mvp.md)
