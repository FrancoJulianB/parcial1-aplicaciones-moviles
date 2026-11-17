# Mi lista de compras — Parcial 1 de Aplicaciones Móviles

**Alumno:** Franco Julián Barrera · **Opción elegida:** Lista de compras inteligente.

Aplicación móvil realizada con React Native, Expo y TypeScript. Permite organizar una lista de compras por usuario, guardar productos en el dispositivo y programar un recordatorio local.

## Ejecución

Requiere Node.js 22.13 o posterior de la rama 22, 24.3 o posterior de la rama 24, o 26 o posterior, y Expo Go compatible con SDK 58 en un teléfono. Desde la carpeta del proyecto:

```bash
npm install
npm start
```

Con el teléfono y la computadora en la misma red, escanear el QR desde la cámara de iOS o desde Expo Go en Android. Si la conexión de red local no está disponible, ejecutar `npx expo start --tunnel` y aceptar la instalación del paquete del túnel si se solicita. Expo Go puede solicitar una cuenta de Expo.

## Funcionalidades implementadas

- Cuatro pantallas con React Navigation y Native Stack: Login, Registro, Home y Alta de producto.
- Registro local con usuario y contraseña, confirmación de contraseña y control de usuarios duplicados.
- Login que valida las credenciales registradas. Las pantallas privadas solo se montan después de iniciar sesión.
- Cierre de sesión. Al reiniciar la aplicación se solicita un nuevo login; los usuarios y productos permanecen guardados.
- Alta de productos con nombre y cantidad, listado, marcado como comprado y eliminación con confirmación.
- Persistencia con AsyncStorage y listas independientes para cada usuario.
- Notificación local mediante expo-notifications: el botón de Home programa un recordatorio a los 10 segundos y solicita permiso cuando corresponde.
- La modificación de la lista o el cierre de sesión cancela el recordatorio pendiente. Puede volver a programarse desde Home.
- Componentes reutilizables ProductItem y PrimaryButton, componentes básicos de React Native y estilos con StyleSheet.
- Validaciones de formularios y mensajes de error.

La autenticación es exclusivamente didáctica y local: las contraseñas se guardan sin cifrar, como permite la consigna. No utiliza backend ni Firebase. Para comprobar las notificaciones se requiere un dispositivo móvil y permisos habilitados.

## Pruebas automatizadas

```bash
npm test
npm run typecheck
```

Jest y React Native Testing Library verifican el renderizado e interacciones del componente ProductItem, las validaciones, la autenticación y la persistencia por usuario.

## Organización

- `App.tsx`: navegación y proveedores.
- `src/screens/`: las cuatro pantallas.
- `src/components/`: componentes reutilizables.
- `src/context/AppContext.tsx`: estado de autenticación y productos.
- `src/services/`: almacenamiento local y notificaciones.
- `src/utils/validators.ts`: reglas de validación.
- `__tests__/`: pruebas automatizadas.

### Resultado de las pruebas

![Resultado de Jest: 3 suites y 8 tests aprobados](docs/tests.png)

## Video demo

https://youtube.com/shorts/_2fgLfN9sKk

## Ubicación del comercio

La ubicación es opcional y se puede asociar desde el alta o el detalle del producto.

- Tocá Usar ubicación actual para solicitar permiso de ubicación en primer plano y obtener las coordenadas GPS.
- También podés escribir un nombre o dirección y tocar Usar comercio manual. Este dato se muestra como ingresado manualmente y reemplaza las coordenadas si existían.
- Desde el detalle podés actualizar o quitar la ubicación. Los productos anteriores sin ubicación siguen funcionando.
- Si el permiso está denegado o la localización no está disponible, podés ingresar el comercio manualmente o reintentar. Si el permiso está bloqueado, el botón de Ajustes permite habilitarlo.
- En Expo Go, los permisos se administran para Expo Go en los ajustes del iPhone. La app no solicita ubicación en segundo plano.

Los datos se conservan por usuario con las mismas claves de AsyncStorage. No se utilizan mapas, servicios externos ni claves API.

## Contacto asociado al producto

El contacto es opcional y se puede asociar desde el alta o el detalle. Tocá Elegir contacto del teléfono para solicitar acceso a los contactos y buscar por nombre, teléfono o email. Con acceso limitado en iOS solo se muestran los contactos autorizados.

Se conserva el nombre y, cuando existen, el primer teléfono y email disponibles. La agenda se usa temporalmente en el selector y no se guarda en AsyncStorage. El contacto elegido queda como una copia de esos datos, sin modificar la agenda del teléfono.

Podés reemplazar o quitar la asociación. Cancelar la selección conserva el contacto anterior. Si se deniega el permiso o no hay contactos, completá el nombre manualmente y, si querés, teléfono o email, y tocá Usar contacto manual. Si el permiso está bloqueado, se ofrece acceso a Ajustes. En Expo Go, los permisos se administran para Expo Go en los ajustes del iPhone.

## Evento de compra en el calendario

La integración con expo-calendar está implementada y tiene pruebas automatizadas de permisos, selección de calendario, validación de fecha y hora, creación del evento, persistencia y prevención de duplicados. Las pruebas utilizan mocks de las APIs nativas; no verifican la creación de eventos reales en el dispositivo.

**Estado para la entrega: no se validó manualmente la creación de eventos reales en el iPhone.** En SDK 58, expo-calendar requiere una compilación de desarrollo y no está disponible en Expo Go. Al intentar usar la función en Expo Go, la app muestra un mensaje informativo y conserva el resto de sus funcionalidades. No se preparó una compilación de desarrollo para esta entrega.

La implementación utiliza la API real del calendario del dispositivo. El siguiente flujo requiere una compilación de desarrollo:

Desde el detalle de un producto guardado, tocá Crear evento de compra. Al utilizar la función se solicita acceso al calendario para listar los calendarios editables. No se solicitan permisos para la app Recordatorios de iOS.

Elegí un calendario y escribí una fecha futura en formato DD/MM/AAAA y una hora en formato HH:MM de 24 horas, usando la hora local del teléfono. Confirmar evento de compra crea un evento real de 30 minutos con título Comprar: seguido del nombre del producto, cantidad, comercio si existe y una alerta al inicio. Cancelar antes de confirmar conserva el producto.

El detalle muestra el calendario, la fecha de compra y cuándo se creó la asociación. Un producto con evento asociado no permite crear otro. La asociación se guarda por usuario con las claves existentes de AsyncStorage. El recordatorio local de diez segundos sigue disponible en la lista y es independiente del evento.

Si no hay calendarios editables, agregá o habilitá uno desde la app Calendario del teléfono y reintentá. Si el permiso está bloqueado, la app ofrece acceso a Ajustes.

### Requisito para validar eventos reales

La validación manual de eventos reales queda pendiente hasta disponer de una compilación de desarrollo instalada en el iPhone con expo-calendar. Consultá la [documentación oficial de expo-calendar](https://docs.expo.dev/versions/v58.0.0/sdk/calendar/) y la [guía de compilaciones de desarrollo](https://docs.expo.dev/develop/development-builds/introduction/).

No se agregan servicios externos ni claves API. Los eventos creados mediante la API permanecen en Calendario aunque después se elimine el producto; esta etapa no sincroniza cambios realizados fuera de la app.

## Estilo y verificación

Las convenciones de desarrollo están en AGENTS.md. Para aplicar el formato a la aplicación, tests y configuración escrita a mano, y comprobarlo:

```bash
npm run format
npm run lint
npm test
npm run typecheck
```

Prettier ordena la indentación y JSX; ESLint exige llaves, cuerpos de función en bloque, retornos explícitos en funciones flecha, declaraciones separadas y una instrucción por línea. El comando de formato termina con ESLint para conservar las llaves multilínea también en bloques vacíos. Se excluyen dependencias, archivos generados y package-lock.json del formateo.
