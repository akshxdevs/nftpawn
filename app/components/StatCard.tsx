import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color?: 'primary' | 'green' | 'purple' | 'orange';
  delay?: number;
}

export default function StatCard({ title, value, icon: Icon, color = 'primary', delay = 0 }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="flex justify-center mb-4">
        <div className={`w-12 h-12 rounded-full bg-${color}-100 dark:bg-${color}-900/20 flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colorClasses[color]}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-gradient mb-2">{value}</div>
      <div className="text-dark-600 dark:text-dark-300">{title}</div>
    </motion.div>
  );
} 