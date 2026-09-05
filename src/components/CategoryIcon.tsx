import React, { useState, useEffect, useMemo } from 'react';
import { Tag, icons } from 'lucide-react';
import { 
  getCategoryStyle, 
  COLOR_PALETTES 
} from '../services/categoryStyles';

export interface CategoryStyle {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  bgColor: string;
  textColor: string;
  darkBgColor: string;
  darkTextColor: string;
}

export const getCategoryMeta = (typeName: string): CategoryStyle => {
  const style = getCategoryStyle(typeName);
  const palette = COLOR_PALETTES.find(p => p.key === style.colorKey) || COLOR_PALETTES[0];
  const IconComponent = (icons as Record<string, any>)[style.iconName] || Tag;

  return {
    icon: IconComponent,
    bgColor: palette.bgColor,
    textColor: palette.textColor,
    darkBgColor: palette.darkBgColor,
    darkTextColor: palette.darkTextColor,
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
  // Update state whenever category styles change
  const [updateTick, setUpdateTick] = useState<number>(0);

  useEffect(() => {
    const handleStyleUpdate = () => {
      setUpdateTick(prev => prev + 1);
    };

    window.addEventListener('finante_category_styles_updated', handleStyleUpdate);
    return () => {
      window.removeEventListener('finante_category_styles_updated', handleStyleUpdate);
    };
  }, []);

  const meta = useMemo(() => {
    return getCategoryMeta(type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, updateTick]);

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
