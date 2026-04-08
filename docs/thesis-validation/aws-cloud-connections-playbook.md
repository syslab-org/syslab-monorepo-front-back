# Playbook de Conexiones Cloud AWS

Este documento deja un paso a paso corto y repetible para probar el flujo de conexiones cloud del MVP, tanto con `Static Keys` como con `AssumeRole`.

## Objetivo

Validar cuatro cosas:

- que la plataforma puede registrar una conexión cloud personal o compartida
- que un laboratorio resuelve la conexión correcta antes del deploy
- que el `APPLY` real usa esa conexión y no las credenciales locales del computador
- que la política alumno/profesor cambia según `personal` vs `course_shared`

## Modelos soportados hoy

### 1. AWS Static Keys

La plataforma guarda:

- `AWS Access Key ID`
- `AWS Secret Access Key`

Y usa esas credenciales directamente en backend/celery para `boto3` y Terraform.

### 2. AWS AssumeRole

La plataforma guarda:

- `Role ARN`
- `External ID` opcional

Y en tiempo de ejecución:

1. el backend usa una identidad base válida
2. llama `sts:AssumeRole`
3. AWS entrega credenciales temporales
4. Terraform y `boto3` corren con esa sesión temporal

## Idea clave para entender `AssumeRole`

En el flujo actual hay dos identidades distintas:

1. principal base que asume el role
2. role destino que se usa para desplegar

Ejemplo validado en local:

- principal base del backend:
  - `arn:aws:iam::034739223309:user/tesis-admin`
- role destino:
  - `arn:aws:iam::034739223309:role/syslab-alumno22-role`

Eso significa que la trust policy del role debe confiar en `tesis-admin`, no en `alumno22-syslab`, porque quien hace `AssumeRole` hoy es el backend.

## Escenarios recomendados de prueba

### Escenario A. Alumno con conexión personal `Static Keys`

Resultado esperado:

- el alumno puede hacer `APPLY`
- el profesor no puede hacer `APPLY` ni `DESTROY` sobre ese lab

### Escenario B. Profesor con conexión `course_shared` `Static Keys`

Resultado esperado:

- el profesor del curso puede hacer `APPLY` y `DESTROY`
- la conexión efectiva del lab debe verse como `course_shared`

### Escenario C. Alumno con conexión personal `AssumeRole`

Resultado esperado:

- la prueba de conexión devuelve `sts_ok`
- la UI muestra un `ARN` de tipo `assumed-role/...`
- el deploy real queda auditado con esa identidad

### Escenario D. Profesor con conexión `course_shared` `AssumeRole`

Resultado esperado:

- el profesor puede ejecutar porque la conexión efectiva es del curso
- el `ARN` auditado sigue siendo de tipo `assumed-role/...`

## Paso a paso para `Static Keys`

### 1. Crear la conexión en la app

Si es personal, crearla como alumno.

Si es compartida, crearla como profesor.

Campos:

- `Scope`: `Personal` o `Curso`
- `Autenticación`: `AWS Static Keys`
- `Region`: por ejemplo `us-east-1`
- `AWS Access Key ID`
- `AWS Secret Access Key`

### 2. Probar la conexión

En `Cloud Connections`, pulsar `Probar`.

Resultado esperado:

- estado `success`
- banner `Conexión válida: sts_ok`

### 3. Asociar la conexión al laboratorio

Para evitar ambigüedad durante la prueba:

- editar el lab
- seleccionar la conexión explícitamente
- no dejar `Auto` si existe otra conexión personal activa

### 4. Verificar antes del deploy

En `Plan Detail -> Resumen -> Próxima ejecución real`, confirmar:

- provider
- source
- scope
- región
- nombre de la conexión efectiva
- cuenta AWS prevista

### 5. Hacer `APPLY` real

Después del deploy, revisar `Evidencia del último APPLY real`.

Resultado esperado:

- `credential_source: cloud_connection`
- nombre de la conexión usada
- cuenta AWS
- `ARN`

## Paso a paso para `AssumeRole`

### 1. Identificar el principal base del backend

En el entorno que usa el backend:

```bash
aws sts get-caller-identity
```

Ejemplo validado:

```json
{
  "UserId": "AIDAQQFU6PMG6XQANVDVH",
  "Account": "034739223309",
  "Arn": "arn:aws:iam::034739223309:user/tesis-admin"
}
```

### 2. Crear el role destino en AWS

Ejemplo de trust policy validada:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::034739223309:user/tesis-admin"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "syslab-alumno22-2026"
        }
      }
    }
  ]
}
```

Ejemplo de role creado:

- `syslab-alumno22-role`

Para una prueba rápida de deploy real, se puede adjuntar temporalmente `AdministratorAccess` al role. Luego conviene reemplazarlo por permisos mínimos.

### 3. Crear la conexión en la app

Ejemplo validado para `alumno22`:

- `Nombre`: `assume-role-alumno22`
- `Scope`: `Personal`
- `Autenticación`: `AWS AssumeRole`
- `Region`: `us-east-1`
- `AWS Role ARN`: `arn:aws:iam::034739223309:role/syslab-alumno22-role`
- `External ID`: `syslab-alumno22-2026`

### 4. Probar la conexión

Resultado esperado:

- `Última prueba = success`
- banner `Conexión válida: sts_ok`

La identidad resultante debe verse como una sesión asumida, por ejemplo:

- `arn:aws:sts::034739223309:assumed-role/syslab-alumno22-role/syslab-...`

### 5. Fijar la conexión en el laboratorio

Editar el lab y seleccionar la conexión `AssumeRole` explícitamente.

### 6. Verificar antes del deploy

En `Próxima ejecución real`, revisar:

- `Provider: aws`
- `Source: lab_explicit`
- `Scope: personal`
- `Region: us-east-1`
- `Conexión efectiva: assume-role-alumno22`
- `Cuenta AWS prevista: 034739223309`
- `ARN conocido: arn:aws:sts::034739223309:assumed-role/syslab-alumno22-role/syslab-...`

### 7. Verificar después del deploy

En `Evidencia del último APPLY real`, revisar:

- conexión usada
- cuenta AWS
- `ARN`
- `credential_source`

Si el `ARN` muestra `assumed-role/...`, quedó confirmado que el deploy real usó la sesión temporal del role y no una key estática final.

## Cómo distinguir `personal` vs `course_shared`

### Si la conexión efectiva es `personal`

- el alumno puede hacer `APPLY` y `DESTROY`
- el profesor puede revisar y validar en `PLAN`
- el profesor no puede ejecutar infraestructura real

### Si la conexión efectiva es `course_shared`

- el profesor del curso sí puede hacer `APPLY` y `DESTROY`
- la UI debe mostrar la conexión efectiva del curso antes del deploy

## Señales de confirmación más útiles en la UI

### Antes del deploy

`Plan Detail -> Resumen -> Próxima ejecución real`

Sirve para confirmar:

- qué conexión se usaría
- si vino del lab, del owner o del curso
- qué cuenta AWS se tocaría

### Después del deploy

`Plan Detail -> Resumen -> Evidencia del último APPLY real`

Sirve para confirmar:

- qué conexión se usó realmente
- si fue `cloud_connection`
- con qué cuenta y `ARN` se ejecutó

### Historial completo

`Plan Detail -> Resumen -> Historial reciente de ejecuciones`

Sirve para confirmar:

- quién pidió cada `PLAN`, `APPLY` o `DESTROY`
- si fue `preview` o `real`
- si hubo delegación explícita
- qué conexión y qué identidad se usaron

### Para recursos creados

`Plan Detail -> Outputs`

Sirve para confirmar:

- VPC
- IGW
- NAT si existe
- instancias detectadas
- IP privada y pública de la bastion

### Para validación guiada

`Plan Detail -> Pruebas`

Sirve para:

- ver el comando SSH sugerido
- explicar por qué una bastion pública es válida para demo pero más débil en aislamiento que una workload privada detrás de NAT

## Errores típicos

### La conexión `AssumeRole` no prueba

Revisar:

- trust policy con principal incorrecto
- `External ID` distinto al de la app
- el backend no tiene identidad base para llamar `sts:AssumeRole`

### El profesor sigue bloqueado

Revisar:

- la conexión efectiva del lab sigue siendo `personal`
- el lab quedó en `Auto` y resolvió una conexión personal del alumno

### El deploy funciona pero no sabes qué identidad usó

Revisar:

- `Próxima ejecución real`
- `Evidencia del último APPLY real`

Esas dos tarjetas son ahora la evidencia principal sin depender de AWS Console.
