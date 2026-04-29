# Casos de Uso del Proyecto SysLab

Este documento sintetiza los casos de uso funcionales del MVP a partir del comportamiento real del monorepo `frontend + backend`, con foco en el flujo academico de modelado, validacion y despliegue de laboratorios de red sobre AWS.

Complemento visual:
- [Graficas de Casos de Uso - SysLab](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/producto/casos-de-uso-graficas.md)

## Objetivo del sistema

Permitir que estudiantes, docentes y administradores modelen laboratorios de red, validen su configuracion y ejecuten despliegues controlados de infraestructura cloud, con trazabilidad sobre quien ejecuto, con que cuenta cloud y sobre que laboratorio.

## Actores

- Estudiante: crea y opera sus propios laboratorios.
- Docente: administra cursos, acompana laboratorios del curso y puede ejecutar infraestructura en escenarios autorizados.
- Platform admin: administra usuarios, cursos, catalogos y operaciones globales.
- AWS: proveedor cloud efectivo del MVP para despliegue real.
- Motor de ejecucion asincrona: Celery + Terraform, encargado de procesar `PLAN`, `APPLY` y `DESTROY`.

## Reglas de negocio transversales

- El MVP es `AWS-first`: `gcp` y `azure` aparecen como roadmap, pero el despliegue real vigente es sobre AWS.
- Un laboratorio puede resolverse con una conexion `personal` o `course_shared`.
- Ver un laboratorio no implica poder ejecutar `APPLY` o `DESTROY`.
- `PLAN` funciona como validacion tecnica/academica; `APPLY` y `DESTROY` operan sobre infraestructura real.
- La ejecucion real se bloquea si la cuenta cloud actual no coincide con la usada en el ultimo `APPLY` real.
- La delegacion explicita solo aplica para habilitar al docente sobre una conexion personal del owner del laboratorio.

## Resumen de casos de uso

| ID | Caso de uso | Actor principal |
|---|---|---|
| UC-01 | Registrarse mediante invitacion | Estudiante / Docente / Admin invitado |
| UC-02 | Iniciar sesion en la plataforma | Estudiante / Docente / Admin |
| UC-03 | Gestionar perfil personal | Estudiante / Docente / Admin |
| UC-04 | Crear y administrar cursos | Docente / Platform admin |
| UC-05 | Invitar y administrar usuarios | Docente / Platform admin |
| UC-06 | Registrar y probar conexiones cloud | Estudiante / Docente / Platform admin |
| UC-07 | Registrar catalogos tecnicos reutilizables | Estudiante / Docente / Platform admin |
| UC-08 | Crear laboratorio de red | Estudiante / Docente / Platform admin |
| UC-09 | Modelar o editar el canvas del laboratorio | Estudiante / Docente / Platform admin |
| UC-10 | Sincronizar y validar un plan desde el canvas | Estudiante / Docente / Platform admin |
| UC-11 | Ejecutar despliegue real de infraestructura | Estudiante / Docente / Platform admin |
| UC-12 | Destruir infraestructura desplegada | Estudiante / Docente / Platform admin |
| UC-13 | Delegar ejecucion cloud al docente | Estudiante / Platform admin |
| UC-14 | Consultar detalle, evidencias e historial de ejecucion | Estudiante / Docente / Platform admin |

## Casos de uso detallados

### UC-01. Registrarse mediante invitacion

- Objetivo: habilitar la activacion segura de una cuenta previamente creada por un docente o administrador.
- Actor principal: usuario invitado.
- Precondiciones:
  - existe una invitacion vigente
  - el correo del usuario ya fue registrado por un actor autorizado
- Flujo principal:
  1. El usuario abre el enlace de invitacion.
  2. El sistema valida token, expiracion y correo asociado.
  3. El usuario completa su registro definiendo credenciales.
  4. El sistema activa la cuenta y elimina el token de invitacion.
- Flujos alternos:
  - si la invitacion expiro o es invalida, el sistema rechaza el registro
  - si el correo no coincide con la invitacion, el sistema bloquea la activacion
- Resultado:
  - la cuenta queda activa y lista para autenticacion

### UC-02. Iniciar sesion en la plataforma

- Objetivo: autenticar al usuario y cargar su contexto de rol.
- Actor principal: estudiante, docente o platform admin.
- Precondiciones:
  - la cuenta existe
  - la cuenta esta activa
- Flujo principal:
  1. El usuario inicia sesion con email/password o Google.
  2. El sistema valida identidad y estado de la cuenta.
  3. El sistema entrega token, datos del usuario y rol canonico.
- Flujos alternos:
  - si las credenciales son invalidas, se rechaza el acceso
  - si la cuenta no esta activa, el sistema bloquea el ingreso
- Resultado:
  - el usuario accede a las vistas permitidas por su rol

### UC-03. Gestionar perfil personal

- Objetivo: mantener datos personales y preferencias del usuario.
- Actor principal: estudiante, docente o platform admin.
- Precondiciones:
  - el usuario ha iniciado sesion
- Flujo principal:
  1. El usuario abre su perfil.
  2. Edita nombre, apellido, email, foto o ajustes personales.
  3. El sistema valida consistencia y guarda los cambios.
- Flujos alternos:
  - si el nuevo email ya esta en uso, el sistema rechaza la actualizacion
- Resultado:
  - el perfil queda actualizado

### UC-04. Crear y administrar cursos

- Objetivo: definir la estructura academica a la que pertenecen alumnos, laboratorios y recursos compartidos.
- Actor principal: docente o platform admin.
- Precondiciones:
  - el actor tiene permisos de gestion academica
- Flujo principal:
  1. El actor crea un curso con nombre y codigo.
  2. El sistema lo asocia al docente responsable.
  3. El actor puede editar nombre, codigo, estado o reasignar docente si tiene privilegios de admin.
- Flujos alternos:
  - si un docente intenta operar sobre un curso ajeno, el sistema lo bloquea
- Resultado:
  - el curso queda disponible para matriculas, laboratorios y conexiones compartidas

### UC-05. Invitar y administrar usuarios

- Objetivo: incorporar estudiantes y administrar el estado de los usuarios del sistema.
- Actor principal: docente o platform admin.
- Precondiciones:
  - el actor ha iniciado sesion
  - existe al menos un curso si se desea asociar al usuario
- Flujo principal:
  1. El actor crea un usuario indicando email, rol y, si corresponde, curso.
  2. El sistema genera perfil en estado pendiente e invitacion temporal.
  3. El actor puede actualizar estado, curso y, en caso de admin, rol.
  4. El docente puede matricular o remover estudiantes de su curso.
- Flujos alternos:
  - un docente solo puede invitar estudiantes
  - un docente no puede asignar alumnos a cursos de otro profesor
- Resultado:
  - el usuario queda registrado y listo para activar su cuenta

### UC-06. Registrar y probar conexiones cloud

- Objetivo: asociar credenciales cloud que permitan ejecutar infraestructura real.
- Actor principal: estudiante, docente o platform admin.
- Precondiciones:
  - el actor ha iniciado sesion
  - dispone de credenciales AWS validas o `AssumeRole`
- Flujo principal:
  1. El actor crea una conexion `personal` o `course_shared`.
  2. Define provider, region y metodo de autenticacion.
  3. El sistema guarda la conexion y protege los secretos.
  4. El actor ejecuta la prueba de conexion.
  5. El sistema consulta AWS y registra resultado, identidad y mensaje.
- Flujos alternos:
  - un estudiante solo puede crear conexiones personales
  - una conexion compartida debe pertenecer al curso del docente autorizado
  - si el provider no coincide con el laboratorio, la conexion no puede asignarse
- Resultado:
  - la plataforma conoce la cuenta cloud efectiva y puede usarla en ejecuciones reales

### UC-07. Registrar catalogos tecnicos reutilizables

- Objetivo: mantener insumos reutilizables para los laboratorios y despliegues.
- Actor principal: estudiante, docente o platform admin.
- Precondiciones:
  - el actor tiene una sesion valida
- Flujo principal:
  1. El actor registra `key pairs` personales o compartidos de curso.
  2. Docentes y admins pueden mantener catalogo de AMIs.
  3. El sistema filtra estos catalogos por provider, region, scope y permisos.
- Flujos alternos:
  - un estudiante no puede registrar `key pairs` compartidos
  - un `key pair` compartido debe apuntar a una conexion del mismo curso
  - solo docentes o admins pueden administrar AMIs
- Resultado:
  - el sistema dispone de insumos tecnicos consistentes para modelado y ejecucion

### UC-08. Crear laboratorio de red

- Objetivo: iniciar un laboratorio persistente que sera modelado y eventualmente desplegado.
- Actor principal: estudiante, docente o platform admin.
- Precondiciones:
  - el actor ha iniciado sesion
  - si el laboratorio es academico, existe un curso valido
- Flujo principal:
  1. El actor crea un laboratorio indicando nombre, provider, narrativa, plantilla y opcionalmente conexion cloud.
  2. El sistema asigna owner, visibilidad, curso y provider objetivo.
  3. Si se elige una plantilla, el sistema precarga un canvas base.
- Flujos alternos:
  - el estudiante crea laboratorios propios y de visibilidad `owner`
  - el docente debe seleccionar uno de sus cursos y el laboratorio queda visible a nivel curso
  - una conexion compartida solo puede vincularse si pertenece al mismo curso
- Resultado:
  - el laboratorio queda creado y disponible para edicion

### UC-09. Modelar o editar el canvas del laboratorio

- Objetivo: definir visualmente la topologia de red y sus parametros.
- Actor principal: estudiante, docente o platform admin.
- Precondiciones:
  - existe un laboratorio visible para el actor
- Flujo principal:
  1. El actor abre el canvas del laboratorio.
  2. Agrega o modifica segmentos, subredes, workloads y conectividad.
  3. El sistema conserva el `flow`, el `intent` y metadatos del laboratorio.
  4. El actor puede partir desde plantillas como:
     - `MVP 1 - 1 segmento (Bastion + App privada)`
     - `Caso 3 - 3 segmentos con conectividad parcial`
- Flujos alternos:
  - si el actor no puede editar ese laboratorio, el sistema bloquea la modificacion
  - si el provider elegido no esta listo para despliegue real, la UI lo presenta como roadmap
- Resultado:
  - el laboratorio queda actualizado con una topologia modelada en canvas

### UC-10. Sincronizar y validar un plan desde el canvas

- Objetivo: transformar el modelado del canvas en un plan ejecutable y validable.
- Actor principal: estudiante, docente o platform admin.
- Precondiciones:
  - existe un laboratorio con `canvas_id`
  - hay un modelado vigente en el canvas
- Flujo principal:
  1. El actor sincroniza el canvas con el backend.
  2. El sistema valida el payload y normaliza `canvas_id`.
  3. Se crea o actualiza un `Plan` asociado al laboratorio.
  4. El actor ejecuta un `PLAN` en modo simulacion.
  5. Celery/Terraform generan el resultado tecnico sin aplicar infraestructura real.
- Flujos alternos:
  - si el payload es invalido, el plan queda rechazado
  - si ya hay una ejecucion corriendo, el sistema bloquea una nueva
- Resultado:
  - el usuario obtiene una validacion tecnica previa al despliegue real

### UC-11. Ejecutar despliegue real de infraestructura

- Objetivo: materializar en AWS la topologia definida en el laboratorio.
- Actor principal: estudiante, docente o platform admin.
- Precondiciones:
  - existe un plan valido
  - la conexion cloud efectiva permite ejecucion real
  - el actor esta autorizado para `APPLY`
- Flujo principal:
  1. El actor solicita `APPLY`.
  2. El sistema verifica permisos segun owner, curso, scope y delegacion.
  3. El sistema revisa que la cuenta cloud actual no difiera del ultimo `APPLY`.
  4. El motor de ejecucion prepara workspace Terraform, corre `init`, `plan` y `apply`.
  5. El sistema registra outputs, logs, identidad AWS y evidencia del ultimo despliegue real.
- Flujos alternos:
  - el docente queda bloqueado si la conexion efectiva es personal del estudiante y no existe delegacion
  - el despliegue se bloquea si faltan credenciales o `key pairs`
  - si el target cloud cambio respecto del ultimo despliegue real, el `APPLY` se rechaza
- Resultado:
  - la infraestructura queda desplegada o el error queda auditado en el plan

### UC-12. Destruir infraestructura desplegada

- Objetivo: eliminar recursos cloud creados previamente por el laboratorio.
- Actor principal: estudiante, docente o platform admin.
- Precondiciones:
  - el plan tiene infraestructura aplicada o un `apply` real fallido con recursos potencialmente existentes
  - el actor esta autorizado para `DESTROY`
- Flujo principal:
  1. El actor solicita `DESTROY`.
  2. El sistema valida permisos y consistencia de la cuenta cloud.
  3. Celery/Terraform ejecutan la destruccion real.
  4. El sistema registra el resultado, el historial y deja el plan no aplicado.
- Flujos alternos:
  - si no existe infraestructura aplicada, el sistema bloquea la destruccion
  - si la cuenta cloud actual no coincide con la ultima usada, el sistema bloquea la accion
- Resultado:
  - la infraestructura queda eliminada o el fallo queda registrado con trazabilidad

### UC-13. Delegar ejecucion cloud al docente

- Objetivo: permitir que el docente del curso ejecute infraestructura real sobre un laboratorio de un estudiante cuando la cuenta efectiva es personal.
- Actor principal: estudiante owner del laboratorio o platform admin.
- Precondiciones:
  - el laboratorio pertenece a un curso con docente asignado
  - la conexion efectiva del laboratorio es `personal` del owner
- Flujo principal:
  1. El owner crea una delegacion de ejecucion para el docente del curso.
  2. El sistema registra nota, expiracion opcional y conexion resuelta.
  3. Mientras la delegacion este activa, el docente puede ejecutar `APPLY` y `DESTROY`.
  4. El owner o los actores autorizados pueden revocar la delegacion.
- Flujos alternos:
  - no se permite delegar a usuarios que no sean docentes
  - no se permite delegar si el laboratorio no pertenece a un curso o no resuelve una conexion personal del owner
- Resultado:
  - la autorizacion excepcional queda habilitada y auditada

### UC-14. Consultar detalle, evidencias e historial de ejecucion

- Objetivo: entregar observabilidad funcional y academica sobre el estado del laboratorio.
- Actor principal: estudiante, docente o platform admin.
- Precondiciones:
  - existe un plan visible para el actor
- Flujo principal:
  1. El actor consulta la lista de planes y abre el detalle de uno.
  2. El sistema muestra estado, payload, outputs, logs e historial reciente.
  3. El actor revisa:
     - proxima ejecucion real prevista
     - evidencia del ultimo `APPLY` real
     - usuario que disparo la accion
     - si fue `PLAN`, `APPLY` o `DESTROY`
     - cuenta AWS y `ARN` usados
- Flujos alternos:
  - si una tarea quedo colgada, el sistema puede reconciliarla a fallo
  - si detecta drift y ya no existe infraestructura, el sistema reconcilia el plan como no aplicado
- Resultado:
  - el actor dispone de trazabilidad suficiente para correccion, demo y auditoria

## Casos de uso prioritarios para la tesis

Si necesitas una version resumida para memoria o defensa, los casos de uso mas representativos del MVP son estos:

1. Crear laboratorio de red.
2. Modelar topologia en canvas.
3. Sincronizar y validar plan.
4. Ejecutar despliegue real en AWS.
5. Destruir infraestructura desplegada.
6. Registrar conexion cloud personal o compartida.
7. Delegar ejecucion docente de forma auditable.
8. Consultar historial y evidencia del ultimo despliegue real.

## Alcance y limites actuales

- El despliegue real validado del MVP esta centrado en AWS.
- La plataforma ya separa `PLAN` de `APPLY`, lo que ayuda a validar sin crear recursos.
- Existe soporte para conexiones personales y compartidas de curso, con reglas distintas de autorizacion.
- La delegacion explicita existe en backend/API y auditoria; su autoservicio UI aun puede mejorar.
- La arquitectura ya prepara extensibilidad multi-cloud, pero la capacidad cerrada del MVP sigue siendo `AWS-first`.
