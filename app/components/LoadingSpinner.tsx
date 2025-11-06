import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'primary' | 'dark';
}

export default function LoadingSpinner({ size = 'md', color = 'white' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const colorClasses = {
    white: 'border-white',
    primary: 'border-primary-600',
    dark: 'border-dark-600',
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`${sizeClasses[size]} ${colorClasses[color]} border-2 border-t-transparent rounded-full`}
    />
  );
} 