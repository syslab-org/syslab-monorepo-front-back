# Frontend

## 1. Stack real

Archivo base: `apps/frontend/package.json`

Tecnologias confirmadas:

- React 18
- Vite
- React Router
- Material UI
- Zustand
- `@xyflow/react`
- `react-hook-form`
- `yup`
- `i18next`

Observaciones confirmadas:

- el flujo principal de API usa `fetch` via `apps/frontend/src/infrastructure/http/api.js`,
- `axios` y `firebase` siguen declarados como dependencias pero no aparecen usados en `src/`.

## 2. Rutas reales

Archivo principal: `apps/frontend/src/App.jsx`

Rutas publicas:

- `/login`
- `/registration/:userId`

Rutas autenticadas:

- `/admin/dashboard`
- `/admin/paneladmin`
- `/admin/settings/amis`
- `/admin/settings/key-pairs`
- `/admin/settings/usersmanagement`
- `/admin/settings/courses`
- `/admin/settings/profile`
- `/admin/settings/cloud-connections`
- `/admin/settings/general`
- `/admin/labs`
- `/admin/labs/:labId/canvas`
- `/admin/plans`
- `/admin/plans/:id`
- `/tasks-demo`

Rutas legacy de compatibilidad:

- `/admin/vpcs`
- `/admin/vpcs/:vpcid/mainflow`

## 3. Modulos funcionales reales

- `features/auth/`: login, registro por invitacion, auth service.
- `features/networkCanvas/`: editor principal del laboratorio.
- `features/plans/`: lista y detalle de planes.
- `features/settings/`: usuarios, cursos, conexiones cloud, AMIs y key pairs.
- `features/admin/`: dashboard, perfil y panel admin.
- `features/devtools/`: demo simple de tareas asincronas.

## 4. Como funciona el canvas

Archivo principal: `apps/frontend/src/features/networkCanvas/pages/CanvasFlowPage.jsx`

Responsabilidades observables:

- carga del laboratorio segun `labId` o id legacy,
- restauracion y guardado del flow,
- polling del estado del plan,
- gestion de dirty state,
- apertura de modales de nodos,
- sincronizacion de metadata del plan,
- preview de rutas,
- despliegue y destroy desde UI.

Hooks centrales usados por la pagina:

- `useCanvasInitialization`
- `useCanvasRuntimeController`
- `useNetworkPlanController`
- `usePlanMeta`
- `usePlanPolling`
- `useRoutingPreview`
- `useSaveFlow`
- `useRestoreFlow`

## 5. Providers en UI

Archivos principales:

- `apps/frontend/src/features/networkCanvas/providers/providerCatalog.js`
- `apps/frontend/src/features/networkCanvas/providers/providerOverrides.js`

Estado real en UI:

- `aws`: `designEnabled=true`, `defaultRuntimeStatus=ready`
- `gcp`: `designEnabled=true`, `defaultRuntimeStatus=planned`
- `azure`: `designEnabled=true`, `defaultRuntimeStatus=planned`

Interpretacion correcta:

- el canvas si puede modelar AWS, GCP y Azure a nivel de formularios y labels,
- eso no implica que GCP o Azure se puedan desplegar de verdad desde backend.

## 6. Integracion con backend

Archivo principal: `apps/frontend/src/infrastructure/http/api.js`

El cliente HTTP ya contempla:

- auth,
- `me`,
- usuarios,
- cursos,
- conexiones cloud,
- labs,
- catalogos de AMIs y key pairs,
- capacidades de providers,
- planes y logs,
- sync desde canvas,
- deploy y destroy.

## 7. Hallazgos importantes

- `apps/frontend/README.md` no describe el frontend real; es un placeholder de Vite.
- el nombre de ruta `/registration/:userId` no refleja que el valor real es un `invite_token`.
- la documentacion historica que menciona `MainFlow.jsx` esta desactualizada: la pagina activa es `CanvasFlowPage.jsx`.
