import React from 'react';
import { useRouter } from '../../contexts/RouterContext';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  const { navigate } = useRouter();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate('dashboard')}
        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-8"
      >
        <ArrowLeft size={20} />
        Volver al dashboard
      </button>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Términos de Servicio</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Última actualización: 5 de junio de 2026</p>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Aceptación de los Términos</h2>
            <p className="mb-4">
              Al acceder y utilizar Atensia (la "Plataforma"), usted acepta estar vinculado por estos Términos de Servicio.
              Si no acepta estos términos, no debe utilizar la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Descripción del Servicio</h2>
            <p className="mb-4">
              Atensia es una plataforma de gestión de tickets y soporte al cliente que permite a las empresas crear, asignar,
              seguir y resolver tickets de soporte. Los servicios incluyen:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Gestión de tickets y tareas</li>
              <li>Gestión de usuarios y permisos</li>
              <li>Registro de auditoría</li>
              <li>Notificaciones en tiempo real</li>
              <li>Políticas de SLA</li>
              <li>Reportes y análisis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. Derechos de Acceso</h2>
            <p className="mb-4">
              Para usar Atensia, debe crear una cuenta con información precisa y completa. Usted es responsable de:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Mantener la confidencialidad de su contraseña</li>
              <li>Todas las actividades que ocurran bajo su cuenta</li>
              <li>Notificar inmediatamente sobre acceso no autorizado</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Contenido del Usuario</h2>
            <p className="mb-4">
              Usted retiene todos los derechos sobre el contenido que carga o crea en Atensia. Al usar la Plataforma,
              nos otorga una licencia para almacenar, procesar y mostrar su contenido según sea necesario para proporcionar
              el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Prohibiciones</h2>
            <p className="mb-4">No debe utilizar Atensia para:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Actividades ilegales o que infrinjan derechos de terceros</li>
              <li>Transmitir código malicioso o virus</li>
              <li>Intentar acceso no autorizado a sistemas</li>
              <li>Acoso, abuso o discriminación</li>
              <li>Spam o comunicaciones no solicitadas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Disponibilidad del Servicio</h2>
            <p className="mb-4">
              Atensia se proporciona "tal cual" sin garantías de disponibilidad continua. No somos responsables de:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Interrupciones o mantenimiento del servicio</li>
              <li>Pérdida de datos debido a factores fuera de nuestro control</li>
              <li>Daños indirectos o consecuentes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Límite de Responsabilidad</h2>
            <p className="mb-4">
              En la máxima medida permitida por la ley, Atensia no será responsable por daños indirectos, incidentales,
              especiales, consecuentes o punitivos resultantes del uso o incapacidad de usar la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Cambios en los Términos</h2>
            <p className="mb-4">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor
              cuando se publiquen. El uso continuado de la Plataforma constituye aceptación de los términos modificados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Terminación</h2>
            <p className="mb-4">
              Podemos terminar o suspender su acceso a Atensia en cualquier momento si viola estos términos.
              Al terminar, sus derechos a usar la Plataforma cesan inmediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Contacto</h2>
            <p className="mb-4">
              Si tiene preguntas sobre estos Términos de Servicio, contáctenos en:
            </p>
            <p>
              Email: <a href="mailto:support@atensia.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                support@atensia.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
