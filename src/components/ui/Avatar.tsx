import React from 'react';
import { Profile } from '../../types';

interface AvatarProps {
  profile?: Profile | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-7 h-7 text-sm',
  md: 'w-9 h-9 text-base',
  lg: 'w-12 h-12 text-xl',
};

export default function Avatar({ profile, size = 'md', className = '' }: AvatarProps) {
  const emoji = profile?.avatar_emoji ?? '👤';
  const color = profile?.avatar_color ?? '#2563eb';

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-medium select-none flex-shrink-0 ${className}`}
      style={{ backgroundColor: color + '22', border: `2px solid ${color}40` }}
      title={profile?.full_name}
    >
      <span>{emoji}</span>
    </div>
  );
}
