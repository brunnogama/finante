export interface CategoryStyleConfig {
  iconName: string;
  colorKey: string;
}

export interface ColorPalette {
  key: string;
  name: string;
  hex: string;
  bgColor: string;
  textColor: string;
  darkBgColor: string;
  darkTextColor: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  { key: 'blue', name: 'Azul', hex: '#3584e4', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600', darkBgColor: 'dark:bg-blue-500/20', darkTextColor: 'dark:text-blue-400' },
  { key: 'emerald', name: 'Verde Esmeralda', hex: '#2ec27e', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-600', darkBgColor: 'dark:bg-emerald-500/20', darkTextColor: 'dark:text-emerald-400' },
  { key: 'teal', name: 'Ciano / Turquesa', hex: '#06b6d4', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-600', darkBgColor: 'dark:bg-cyan-500/20', darkTextColor: 'dark:text-cyan-400' },
  { key: 'amber', name: 'Âmbar / Dourado', hex: '#e5a50a', bgColor: 'bg-amber-500/10', textColor: 'text-amber-600', darkBgColor: 'dark:bg-amber-500/20', darkTextColor: 'dark:text-amber-400' },
  { key: 'orange', name: 'Laranja', hex: '#f97316', bgColor: 'bg-orange-500/10', textColor: 'text-orange-600', darkBgColor: 'dark:bg-orange-500/20', darkTextColor: 'dark:text-orange-400' },
  { key: 'rose', name: 'Vermelho', hex: '#e01b24', bgColor: 'bg-rose-500/10', textColor: 'text-rose-600', darkBgColor: 'dark:bg-rose-500/20', darkTextColor: 'dark:text-rose-400' },
  { key: 'purple', name: 'Roxo', hex: '#9141ac', bgColor: 'bg-purple-500/10', textColor: 'text-purple-600', darkBgColor: 'dark:bg-purple-500/20', darkTextColor: 'dark:text-purple-400' },
  { key: 'indigo', name: 'Índigo', hex: '#6366f1', bgColor: 'bg-indigo-500/10', textColor: 'text-indigo-600', darkBgColor: 'dark:bg-indigo-500/20', darkTextColor: 'dark:text-indigo-400' },
  { key: 'pink', name: 'Rosa', hex: '#ec4899', bgColor: 'bg-pink-500/10', textColor: 'text-pink-600', darkBgColor: 'dark:bg-pink-500/20', darkTextColor: 'dark:text-pink-400' },
  { key: 'zinc', name: 'Cinza / Neutro', hex: '#71717a', bgColor: 'bg-zinc-500/10', textColor: 'text-zinc-600', darkBgColor: 'dark:bg-zinc-500/20', darkTextColor: 'dark:text-zinc-400' },
];

const STORAGE_KEY = 'finante_category_styles';

export const getStoredCategoryStyles = (): Record<string, CategoryStyleConfig> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const getDefaultCategoryStyle = (typeName: string): CategoryStyleConfig => {
  const norm = (typeName || '').toLowerCase().trim();

  if (norm.includes('moradia') || norm.includes('aluguel') || norm.includes('condom') || norm.includes('casa')) {
    return { iconName: 'House', colorKey: 'blue' };
  }
  if (norm.includes('alimenta') || norm.includes('mercado') || norm.includes('comida') || norm.includes('restaurante')) {
    return { iconName: 'UtensilsCrossed', colorKey: 'amber' };
  }
  if (norm.includes('transporte') || norm.includes('combust') || norm.includes('carro') || norm.includes('uber') || norm.includes('gasolina')) {
    return { iconName: 'Car', colorKey: 'teal' };
  }
  if (norm.includes('servi') || norm.includes('luz') || norm.includes('energia') || norm.includes('agua') || norm.includes('copel') || norm.includes('enel') || norm.includes('internet')) {
    return { iconName: 'Zap', colorKey: 'amber' };
  }
  if (norm.includes('saude') || norm.includes('saúde') || norm.includes('farm') || norm.includes('medic') || norm.includes('hospital')) {
    return { iconName: 'HeartPulse', colorKey: 'rose' };
  }
  if (norm.includes('educa') || norm.includes('curso') || norm.includes('escola') || norm.includes('faculd')) {
    return { iconName: 'GraduationCap', colorKey: 'purple' };
  }
  if (norm.includes('assinatura') || norm.includes('netflix') || norm.includes('spotify') || norm.includes('stream')) {
    return { iconName: 'Tv', colorKey: 'pink' };
  }
  if (norm.includes('lazer') || norm.includes('jogo') || norm.includes('viagem') || norm.includes('cinema')) {
    return { iconName: 'Gamepad2', colorKey: 'indigo' };
  }
  if (norm.includes('compra') || norm.includes('shopping')) {
    return { iconName: 'ShoppingBag', colorKey: 'teal' };
  }
  if (norm.includes('pet') || norm.includes('animal') || norm.includes('vet') || norm.includes('cao') || norm.includes('gato')) {
    return { iconName: 'PawPrint', colorKey: 'emerald' };
  }
  if (norm.includes('invest') || norm.includes('poup')) {
    return { iconName: 'TrendingUp', colorKey: 'emerald' };
  }
  if (norm.includes('impost') || norm.includes('taxa') || norm.includes('tributo')) {
    return { iconName: 'Receipt', colorKey: 'rose' };
  }
  if (norm.includes('cart') || norm.includes('banco')) {
    return { iconName: 'CreditCard', colorKey: 'indigo' };
  }

  return { iconName: 'Tag', colorKey: 'zinc' };
};

export const getCategoryStyle = (typeName: string): CategoryStyleConfig => {
  const norm = (typeName || '').toLowerCase().trim();
  const all = getStoredCategoryStyles();
  if (all[norm]) {
    return all[norm];
  }
  return getDefaultCategoryStyle(typeName);
};

export const saveCategoryStyle = (typeName: string, style: CategoryStyleConfig) => {
  const norm = (typeName || '').toLowerCase().trim();
  if (!norm) return;

  const current = getStoredCategoryStyles();
  current[norm] = style;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent('finante_category_styles_updated', { detail: { typeName: norm, style } }));
};

export const renameCategoryStyle = (oldName: string, newName: string) => {
  const normOld = (oldName || '').toLowerCase().trim();
  const normNew = (newName || '').toLowerCase().trim();
  if (!normOld || !normNew || normOld === normNew) return;

  const current = getStoredCategoryStyles();
  if (current[normOld]) {
    current[normNew] = current[normOld];
    delete current[normOld];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('finante_category_styles_updated'));
  }
};

export const deleteCategoryStyle = (typeName: string) => {
  const norm = (typeName || '').toLowerCase().trim();
  const current = getStoredCategoryStyles();
  if (current[norm]) {
    delete current[norm];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('finante_category_styles_updated'));
  }
};
