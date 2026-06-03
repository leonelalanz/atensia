import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from '../../contexts/RouterContext';
import TicketForm from '../../components/tickets/TicketForm';

export default function NewTicketPage() {
  const { navigate } = useRouter();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('tickets')}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nuevo Ticket</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Describe el problema para que podamos ayudarte
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <TicketForm
          onSave={() => navigate('tickets')}
          onCancel={() => navigate('tickets')}
        />
      </div>
    </div>
  );
}
