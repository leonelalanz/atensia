export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  details: string;
  instructions: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'binance',
    name: '🪙 Binance (USDT/USDC)',
    icon: '🪙',
    details: 'Tu dirección de wallet aquí',
    instructions: 'Envía USDT o USDC a la dirección indicada. Redes: BSC, Polygon o Ethereum.',
  },
  {
    id: 'pago-movil',
    name: '📱 Pago Móvil',
    icon: '📱',
    details: 'Tu teléfono + Cédula aquí',
    instructions: 'Realiza una transferencia por pago móvil al teléfono indicado. Incluye la referencia en tu comprobante.',
  },
  {
    id: 'banesco-panama',
    name: '🏦 Banesco Panamá',
    icon: '🏦',
    details: 'Tu cuenta IBAN o número de cuenta aquí',
    instructions: 'Transferencia bancaria a tu cuenta en Banesco Panamá. Usa tu nombre como referencia.',
  },
  {
    id: 'transferencia',
    name: '💳 Transferencia Bancaria',
    icon: '💳',
    details: 'Tu cuenta bancaria aquí',
    instructions: 'Realiza una transferencia bancaria local. El depósito se acreditará en 1-2 días hábiles.',
  },
  {
    id: 'paypal',
    name: '💰 PayPal',
    icon: '💰',
    details: 'Tu correo PayPal aquí',
    instructions: 'Envía el pago a través de PayPal. Se acreditará inmediatamente.',
  },
];

export const PLANS = [
  {
    id: 'basic',
    name: 'Básico',
    price: 9.99,
    description: 'Para equipos pequeños',
    features: [
      '✅ Hasta 5 empresas',
      '✅ Tickets ilimitados',
      '✅ 3 usuarios por empresa',
      '✅ Soporte por email',
      '✅ Reportes básicos',
    ],
  },
  {
    id: 'professional',
    name: 'Profesional',
    price: 29.99,
    description: 'Para equipos medianos',
    popular: true,
    features: [
      '✅ Empresas ilimitadas',
      '✅ Tickets ilimitados',
      '✅ Usuarios ilimitados',
      '✅ SLAs personalizados',
      '✅ Reportes avanzados',
      '✅ Soporte prioritario',
      '✅ Auditoría completa',
    ],
  },
  {
    id: 'enterprise',
    name: 'Empresarial',
    price: 99.99,
    description: 'Para grandes organizaciones',
    features: [
      '✅ Todo de Profesional',
      '✅ Integraciones API',
      '✅ Soporte 24/7',
      '✅ Consultoría incluida',
      '✅ SLA de disponibilidad',
      '✅ Backup diario garantizado',
      '✅ Equipo dedicado',
    ],
  },
];
