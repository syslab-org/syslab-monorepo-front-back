# Caso Validado: Cambio de Cuenta Cloud tras APPLY Real

Este documento registra un caso validado manualmente donde un laboratorio cambia su conexión cloud efectiva después de haber ejecutado un `APPLY` real exitoso en otra cuenta.

## Pregunta que resuelve

Qué debería pasar si:

1. un laboratorio fue desplegado realmente en una cuenta cloud A
2. después el owner cambia la conexión cloud efectiva del laboratorio a una cuenta cloud B
3. la UI todavía conserva historial y estado del plan anterior

La duda central era si el estado `ACTIVE` seguía siendo correcto cuando la cuenta actual ya no coincide con la cuenta donde se creó la infraestructura.

## Escenario validado

Laboratorio:

- `lab-single-v2`

Secuencia ejecutada:

1. se configuró el laboratorio con una conexión `course_shared` del curso
2. se ejecutó un `APPLY` real exitoso con:
   - conexión `Redes-1`
   - `scope = course_shared`
   - cuenta AWS `034739223309`
   - `ARN` tipo `assumed-role/syslab-course-redes1-role/...`
3. luego se creó una conexión personal `Static Keys` para José
4. el laboratorio se cambió explícitamente para usar esa conexión personal
5. la nueva cuenta prevista pasó a ser:
   - cuenta AWS `171109860647`
   - `ARN` conocido `arn:aws:iam::171109860647:user/jose-syslab`

## Riesgo detectado

Sin un guardrail adicional, el sistema podía quedar en una situación semánticamente ambigua:

- el plan seguía mostrando `SUCCESS` y `ACTIVE`
- pero esa infraestructura real pertenecía a otra cuenta cloud
- la nueva cuenta actual de José no tenía ningún despliegue asociado a ese laboratorio

Eso hacía posible interpretar erróneamente que el laboratorio seguía “activo” en la cuenta actual, cuando en realidad ese `ACTIVE` correspondía a otra conexión cloud.

## Comportamiento implementado y validado

El sistema ahora expone tres señales complementarias:

### 1. Próxima ejecución real

Muestra la conexión cloud actual que se usaría si hoy se intentara ejecutar infraestructura real.

En este caso validado:

- `provider = aws`
- `source = lab_explicit`
- `scope = personal`
- conexión efectiva `Jose-new`
- cuenta prevista `171109860647`
- `ARN` conocido `arn:aws:iam::171109860647:user/jose-syslab`

### 2. Evidencia del último APPLY real

Conserva el contexto del último despliegue real exitoso.

En este caso validado:

- `credential_source = cloud_connection`
- `scope = course_shared`
- conexión usada `Redes-1`
- cuenta AWS `034739223309`
- `ARN` `arn:aws:sts::034739223309:assumed-role/syslab-course-redes1-role/...`

### 3. Reconciliación de cuenta cloud

Compara:

- la conexión efectiva actual
- con la conexión/cuenta usadas en el último `APPLY` real

Resultado validado:

- el estado pasa a `target_changed`
- la UI informa:
  - “La conexión cloud actual ya no coincide con la usada en el último APPLY real. El estado ACTIVE pasa a ser histórico respecto de otra cuenta cloud.”

## Guardrail operativo

Cuando existe este mismatch:

- `APPLY` real se bloquea
- `DESTROY` real se bloquea
- el backend responde `409` con código:
  - `CLOUD_TARGET_CHANGED`

Esto obliga a interpretar el estado correctamente:

- `SUCCESS` sigue describiendo la última ejecución
- `ACTIVE` sigue describiendo que hubo infraestructura real
- pero esa infraestructura ya no puede asumirse como vigente en la cuenta actual seleccionada

## Qué demuestra este caso

Este caso demuestra una propiedad importante del modelo:

- el control de usuarios no depende solo de “quién puede ejecutar”
- también depende de “sobre qué cuenta cloud tiene sentido interpretar el estado”

En otras palabras:

- cambiar la conexión cloud no cambia mágicamente dónde existe la infraestructura previa
- por eso la plataforma debe reconciliar identidad cloud actual vs identidad cloud histórica

## Valor para tesis y producto

Este caso es especialmente útil para la tesis porque muestra:

- una limitación semántica real detectada durante validación
- una corrección de producto basada en evidencia
- una mejora de seguridad operacional
- una mejor separación entre:
  - intención futura
  - evidencia pasada
  - cuenta cloud actual

## Relación con otros documentos

- [Modelo de Ejecución Cloud por Usuario](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/cloud-execution-model.md)
- [Playbook de Conexiones Cloud AWS](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/aws-cloud-connections-playbook.md)
- [Matriz Formal de Permisos y Control de Usuarios](/Users/juliocaicedo/Sites/tesis/syslab-monorepo-front-back/docs/tesis/validacion/user-control-permissions-matrix.md)
