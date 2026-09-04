import React from 'react';
import { 
  Home, 
  UtensilsCrossed, 
  Car, 
  Zap, 
  HeartPulse, 
  GraduationCap, 
  Tv, 
  Gamepad2, 
  Tag, 
  ShoppingBag
} from 'lucide-react';

export interface CategoryStyle {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  bgColor: string;
  textColor: string;
  darkBgColor: string;
  darkTextColor: string;
}

export const getCategoryMeta = (typeName: string): CategoryStyle => {
  const norm = (typeName || '').toLowerCase().trim();

  if (norm.includes('moradia') || norm.includes('aluguel') || norm.includes('condom') || norm.includes('casa')) {
    return {
      icon: Home,
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-600',
      darkBgColor: 'dark:bg-blue-500/15',
      darkTextColor: 'dark:text-blue-400'
    };
  }

  if (norm.includes('alimenta') || norm.includes('mercado') || norm.includes('comida') || norm.includes('restaurante')) {
    return {
      icon: UtensilsCrossed,
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-600',
      darkBgColor: 'dark:bg-amber-500/15',
      darkTextColor: 'dark:text-amber-400'
    };
  }

  if (norm.includes('transporte') || norm.includes('combust') || norm.includes('carro') || norm.includes('uber') || norm.includes('gasolina')) {
    return {
      icon: Car,
      bgColor: 'bg-teal-500/10',
      textColor: 'text-teal-600',
      darkBgColor: 'dark:bg-teal-500/15',
      darkTextColor: 'dark:text-teal-400'
    };
  }

  if (norm.includes('servi') || norm.includes('luz') || norm.includes('energia') || norm.includes('agua') || norm.includes('copel') || norm.includes('enel') || norm.includes('internet')) {
    return {
      icon: Zap,
      bgColor: 'bg-yellow-500/10',
      textColor: 'text-yellow-600',
      darkBgColor: 'dark:bg-yellow-500/15',
      darkTextColor: 'dark:text-yellow-400'
    };
  }

  if (norm.includes('saude') || norm.includes('saúde') || norm.includes('farm') || norm.includes('medic') || norm.includes('hospital')) {
    return {
      icon: HeartPulse,
      bgColor: 'bg-rose-500/10',
      textColor: 'text-rose-600',
      darkBgColor: 'dark:bg-rose-500/15',
      darkTextColor: 'dark:text-rose-400'
    };
  }

  if (norm.includes('educa') || norm.includes('curso') || norm.includes('escola') || norm.includes('faculd')) {
    return {
      icon: GraduationCap,
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-600',
      darkBgColor: 'dark:bg-purple-500/15',
      darkTextColor: 'dark:text-purple-400'
    };
  }

  if (norm.includes('assinatura') || norm.includes('netflix') || norm.includes('spotify') || norm.includes('stream')) {
    return {
      icon: Tv,
      bgColor: 'bg-pink-500/10',
      textColor: 'text-pink-600',
      darkBgColor: 'dark:bg-pink-500/15',
      darkTextColor: 'dark:text-pink-400'
    };
  }

  if (norm.includes('lazer') || norm.includes('jogo') || norm.includes('viagem') || norm.includes('cinema')) {
    return {
      icon: Gamepad2,
      bgColor: 'bg-indigo-500/10',
      textColor: 'text-indigo-600',
      darkBgColor: 'dark:bg-indigo-500/15',
      darkTextColor: 'dark:text-indigo-400'
    };
  }

  if (norm.includes('compra') || norm.includes('shopping')) {
    return {
      icon: ShoppingBag,
      bgColor: 'bg-cyan-500/10',
      textColor: 'text-cyan-600',
      darkBgColor: 'dark:bg-cyan-500/15',
      darkTextColor: 'dark:text-cyan-400'
    };
  }

  return {
    icon: Tag,
    bgColor: 'bg-zinc-500/10',
    textColor: 'text-zinc-600',
    darkBgColor: 'dark:bg-zinc-500/15',
    darkTextColor: 'dark:text-zinc-400'
  };
};

interface CategoryIconProps {
  type: string;
  size?: number;
  className?: string;
  containerClassName?: string;
  showBadge?: boolean;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ 
  type, 
  size = 16, 
  className = '', 
  containerClassName = '',
  showBadge = true 
}) => {
  const meta = getCategoryMeta(type);
  const IconComponent = meta.icon;

  if (!showBadge) {
    return <IconComponent size={size} className={`${meta.textColor} ${meta.darkTextColor} ${className}`} strokeWidth={2.2} />;
  }

  return (
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform ${meta.bgColor} ${meta.darkBgColor} ${containerClassName}`}>
      <IconComponent size={size} className={`${meta.textColor} ${meta.darkTextColor} ${className}`} strokeWidth={2.2} />
    </div>
  );
};
