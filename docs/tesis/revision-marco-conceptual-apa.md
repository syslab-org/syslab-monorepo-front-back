# Revision del Marco Conceptual: citas y bibliografia APA

Este documento consolida la normalizacion de citas y referencias del **Capitulo 2. Marco conceptual** para evitar desalineaciones entre el texto del TEG y la bibliografia final.

## Revision global de la bibliografia del TEG

### Estado actual del PDF

La bibliografia visible en el PDF del TEG presenta tres problemas estructurales:

- mezcla referencias en formato `IEEE` con referencias en formato `APA`
- incluye obras que no estan conectadas correctamente con las citas del cuerpo del texto
- repite el autor `Amazon Web Services` en un bloque separado, sin integrarlo a una lista alfabetica unica

### Citas efectivamente detectadas en el documento

En el PDF actual se detectan como citas efectivas:

- `[1]` y `[2]` en `2.1 Redes de computadoras`
- referencias de `Amazon Web Services` en `2.3`
- referencias de `Amazon Web Services`, `HashiCorp` y `Morris` en `2.4` y `2.5`

No se detectan como citas efectivas en el cuerpo del texto:

- `[3]` `Cloud Computing: Concepts, Technology & Architecture`
- `[4]` `The NIST Definition of Cloud Computing`
- `[6]` `AWS CloudFormation User Guide`
- `[7]` `Ansible Documentation`
- `[8]` `Terraform documentation: Introduction`
- `[9]` `Terraform documentation: State`

Esto no significa necesariamente que deban eliminarse, sino que **deben reconectarse** con el texto mediante citas APA explicitas o, si no se van a usar, deben salir de la bibliografia final.

### Decision editorial recomendada

Para evitar inconsistencias, la bibliografia final del TEG deberia seguir una sola de estas dos rutas:

1. **Ruta recomendada**  
   Mantener solo referencias efectivamente citadas en el texto, y corregir `2.2`, `2.4.3.1`, `2.4.3.2` y `2.5` para que todas tengan su cita APA correspondiente.

2. **Ruta minima**  
   Eliminar de la bibliografia final las referencias que no aparezcan citadas en el cuerpo.

La opcion mas solida academicamente es la primera.

### Referencias que deben conectarse mejor con el texto

#### 2.2 Computacion en la nube

Actualmente `2.2` define computacion en la nube, modelos de servicio y modelos de despliegue, pero no tiene citas visibles. Aqui deberian incorporarse:

- `Erl, Puttini y Mahmood (2013)` para el desarrollo general del concepto
- `Mell y Grance (2011)` para la definicion de nube y modelos de despliegue

Sugerencia de insercion:

- `2.2 Computacion en la Nube` cierre del primer parrafo -> `(Erl et al., 2013; Mell & Grance, 2011)`
- `2.2.1 Modelos de servicio` -> `(Erl et al., 2013)`
- `2.2.2 Modelos de despliegue` -> `(Mell & Grance, 2011)`

#### 2.4.3.1 AWS CloudFormation

Si este apartado se mantiene en el Marco Conceptual, debe citarse con documentacion oficial de AWS:

- `Amazon Web Services, s. f.-g`

#### 2.4.3.2 Ansible

Si este apartado se mantiene, debe citarse con:

- `Ansible Documentation Project, s. f.`

#### 2.5 Terraform

La seccion ya trata conceptos de Terraform, pero las referencias de bibliografia `[8]` y `[9]` deben convertirse al mismo formato APA que el resto:

- `HashiCorp, s. f.-c` para la introduccion general
- `HashiCorp, s. f.-a` para el flujo de trabajo
- `HashiCorp, s. f.-b` para el estado

### Bibliografia final sugerida para todo el TEG

Si el documento cierra en APA y solo con referencias realmente usadas, la bibliografia consolidada deberia componerse, al menos, de:

- Amazon Web Services. (s. f.-a) a (s. f.-l)
- Ansible Documentation Project. (s. f.)
- Erl, T., Puttini, R., & Mahmood, Z. (2013)
- HashiCorp. (s. f.-a) a (s. f.-c)
- Mell, P., & Grance, T. (2011)
- Morris, K. (2020)
- Stallings, W. (2004)
- Tanenbaum, A. S. (2012)

### Referencias del PDF actual que deben corregirse o desaparecer como entradas separadas

- `[3] T. El` -> debe corregirse a `Erl, T., Puttini, R., & Mahmood, Z.`
- `[5] K. Morris, Infraestructure as Code, 3rd Edition. O'Reilly Media, 2025.` -> debe corregirse a la referencia real de `Morris (2020)` en APA
- `[6] Amazon Web Services. AWS CloudFormation User Guide.` -> no debe quedar como entrada suelta en estilo IEEE; debe integrarse como referencia APA bajo `Amazon Web Services`
- `[7] Red Hat, Inc. Ansible Documentation.` -> conviene normalizar a `Ansible Documentation Project. (s. f.)`
- `[8]` y `[9]` -> deben integrarse a las entradas APA de `HashiCorp`

## Hallazgos principales

- El capitulo mezcla formato `IEEE` (`[1]`, `[2]`, etc.) con formato `APA`.
- Las referencias de `Amazon Web Services` y `HashiCorp` usan sufijos `s. f.-a`, `s. f.-b`, etc., pero no siguen una secuencia global consistente por autor.
- `2.4.1 Principios de IaC` aparece duplicado: una version sin citas y otra version corregida con citas. Debe conservarse solo la segunda.
- `2.4.3.1 AWS CloudFormation` y `2.4.3.2 Ansible` pueden mantenerse como herramientas comparativas, pero no deben redactarse como componentes implementados del sistema.
- En el cuerpo del texto aparece `Amazon Web Service` en singular. Debe corregirse siempre a `Amazon Web Services`.

## Regla editorial recomendada

- Usar **APA 7** en todo el documento.
- Eliminar numeracion tipo `[1]`, `[2]`, `[3]` de la bibliografia final.
- Ordenar la bibliografia alfabeticamente por autor.
- Mantener `s. f.` para recursos web sin fecha visible.
- Como varias fuentes web del capitulo son documentaciones vivas, incluir `Recuperado el ...` en las referencias web.

## Mapa de citas normalizado

### Amazon Web Services

Estos sufijos deben aplicarse de forma global en todo el Capitulo 2:

- `Amazon Web Services, s. f.-a` -> *Amazon EC2 key pairs and Amazon EC2 instances*
- `Amazon Web Services, s. f.-b` -> *Amazon EC2 security groups for your EC2 instances*
- `Amazon Web Services, s. f.-c` -> *Configure route tables*
- `Amazon Web Services, s. f.-d` -> *Connect VPCs using VPC peering*
- `Amazon Web Services, s. f.-e` -> *How Amazon VPC works*
- `Amazon Web Services, s. f.-f` -> *How AWS Transit Gateway works*
- `Amazon Web Services, s. f.-g` -> *How CloudFormation works*
- `Amazon Web Services, s. f.-h` -> *IAM roles*
- `Amazon Web Services, s. f.-i` -> *Infrastructure as code*
- `Amazon Web Services, s. f.-j` -> *NAT gateways*
- `Amazon Web Services, s. f.-k` -> *Subnet route tables*
- `Amazon Web Services, s. f.-l` -> *VPC basics*

### HashiCorp

- `HashiCorp, s. f.-a` -> *Core Terraform workflow overview*
- `HashiCorp, s. f.-b` -> *State*
- `HashiCorp, s. f.-c` -> *What is Terraform?*

## Ajustes minimos recomendados en el texto

- Corregir `Amazon Web Service` -> `Amazon Web Services`
- Corregir `Amazon Elastic Compute Cloud (E2C)` -> `Amazon Elastic Compute Cloud (EC2)`
- Corregir `dentro dentro` -> `dentro de`
- Corregir `accesos remoto` -> `acceso remoto`
- Corregir `cosiste` -> `consiste`
- Corregir `Assume System Are Unreliable` -> `Assume Systems Are Unreliable`

## Reemplazos exactos de citas en el Capitulo 2

Esta seccion sirve para corregir el texto ya redactado sin perder correspondencia con la bibliografia final.

### Reemplazos globales de forma

- `Amazon Web Service, s.f.-` -> `Amazon Web Services, s. f.-`
- `Amazon Web Services, s.f.-` -> `Amazon Web Services, s. f.-`
- `Amazon Web Services, s.f-` -> `Amazon Web Services, s. f.-`
- `HashiCorp, s.f.-` -> `HashiCorp, s. f.-`
- `HashiCorp, s.f-` -> `HashiCorp, s. f.-`
- `Amazon Web Services, s.f-a` -> `Amazon Web Services, s. f.-i`
- `HashiCorp, s.f-a` -> `HashiCorp, s. f.-c`

### 2.3 Redes en la nube (AWS)

Como en la bibliografia final los sufijos de `Amazon Web Services` quedaron reordenados alfabeticamente, las citas del bloque `2.3` deben ajustarse asi:

- `s. f.-e` = *How Amazon VPC works*
- `s. f.-l` = *VPC basics*
- `s. f.-k` = *Subnet route tables*
- `s. f.-c` = *Configure route tables*
- `s. f.-j` = *NAT gateways*
- `s. f.-d` = *Connect VPCs using VPC peering*
- `s. f.-f` = *How AWS Transit Gateway works*
- `s. f.-b` = *Amazon EC2 security groups for your EC2 instances*
- `s. f.-a` = *Amazon EC2 key pairs and Amazon EC2 instances*
- `s. f.-h` = *IAM roles*

Por tanto, el bloque `2.3` debe quedar asi:

- `2.3 Redes en la Nube (AWS)` -> `(Amazon Web Services, s. f.-e; Amazon Web Services, s. f.-l)`
- `2.3.1 Redes virtuales` -> `(Amazon Web Services, s. f.-e; Amazon Web Services, s. f.-l)`
- `2.3.2 Subredes` primer par -> `(Amazon Web Services, s. f.-k; Amazon Web Services, s. f.-l)`
- `2.3.2 Subredes` segundo par -> `(Amazon Web Services, s. f.-c; Amazon Web Services, s. f.-j)`
- `2.3.3 Computo` -> `(Amazon Web Services, s. f.-a)`
- `2.3.4 Enrutamiento` -> `(Amazon Web Services, s. f.-c; Amazon Web Services, s. f.-k)`
- `2.3.5 Gateways y conectividad entre redes` primer par -> `(Amazon Web Services, s. f.-d; Amazon Web Services, s. f.-f; Amazon Web Services, s. f.-j)`
- `2.3.5` NAT Gateway -> `(Amazon Web Services, s. f.-j)`
- `2.3.5` peering y TGW -> `(Amazon Web Services, s. f.-d; Amazon Web Services, s. f.-f)`
- `2.3.6 Seguridad` primer par -> `(Amazon Web Services, s. f.-b)`
- `2.3.6 Seguridad` segundo par -> `(Amazon Web Services, s. f.-a; Amazon Web Services, s. f.-b)`
- `2.3.7 Credenciales e identidad AWS` -> `(Amazon Web Services, s. f.-h)`

### 2.4 Infraestructura como Codigo

En la bibliografia final:

- `Amazon Web Services, s. f.-i` = *Infrastructure as code*
- `Amazon Web Services, s. f.-g` = *How CloudFormation works*
- `HashiCorp, s. f.-c` = *What is Terraform?*
- `HashiCorp, s. f.-a` = *Core Terraform workflow overview*
- `HashiCorp, s. f.-b` = *State*

Con esto, `2.4` debe corregirse asi:

- `2.4` apertura -> `(Amazon Web Services, s. f.-i; HashiCorp, s. f.-c)`
- `2.4` segundo parrafo -> `(Amazon Web Services, s. f.-i)`
- `2.4.1` apertura -> `(Amazon Web Services, s. f.-i; Morris, 2020)`
- `2.4.1` cierre -> `(Amazon Web Services, s. f.-i; Morris, 2020)`
- `2.4.2` reduccion de errores humanos -> `(Amazon Web Services, s. f.-i)`
- `2.4.2` trazabilidad y control de cambios -> `(Amazon Web Services, s. f.-i; HashiCorp, s. f.-c)`
- `2.4.3` cierre introductorio -> `(Amazon Web Services, s. f.-i)`
- `2.4.3` seleccion de Terraform -> `(HashiCorp, s. f.-c)`
- `2.4.3.1 AWS CloudFormation` -> usar `(Amazon Web Services, s. f.-g)` donde se cite documentacion oficial
- `2.4.3.2 Ansible` -> usar `(Ansible Documentation Project, s. f.)`
- `2.4.3.3 Terraform` -> usar `(HashiCorp, s. f.-c; HashiCorp, s. f.-a)`

### 2.5 Terraform

- `2.5.1 Funcionamiento de Terraform` -> `(HashiCorp, s. f.-c)`
- `2.5.2 Flujo de Terraform` -> `(HashiCorp, s. f.-a)`
- `2.5.3 Estados de Terraform` -> `(HashiCorp, s. f.-b)`

### Recomendacion de consolidacion para 2.4.1

Eliminar la primera version de `2.4.1 Principios de IaC`, la que aparece sin citas y con la lista en viñetas aislada. Debe conservarse solo la version posterior, la que desarrolla cada principio con apoyo en `Morris (2020)` y `Amazon Web Services (s. f.-i)`.

## Bibliografia consolidada en APA 7

Amazon Web Services. (s. f.-a). *Amazon EC2 key pairs and Amazon EC2 instances*. Recuperado el 18 de mayo de 2026, de https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html

Amazon Web Services. (s. f.-b). *Amazon EC2 security groups for your EC2 instances*. Recuperado el 18 de mayo de 2026, de https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html

Amazon Web Services. (s. f.-c). *Configure route tables*. Recuperado el 18 de mayo de 2026, de https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html

Amazon Web Services. (s. f.-d). *Connect VPCs using VPC peering*. Recuperado el 18 de mayo de 2026, de https://docs.aws.amazon.com/vpc/latest/userguide/vpc-peering.html

Amazon Web Services. (s. f.-e). *How Amazon VPC works*. Recuperado el 18 de mayo de 2026, de https://docs.aws.amazon.com/vpc/latest/userguide/how-it-works.html

Amazon Web Services. (s. f.-f). *How AWS Transit Gateway works*. Recuperado el 18 de mayo de 2026, de https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html

Amazon Web Services. (s. f.-g). *How CloudFormation works*. Recuperado el 18 de mayo de 2026, de https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-overview.html

Amazon Web Services. (s. f.-h). *IAM roles*. Recuperado el 18 de mayo de 2026, de https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html

Amazon Web Services. (s. f.-i). *Infrastructure as code*. Recuperado el 18 de mayo de 2026, de https://docs.aws.amazon.com/whitepapers/latest/introduction-devops-aws/infrastructure-as-code.html

Amazon Web Services. (s. f.-j). *NAT gateways*. Recuperado el 18 de mayo de 2026, de https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html

Amazon Web Services. (s. f.-k). *Subnet route tables*. Recuperado el 18 de mayo de 2026, de https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html

Amazon Web Services. (s. f.-l). *VPC basics*. Recuperado el 18 de mayo de 2026, de https://docs.aws.amazon.com/vpc/latest/userguide/vpc-subnet-basics.html

Ansible Documentation Project. (s. f.). *Ansible playbooks*. Recuperado el 18 de mayo de 2026, de https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_intro.html

Erl, T., Puttini, R., & Mahmood, Z. (2013). *Cloud computing: Concepts, technology & architecture*. Pearson.

HashiCorp. (s. f.-a). *Core Terraform workflow overview*. Recuperado el 18 de mayo de 2026, de https://developer.hashicorp.com/terraform/intro/core-workflow

HashiCorp. (s. f.-b). *State*. Recuperado el 18 de mayo de 2026, de https://developer.hashicorp.com/terraform/language/state

HashiCorp. (s. f.-c). *What is Terraform?* Recuperado el 18 de mayo de 2026, de https://developer.hashicorp.com/terraform/intro

Mell, P., & Grance, T. (2011). *The NIST definition of cloud computing* (NIST Special Publication 800-145). National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-145

Morris, K. (2020). *Infrastructure as code: Dynamic systems for the cloud age* (2nd ed.). O'Reilly Media.

Stallings, W. (2004). *Comunicaciones y redes de computadores*. Pearson.

Tanenbaum, A. S. (2012). *Redes de computadoras*. Pearson.

## Nota sobre ediciones impresas

Las referencias de `Tanenbaum`, `Stallings` y la obra de `Erl, Puttini y Mahmood` deben contrastarse con la **edicion exacta realmente consultada** antes de cerrar el PDF final, especialmente si se usaron traducciones o reimpresiones locales.

## Correcciones textuales puntuales del Marco Conceptual

Esta seccion resume los ajustes mas importantes que conviene aplicar directamente sobre el texto del **Capitulo 2**, una vez normalizada la bibliografia.

### Tabla de contenido

En la tabla de contenido del PDF aparecen errores de numeracion en `2.3` y `3.4`:

- `2.3.3 Subredes` deberia ser `2.3.2 Subredes`
- `2.3.4 Seguridad` esta repetido y fuera de secuencia
- en `3.4` siguen apareciendo subsecciones como `3.3.1`, `3.3.2`, etc.

Estas inconsistencias deben corregirse en el archivo fuente del documento antes de la compilacion final.

### 2.2 Computacion en la nube

- Agregar citas en `2.2`, `2.2.1` y `2.2.2`, porque actualmente la seccion desarrolla conceptos teoricos pero no muestra soporte bibliografico visible.
- Recomendacion concreta:
  - `2.2` -> `(Erl et al., 2013; Mell & Grance, 2011)`
  - `2.2.1` -> `(Erl et al., 2013)`
  - `2.2.2` -> `(Mell & Grance, 2011)`

### 2.3 Redes en la nube (AWS)

#### Pagina 14 del capitulo

- Corregir `Amazon Web Service` -> `Amazon Web Services`
- Normalizar `s.f.` -> `s. f.`
- Ajustar la cita del cierre del primer parrafo segun el mapa final:
  - `(Amazon Web Services, s. f.-e; Amazon Web Services, s. f.-l)`

#### Pagina 15 del capitulo

- En `2.3.2 Subredes`, ajustar:
  - primer par de citas -> `(Amazon Web Services, s. f.-k; Amazon Web Services, s. f.-l)`
  - segundo par de citas -> `(Amazon Web Services, s. f.-c; Amazon Web Services, s. f.-j)`

#### Pagina 16 del capitulo

- Corregir `Amazon Elastic Compute Cloud (E2C)` -> `Amazon Elastic Compute Cloud (EC2)`
- Corregir `dentro dentro de una subred` -> `dentro de una subred`
- Ajustar la cita de `2.3.3 Computo` a:
  - `(Amazon Web Services, s. f.-a)`

#### Pagina 17 del capitulo

- En `2.3.5 Gateways y conectividad entre redes`, corregir:
  - `NAT gateway` -> `NAT Gateway`
  - referencias -> `(Amazon Web Services, s. f.-d; Amazon Web Services, s. f.-f; Amazon Web Services, s. f.-j)`

#### Pagina 18 del capitulo

- Corregir `accesos remoto seguro` -> `acceso remoto seguro`
- Corregir `resulta fundamentalmente en laboratorios` -> `resulta fundamental en laboratorios`
- En `2.3.7`, el titulo puede mejorar a:
  - `Credenciales e identidad en AWS`
- Ajustar la cita de la subseccion a:
  - `(Amazon Web Services, s. f.-h)`

### 2.4 Infraestructura como Codigo

#### Pagina 18 del capitulo

- Corregir la cita de apertura de `2.4` a:
  - `(Amazon Web Services, s. f.-i; HashiCorp, s. f.-c)`
- El texto incluye notas editoriales pendientes:
  - `(PONER IMÁGEN¿?)`
  - `(¿Otra Imagen?)`

Estas notas deben eliminarse o sustituirse por la figura real antes de la entrega final.

#### Paginas 19 a 22 del capitulo

- `2.4.1 Principios de IaC` aparece duplicado.
- Debe eliminarse la primera version:
  - la que comienza con `La Infraestructura como Codigo no se limita a automatizar...`
  - incluye la lista de principios en viñetas
  - no contiene citas
- Debe conservarse solo la segunda version:
  - la que cita `Amazon Web Services` y `Morris`
  - la que aterriza los principios al contexto de Architecta

#### Pagina 21 del capitulo

- Corregir `Assume System Are Unreliable` -> `Assume Systems Are Unreliable`
- Corregir `cosiste` -> `consiste`
- Corregir las citas:
  - `Amazon Web Services, s.f-a` -> `Amazon Web Services, s. f.-i`
  - `Morris, 2021` -> mantener uniformemente `Morris, 2020` si se usa la 2nd ed. verificada

#### Pagina 23 del capitulo

- En `2.4.2 Beneficios de IaC`, ajustar:
  - `Amazon Web Services, s.f-a` -> `Amazon Web Services, s. f.-i`
  - `HashiCorp, s.f-a` -> `HashiCorp, s. f.-c`

#### Paginas 24 y 25 del capitulo

- Si `2.4.3.1 AWS CloudFormation` se mantiene, agregar citas explicitas con:
  - `(Amazon Web Services, s. f.-g)`
- Si `2.4.3.2 Ansible` se mantiene, agregar citas explicitas con:
  - `(Ansible Documentation Project, s. f.)`

Si se decide reducir el capitulo a herramientas realmente alineadas con el producto, ambos apartados pueden resumirse como herramientas comparativas y mantener a `Terraform` como herramienta central.

### 2.5 Terraform

#### Pagina 26 del capitulo

- Corregir `terraform interpreta` -> `Terraform interpreta`
- Corregir la cita de apertura de `2.5.1` a:
  - `(HashiCorp, s. f.-c)`
- Corregir `HashiCorp, s.f. -a` -> `HashiCorp, s. f.-c`

#### Pagina 27 del capitulo

- En `2.5.2 Flujo de Terraform`, usar:
  - `(HashiCorp, s. f.-a)`

#### Pagina 28 del capitulo

- En `2.5.3 Estados de Terraform`, usar:
  - `(HashiCorp, s. f.-b)`

### Limpieza final recomendada

Antes de recompilar el TEG:

- unificar `internet` o `Internet` segun el criterio editorial elegido
- unificar `cloud` o `nube` cuando el termino pueda expresarse en espanol sin perder precision
- revisar que todos los titulos de subsecciones coincidan con la tabla de contenido
- confirmar que toda referencia en bibliografia tenga al menos una cita en el texto
- confirmar que toda cita del texto tenga una entrada unica y trazable en la bibliografia final

## Listado exacto de reemplazos en citas internas

Esta seccion esta pensada para aplicar correcciones directas sobre el archivo fuente del TEG.

### Reemplazos globales seguros

Aplicar primero estos reemplazos en todo el documento:

1. `Amazon Web Service, s.f.-` -> `Amazon Web Services, s. f.-`
2. `Amazon Web Service, s.f-` -> `Amazon Web Services, s. f.-`
3. `Amazon Web Services, s.f.-` -> `Amazon Web Services, s. f.-`
4. `Amazon Web Services, s.f-` -> `Amazon Web Services, s. f.-`
5. `HashiCorp, s.f.-` -> `HashiCorp, s. f.-`
6. `HashiCorp, s.f. -` -> `HashiCorp, s. f.-`
7. `HashiCorp, s.f-` -> `HashiCorp, s. f.-`

### Reemplazos exactos de citas AWS en 2.3

Estos reemplazos deben hacerse sobre las citas ya existentes en `2.3`:

1. `(Amazon Web Services, s. f.-e; Amazon Web Services, s. f.-j)`  
   -> `(Amazon Web Services, s. f.-e; Amazon Web Services, s. f.-l)`

2. `(Amazon Web Services, s. f.-i; Amazon Web Services, s. f.-j)`  
   -> `(Amazon Web Services, s. f.-k; Amazon Web Services, s. f.-l)`

3. `(Amazon Web Services, s. f.-c; Amazon Web Services, s. f.-h)`  
   -> `(Amazon Web Services, s. f.-c; Amazon Web Services, s. f.-j)`

4. `(Amazon Web Services, s. f.-g)`  
   -> `(Amazon Web Services, s. f.-h)`  
   Nota: aplica solo en `2.3.7 Credenciales e identidad en AWS`, no en `2.4.3.1 CloudFormation`.

5. `(Amazon Web Services, s. f.-d; Amazon Web Services, s. f.-f; Amazon Web Services, s. f.-h)`  
   -> `(Amazon Web Services, s. f.-d; Amazon Web Services, s. f.-f; Amazon Web Services, s. f.-j)`

6. `(Amazon Web Services, s. f.-h)`  
   -> `(Amazon Web Services, s. f.-j)`  
   Nota: aplica solo cuando la cita este asociada a `NAT Gateway`.

7. `(Amazon Web Services, s. f.-i)`  
   -> `(Amazon Web Services, s. f.-k)`  
   Nota: aplica solo cuando la cita este asociada a `Subnet route tables`, no cuando se cite `Infrastructure as code`.

8. `(Amazon Web Services, s. f.-j)`  
   -> `(Amazon Web Services, s. f.-l)`  
   Nota: aplica solo cuando la cita este asociada a `VPC basics`.

### Reemplazos exactos de citas AWS en 2.4

1. `(Amazon Web Services, s. f.-a; HashiCorp, s. f.-a)`  
   -> `(Amazon Web Services, s. f.-i; HashiCorp, s. f.-c)`

2. `(Amazon Web Services, s. f.-a)`  
   -> `(Amazon Web Services, s. f.-i)`  
   Nota: aplica en `2.4`, `2.4.1` y `2.4.2`, donde la referencia correcta es `Infrastructure as code`.

3. `(Amazon Web Services, s. f.-a; Morris, 2021)`  
   -> `(Amazon Web Services, s. f.-i; Morris, 2020)`

4. `(Amazon Web Services, s. f.-a; HashiCorp, s. f.-a)`  
   -> `(Amazon Web Services, s. f.-i; HashiCorp, s. f.-c)`  
   Nota: este patron reaparece en `2.4.2`.

### Reemplazos exactos de citas HashiCorp en 2.4 y 2.5

1. `(HashiCorp, s. f.-a)`  
   -> `(HashiCorp, s. f.-c)`  
   Nota: aplica cuando la cita sea introductoria o defina que es Terraform.

2. `(HashiCorp, s. f.-b)`  
   -> `(HashiCorp, s. f.-a)`  
   Nota: aplica en `2.5.2 Flujo de Terraform`, donde la referencia correcta es `Core Terraform workflow overview`.

3. `(HashiCorp, s. f.-c)`  
   -> `(HashiCorp, s. f.-b)`  
   Nota: aplica en `2.5.3 Estados de Terraform`, donde la referencia correcta es `State`.

### Reemplazos de ano para Morris

1. `(Morris, 2021)` -> `(Morris, 2020)`

### Reemplazos textuales que afectan coherencia bibliografica

1. `Amazon Web Service` -> `Amazon Web Services`
2. `Amazon Elastic Compute Cloud (E2C)` -> `Amazon Elastic Compute Cloud (EC2)`
3. `Assume System Are Unreliable` -> `Assume Systems Are Unreliable`
4. `cosiste` -> `consiste`
5. `dentro dentro` -> `dentro de`
6. `accesos remoto` -> `acceso remoto`

### Orden sugerido para aplicar los cambios

1. Ejecutar los reemplazos globales seguros.
2. Corregir `2.3` con los reemplazos AWS especificos.
3. Corregir `2.4` y `2.5` con los reemplazos de `AWS`, `HashiCorp` y `Morris`.
4. Eliminar la primera version duplicada de `2.4.1`.
5. Agregar las citas faltantes en `2.2`.
6. Reemplazar la bibliografia final por la lista APA consolidada de este documento.

## Guia operacional por subseccion y parrafo

Usa esta seccion como mapa directo para editar el archivo fuente del TEG. Cada punto indica:

- **donde** hacer el cambio
- **como ubicarlo**
- **que reemplazar o agregar**

### 2.2 Computacion en la nube

#### 2.2 Apertura de la seccion

- **Ubicacion**: `2.2 Computacion en la Nube`
- **Ubica este texto**: `La computación en la nube es un modelo que permite el acceso bajo demanda...`
- **Accion**: al final del segundo parrafo, agregar cita
- **Debe quedar asi**:
  - `...lo que lo convierte en una solución ampliamente adoptada en entornos tecnológicos modernos (Erl et al., 2013; Mell & Grance, 2011).`

#### 2.2.1 Modelos de servicio

- **Ubicacion**: `2.2.1 Modelos de servicio`
- **Ubica este texto**: `Los modelos de servicio en la computación en la nube definen el nivel de control...`
- **Accion**: agregar una cita al final del parrafo introductorio
- **Debe quedar asi**:
  - `...definen el nivel de control que tiene el usuario sobre la infraestructura y los servicios utilizados (Erl et al., 2013).`

#### 2.2.2 Modelos de despliegue

- **Ubicacion**: `2.2.2 Modelos de despliegue`
- **Ubica este texto**: `Los modelos de despliegue en la computación en la nube se refieren...`
- **Accion**: agregar cita al final del parrafo introductorio o al final de la frase `Existen cuatro modelos principales...`
- **Debe quedar asi**:
  - `Existen cuatro modelos principales de despliegue: nube pública, nube privada, nube comunitaria y nube híbrida (Mell & Grance, 2011).`

### 2.3 Redes en la nube (AWS)

#### 2.3 Apertura general

- **Ubicacion**: primer parrafo de `2.3 Redes en la Nube (AWS)`
- **Ubica este texto**: `...adaptadas al paradigma cloud (Amazon Web Service, s.f.-e; Amazon Web Services, s.f.-j).`
- **Reemplazar por**:
  - `...adaptadas al paradigma cloud (Amazon Web Services, s. f.-e; Amazon Web Services, s. f.-l).`

#### 2.3.1 Redes virtuales

- **Ubicacion**: primer parrafo de `2.3.1 Redes virtuales`
- **Ubica este texto**: `...con redes externas (Amazon Web Service, s.f.-e; Amazon Web Services, s.f.-j).`
- **Reemplazar por**:
  - `...con redes externas (Amazon Web Services, s. f.-e; Amazon Web Services, s. f.-l).`

#### 2.3.2 Subredes, primer parrafo

- **Ubicacion**: primer parrafo de `2.3.2 Subredes`
- **Ubica este texto**: `...según criterios de aislamiento, exposición y función (Amazon Web Service, s.f.-i; Amazon Web Services, s.f.-j).`
- **Reemplazar por**:
  - `...según criterios de aislamiento, exposición y función (Amazon Web Services, s. f.-k; Amazon Web Services, s. f.-l).`

#### 2.3.2 Subredes, segundo parrafo

- **Ubicacion**: segundo parrafo de `2.3.2 Subredes`
- **Ubica este texto**: `...mediante mecanismos intermedios (Amazon Web Service, s.f.-c; Amazon Web Services, s.f.-h).`
- **Reemplazar por**:
  - `...mediante mecanismos intermedios (Amazon Web Services, s. f.-c; Amazon Web Services, s. f.-j).`

#### 2.3.3 Computo

- **Ubicacion**: primer parrafo de `2.3.3 Cómputo`
- **Ubica este texto**: `Amazon Elastic Compute Cloud (E2C)` y `(...Amazon Web Service, s.f.-a).`
- **Reemplazar por**:
  - `Amazon Elastic Compute Cloud (EC2)`
  - `(...Amazon Web Services, s. f.-a).`

- **Ubicacion**: segundo parrafo de `2.3.3 Cómputo`
- **Ubica este texto**: `Cada instancia se ubica dentro dentro de una subred`
- **Reemplazar por**:
  - `Cada instancia se ubica dentro de una subred`

#### 2.3.4 Enrutamiento

- **Ubicacion**: primer parrafo de `2.3.4 Enrutamiento`
- **Ubica este texto**: `...sale hacia internet (Amazon Web Service, s.f.-c; Amazon Web Services, s.f.-i).`
- **Reemplazar por**:
  - `...sale hacia internet (Amazon Web Services, s. f.-c; Amazon Web Services, s. f.-k).`

#### 2.3.5 Gateways y conectividad entre redes, primer parrafo

- **Ubicacion**: primer parrafo de `2.3.5 Gateways y conectividad entre redes`
- **Ubica este texto**: `...Transit Gateway (Amazon Web Service, s.f.-d; Amazon Web Services, s.f.-f; Amazon Web Services, s.f.-h).`
- **Reemplazar por**:
  - `...Transit Gateway (Amazon Web Services, s. f.-d; Amazon Web Services, s. f.-f; Amazon Web Services, s. f.-j).`

#### 2.3.5 Gateways y conectividad entre redes, segundo parrafo

- **Ubicacion**: segundo parrafo de `2.3.5`
- **Ubica este texto**: `Por su parte, el NAT gateway... (Amazon Web Service, s.f.-h).`
- **Reemplazar por**:
  - `Por su parte, el NAT Gateway... (Amazon Web Services, s. f.-j).`

#### 2.3.5 Gateways y conectividad entre redes, tercer parrafo

- **Ubicacion**: tercer parrafo de `2.3.5`
- **Ubica este texto**: `...escalables y centralizados (Amazon Web Service, s.f.-d; Amazon Web Services, s.f.-f).`
- **Reemplazar por**:
  - `...escalables y centralizados (Amazon Web Services, s. f.-d; Amazon Web Services, s. f.-f).`

#### 2.3.6 Seguridad

- **Ubicacion**: primer parrafo de `2.3.6 Seguridad`
- **Ubica este texto**: `...está autorizado (Amazon Web Service, s.f.-b).`
- **Reemplazar por**:
  - `...está autorizado (Amazon Web Services, s. f.-b).`

- **Ubicacion**: segundo parrafo de `2.3.6 Seguridad`
- **Ubica este texto**: `pares de claves para accesos remoto seguro`
- **Reemplazar por**:
  - `pares de claves para acceso remoto seguro`

- **Ubica este texto**: `...dirección IP (Amazon Web Service, s.f.-a; Amazon Web Services, s.f.-b).`
- **Reemplazar por**:
  - `...dirección IP (Amazon Web Services, s. f.-a; Amazon Web Services, s. f.-b).`

- **Ubica este texto**: `lo que resulta fundamentalmente en laboratorios`
- **Reemplazar por**:
  - `lo que resulta fundamental en laboratorios`

#### 2.3.7 Credenciales e identidad AWS

- **Ubicacion**: titulo de la subseccion
- **Reemplazar**:
  - `2.3.7 Credenciales e identidad AWS`
  - por
  - `2.3.7 Credenciales e identidad en AWS`

- **Ubicacion**: primer parrafo de `2.3.7`
- **Ubica este texto**: `...asunción de roles (Amazon Web Service, s.f.-g).`
- **Reemplazar por**:
  - `...asunción de roles (Amazon Web Services, s. f.-h).`

### 2.4 Infraestructura como Codigo

#### 2.4 Apertura general

- **Ubicacion**: primer parrafo de `2.4`
- **Ubica este texto**: `...desarrollo de software (Amazon Web Services, s.f.-a; HashiCorp, s.f.-a).`
- **Reemplazar por**:
  - `...desarrollo de software (Amazon Web Services, s. f.-i; HashiCorp, s. f.-c).`

- **Ubicacion**: segundo parrafo de `2.4`
- **Ubica este texto**: `...configuraciones equivalentes en distintos escenarios (Amazon Web Services, s.f.-a).`
- **Reemplazar por**:
  - `...configuraciones equivalentes en distintos escenarios (Amazon Web Services, s. f.-i).`

- **Ubicacion**: cuerpo de `2.4`
- **Eliminar**:
  - `(PONER IMÁGEN¿?)`
  - `(¿Otra Imagen?)`

#### 2.4.1 Principios de IaC

- **Ubicacion**: desde `2.4.1 Principios de IaC` hasta antes del parrafo que comienza con `La Infraestructura como Código no se limita a automatizar la creación de recursos, sino que plantea una manera distinta...`
- **Accion**: eliminar todo ese bloque
- **Motivo**: es la primera version duplicada, sin citas, del apartado

- **Ubicacion**: version que se conserva de `2.4.1`
- **Ubica este texto**: `...funcionales, operativos o de escala (Amazon Web Services, s.f-a; Morris, 2021).`
- **Reemplazar por**:
  - `...funcionales, operativos o de escala (Amazon Web Services, s. f.-i; Morris, 2020).`

- **Ubica este texto**: `Assume System Are Unreliable`
- **Reemplazar por**:
  - `Assume Systems Are Unreliable`

- **Ubica este texto**: `uno de sus objetivos principales cosiste`
- **Reemplazar por**:
  - `uno de sus objetivos principales consiste`

- **Ubica este texto**: cualquier `(Morris, 2021)`
- **Reemplazar por**:
  - `(Morris, 2020)`

- **Ubica este texto**: `...sobre un proveedor cloud (Amazon Web Services, s.f.-a; Morris, 2021).`
- **Reemplazar por**:
  - `...sobre un proveedor cloud (Amazon Web Services, s. f.-i; Morris, 2020).`

#### 2.4.2 Beneficios de IaC

- **Ubicacion**: primer parrafo de `2.4.2`
- **Ubica este texto**: `...configuración de recursos (Amazon Web Services, s.f-a).`
- **Reemplazar por**:
  - `...configuración de recursos (Amazon Web Services, s. f.-i).`

- **Ubicacion**: parrafo sobre trazabilidad y control de cambios
- **Ubica este texto**: `...código fuente de una aplicación (Amazon Web Services, s.f.-a; HashiCorp, s.f-a).`
- **Reemplazar por**:
  - `...código fuente de una aplicación (Amazon Web Services, s. f.-i; HashiCorp, s. f.-c).`

#### 2.4.3 Herramientas IaC

- **Ubicacion**: primer parrafo de `2.4.3`
- **Ubica este texto**: `...dependencia de procedimientos manuales (Amazon Web Services, s.f.-a)`
- **Reemplazar por**:
  - `...dependencia de procedimientos manuales (Amazon Web Services, s. f.-i).`

- **Ubicacion**: segundo parrafo de `2.4.3`
- **Ubica este texto**: `...proveedores especializados (HashiCorp, s.f.-a).`
- **Reemplazar por**:
  - `...proveedores especializados (HashiCorp, s. f.-c).`

#### 2.4.3.1 AWS CloudFormation

- **Ubicacion**: final del primer o segundo parrafo de `2.4.3.1`
- **Accion**: agregar cita oficial de AWS
- **Agregar**:
  - `(Amazon Web Services, s. f.-g)`

- **Recomendacion**: agregar la cita al menos una vez en el apartado; idealmente en el parrafo donde se define `stack` o donde se menciona el manejo de cambios.

#### 2.4.3.2 Ansible

- **Ubicacion**: final del primer parrafo de `2.4.3.2`
- **Accion**: agregar cita oficial
- **Agregar**:
  - `(Ansible Documentation Project, s. f.)`

- **Recomendacion**: si quieres mayor apoyo, repetir la misma cita en el parrafo donde se menciona `playbooks` e idempotencia.

### 2.5 Terraform

#### 2.5 Apertura general

- **Ubicacion**: primer parrafo de `2.5`
- **Ubica este texto**: `la forma en que terraform interpreta`
- **Reemplazar por**:
  - `la forma en que Terraform interpreta`

#### 2.5.1 Funcionamiento de Terraform

- **Ubicacion**: primer parrafo de `2.5.1`
- **Ubica este texto**: `...configuración declarativos (HashiCorp, s.f. -a).`
- **Reemplazar por**:
  - `...configuración declarativos (HashiCorp, s. f.-c).`

- **Ubicacion**: segundo parrafo de `2.5.1`
- **Ubica este texto**: `...infraestructura (HashiCorp, s.f.-a).`
- **Reemplazar por**:
  - `...infraestructura (HashiCorp, s. f.-c).`

- **Ubicacion**: cuarto parrafo de `2.5.1`
- **Ubica este texto**: `...múltiples componentes (HashiCorp, s.f.-a).`
- **Reemplazar por**:
  - `...múltiples componentes (HashiCorp, s. f.-c).`

#### 2.5.2 Flujo de Terraform

- **Ubicacion**: primer parrafo de `2.5.2`
- **Ubica este texto**: `...infraestructura real desplegada (HashiCorp, s.f.-b).`
- **Reemplazar por**:
  - `...infraestructura real desplegada (HashiCorp, s. f.-a).`

- **Ubicacion**: ultimo parrafo de `2.5.2`
- **Ubica este texto**: `...automatización y el control de cambios (HashiCorp, s.f.-b).`
- **Reemplazar por**:
  - `...automatización y el control de cambios (HashiCorp, s. f.-a).`

#### 2.5.3 Estados de Terraform

- **Ubicacion**: primer parrafo de `2.5.3`
- **Ubica este texto**: `...sistemas externos (HashiCorp, s.f-c).`
- **Reemplazar por**:
  - `...sistemas externos (HashiCorp, s. f.-b).`

- **Ubicacion**: tercer parrafo de `2.5.3`
- **Ubica este texto**: `...entornos colaborativos (HashiCorp, s.f.-c).`
- **Reemplazar por**:
  - `...entornos colaborativos (HashiCorp, s. f.-b).`

- **Ubicacion**: cuarto parrafo de `2.5.3`
- **Ubica este texto**: `...forma controlada (HashiCorp, s.f.-c).`
- **Reemplazar por**:
  - `...forma controlada (HashiCorp, s. f.-b).`

## Cambios pendientes exactos sobre `TEG v1.0 - 2026 (2).pdf`

Esta seccion aplica **solo** a la version mas reciente del PDF que compartiste. Aqui van unicamente los cambios que siguen pendientes en esa version.

### Lo que ya quedo resuelto en esta version

No hace falta tocar de nuevo estos puntos:

- `2.2 Computacion en la nube` ya tiene citas a `Erl et al. (2013)` y `Mell & Grance (2011)`.
- `2.4.3.1 AWS CloudFormation` ya incluye la cita a `Amazon Web Services, s. f.-g`.
- `2.4.3.2 Ansible` ya incluye la cita a `Ansible Documentation Project, s. f.`.
- `2.5` apertura general ya incluye una cita a `HashiCorp, s. f.-c`.

### Cambios pendientes, exactos y localizables

#### Pagina 21 del PDF: `2.3 Redes en la Nube (AWS)`

- **Busca exactamente**:
  - `...adaptadas al paradigma cloud (Amazon Web Service, s.f.-e; Amazon Web Services, s.f.-j).`
- **Sustituye por**:
  - `...adaptadas al paradigma cloud (Amazon Web Services, s. f.-e; Amazon Web Services, s. f.-j).`

#### Pagina 21 del PDF: `2.3.1 Redes virtuales`

- **Busca exactamente**:
  - `...con redes externas (Amazon Web Service, s.f.-e; Amazon Web Services, s.f.-j).`
- **Sustituye por**:
  - `...con redes externas (Amazon Web Services, s. f.-e; Amazon Web Services, s. f.-j).`

#### Pagina 21 del PDF: `2.3.2 Subredes`, primer parrafo

- **Busca exactamente**:
  - `...según criterios de aislamiento, exposición y función (Amazon Web Service, s.f.-i; Amazon Web Services, s.f.-j).`
- **Sustituye por**:
  - `...según criterios de aislamiento, exposición y función (Amazon Web Services, s. f.-i; Amazon Web Services, s. f.-j).`

#### Pagina 21 del PDF: `2.3.2 Subredes`, segundo parrafo

- **Busca exactamente**:
  - `...mediante mecanismos intermedios (Amazon Web Service, s.f.-c; Amazon Web Services, s.f.-h).`
- **Sustituye por**:
  - `...mediante mecanismos intermedios (Amazon Web Services, s. f.-c; Amazon Web Services, s. f.-h).`

#### Pagina 22 del PDF: `2.3.3 Cómputo`

- **Busca exactamente**:
  - `Amazon Elastic Compute Cloud (E2C)`
- **Sustituye por**:
  - `Amazon Elastic Compute Cloud (EC2)`

- **Busca exactamente**:
  - `...servicios o herramientas de laboratorio (Amazon Web Service,`
  - y en la linea siguiente: `s.f.-a).`
- **Sustituye por**:
  - `...servicios o herramientas de laboratorio (Amazon Web Services, s. f.-a).`

- **Busca exactamente**:
  - `Cada instancia se ubica dentro dentro de una subred`
- **Sustituye por**:
  - `Cada instancia se ubica dentro de una subred`

#### Pagina 22 del PDF: `2.3.4 Enrutamiento`

- **Busca exactamente**:
  - `...sale hacia internet (Amazon Web Service, s.f.-c; Amazon Web`
  - siguiente linea: `Services, s.f.-i).`
- **Sustituye por**:
  - `...sale hacia internet (Amazon Web Services, s. f.-c; Amazon Web Services, s. f.-i).`

#### Pagina 23 del PDF: `2.3.5 Gateways y conectividad entre redes`

- **Busca exactamente**:
  - `...Transit Gateway (Amazon Web Service, s.f.-d; Amazon Web Services, s.f.-f;`
  - siguiente linea: `Amazon Web Services, s.f.-h).`
- **Sustituye por**:
  - `...Transit Gateway (Amazon Web Services, s. f.-d; Amazon Web Services, s. f.-f; Amazon Web Services, s. f.-h).`

- **Busca exactamente**:
  - `Por su parte, el NAT gateway`
- **Sustituye por**:
  - `Por su parte, el NAT Gateway`

- **Busca exactamente**:
  - `...desde el exterior (Amazon Web Service, s.f.-h).`
- **Sustituye por**:
  - `...desde el exterior (Amazon Web Services, s. f.-h).`

- **Busca exactamente**:
  - `...escalables y centralizados (Amazon Web Service, s.f.-d; Amazon Web Services, s.f.-f).`
- **Sustituye por**:
  - `...escalables y centralizados (Amazon Web Services, s. f.-d; Amazon Web Services, s. f.-f).`

#### Pagina 23 del PDF: `2.3.6 Seguridad`

- **Busca exactamente**:
  - `...está autorizado (Amazon Web Service,`
  - siguiente linea: `s.f.-b).`
- **Sustituye por**:
  - `...está autorizado (Amazon Web Services, s. f.-b).`

- **Busca exactamente**:
  - `pares de claves para accesos remoto seguro`
- **Sustituye por**:
  - `pares de claves para acceso remoto seguro`

- **Busca exactamente**:
  - `...dirección IP (Amazon Web Service, s.f.-a; Amazon Web Services, s.f.-b).`
- **Sustituye por**:
  - `...dirección IP (Amazon Web Services, s. f.-a; Amazon Web Services, s. f.-b).`

- **Busca exactamente**:
  - `lo que resulta fundamentalmente en laboratorios`
- **Sustituye por**:
  - `lo que resulta fundamental en laboratorios`

#### Pagina 24 del PDF: `2.3.7 Credenciales e identidad AWS`

- **Busca exactamente**:
  - `2.3.7 Credenciales e identidad AWS`
- **Sustituye por**:
  - `2.3.7 Credenciales e identidad en AWS`

- **Busca exactamente**:
  - `...como la asunción de roles (Amazon Web`
  - siguiente linea: `Service, s.f.-g).`
- **Sustituye por**:
  - `...como la asunción de roles (Amazon Web Services, s. f.-g).`

#### Pagina 24 del PDF: `2.4 Infraestructura como Código`

- **Busca exactamente**:
  - `...desarrollo de software (Amazon Web`
  - siguiente linea: `Services, s.f.-a; HashiCorp, s.f.-a).`
- **Sustituye por**:
  - `...desarrollo de software (Amazon Web Services, s. f.-a; HashiCorp, s. f.-a).`

- **Busca exactamente**:
  - `...distintos escenarios (Amazon Web`
  - siguiente linea: `Services, s.f.-a).`
- **Sustituye por**:
  - `...distintos escenarios (Amazon Web Services, s. f.-a).`

- **Elimina completamente**:
  - `(PONER IMÁGEN¿?)`
  - `(¿Otra Imagen?)`

#### Paginas 25 a 29 del PDF: `2.4.1 Principios de IaC`

- **Accion estructural**:
  - elimina la **primera version completa** del apartado, la que arranca en la pagina 25 con `La Infraestructura como Código no se limita a automatizar la creación de recursos...` y llega hasta antes del nuevo arranque del mismo apartado en la pagina 27.

- **Conserva solo la segunda version**, la que ya trae citas con `Amazon Web Services` y `Morris`.

- **Dentro de la version que se conserva, busca exactamente**:
  - `...operativos o de escala (Amazon Web Services, s.f-a; Morris, 2021).`
- **Sustituye por**:
  - `...operativos o de escala (Amazon Web Services, s. f.-a; Morris, 2021).`

- **Busca exactamente**:
  - `Assume System Are Unreliable`
- **Sustituye por**:
  - `Assume Systems Are Unreliable`

- **Busca exactamente**:
  - `uno de sus objetivos principales cosiste`
- **Sustituye por**:
  - `uno de sus objetivos principales consiste`

- **Busca exactamente**:
  - `...sobre un proveedor cloud (Amazon Web Services,`
  - siguiente linea: `s.f.-a; Morris, 2021).`
- **Sustituye por**:
  - `...sobre un proveedor cloud (Amazon Web Services, s. f.-a; Morris, 2021).`

#### Paginas 29 y 30 del PDF: `2.4.2 Beneficios de IaC`

- **Busca exactamente**:
  - `...configuración de recursos (Amazon Web Services, s.f-a).`
- **Sustituye por**:
  - `...configuración de recursos (Amazon Web Services, s. f.-a).`

- **Busca exactamente**:
  - `...código fuente de una aplicación (Amazon Web Services,`
  - siguiente linea: `s.f.-a; HashiCorp, s.f-a).`
- **Sustituye por**:
  - `...código fuente de una aplicación (Amazon Web Services, s. f.-a; HashiCorp, s. f.-a).`

#### Pagina 30 del PDF: `2.4.3 Herramientas IaC`

- **Busca exactamente**:
  - `...dependencia de procedimientos manuales (Amazon Web Services, s.f.-a)`
- **Sustituye por**:
  - `...dependencia de procedimientos manuales (Amazon Web Services, s. f.-a).`

- **Busca exactamente**:
  - `...proveedores especializados (HashiCorp, s.f.-a).`
- **Sustituye por**:
  - `...proveedores especializados (HashiCorp, s. f.-a).`

#### Pagina 32 del PDF: `2.5 Terraform`

- **Busca exactamente**:
  - `la forma en que terraform interpreta`
- **Sustituye por**:
  - `la forma en que Terraform interpreta`

- **Busca exactamente**:
  - `...gestión del estado (HashiCorp, s. f.-c) .`
- **Sustituye por**:
  - `...gestión del estado (HashiCorp, s. f.-c).`

#### Pagina 33 del PDF: `2.5.1 Funcionamiento de Terraform`

- **Busca exactamente**:
  - `...configuración declarativos (HashiCorp, s.f. -a).`
- **Sustituye por**:
  - `...configuración declarativos (HashiCorp, s. f.-a).`

- **Busca exactamente**:
  - `...infraestructura (HashiCorp, s.f.-a).`
- **Sustituye por**:
  - `...infraestructura (HashiCorp, s. f.-a).`

- **Busca exactamente**:
  - `...múltiples componentes (HashiCorp, s.f.-a).`
- **Sustituye por**:
  - `...múltiples componentes (HashiCorp, s. f.-a).`

#### Paginas 34 y 35 del PDF: `2.5.2 Flujo de Terraform`

- **Busca exactamente**:
  - `...infraestructura real desplegada (HashiCorp, s.f.-b).`
- **Sustituye por**:
  - `...infraestructura real desplegada (HashiCorp, s. f.-b).`

- **Busca exactamente**:
  - `...automatización y el control de cambios (HashiCorp, s.f.-b).`
- **Sustituye por**:
  - `...automatización y el control de cambios (HashiCorp, s. f.-b).`

#### Pagina 35 del PDF: `2.5.3 Estados de Terraform`

- **Busca exactamente**:
  - `...sistemas externos (HashiCorp,`
  - siguiente linea: `s.f-c).`
- **Sustituye por**:
  - `...sistemas externos (HashiCorp, s. f.-c).`

- **Busca exactamente**:
  - `...entornos colaborativos (HashiCorp, s.f.-c).`
- **Sustituye por**:
  - `...entornos colaborativos (HashiCorp, s. f.-c).`

- **Busca exactamente**:
  - `...forma controlada (HashiCorp, s.f.-c).`
- **Sustituye por**:
  - `...forma controlada (HashiCorp, s. f.-c).`

### Bibliografia final: que sigue pendiente

En esta version del PDF, la bibliografia sigue necesitando estos cambios:

1. El bloque sigue mezclando `IEEE` y `APA`. Debe quedar una sola lista en `APA 7`.
2. `[3] T. El, ...` debe corregirse a `Erl, T., Puttini, R., & Mahmood, Z.`
3. `[5] K. Morris, Infraestructure as Code, 3rd Edition. O’Reilly Media, 2025.` debe corregirse a la edicion real usada.
4. `[6]`, `[7]`, `[8]` y `[9]` no deben quedar como entradas separadas en estilo IEEE; deben integrarse a la lista APA consolidada.
