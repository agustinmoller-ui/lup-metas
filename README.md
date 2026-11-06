# LUP · Portal de metas

Interfaz de gestión de LUP alojada en GitHub Pages.

Este repositorio contiene únicamente código de interfaz, logo y tipografías. No contiene contratos, remuneraciones, metas individuales, resultados, claves ni tokens de activación. Los documentos y las claves se administran en un servidor independiente con validación de sesión.

## Propiedad y continuidad

Proyecto y activos para LUP. La cuenta de alojamiento elegida por el propietario es agustinmoller-ui. El servicio privado actual utiliza la infraestructura Base44 existente; no se ha ejecutado una migración a otro workspace ni se presume realizada.

## Operación

El administrador define su propia clave mediante un enlace inicial de un solo uso. La clave de lectura del equipo es distinta. Ambas pueden cambiarse dentro de Administración. Las sesiones duran hasta ocho horas y pueden revocarse. No se deben publicar datos privados en este repositorio ni en GitHub Pages.


## Gestión operativa del equipo

La sección Tareas incorpora Owner, áreas configurables, fechas de realización y límite, estados y resúmenes por persona. Sus datos son independientes de los KPI y de los bonos. Administración edita y el perfil de lectura consulta. Las copias técnicas se conservan privadas, sin enlazarlas desde Inicio.

## Minutas

Tareas contiene una subpestaña Minutas con tabla de fecha, PDF y palabras clave. Permite rango de fechas y búsqueda combinada sin distinguir tildes. Los documentos y metadatos se guardan en LupPortalPrivate (RLS cerrado); lupMinutes valida la sesión contra portalMetas antes de responder. GitHub contiene solo la interfaz, nunca PDFs ni el contenido de reuniones. Las sesiones del propietario autenticado en Base44 pueden verificar los mismos registros para mantenimiento.
