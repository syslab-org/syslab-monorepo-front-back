# Recetas de canvas

Estas recetas sirven para construir manualmente escenarios en el canvas y observar:
- guía de modelado,
- validaciones del formulario de conectividad,
- preview de rutas,
- diferencias entre la vista neutral y la traducción AWS.

## Caso A: Direct links correctos entre dos segmentos

Objetivo:
- entender cuándo aparece un enlace directo válido,
- verificar conectividad bidireccional.

Pasos:
1. Crear dos segmentos con CIDR distintos.
2. Crear una zona pública en cada segmento.
3. Crear un workload en cada zona.
4. Conectar ambos segmentos a un nodo de conectividad.
5. En la policy de conectividad seleccionar modo `Direct links`.
6. Crear dos rutas:
   - `VPC-A -> CIDR de VPC-B`
   - `VPC-B -> CIDR de VPC-A`
7. Guardar y abrir `Previsualizar`.

Resultado esperado:
- el router muestra un par bidireccional,
- el preview muestra conectividad completa,
- al desplegar, `Plan Detail -> Pruebas` sugiere ping de ida y vuelta.

## Caso B: Direct link inválido por falta de retorno

Objetivo:
- ver por qué un `direct link` requiere rutas en ambos sentidos.

Pasos:
1. Repetir el caso A.
2. Dejar solo una ruta:
   - `VPC-A -> CIDR de VPC-B`
3. Intentar guardar el router.

Resultado esperado:
- el formulario de conectividad advierte `Solo ida`,
- el guardado queda bloqueado,
- la explicación indica que el enlace directo no es transitivo y necesita retorno.

## Caso C: Hub routing con tres segmentos

Objetivo:
- comparar `direct links` vs `hub routing`.

Pasos:
1. Crear tres segmentos con zonas públicas.
2. Crear un workload en cada segmento.
3. Conectar los tres segmentos a un nodo de conectividad.
4. En la policy de conectividad seleccionar modo `Hub routing`.
5. Crear rutas ida/vuelta entre cada par de segmentos.
6. Abrir `Previsualizar`.

Resultado esperado:
- el preview muestra un `routing hub`,
- cada segmento queda con rutas hacia los demás mediante el hub,
- la traducción AWS muestra attachments en lugar de peerings.

## Caso D: Tres segmentos con direct links parciales

Objetivo:
- entender pares conectados y pares aislados.

Pasos:
1. Crear tres segmentos.
2. Conectarlos a un nodo de conectividad en modo `Direct links`.
3. Crear solo estas rutas:
   - `VPC-A -> VPC-B`
   - `VPC-B -> VPC-A`
   - `VPC-B -> VPC-C`
   - `VPC-C -> VPC-B`
4. Abrir `Previsualizar`.

Resultado esperado:
- `VPC-A <-> VPC-B` aparece conectada,
- `VPC-B <-> VPC-C` aparece conectada,
- `VPC-A <-> VPC-C` aparece aislada.

## Caso E: Error por zonas solapadas

Objetivo:
- probar validación de direccionamiento.

Pasos:
1. Crear un segmento.
2. Crear una zona `10.80.1.0/24`.
3. Crear otra zona `10.80.1.128/25`.
4. Ejecutar validación.

Resultado esperado:
- la validación reporta solapamiento de zonas,
- no se permite avanzar al deploy.
