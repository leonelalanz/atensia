import React from 'react';
import { useBrand } from '../../contexts/BrandContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const { primaryColor } = useBrand();

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-medium',
    md: 'px-4 py-2 text-sm font-medium',
    lg: 'px-6 py-2.5 text-base font-medium',
  };

  const baseClasses = 'rounded-xl transition-all flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed';

  let variantClasses = '';
  let style: React.CSSProperties = {};

  if (variant === 'primary') {
    variantClasses = 'text-white';
    style = { backgroundColor: primaryColor };
  } else if (variant === 'secondary') {
    variantClasses = 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800';
  } else if (variant === 'danger') {
    variantClasses = 'bg-red-600 hover:bg-red-700 text-white';
  } else if (variant === 'ghost') {
    variantClasses = 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white';
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses} ${className}`}
      style={variant === 'primary' ? style : undefined}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}
