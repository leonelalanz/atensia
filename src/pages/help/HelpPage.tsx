import { BookOpen, Users, Ticket,  Clock,  Settings, Palette, Download, ChevronRight, Zap, Building2, CreditCard, Calendar } from 'lucide-react';
import { useState } from 'react';

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  red: { bg: '#fee2e2', border: '#fecaca', text: '#991b1b', badge: '#fca5a5' },
  blue: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', badge: '#bfdbfe' },
  green: { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#bbf7d0' },
  yellow: { bg: '#fefce8', border: '#fde047', text: '#854d0e', badge: '#fef08a' },
};

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('intro');

  const sections: Section[] = [
    {
      id: 'intro',
      title: 'Introduccion',
      icon: <BookOpen className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 leading-relaxed">
            <strong>Atensia</strong> es un sistema de gestion de tickets e incidentes disenado para equipos de soporte tecnico.
            Permite registrar, asignar, priorizar y resolver solicitudes de soporte, con seguimiento de SLA,
            historial de cambios, comentarios internos y registro de actividades.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm font-medium">Version 1.0 — Mayo 2026</p>
            <p className="text-blue-600 text-sm mt-1">Este manual cubre todas las funcionalidades disponibles segun su rol en el sistema.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'roles',
      title: 'Roles y Permisos',
      icon: <Users className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-600">El sistema maneja cuatro roles con distintos niveles de acceso:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { role: 'Superadmin', color: 'red', desc: 'Control total del sistema. Gestiona empresas, suscripciones y todos los usuarios.' },
              { role: 'Admin', color: 'blue', desc: 'Administra su empresa: usuarios, tickets, SLA y branding.' },
              { role: 'Agent', color: 'green', desc: 'Gestiona y resuelve tickets asignados a su empresa.' },
              { role: 'Developer', color: 'yellow', desc: 'Trabaja en tickets tecnicos y registra actividades (tiempo y trabajo).' },
            ].map(({ role, color, desc }) => {
              const colors = colorMap[color];
              return (
                <div key={role} className="border rounded-lg p-4" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                  <span className="inline-block text-xs font-bold px-2 py-1 rounded mb-2" style={{ color: colors.text, backgroundColor: colors.badge }}>{role}</span>
                  <p className="text-gray-700 text-sm">{desc}</p>
                </div>
              );
            })}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-3 border border-gray-200 font-semibold">Modulo</th>
                  {['Superadmin', 'Admin', 'Agent', 'Developer'].map(r => (
                    <th key={r} className="text-center p-3 border border-gray-200 font-semibold">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Dashboard', true, true, true, true],
                  ['Tickets', true, true, true, true],
                  ['Usuarios', true, 'Solo su empresa', false, false],
                  ['Empresas', true, false, false, false],
                  ['SLA', true, true, false, false],
                  ['Actividades', false, false, false, true],
                  ['Branding', false, true, false, false],
                  ['Suscripciones', true, false, false, false],
                  ['Configuracion', true, true, true, true],
                ].map(([mod, ...vals], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 border border-gray-200 font-medium text-gray-700">{mod}</td>
                    {vals.map((v, j) => (
                      <td key={j} className="p-3 border border-gray-200 text-center">
                        {v === true ? <span className="text-green-600 font-bold">Si</span>
                          : v === false ? <span className="text-red-400">No</span>
                          : <span className="text-blue-600 text-xs">{v}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: 'tickets',
      title: 'Tickets',
      icon: <Ticket className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <Section title="Listar Tickets">
            <p className="text-gray-600 text-sm">La pagina de Tickets muestra todos los tickets accesibles segun su rol.</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li>Busqueda por texto (titulo, descripcion o ID)</li>
              <li>Filtro por estado: Abierto, En progreso, Resuelto, Cerrado</li>
              <li>Filtro por prioridad: Baja, Media, Alta, Critica</li>
              <li>Filtro por empresa (admin y superadmin)</li>
            </ul>
          </Section>
          <Section title="Crear un Ticket">
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
              <li>Haga clic en el boton <strong>Nuevo Ticket</strong> (esquina superior derecha).</li>
              <li>Complete el formulario con titulo, descripcion, prioridad y empresa.</li>
              <li>Opcionalmente asigne un responsable y adjunte archivos.</li>
              <li>Haga clic en <strong>Crear Ticket</strong>.</li>
            </ol>
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-3 text-amber-800 text-xs">
              El SLA comienza a contar desde el momento de creacion segun la politica activa de la empresa.
            </div>
          </Section>
          <Section title="Estados de un Ticket">
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { estado: 'Abierto', color: 'bg-blue-100 text-blue-800', desc: 'Ticket recien creado, sin atender.' },
                { estado: 'En progreso', color: 'bg-yellow-100 text-yellow-800', desc: 'Alguien esta trabajando en el.' },
                { estado: 'Resuelto', color: 'bg-green-100 text-green-800', desc: 'El problema fue solucionado.' },
                { estado: 'Cerrado', color: 'bg-gray-100 text-gray-800', desc: 'Cerrado definitivamente.' },
              ].map(({ estado, color, desc }) => (
                <div key={estado} className="flex items-start gap-2 p-2 border border-gray-100 rounded">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap ${color}`}>{estado}</span>
                  <span className="text-xs text-gray-600">{desc}</span>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Categorías de Ticket">
            <p className="text-sm text-gray-600 mb-2">Clasifique sus tickets según el tipo:</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { cat: 'Soporte', desc: 'Consultas y problemas de usuarios.' },
                { cat: 'Bug', desc: 'Errores en la aplicación.' },
                { cat: 'Solicitud', desc: 'Nuevas funcionalidades solicitadas.' },
                { cat: 'Consulta', desc: 'Preguntas o aclaraciones.' },
              ].map(({ cat, desc }) => (
                <div key={cat} className="text-xs border border-gray-100 rounded p-2">
                  <p className="font-semibold text-gray-800">{cat}</p>
                  <p className="text-gray-600 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Comentarios y Notas Internas">
            <p className="text-sm text-gray-600">Dentro del detalle de un ticket puede agregar:</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li><strong>Comentario publico</strong> — visible para todos los involucrados.</li>
              <li><strong>Nota interna</strong> — visible solo para el equipo. Los clientes no la ven.</li>
            </ul>
          </Section>
        </div>
      ),
    },
    {
      id: 'usuarios',
      title: 'Usuarios',
      icon: <Users className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-blue-800 text-sm">
            Disponible para <strong>Superadmin</strong> y <strong>Admin</strong>. Los admins ven solo los usuarios de su empresa.
          </div>
          <Section title="Crear Usuario">
            <ol className="space-y-1 text-sm text-gray-600 list-decimal list-inside">
              <li>Haga clic en <strong>Nuevo Usuario</strong>.</li>
              <li>Complete: nombre, correo, contrasena, rol y empresa.</li>
              <li>Haga clic en <strong>Crear</strong>.</li>
            </ol>
          </Section>
          <Section title="Roles disponibles al crear">
            <div className="grid grid-cols-3 gap-2 mt-2">
              {['Agent', 'Developer', 'Admin'].map(r => (
                <div key={r} className="text-center border border-gray-200 rounded p-2 text-sm font-medium text-gray-700">{r}</div>
              ))}
            </div>
          </Section>
          <Section title="Desactivar / Activar Usuario">
            <p className="text-sm text-gray-600">Use el interruptor de estado para desactivar el acceso de un usuario sin eliminarlo del sistema.</p>
          </Section>
        </div>
      ),
    },
    {
      id: 'sla',
      title: 'SLA',
      icon: <Clock className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-600 text-sm">El modulo SLA define los tiempos maximos de respuesta y resolucion para cada nivel de prioridad.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-3 border border-gray-200">Prioridad</th>
                  <th className="text-left p-3 border border-gray-200">Primera Respuesta</th>
                  <th className="text-left p-3 border border-gray-200">Resolucion</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Critica', '1 hora', '4 horas'],
                  ['Alta', '4 horas', '8 horas'],
                  ['Media', '8 horas', '24 horas'],
                  ['Baja', '24 horas', '72 horas'],
                ].map(([p, r, res], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 border border-gray-200 font-medium">{p}</td>
                    <td className="p-3 border border-gray-200">{r}</td>
                    <td className="p-3 border border-gray-200">{res}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Section title="Indicadores de SLA en Tickets">
            <div className="space-y-2 mt-2">
              {[
                { label: 'En tiempo', color: 'bg-green-100 text-green-800', desc: 'Dentro del plazo acordado.' },
                { label: 'En riesgo', color: 'bg-yellow-100 text-yellow-800', desc: 'Menos del 25% del tiempo restante.' },
                { label: 'Vencido', color: 'bg-red-100 text-red-800', desc: 'El plazo fue superado.' },
              ].map(({ label, color, desc }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${color}`}>{label}</span>
                  <span className="text-sm text-gray-600">{desc}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      ),
    },
    {
      id: 'branding',
      title: 'Branding',
      icon: <Palette className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-blue-800 text-sm">
            Disponible para <strong>Admin</strong>.
          </div>
          <p className="text-gray-600 text-sm">Personalice la apariencia del sistema para su empresa.</p>
          <ul className="space-y-2 text-sm text-gray-600">
            {[
              ['Nombre de la empresa', 'Aparece en la barra lateral y en reportes.'],
              ['Logo', 'Imagen representativa de la empresa.'],
              ['Color primario', 'Color principal de la interfaz.'],
              ['Favicon', 'Icono en la pestana del navegador.'],
            ].map(([campo, desc]) => (
              <li key={campo} className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span><strong>{campo}</strong> — {desc}</span>
              </li>
            ))}
          </ul>
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-amber-800 text-xs">
            Los cambios de branding aplican inmediatamente para todos los usuarios de la empresa.
          </div>
        </div>
      ),
    },
    {
      id: 'exportacion',
      title: 'Exportacion de Datos',
      icon: <Download className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">El sistema permite exportar datos en dos formatos desde multiples modulos.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { formato: 'CSV', desc: 'Archivo de texto plano compatible con Excel y Google Sheets.' },
              { formato: 'PDF', desc: 'Documento formateado listo para imprimir o compartir.' },
            ].map(({ formato, desc }) => (
              <div key={formato} className="border border-gray-200 rounded-lg p-4">
                <p className="font-bold text-gray-800">{formato}</p>
                <p className="text-sm text-gray-600 mt-1">{desc}</p>
              </div>
            ))}
          </div>
          <Section title="Que se puede exportar">
            <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li>Lista de tickets con todos sus campos</li>
              <li>Lista de usuarios</li>
              <li>Lista de empresas</li>
              <li>Registro de actividades</li>
              <li>Historial de SLA</li>
            </ul>
          </Section>
        </div>
      ),
    },
    {
      id: 'planes',
      title: 'Planes y Características',
      icon: <Zap className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-gray-600 text-sm">El sistema ofrece tres planes con diferentes características y límites. Superadmin tiene acceso a todas las funcionalidades.</p>
          <div className="space-y-3">
            {[
              {
                plan: 'Starter (Básico)',
                color: 'bg-gray-100 text-gray-800 border-gray-300',
                features: ['3 agentes máximo', 'Gestión básica de tickets', 'SLA estándar', 'Un solo color de marca', 'Sin exportación PDF']
              },
              {
                plan: 'Pro (Profesional)',
                color: 'bg-blue-100 text-blue-800 border-blue-300',
                features: ['10 agentes máximo', 'Branding personalizado completo', 'SLA avanzado con reportes', 'Exportación a PDF', 'Sin multi-empresa']
              },
              {
                plan: 'Business (Empresarial)',
                color: 'bg-purple-100 text-purple-800 border-purple-300',
                features: ['Agentes ilimitados', 'Branding personalizado completo', 'SLA avanzado', 'Exportación a PDF', 'Multi-empresa', 'Soporte prioritario']
              }
            ].map(({ plan, color, features }) => (
              <div key={plan} className={`border-2 rounded-lg p-4 ${color}`}>
                <p className="font-bold text-sm mb-3">{plan}</p>
                <ul className="space-y-1 text-xs">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-blue-800 text-xs">
            El plan se asigna al crear la suscripción de una empresa. El limite de agentes se valida al crear usuarios nuevos.
          </div>
        </div>
      ),
    },
    {
      id: 'suscripciones',
      title: 'Suscripciones',
      icon: <CreditCard className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-blue-800 text-sm">
            Disponible para <strong>Superadmin</strong>. Gestiona los planes y estados de las empresas.
          </div>
          <Section title="Crear Suscripción">
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
              <li>Haga clic en <strong>Nueva</strong> (esquina superior derecha).</li>
              <li>Seleccione una empresa y asigne un plan (Básico, Profesional, Empresarial).</li>
              <li>Establezca el estado (Activo, Prueba, Expirado, Cancelado).</li>
              <li>Configure las fechas de inicio y fin (opcional).</li>
              <li>Ingrese el monto y moneda (USD, EUR, MXN, COP, ARS).</li>
              <li>Agregue los datos del administrador inicial de la empresa.</li>
              <li>Haga clic en <strong>Crear</strong>.</li>
            </ol>
          </Section>
          <Section title="Estados de Suscripción">
            <div className="space-y-2 mt-2">
              {[
                { estado: 'Activo', color: 'bg-green-100 text-green-800', desc: 'Suscripción vigente y funcionando.' },
                { estado: 'Prueba', color: 'bg-blue-100 text-blue-800', desc: 'Periodo de prueba sin cobro.' },
                { estado: 'Expirado', color: 'bg-red-100 text-red-800', desc: 'La suscripción venció.' },
                { estado: 'Cancelado', color: 'bg-gray-100 text-gray-800', desc: 'Cancelada por el usuario o administrativamente.' },
              ].map(({ estado, color, desc }) => (
                <div key={estado} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${color}`}>{estado}</span>
                  <span className="text-sm text-gray-600">{desc}</span>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Filtros">
            <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li>Busqueda por nombre de empresa</li>
              <li>Filtro por estado de suscripción</li>
              <li>Exportación a CSV o PDF</li>
            </ul>
          </Section>
        </div>
      ),
    },
    {
      id: 'empresas',
      title: 'Empresas',
      icon: <Building2 className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-blue-800 text-sm">
            Disponible para <strong>Superadmin</strong>. Administra todas las empresas del sistema.
          </div>
          <Section title="Crear Empresa">
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
              <li>Haga clic en <strong>Nueva Empresa</strong>.</li>
              <li>Complete el nombre, seleccione un plan y estado.</li>
              <li>Personalice el color primario y cargue un logo (opcional).</li>
              <li>Agregue los datos del usuario administrador inicial.</li>
              <li>Haga clic en <strong>Crear</strong>.</li>
            </ol>
          </Section>
          <Section title="Estados de Empresa">
            <div className="space-y-2 mt-2">
              {[
                { estado: 'Activa', color: 'bg-green-100 text-green-800', desc: 'Empresa operativa y con acceso completo.' },
                { estado: 'Suspendida', color: 'bg-yellow-100 text-yellow-800', desc: 'Acceso limitado o pausado temporalmente.' },
                { estado: 'Cancelada', color: 'bg-red-100 text-red-800', desc: 'Empresa desactivada definitivamente.' },
              ].map(({ estado, color, desc }) => (
                <div key={estado} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${color}`}>{estado}</span>
                  <span className="text-sm text-gray-600">{desc}</span>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Filtros Avanzados">
            <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li>Busqueda por nombre</li>
              <li>Filtro por plan (Básico, Profesional, Empresarial)</li>
              <li>Filtro por estado</li>
              <li>Filtro por rango de fechas de creación</li>
              <li>Exportación a CSV o PDF</li>
            </ul>
          </Section>
        </div>
      ),
    },
    {
      id: 'actividades',
      title: 'Registro de Actividades',
      icon: <Calendar className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-blue-800 text-sm">
            Disponible para <strong>Developer</strong>. Registre el tiempo y trabajo realizado en tareas y tickets.
          </div>
          <Section title="Registrar Actividad">
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
              <li>Haga clic en <strong>Nueva Actividad</strong>.</li>
              <li>Seleccione la fecha, descripción y horas invertidas.</li>
              <li>Opcionalmente vincule a un ticket activo o en progreso.</li>
              <li>Haga clic en <strong>Crear</strong>.</li>
            </ol>
          </Section>
          <Section title="Información de Actividades">
            <p className="text-sm text-gray-600 mb-2">Cada registro incluye:</p>
            <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li><strong>Fecha</strong> — Día en que se realizó el trabajo</li>
              <li><strong>Descripción</strong> — Detalle de lo realizado</li>
              <li><strong>Horas</strong> — Tiempo invertido en la tarea</li>
              <li><strong>Ticket</strong> — Vinculación opcional con un ticket</li>
            </ul>
          </Section>
          <Section title="Filtros y Vistas">
            <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li><strong>Developers</strong> ven solo sus propias actividades</li>
              <li><strong>Admins</strong> ven actividades de su empresa</li>
              <li>Filtro por rango de fechas</li>
              <li>Filtro por usuario (admins solamente)</li>
              <li>Filtro por horas mínimas trabajadas</li>
              <li>Exportación a CSV o PDF</li>
            </ul>
          </Section>
        </div>
      ),
    },
    {
      id: 'faq',
      title: 'Preguntas Frecuentes',
      icon: <Settings className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          {[
            {
              q: 'No puedo ver los tickets de otra empresa.',
              a: 'Los tickets son visibles segun su rol y empresa asignada. Solo el superadmin tiene vision global.',
            },
            {
              q: 'El SLA aparece en rojo aunque acabo de crear el ticket.',
              a: 'Verifique que la empresa tenga una politica SLA configurada. Sin politica, el calculo puede comportarse de forma inesperada.',
            },
            {
              q: 'No veo el modulo de Actividades.',
              a: 'Las Actividades solo estan disponibles para el rol Developer.',
            },
            {
              q: 'Quiero cambiar el logo de la empresa.',
              a: 'Acceda al modulo Branding con un usuario de rol Admin.',
            },
            {
              q: 'Recibo una alerta cuando trato de crear un usuario nuevo.',
              a: 'Probablemente su empresa alcanzo el limite de agentes del plan. Upgrade a un plan superior o elimine usuarios inactivos.',
            },
            {
              q: 'No puedo usar Branding, PDF o SLA avanzado.',
              a: 'Estas caracteristicas estan disponibles en planes Pro y Business. Contacte al superadmin para un upgrade.',
            },
            {
              q: 'No veo el modulo de Empresas o Suscripciones.',
              a: 'Estos modulos estan reservados para Superadmin. Solo un Superadmin puede gestionar multiples empresas.',
            },
            {
              q: 'Cuales son las diferencias entre los planes?',
              a: 'Consulte la seccion "Planes y Caracteristicas" en este manual. Cada plan ofrece distintos limites de agentes, branding, exportacion y mas.',
            },
            {
              q: 'Como registro actividades de tiempo?',
              a: 'Si tiene rol Developer, acceda al modulo Actividades y cree registros con la fecha, descripcion y horas trabajadas. Puede vincularlos a tickets.',
            },
          ].map(({ q, a }, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-800 text-sm">{q}</p>
              <p className="text-gray-600 text-sm mt-1">{a}</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const active = sections.find(s => s.id === activeSection);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Manual de Usuario</h1>
        </div>
        <p className="text-gray-500 text-sm ml-9">Guia completa del sistema Atensia</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar de navegacion */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-1 sticky top-6">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  activeSection === s.id
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s.icon}
                {s.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          {active && (
            <>
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
                <span className="text-blue-600">{active.icon}</span>
                <h2 className="text-lg font-bold text-gray-900">{active.title}</h2>
              </div>
              {active.content}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
        <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
        {title}
      </h3>
      <div className="pl-5">{children}</div>
    </div>
  );
}
