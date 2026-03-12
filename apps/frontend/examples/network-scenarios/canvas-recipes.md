# Recetas de canvas

Estas recetas sirven para construir manualmente escenarios en el canvas y observar:
- guía de aprendizaje,
- validaciones del formulario del router,
- preview de rutas,
- diferencias visuales entre VLAN/laboratorio y AWS.

## Caso A: Peering correcto entre dos VPC

Objetivo:
- entender cuándo aparece un peering válido,
- verificar conectividad bidireccional.

Pasos:
1. Crear dos VPC con CIDR distintos.
2. Crear una subnet pública en cada VPC.
3. Crear una instancia en cada subnet.
4. Conectar ambas VPC a un router.
5. En el router seleccionar modo `Peering`.
6. Crear dos rutas:
   - `VPC-A -> CIDR de VPC-B`
   - `VPC-B -> CIDR de VPC-A`
7. Guardar y abrir `Previsualizar`.

Resultado esperado:
- el router muestra un par bidireccional,
- el preview muestra conectividad completa,
- al desplegar, `Plan Detail -> Pruebas` sugiere ping de ida y vuelta.

## Caso B: Peering inválido por falta de retorno

Objetivo:
- ver por qué peering requiere rutas en ambos sentidos.

Pasos:
1. Repetir el caso A.
2. Dejar solo una ruta:
   - `VPC-A -> CIDR de VPC-B`
3. Intentar guardar el router.

Resultado esperado:
- el formulario del router advierte `Solo ida`,
- el guardado queda bloqueado,
- la explicación indica que peering no es transitivo y necesita retorno.

## Caso C: TGW con tres VPC

Objetivo:
- comparar peering vs TGW.

Pasos:
1. Crear tres VPC con subnets públicas.
2. Crear una instancia en cada VPC.
3. Conectar las tres VPC a un router.
4. En el router seleccionar modo `Transit Gateway`.
5. Crear rutas ida/vuelta entre cada par de VPC.
6. Abrir `Previsualizar`.

Resultado esperado:
- el preview muestra `Transit Gateway`,
- cada VPC queda con rutas hacia las demás por TGW,
- el resumen del router muestra attachments en lugar de peerings.

## Caso D: Tres VPC con peering parcial

Objetivo:
- entender pares conectados y pares aislados.

Pasos:
1. Crear tres VPC.
2. Conectarlas a un router en modo `Peering`.
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

## Caso E: Error por subnets solapadas

Objetivo:
- probar validación de direccionamiento.

Pasos:
1. Crear una VPC.
2. Crear una subnet `10.80.1.0/24`.
3. Crear otra subnet `10.80.1.128/25`.
4. Ejecutar validación.

Resultado esperado:
- la validación reporta solapamiento de subnets,
- no se permite avanzar al deploy.
