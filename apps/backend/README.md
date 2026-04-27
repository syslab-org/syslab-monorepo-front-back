# Backend Overview

El backend es la fuente de verdad para:

- autenticación y autorización
- cursos, usuarios y roles
- laboratorios (`Lab`)
- ejecuciones y planes (`Plan`)

## Modelo canónico

Conceptos principales:

- `Lab`: laboratorio persistido, con `canvas_id` canónico
- `Plan`: ejecución asociada a un laboratorio
- `NetworkIntent`: contrato neutral del dominio multi-cloud

El frontend debe hablar en términos de:

- `labs`
- `canvas`
- `canvas_id`

## Compatibilidad legacy

Todavía existen nombres legacy por compatibilidad con datos y payloads históricos:

- `legacy_canvas_id` en `Lab`
- `firestore_vpc_id` como alias legacy de `Plan.canvas_id`
- `vpcId` y `firestore_vpc_id` como inputs tolerados en algunos endpoints

Regla actual:

- `canvas_id` es el identificador canónico
- los nombres legacy solo se aceptan para lectura o migración
- los payloads persistidos deben guardarse con `canvas_id`

## Flujo de compilación

1. El frontend modela el laboratorio y envía un `NetworkIntent` neutral.
2. El backend valida ese intent.
3. El provider adapter compila el intent al formato requerido por la ejecución real.
4. En el MVP actual, solo `aws` tiene adapter funcional.

## Estado de providers

- `aws`: funcional
- `gcp`: scaffolding
- `azure`: scaffolding

## Nota sobre Terraform

Terraform sigue operando con un payload AWS-oriented en la capa de ejecución.
Eso no es el contrato de dominio. Es una traducción temporal del adapter AWS
mientras el sistema termina de desacoplar el storage y la ejecución.
