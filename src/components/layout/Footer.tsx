import React from 'react';
import { useRouter } from '../../contexts/RouterContext';

export default function Footer() {
  const { navigate } = useRouter();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 sm:px-6 py-4">
      <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
        <p>© {currentYear} Atensia. Todos los derechos reservados.</p>

        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => navigate('terms')}
            className="hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Términos de Servicio
          </button>
          <button
            onClick={() => navigate('privacy')}
            className="hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Política de Privacidad
          </button>
        </div>
      </div>
    </footer>
  );
}
