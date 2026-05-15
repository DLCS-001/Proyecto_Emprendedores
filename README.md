# Sistema de Pedidos - Restaurante

Un sistema completo de gestión de pedidos para restaurantes con roles diferenciados (Mesero, Chef, Servicio al cliente), tablero Kanban interactivo y múltiples funcionalidades avanzadas.

## 🚀 Características

### Funcionalidades Principales
- **Sistema de roles**: Mesero (crear/editar/cancelar), Chef (drag & drop), Servicio (entregar)
- **Tablero Kanban**: 4 columnas (Pendiente, En preparación, Listo, Entregado)
- **Drag & drop**: Movimiento intuitivo entre estados
- **Edición de órdenes**: Modificar órdenes pendientes
- **Campo de notas**: Información adicional por orden
- **Modo oscuro**: Interfaz adaptable con persistencia
- **Exportar/Importar**: Respaldos en formato JSON
- **Búsqueda y filtros**: Por mesa, plato o ID
- **Responsive**: Optimizado para móvil y escritorio
- **Persistencia local**: Datos guardados en localStorage

### Mejoras Visuales
- Glass effects con backdrop-filter
- Time badges para mostrar antigüedad
- Animaciones suaves y transiciones
- Tema oscuro completo
- Iconografía moderna con Font Awesome

## 📁 Estructura del Proyecto

```
proyecto-emprendedores/
├── index.html          # Archivo principal HTML
├── css/
│   └── styles.css      # Estilos CSS personalizados
├── js/
│   └── app.js          # Lógica JavaScript de la aplicación
├── prototipo 1.html    # Versión anterior (conservada)
└── preview.html        # Versión anterior (conservada)
```

## 🛠️ Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Variables CSS, Flexbox, Grid, Animaciones
- **Tailwind CSS**: Framework de utilidades
- **JavaScript (Vanilla)**: Lógica de aplicación
- **SweetAlert2**: Modales y notificaciones
- **Dragula**: Funcionalidad drag & drop
- **Font Awesome**: Iconografía
- **Google Fonts**: Tipografía Inter

## 🚀 Cómo Usar

1. **Abrir el proyecto**: Haz doble clic en `index.html` o ábrelo en tu navegador
2. **Seleccionar rol**: Elige entre Mesero, Chef o Servicio al cliente
3. **Gestionar pedidos**:
   - **Mesero**: Crear nuevas órdenes, editar pendientes, cancelar
   - **Chef**: Arrastrar órdenes entre estados de preparación
   - **Servicio**: Marcar órdenes como entregadas

## 📱 Funcionalidades por Rol

### 👨‍🍳 Mesero
- ✅ Crear nuevas órdenes
- ✅ Editar órdenes pendientes
- ✅ Cancelar órdenes pendientes
- ✅ Agregar notas a las órdenes
- ✅ Ver todas las órdenes

### 👨‍🍳 Chef
- ✅ Ver órdenes pendientes y en preparación
- ✅ Mover órdenes con drag & drop
- ✅ Cambiar estados automáticamente

### 🧑‍💼 Servicio al Cliente
- ✅ Ver órdenes listas y entregadas
- ✅ Marcar órdenes como entregadas

## 🎨 Personalización

### Tema Oscuro
- Automático según preferencia del sistema
- Toggle manual disponible
- Persistencia en localStorage

### Estilos Personalizados
Los estilos se pueden modificar en `css/styles.css`:
- Variables CSS para colores y temas
- Clases de utilidad para efectos visuales
- Responsive design con breakpoints

## 💾 Persistencia de Datos

- **localStorage**: Órdenes guardadas automáticamente
- **Exportar**: Descargar datos en JSON
- **Importar**: Cargar datos desde archivo JSON
- **Datos de muestra**: Se cargan automáticamente en primera visita

## 🔧 Desarrollo

### Archivos Separados
- `index.html`: Estructura HTML
- `css/styles.css`: Estilos personalizados
- `js/app.js`: Lógica JavaScript

### Dependencias Externas
Todas las librerías se cargan desde CDN:
- Tailwind CSS
- SweetAlert2
- Dragula
- Font Awesome
- Google Fonts

## 📊 Estados de Órdenes

1. **Pendiente** 🟡: Orden creada, esperando preparación
2. **En preparación** 🟠: Chef trabajando en la orden
3. **Listo** 🟢: Orden preparada, esperando entrega
4. **Entregado** 🔵: Orden entregada al cliente

## 🎯 Próximas Mejoras

- [ ] Base de datos backend
- [ ] Autenticación de usuarios
- [ ] Notificaciones push
- [ ] Estadísticas e informes
- [ ] Integración con impresoras
- [ ] API REST para integración

## 📄 Licencia

Este proyecto es de código abierto y puede ser utilizado libremente para fines educativos y comerciales.

---

**Desarrollado con ❤️ para optimizar la gestión de pedidos en restaurantes**