# Demo de Evaluacion: Roles, Validacion y Despliegue

Guion reproducible para presentar SysLab ante profesores evaluadores. Comienza con la configuracion y validacion de cuentas por un profesor o `platform_admin`, y termina con el `APPLY` y `DESTROY` ejecutados por un alumno.

## Objetivo

Demostrar que SysLab:

1. separa los permisos de `platform_admin`, profesor y alumno;
2. incorpora alumnos mediante invitacion y curso;
3. valida la cuenta AWS y sus insumos antes del despliegue;
4. transforma un canvas en un plan revisable;
5. impide ejecuciones no autorizadas;
6. despliega y destruye infraestructura con trazabilidad.

El provider real del MVP es AWS. GCP y Azure deben presentarse como roadmap.

## Run of show

Duracion objetivo: 18 a 22 minutos.

| Minuto | Actor | Demostracion |
|---:|---|---|
| 0-2 | Presentador | Problema, actores y topologia objetivo |
| 2-5 | `platform_admin` | Roles, curso y limites administrativos |
| 5-7 | Profesor | Invitacion/matricula y recursos compartidos |
| 7-9 | Profesor | Conexion AWS `course_shared`, `sts_ok` y key pair |
| 9-14 | Alumno | Login, laboratorio, canvas y `PLAN` |
| 14-18 | Alumno | `APPLY`, outputs, identidad e historial |
| 18-20 | Profesor/alumno | Control de permisos y `DESTROY` |
| 20-22 | Presentador | Evidencia automatizada y conclusiones |

En una version de 12 minutos, ejecutar D-01, D-05, D-07, D-08 y D-10. Mostrar D-03 y D-06 mediante capturas preparadas.

## Datos sugeridos

| Elemento | Valor |
|---|---|
| Administrador | `admin.demo@syslab.local` |
| Profesor | `profesor.demo@syslab.local` |
| Alumno | `alumno.demo@syslab.local` |
| Alumno ajeno | `alumno.otro@syslab.local` |
| Curso | `Redes Cloud - Demo 2026` |
| Codigo | `RCD-2026` |
| Autodestruccion | `30 minutos` |
| Conexion | `AWS Curso Demo` |
| Key pair | `syslab-demo-course` |
| Laboratorio | `Demo - Bastion y App Privada` |
| Region | `us-east-1` |
| CIDR maestro | `10.80.0.0/16` |

No mostrar secretos, access keys, cookies, tokens completos ni archivos `.pem`. Mostrar solamente valores enmascarados y la identidad resultante de STS.

## Preparacion obligatoria

Realizarla el dia anterior y repetirla 30 minutos antes de la defensa.

### Plataforma y usuarios

- levantar el stack, aplicar migraciones y comprobar Celery, Redis y PostgreSQL;
- abrir tres sesiones separadas: administrador, profesor y alumno;
- confirmar que el superusuario resuelve a `platform_admin`;
- confirmar profesor `teacher` activo, titular del curso;
- confirmar alumno `student` activo y matriculado en ese curso;
- asignar `alumno.otro` a otro curso para la prueba de aislamiento;
- conservar una invitacion secundaria pendiente; la cuenta principal debe estar activada;
- confirmar que no hay planes anteriores en estado `RUNNING`.

Comprobaciones tecnicas:

```bash
make ps
make migrate
docker compose -f tools/docker/compose.dev.yml exec -T backend python manage.py test api.tests
pnpm --dir apps/frontend build
```

### AWS

- usar una cuenta o role exclusivo de demo con permisos minimos;
- probar `AWS Curso Demo` hasta obtener `Last test = success` y `sts_ok`;
- confirmar region, Account ID y ARN esperados;
- comprobar que `syslab-demo-course` existe en esa cuenta y region;
- fijar `Allowed SSH CIDR` a la IP publica del lugar si se mostrara SSH;
- revisar cuotas, presupuesto y recursos remanentes;
- configurar autodestruccion como red de seguridad, sin reemplazar el `DESTROY` manual.

## Topologia minima

```text
VPC 10.80.0.0/16
├── subnet publica 10.80.1.0/24
│   └── bastion EC2
└── subnet privada 10.80.2.0/24
    └── app EC2
```

Para acortar, desplegar solo la VPC, la subnet publica y el bastion. Evitar Transit Gateway o varias VPC en la demo principal: agregan tiempo sin mejorar la demostracion de roles.

## Casos de prueba

### D-01. Rol canonico

- Actor: `platform_admin`.
- Accion: iniciar sesion y abrir Perfil y Gestion de usuarios.
- Esperado: administrador `platform_admin`; profesor y alumno con rol/estado correctos.
- Evidencia: el administrador ve todos los usuarios y puede modificar roles.
- Mensaje: el rol efectivo se resuelve en backend, no depende de ocultar opciones en UI.

### D-02. Limite del profesor

- Actor: profesor.
- Accion: intentar crear o modificar un usuario con rol profesor/admin.
- Esperado: operacion bloqueada; el profesor solo invita alumnos y solo el admin cambia roles.
- Evidencia: respuesta `403` o control no disponible.

### D-03. Invitacion y activacion

- Actores: profesor y alumno invitado.
- Accion: crear alumno, asociarlo al curso, copiar el enlace y registrarlo con el mismo correo.
- Esperado: invitacion vigente, registro exitoso y cuenta activa.
- Caso negativo: token vencido o correo diferente; activacion rechazada.
- Nota: usar una invitacion secundaria, no la cuenta principal preparada.

### D-04. Aislamiento entre cursos

- Actor: profesor o alumno principal.
- Accion: revisar usuarios, laboratorios y planes.
- Esperado: no aparecen objetos del otro profesor/curso.
- Mensaje: la API filtra los objetos; no es solo una restriccion visual.

### D-05. Conexion AWS compartida

- Actor: profesor.
- Accion: en `Settings -> Cloud Connections`, probar `AWS Curso Demo`.
- Esperado: `success`, `sts_ok`, Account ID y ARN de la cuenta de demo.
- Verificar: `scope = course_shared`, curso correcto y `us-east-1`.
- Negativo opcional: el alumno no puede crear conexiones `course_shared`.

### D-06. Profesor bloqueado sobre cuenta personal

- Precondicion: lab del alumno con conexion `personal`, sin delegacion.
- Actor: profesor titular.
- Accion: ejecutar `PLAN` e intentar `APPLY`.
- Esperado: `PLAN` aceptado; `APPLY` bloqueado con `PLAN_EXECUTION_FORBIDDEN`.
- Mensaje: revisar un laboratorio no concede acceso a la cuenta personal del alumno.

Usar un plan secundario ya preparado y luego volver al lab principal con `course_shared`.

### D-07. Laboratorio y validacion del alumno

- Actor: alumno.
- Accion: crear el lab, elegir AWS, curso, conexion, region y CIDR; cargar plantilla o construir la topologia; guardar y pulsar `Validar canvas`.
- Esperado: plan sincronizado y simulacion exitosa, sin recursos reales.
- Evidencia: resumen `Add / Change / Destroy / Replace` y ausencia de errores de CIDR/key pair.
- Negativo breve: solapar subnets, mostrar el bloqueo y corregirlo.

### D-08. Despliegue real del alumno

- Actor: alumno owner.
- Accion: abrir despliegue, revisar la proxima ejecucion y confirmar `APPLY`.
- Antes de confirmar: provider, source, `course_shared`, region, Account ID y ARN.
- Esperado: tarea encolada, transicion `RUNNING -> SUCCESS` e infraestructura aplicada.
- Restriccion: no iniciar otra accion mientras el plan esta `RUNNING`.

### D-09. Evidencia y auditoria

- Actores: alumno y profesor.
- Accion: abrir `Plan Detail`.
- Esperado: outputs, logs, ultimo `APPLY`, identidad AWS, usuario solicitante, modo real y fecha.
- Mensaje: el sistema responde quien ejecuto, que ejecuto y en que cuenta.

### D-10. Destruccion y cierre

- Actor: alumno owner; alternativamente profesor sobre `course_shared`.
- Accion: pulsar `Destruir`, confirmar y esperar `SUCCESS`.
- Esperado: `applied = false`, accion final `DESTROY` e historial actualizado.
- Cierre: revisar AWS y las EIP aportadas manualmente, que no deben ser eliminadas por el stack.

## Matriz de aceptacion

| Caso | Criterio de aprobacion | Evidencia |
|---|---|---|
| D-01 | Roles canonicos correctos | Perfil/lista de usuarios |
| D-02 | Profesor no eleva privilegios | `403` o control no disponible |
| D-03 | Invitacion segura | Cuenta activa/rechazo invalido |
| D-04 | Sin fuga entre cursos | Listas filtradas |
| D-05 | Identidad AWS verificada | `sts_ok`, cuenta y ARN |
| D-06 | Revision permitida, ejecucion personal bloqueada | `PLAN` 202 y `APPLY` 403 |
| D-07 | Canvas convertido en plan | Diff sin recursos creados |
| D-08 | Owner despliega | `RUNNING -> SUCCESS` |
| D-09 | Ejecucion trazable | Historial e identidad AWS |
| D-10 | Infraestructura eliminada | `DESTROY SUCCESS`, `applied = false` |

## Evidencias y contingencia

Preparar capturas numeradas de roles, curso, `sts_ok`, key pair, canvas, diff, bloqueo docente, target del `APPLY`, `APPLY SUCCESS` y `DESTROY SUCCESS`. No versionar imágenes con Account ID, ARN sensible, IP o datos personales.

| Falla | Respuesta durante la demo |
|---|---|
| Internet inestable | Ejecutar D-01 a D-07 localmente y mostrar evidencia de D-08 a D-10 |
| STS falla | No rotar credenciales en vivo; mostrar el ultimo `sts_ok` |
| `APPLY` tarda | Continuar con un plan previamente desplegado |
| `APPLY` falla | Mostrar logs y la recuperacion mediante `DESTROY` |
| Invitacion falla | Usar la cuenta principal ya activada |
| Cambio de IP | Omitir SSH; no invalida el despliegue |

Nunca solucionar un fallo exponiendo credenciales o desactivando guardrails.

## Preguntas previsibles

- **¿Por que el profesor ve pero no despliega?** Revision academica y operacion sobre una cuenta personal son permisos distintos.
- **¿Cuando puede desplegar?** Con `course_shared` o delegacion personal explicita, vigente y auditable.
- **¿Que impide usar la cuenta equivocada?** La UI muestra el target y backend bloquea `APPLY/DESTROY` si cambio desde el ultimo `APPLY` real.
- **¿Que pasa si se cierra el navegador?** Celery continua; estado y logs quedan persistidos.
- **¿Como se controla el costo?** Topologia minima, autodestruccion, `DESTROY` y revision de recursos externos.
- **¿GCP y Azure funcionan?** No para ejecucion real en el MVP; AWS es el adapter funcional.

## Checklist final

- [ ] Los 57 tests de backend pasan.
- [ ] El frontend compila sin errores.
- [ ] Servicios y tres sesiones estan activos.
- [ ] Conexion AWS con `sts_ok` y key pair compatible.
- [ ] No hay planes atascados ni recursos anteriores.
- [ ] `APPLY` y `DESTROY` se ensayaron el mismo dia.
- [ ] Capturas disponibles y libres de secretos.
- [ ] Alarma creada para verificar la limpieza posterior.

La suite `api.tests` respalda el aislamiento, limites de recursos compartidos, gestion del curso, `PLAN` docente, bloqueo de `APPLY` personal, permiso `course_shared`, delegacion, bloqueo de `DESTROY` y cambio de cuenta. No reemplaza el ensayo AWS, porque STS, cuotas, red, AMI, key pair y Terraform dependen del entorno.

Documentos complementarios:

- [Matriz formal de permisos](../06-permissions-matrix.md)
- [Catalogo maestro de pruebas AWS](../operacion/aws/test-catalog.md)
- [Playbook de conexiones AWS](../operacion/aws/cloud-connections-playbook.md)
- [Playbook de key pairs y SSH](../operacion/aws/key-pairs-ssh-playbook.md)

