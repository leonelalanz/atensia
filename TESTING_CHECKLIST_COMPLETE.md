# 🧪 CHECKLIST DE PRUEBAS COMPLETO - ATENSIA

## 1️⃣ AUTENTICACIÓN & ACCESO

### Login
- [ ] Login con credenciales correctas funciona
- [ ] Login con credenciales incorrectas muestra error
- [ ] Olvidé contraseña redirige a página correcta
- [ ] Reset de contraseña funciona correctamente
- [ ] Session persiste después de refrescar página
- [ ] Logout cierra sesión correctamente

### Signup (Nuevo Usuario)
- [ ] Signup con datos válidos crea cuenta exitosamente
- [ ] Modal de éxito aparece con mensaje correcto
- [ ] Usuario puede hacer login inmediatamente después
- [ ] Validación: campos vacíos muestran error
- [ ] Validación: passwords no coinciden muestran error
- [ ] Se crea automáticamente empresa con nombre ingresado
- [ ] Se crea automáticamente usuario admin de la empresa

### Acceso por Rol
- [ ] SuperAdmin: accede a todas las secciones
- [ ] Admin: accede solo a secciones permitidas
- [ ] Agent: no ve opciones de admin
- [ ] Developer: solo ve Actividades
- [ ] Intentar acceder a URL restringida redirige a Dashboard

---

## 2️⃣ EMPRESAS & PLANES

### Gestión de Empresas (SuperAdmin)
- [ ] Ver lista de todas las empresas
- [ ] Panel expandible muestra detalles de empresa
- [ ] Editar nombre de empresa funciona
- [ ] Editar color de empresa funciona
- [ ] Editar logo URL de empresa funciona
- [ ] Editar nombre admin de empresa funciona
- [ ] Editar email admin de empresa funciona
- [ ] **Cambiar password del admin funciona y se puede hacer login con la nueva**
- [ ] Cambios se guardan en BD correctamente
- [ ] Los cambios se reflejan inmediatamente sin refrescar

### Cambio de Planes (SuperAdmin)
- [ ] Botón "Editar Plan" abre modal con planes
- [ ] Se puede cambiar de Basic a Professional
- [ ] Se puede cambiar de Professional a Enterprise
- [ ] Se puede cambiar de Enterprise a Basic (downgrade)
- [ ] Cambio desactiva modo mantenimiento si estaba activo
- [ ] Plan se actualiza correctamente en BD
- [ ] Admin ve el nuevo plan en su Configuración

### Modo Mantenimiento (Sin Pago)
- [ ] SuperAdmin puede activar/desactivar modo mantenimiento
- [ ] Cuando está en mantenimiento, users normales ven página "Suscripción Vencida"
- [ ] Página de suscripción vencida muestra botón "Contactar Soporte"
- [ ] SuperAdmin aún puede acceder aunque la empresa esté en mantenimiento
- [ ] Al desactivar mantenimiento, users vuelven a tener acceso

---

## 3️⃣ PLANES & PAGOS

### Página de Configuración (Admin)
- [ ] Sección "Tu plan actual" muestra plan correcto
- [ ] Muestra precio del plan actual
- [ ] Muestra características del plan actual
- [ ] Botón "Cambiar Plan" funciona
- [ ] Modal de selección muestra todos los planes
- [ ] Plan actual está marcado en verde
- [ ] Otras planes tienen botón "Cambiar a [Plan]"

### Modal de Selección de Planes
- [ ] Muestra nombre, precio y descripción de cada plan
- [ ] **Muestra TODAS las características (sin "+X más")**
- [ ] Plan actual indicado con badge verde
- [ ] Click en plan abre modal de pago

### Modal de Pago
- [ ] Muestra resumen de plan seleccionado
- [ ] 5 métodos de pago disponibles:
  - [ ] 🪙 Binance (USDT/USDC)
  - [ ] 📱 Pago Móvil
  - [ ] 🏦 Banesco Panamá
  - [ ] 💳 Transferencia Bancaria
  - [ ] 💰 PayPal
- [ ] Botón copy copia datos de pago
- [ ] Se puede subir comprobante
- [ ] Instrucciones son claras
- [ ] Botón "He Completado el Pago" cierra modal

---

## 4️⃣ SIDEBAR & NAVEGACIÓN

### Items del Sidebar
- [ ] Panel aparece para todos los roles
- [ ] Tickets aparece solo para admin/agent/developer
- [ ] Usuarios aparece solo para admin
- [ ] Empresas aparece solo para superadmin
- [ ] SLA aparece solo para admin
- [ ] Actividades aparece solo para developer/admin
- [ ] Auditoría aparece solo para admin/superadmin
- [ ] Marca aparece solo para admin/superadmin
- [ ] Configuración aparece para todos
- [ ] "Mi Plan" NO aparece en sidebar (removido)

### Navegación
- [ ] Click en items del sidebar navega correctamente
- [ ] Item activo está resaltado
- [ ] Volver atrás (browser back) funciona
- [ ] URLs cambien cuando navegas
- [ ] Refrescar página mantiene la sección actual

---

## 5️⃣ FOOTER & LEGAL

### Footer
- [ ] Footer aparece en todas las páginas
- [ ] Copyright muestra año actual (2026)
- [ ] Link a Términos de Servicio funciona
- [ ] Link a Política de Privacidad funciona
- [ ] Footer está pegado al fondo

### Términos de Servicio
- [ ] Página carga correctamente
- [ ] Contiene información legal completa
- [ ] Link "Volver" funciona

### Política de Privacidad
- [ ] Página carga correctamente
- [ ] Contiene información de protección de datos
- [ ] Link "Volver" funciona

### Login Page (Sin Demo)
- [ ] NO aparece sección de "Demo Access"
- [ ] NO aparecen botones de "Inicia como..."
- [ ] Solo aparecen campos de email/password
- [ ] Link "¿No tienes cuenta? Regístrate" funciona

---

## 6️⃣ TICKETS & OPERACIONES

### Ver Tickets
- [ ] Lista de tickets carga correctamente
- [ ] Se ven todos los tickets de la empresa del user
- [ ] SuperAdmin ve tickets de TODAS las empresas
- [ ] Filtros funcionan (estado, prioridad, etc.)
- [ ] Búsqueda funciona
- [ ] Paginación funciona si hay muchos tickets

### Crear Ticket
- [ ] Formulario carga sin errores
- [ ] Se puede crear ticket nuevo
- [ ] Validación de campos obligatorios
- [ ] Email de notificación se envía
- [ ] Ticket aparece en lista inmediatamente

### Detalle de Ticket
- [ ] Ver ticket individual funciona
- [ ] Se pueden agregar comentarios
- [ ] Se pueden adjuntar archivos
- [ ] Se puede cambiar estado
- [ ] Se puede asignar a usuario
- [ ] Se puede cambiar prioridad
- [ ] Cambios se guardan correctamente

---

## 7️⃣ USUARIOS & PERMISOS

### Gestión de Usuarios (Admin)
- [ ] Ver lista de usuarios de la empresa
- [ ] Crear nuevo usuario funciona
- [ ] Editar usuario funciona
- [ ] Cambiar rol de usuario funciona
- [ ] Desactivar usuario funciona
- [ ] Solo users activos pueden login

### Auditoría (Admin/SuperAdmin)
- [ ] Ver log de auditoría funciona
- [ ] Filtros por fecha funcionan
- [ ] Se ven acciones correctamente registradas
- [ ] Cambios de planes se registran
- [ ] Cambios de usuarios se registran

---

## 8️⃣ CONFIGURACIÓN & PERFIL

### Mi Perfil
- [ ] Cambiar nombre funciona
- [ ] Cambiar avatar emoji funciona
- [ ] Cambiar avatar color funciona
- [ ] Cambios se guardan
- [ ] Cambios se reflejan inmediatamente
- [ ] Email no es editable (solo lectura)

### Configuración General
- [ ] Acceso a configuración sin errores
- [ ] Sección "Tu plan actual" muestra correctamente
- [ ] No hay errores 404
- [ ] Datos se guardan correctamente

---

## 9️⃣ SEGURIDAD & VALIDACIÓN

### Contraseñas
- [ ] Password fuerte es requerido
- [ ] Cambiar password de admin por superadmin funciona
- [ ] Nueva password funciona inmediatamente
- [ ] Old password no funciona después de cambiar

### RLS (Row Level Security)
- [ ] Users de empresa A no ven datos de empresa B
- [ ] Agents no pueden ver datos de otros agents
- [ ] Admins pueden ver datos de su empresa
- [ ] SuperAdmin ve todo

### SQL Injection & XSS
- [ ] Caracteres especiales en formularios se escapan
- [ ] Scripts maliciosos no se ejecutan
- [ ] Datos se guardan sin problemas con acentos/emojis

---

## 🔟 RENDIMIENTO & UX

### Velocidad
- [ ] Dashboard carga en < 2 segundos
- [ ] Listados cargan sin lag
- [ ] Búsqueda es responsiva
- [ ] No hay errores de timeout

### Responsive Design
- [ ] Funciona en desktop (1920px+)
- [ ] Funciona en tablet (768px)
- [ ] Funciona en mobile (375px)
- [ ] Sidebar colapsa en mobile
- [ ] Modales se ven bien en mobile

### Dark Mode
- [ ] Dark mode toggle funciona
- [ ] Colors son legibles en dark mode
- [ ] Se mantiene la preferencia al refrescar

### Errores
- [ ] Mensajes de error son claros
- [ ] No hay errores en consola (sin "errors" graves)
- [ ] Errores de red se manejan correctamente
- [ ] Fallback UI aparece cuando apropiado

---

## 1️⃣1️⃣ DATOS & PERSISTENCIA

### Base de Datos
- [ ] Crear empresa guarda en BD
- [ ] Cambios de plan guardan en BD
- [ ] Crear usuario guarda en BD
- [ ] Cambios de configuración guardan en BD
- [ ] Datos persisten después de logout/login

### Sincronización
- [ ] Si 2 tabs están abiertos, cambios en uno se reflejan en otro (opcional pero ideal)
- [ ] No hay conflictos de datos
- [ ] No hay duplicados innecesarios

---

## 1️⃣2️⃣ NOTIFICACIONES & COMUNICACIÓN

### Confirmaciones
- [ ] Al crear empresa aparece confirmación
- [ ] Al cambiar plan aparece confirmación
- [ ] Al cambiar password aparece confirmación

### Mensajes de Error
- [ ] Errores son claros y accionables
- [ ] Errores no revelan información sensible
- [ ] Errores desaparecen después de unos segundos (opcional)

---

## 1️⃣3️⃣ FLUJOS COMPLETOS (END-TO-END)

### Flujo 1: Nuevo Usuario → Crear Empresa
- [ ] Usuario hace signup
- [ ] Se crea empresa automáticamente
- [ ] Usuario es admin de su empresa
- [ ] Puede ver su plan en Configuración
- [ ] Puede crear tickets

### Flujo 2: SuperAdmin → Editar Empresa
- [ ] SuperAdmin va a Empresas
- [ ] Expande empresa
- [ ] Edita nombre/color/admin
- [ ] Cambios se guardan
- [ ] Admin de la empresa ve los cambios

### Flujo 3: Admin → Cambiar Plan
- [ ] Admin va a Configuración
- [ ] Ve "Tu plan actual"
- [ ] Click "Cambiar Plan"
- [ ] Selecciona nuevo plan
- [ ] Elige método de pago
- [ ] Sube comprobante
- [ ] Modal de éxito aparece

### Flujo 4: SuperAdmin → Suspender Empresa
- [ ] SuperAdmin activa "Modo mantenimiento" en empresa
- [ ] Admin de esa empresa ve página de "Suscripción Vencida"
- [ ] SuperAdmin desactiva "Modo mantenimiento"
- [ ] Admin puede acceder normalmente de nuevo

### Flujo 5: Cambiar Password del Admin
- [ ] SuperAdmin edita empresa
- [ ] Cambia password del admin
- [ ] Nuevo admin intenta login con old password → falla
- [ ] Nuevo admin intenta login con new password → éxito

---

## 1️⃣4️⃣ BROWSER & COMPATIBILIDAD

- [ ] Chrome (últimas 2 versiones)
- [ ] Firefox (últimas 2 versiones)
- [ ] Safari (últimas 2 versiones)
- [ ] Edge (últimas 2 versiones)
- [ ] No hay warnings en consola
- [ ] No hay elementos rotos (images, fonts, etc)

---

## 1️⃣5️⃣ ESPECIALES (CRÍTICOS)

### MUST HAVE
- [ ] ✅ Signup crea empresa automáticamente
- [ ] ✅ SuperAdmin puede editar TODO de una empresa
- [ ] ✅ SuperAdmin puede cambiar password del admin
- [ ] ✅ Admin puede cambiar su plan desde Configuración
- [ ] ✅ Modal de pago muestra TODAS las características
- [ ] ✅ Términos y privacidad en footer
- [ ] ✅ Sin sección "Demo Access" en login
- [ ] ✅ Modo mantenimiento bloquea acceso (excepto SuperAdmin)

### NICE TO HAVE
- [ ] Dark mode funciona perfectamente
- [ ] Responsive design es excelente
- [ ] Animaciones son suaves
- [ ] Loading states están bien diseñados

---

## 📋 RESULTADO FINAL

**Firma de Aprobación:**

```
Probado por: ________________
Fecha: ________________
Resultado: ✅ APROBADO / ❌ NO APROBADO

Bugs encontrados:
1. _________________________________
2. _________________________________
3. _________________________________

Comentarios:
_________________________________
_________________________________
```
