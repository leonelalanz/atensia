import React from 'react';
import { useRouter } from '../../contexts/RouterContext';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Política de Privacidad</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Última actualización: 5 de junio de 2026</p>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Introducción</h2>
            <p className="mb-4">
              En Atensia, nos comprometemos a proteger su privacidad. Esta Política de Privacidad explica cómo recopilamos,
              usamos, divulgamos y salvaguardamos su información cuando utiliza nuestra Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Información que Recopilamos</h2>
            <p className="mb-4">Recopilamos información que usted proporciona directamente:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Nombre completo y dirección de correo electrónico</li>
              <li>Información de la empresa</li>
              <li>Contenido de tickets y comentarios</li>
              <li>Archivos y documentos cargados</li>
            </ul>
            <p className="mb-4">También recopilamos automáticamente:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Dirección IP y tipo de navegador</li>
              <li>Páginas visitadas y tiempo en el sitio</li>
              <li>Registro de actividades y acciones</li>
              <li>Cookies y tecnologías similares</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. Uso de la Información</h2>
            <p className="mb-4">Utilizamos la información recopilada para:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Proporcionar y mejorar nuestros servicios</li>
              <li>Autenticar usuarios y prevenir fraude</li>
              <li>Enviar comunicaciones sobre su cuenta</li>
              <li>Procesar transacciones y enviar actualizaciones de facturación</li>
              <li>Responder a consultas y proporcionar soporte</li>
              <li>Cumplir con obligaciones legales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Divulgación de Información</h2>
            <p className="mb-4">
              No vendemos, intercambiamos ni alquilamos su información personal a terceros. Podemos divulgar información a:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Proveedores de servicios que nos ayudan a operar la Plataforma</li>
              <li>Autoridades legales cuando lo requiera la ley</li>
              <li>Sucesores en caso de venta o fusión</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Seguridad de Datos</h2>
            <p className="mb-4">
              Implementamos medidas de seguridad técnicas, administrativas y físicas para proteger su información:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Cifrado de datos en tránsito y en reposo</li>
              <li>Autenticación de múltiples factores</li>
              <li>Control de acceso basado en roles</li>
              <li>Auditoría de accesos a sistemas</li>
              <li>Copias de seguridad regulares</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Derechos del Usuario</h2>
            <p className="mb-4">Usted tiene derecho a:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Acceder a su información personal</li>
              <li>Rectificar datos incorrectos</li>
              <li>Solicitar la eliminación de datos</li>
              <li>Objetar el procesamiento de datos</li>
              <li>Solicitar la portabilidad de datos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Cookies y Tecnologías de Seguimiento</h2>
            <p className="mb-4">
              Utilizamos cookies para mejorar su experiencia. Puede controlar las preferencias de cookies a través
              de la configuración de su navegador. Algunos servicios pueden no funcionar correctamente sin cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Retención de Datos</h2>
            <p className="mb-4">
              Retenemos información personal durante el tiempo que sea necesario para proporcionar servicios y cumplir
              obligaciones legales. Puede solicitar la eliminación de datos en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Privacidad de Menores</h2>
            <p className="mb-4">
              Atensia no está destinado a menores de 18 años. No recopilamos conscientemente información de menores.
              Si nos enteramos que hemos recopilado información de un menor, la eliminaremos inmediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Cambios en esta Política</h2>
            <p className="mb-4">
              Podemos actualizar esta Política de Privacidad periódicamente. Continuaremos notificándole de cambios
              significativos en la forma en que tratamos su información personal.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Contacto</h2>
            <p className="mb-4">
              Si tiene preguntas o inquietudes sobre nuestras prácticas de privacidad, contáctenos en:
            </p>
            <p className="mb-2">
              Email: <a href="mailto:privacy@atensia.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                privacy@atensia.com
              </a>
            </p>
            <p>
              Soporte: <a href="mailto:support@atensia.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                support@atensia.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Cumplimiento Legal</h2>
            <p>
              Atensia cumple con las regulaciones de protección de datos aplicables, incluido el GDPR (Reglamento General
              de Protección de Datos) y leyes similares. Si tiene derechos específicos según la ley de su país, podemos
              ayudarle a ejercerlos.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
