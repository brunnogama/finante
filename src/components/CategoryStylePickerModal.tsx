import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Search, 
  Check, 
  Sparkles,
  Tag
} from 'lucide-react';
import { icons } from 'lucide-react';
import { 
  COLOR_PALETTES 
} from '../services/categoryStyles';
import type { CategoryStyleConfig } from '../services/categoryStyles';

interface CategoryStylePickerModalProps {
  currentTypeName: string;
  initialIconName?: string;
  initialColorKey?: string;
  onSelect: (config: CategoryStyleConfig) => void;
  onClose: () => void;
}

// Portuguese synonyms dictionary for icons
const ICON_KEYWORDS_PT: Record<string, string[]> = {
  Wallet: ['carteira', 'dinheiro', 'financas', 'pagamento'],
  CreditCard: ['cartao', 'credito', 'debito', 'banco'],
  Banknote: ['dinheiro', 'cedula', 'nota', 'grana', 'pagamento'],
  Coins: ['moedas', 'troco', 'dinheiro', 'centavos'],
  PiggyBank: ['cofrinho', 'poupanca', 'investimento', 'reserva'],
  Receipt: ['recibo', 'nota', 'fiscal', 'imposto', 'comprovante', 'fatura'],
  TrendingUp: ['investimento', 'lucro', 'rendimento', 'subida', 'ganhos'],
  TrendingDown: ['prejuizo', 'queda', 'gasto'],
  Landmark: ['banco', 'governo', 'instituicao', 'tesouro'],
  Vault: ['cofre', 'seguranca', 'reserva'],
  DollarSign: ['dolar', 'dinheiro', 'valor'],
  Percent: ['porcentagem', 'desconto', 'juros', 'taxa'],

  House: ['casa', 'moradia', 'lar', 'imovel', 'residencia'],
  Building: ['predio', 'condominio', 'apartamento', 'empresa'],
  Key: ['chave', 'aluguel', 'fechadura', 'casa'],
  Bed: ['quarto', 'cama', 'pousada', 'hotel'],
  Bath: ['banheiro', 'banho', 'higiene'],
  Hammer: ['reforma', 'construcao', 'obra', 'ferramenta'],
  Paintbrush: ['pintura', 'decoracao', 'reforma'],
  Armchair: ['sofa', 'mobilia', 'sala', 'conforto'],
  Lamp: ['luminaria', 'decoracao', 'luz'],
  Flame: ['gas', 'fogao', 'aquecimento', 'fogo'],

  UtensilsCrossed: ['comida', 'restaurante', 'almoco', 'jantar', 'refeicao', 'culinaria'],
  Utensils: ['talheres', 'comida', 'prato'],
  Pizza: ['pizza', 'lanche', 'delivery', 'comida', 'ifood'],
  Coffee: ['cafe', 'cafeteria', 'lanche', 'bebida', 'padaria'],
  Apple: ['maca', 'fruta', 'feira', 'hortifruti', 'saudavel'],
  Soup: ['sopa', 'refeicao', 'quente'],
  Cake: ['bolo', 'festa', 'aniversario', 'confeitaria', 'doce'],
  Beer: ['cerveja', 'bar', 'chopp', 'happy hour', 'bebida'],
  Wine: ['vinho', 'adega', 'bar', 'bebida'],
  CookingPot: ['panela', 'comida caseira', 'cozinha'],
  CupSoda: ['refrigerante', 'suco', 'lanche', 'fast food'],
  IceCream: ['sorvete', 'sobremesa', 'doce'],
  Sandwich: ['sanduiche', 'hamburguer', 'lanche'],

  Car: ['carro', 'automovel', 'transporte', 'veiculo'],
  CarFront: ['carro', 'frente'],
  Fuel: ['gasolina', 'combustivel', 'posto', 'etanol', 'diesel', 'abastecimento'],
  Bike: ['bicicleta', 'ciclismo', 'pedal', 'transporte'],
  Bus: ['onibus', 'coletivo', 'transporte publico', 'viagem'],
  Train: ['trem', 'metro', 'estacao'],
  Plane: ['aviao', 'voo', 'viagem', 'passagem', 'turismo'],
  Ship: ['barco', 'navio', 'cruzeiro', 'balsa'],
  Wrench: ['mecanico', 'oficina', 'conserto', 'manutencao'],

  HeartPulse: ['saude', 'coracao', 'cardiologista', 'clinica'],
  Pill: ['farmacia', 'remedio', 'medicamento', 'drogaria', 'comprimido'],
  Stethoscope: ['medico', 'consulta', 'doutor', 'exame'],
  Syringe: ['vacina', 'injecao', 'exame de sangue', 'laboratorio'],
  Hospital: ['hospital', 'pronto socorro', 'emergencia'],
  Activity: ['exercicio', 'vitalidade', 'saude'],
  Smile: ['dentista', 'odontologia', 'sorriso'],
  Eye: ['oftalmologista', 'otica', 'oculos'],
  Thermometer: ['febre', 'temperatura', 'doente'],

  GraduationCap: ['formatura', 'faculdade', 'universidade', 'graduacao', 'curso'],
  Book: ['livro', 'leitura', 'estudo', 'material escolar'],
  BookOpen: ['livro', 'apostila', 'aprendizado'],
  School: ['escola', 'colegio', 'educacao'],
  Pencil: ['lapis', 'papelaria', 'desenho'],
  Library: ['biblioteca', 'pesquisa'],

  Gamepad2: ['jogos', 'games', 'videogame', 'playstation', 'xbox', 'steam'],
  Tv: ['tv', 'televisao', 'streaming', 'netflix', 'series', 'filmes'],
  Film: ['cinema', 'filme', 'ingresso', 'pipoca'],
  Music: ['musica', 'spotify', 'show', 'instrumento'],
  Headphones: ['fone', 'podcast', 'audio'],
  Ticket: ['ingresso', 'evento', 'show', 'teatro'],
  PartyPopper: ['festa', 'balada', 'comemoracao', 'aniversario'],
  Camera: ['foto', 'fotografia', 'camera'],

  PawPrint: ['pet', 'animais', 'cachorro', 'gato', 'veterinario', 'racao'],
  Dog: ['cachorro', 'cao', 'pet'],
  Cat: ['gato', 'felino', 'pet'],
  Fish: ['peixe', 'aquario'],
  Bird: ['passaro', 'ave'],
  Bone: ['osso', 'pet shop', 'brinquedo pet'],

  Zap: ['luz', 'energia', 'eletricidade', 'conta de luz', 'copel', 'enel'],
  Droplets: ['agua', 'saneamento', 'conta de agua', 'sanepar', 'sabesp'],
  Wifi: ['internet', 'banda larga', 'fibra', 'conexao', 'rede'],
  Phone: ['telefone', 'celular', 'ligacao', 'telefonia'],
  Smartphone: ['celular', 'smartphone', 'recarga', 'aparelho'],
  Mail: ['correios', 'correspondencia', 'envio'],
  Shield: ['seguro', 'protecao', 'garantia'],

  ShoppingBag: ['compras', 'sacola', 'loja', 'shopping'],
  ShoppingCart: ['carrinho', 'supermercado', 'compras online'],
  Tag: ['etiqueta', 'preco', 'promocao', 'categoria'],
  Gift: ['presente', 'lembrancinha', 'natal'],
  Shirt: ['roupa', 'vestuario', 'moda', 'camisa'],
  Watch: ['relogio', 'acessorio', 'joia'],
  Package: ['encomenda', 'pacote', 'entrega'],

  Briefcase: ['trabalho', 'negocios', 'escritorio', 'profissao'],
  Laptop: ['notebook', 'computador', 'trabalho remoto'],
  Monitor: ['monitor', 'tela', 'pc'],
  Printer: ['impressora', 'copia', 'papel'],

  Dumbbell: ['academia', 'musculacao', 'treino', 'peso', 'fitness'],
  Trophy: ['premio', 'campeonato', 'vitoria'],
  Medal: ['medalha', 'conquista'],

  Luggage: ['mala', 'viagem', 'bagagem', 'ferias'],
  Compass: ['bussola', 'aventura', 'trilha'],
  MapPin: ['localizacao', 'endereco', 'lugar', 'destino'],
  Sun: ['praia', 'verao', 'sol'],
  Umbrella: ['chuva', 'guarda-chuva', 'seguro'],
};

// Popular icons organized by category for fast browsing
const QUICK_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'finance', label: 'Finanças' },
  { id: 'home', label: 'Casa' },
  { id: 'food', label: 'Alimentação' },
  { id: 'transport', label: 'Transporte' },
  { id: 'health', label: 'Saúde' },
  { id: 'pets', label: 'Pets' },
  { id: 'leisure', label: 'Lazer' },
  { id: 'tech', label: 'Serviços & Tech' },
  { id: 'shopping', label: 'Compras' },
  { id: 'education', label: 'Educação' },
  { id: 'sports', label: 'Esportes' },
];

const CATEGORIZED_ICONS: Record<string, string[]> = {
  finance: ['Wallet', 'CreditCard', 'Banknote', 'Coins', 'PiggyBank', 'Receipt', 'TrendingUp', 'TrendingDown', 'Landmark', 'Vault', 'DollarSign', 'Percent', 'Calculator', 'BadgePercent', 'HandCoins'],
  home: ['House', 'Building', 'Key', 'Bed', 'Bath', 'Hammer', 'Paintbrush', 'Armchair', 'Lamp', 'Flame', 'DoorClosed', 'Sofa', 'WashingMachine', 'Refrigerator'],
  food: ['UtensilsCrossed', 'Utensils', 'Pizza', 'Coffee', 'Apple', 'Soup', 'Cake', 'Beer', 'Wine', 'CookingPot', 'CupSoda', 'IceCream', 'Sandwich', 'Salad', 'Beef', 'Wheat'],
  transport: ['Car', 'CarFront', 'Fuel', 'Bike', 'Bus', 'Train', 'Plane', 'Ship', 'Wrench', 'Truck', 'TrafficCone', 'MapPin', 'Compass', 'Navigation'],
  health: ['HeartPulse', 'Pill', 'Stethoscope', 'Syringe', 'Hospital', 'Activity', 'Smile', 'Eye', 'Thermometer', 'FirstAid', 'Cross', 'Brain', 'Baby'],
  pets: ['PawPrint', 'Dog', 'Cat', 'Fish', 'Bird', 'Bone', 'Rabbit', 'Bug', 'Egg', 'Feather'],
  leisure: ['Gamepad2', 'Tv', 'Film', 'Music', 'Headphones', 'Ticket', 'PartyPopper', 'Camera', 'Palette', 'Dices', 'Radio', 'Mic', 'Sparkles'],
  tech: ['Zap', 'Droplets', 'Wifi', 'Phone', 'Smartphone', 'Mail', 'Shield', 'Laptop', 'Monitor', 'Printer', 'HardDrive', 'Cpu', 'BatteryCharging', 'Router', 'RadioTower'],
  shopping: ['ShoppingBag', 'ShoppingCart', 'Tag', 'Gift', 'Shirt', 'Watch', 'Package', 'Store', 'Scissors', 'Glasses', 'Gem'],
  education: ['GraduationCap', 'Book', 'BookOpen', 'School', 'Pencil', 'Library', 'Notebook', 'Bookmark', 'FileText'],
  sports: ['Dumbbell', 'Bike', 'Trophy', 'Medal', 'Footprints', 'Flame', 'Target', 'Volleyball', 'Watch'],
};

// All icon names in Lucide
const ALL_ICON_NAMES = Object.keys(icons).sort((a, b) => a.localeCompare(b));

export const CategoryStylePickerModal: React.FC<CategoryStylePickerModalProps> = ({
  currentTypeName,
  initialIconName = 'Tag',
  initialColorKey = 'blue',
  onSelect,
  onClose,
}) => {
  const [selectedIcon, setSelectedIcon] = useState<string>(initialIconName);
  const [selectedColorKey, setSelectedColorKey] = useState<string>(initialColorKey);
  const [search, setSearch] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState<number>(120);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentColor = useMemo(() => {
    return COLOR_PALETTES.find(c => c.key === selectedColorKey) || COLOR_PALETTES[0];
  }, [selectedColorKey]);

  // Selected Icon Component
  const SelectedIconComponent = useMemo(() => {
    const Component = (icons as Record<string, any>)[selectedIcon] || Tag;
    return Component;
  }, [selectedIcon]);

  // Filter icons based on category tab and search query
  const filteredIcons = useMemo(() => {
    const term = search.trim().toLowerCase();

    let candidateNames = ALL_ICON_NAMES;
    if (activeFilter !== 'all') {
      const specific = CATEGORIZED_ICONS[activeFilter];
      if (specific) {
        candidateNames = specific.filter(name => (icons as any)[name]);
      }
    }

    if (!term) {
      // If no search, put popular icons first
      if (activeFilter === 'all') {
        const popular = [
          'House', 'UtensilsCrossed', 'Car', 'HeartPulse', 'Zap', 'GraduationCap', 
          'Tv', 'Gamepad2', 'ShoppingBag', 'PawPrint', 'CreditCard', 'Wallet', 
          'Banknote', 'Fuel', 'Pill', 'Coffee', 'Pizza', 'TrendingUp', 'Building', 
          'Receipt', 'Dumbbell', 'Luggage', 'Gift', 'Phone', 'Wifi', 'Dog', 'Cat',
          'Plane', 'Bike', 'Briefcase', 'Hammer', 'Wrench', 'Music', 'Shirt'
        ].filter(name => (icons as any)[name]);
        const others = candidateNames.filter(name => !popular.includes(name));
        return [...popular, ...others];
      }
      return candidateNames;
    }

    return candidateNames.filter(iconName => {
      // 1. Direct name match (e.g. "Car", "UtensilsCrossed")
      if (iconName.toLowerCase().includes(term)) return true;

      // 2. Portuguese synonyms match
      const keywords = ICON_KEYWORDS_PT[iconName];
      if (keywords && keywords.some(k => k.toLowerCase().includes(term))) {
        return true;
      }

      return false;
    });
  }, [search, activeFilter]);

  const visibleIcons = useMemo(() => {
    return filteredIcons.slice(0, displayCount);
  }, [filteredIcons, displayCount]);

  const handleConfirm = () => {
    onSelect({
      iconName: selectedIcon,
      colorKey: selectedColorKey,
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      <div 
        className="adw-dialog max-w-2xl w-full p-5 md:p-6 shadow-2xl animate-scaleIn overflow-hidden flex flex-col max-h-[92vh] border border-black/10 dark:border-white/10"
        style={{ zIndex: 100000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl ${currentColor.bgColor} ${currentColor.textColor} flex items-center justify-center transition-colors`}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                Personalizar Ícone e Cor
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {currentTypeName ? `Categoria: "${currentTypeName}"` : 'Escolha a identidade visual da categoria'}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="my-3.5 p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl ${currentColor.bgColor} ${currentColor.darkBgColor} flex items-center justify-center shadow-xs transition-colors`}>
              <SelectedIconComponent size={24} className={`${currentColor.textColor} ${currentColor.darkTextColor}`} strokeWidth={2.3} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Prévia Visual</div>
              <div className="font-bold text-sm text-zinc-900 dark:text-white">
                {currentTypeName || 'Nova Categoria'}
              </div>
              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentColor.hex }} />
                <span>{currentColor.name}</span> • <span>Ícone: {selectedIcon}</span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${currentColor.bgColor} ${currentColor.textColor}`}>
              <SelectedIconComponent size={14} />
              {currentTypeName || 'Exemplo'}
            </span>
          </div>
        </div>

        {/* Color Palette Selector */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Cor da Categoria
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
            {COLOR_PALETTES.map(color => {
              const isSelected = selectedColorKey === color.key;
              return (
                <button
                  key={color.key}
                  type="button"
                  onClick={() => setSelectedColorKey(color.key)}
                  className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    isSelected ? 'ring-2 ring-offset-2 ring-[#3584e4] dark:ring-offset-zinc-900 scale-110 shadow-md' : 'hover:scale-105 opacity-85 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                >
                  {isSelected && <Check size={16} className="text-white drop-shadow-md" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Icon Search & Filter */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Escolha o Ícone ({filteredIcons.length} disponíveis)
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input 
              type="text"
              placeholder="Buscar ícone (ex: carro, pet, comida, wifi, dollar, ferramentas...)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setDisplayCount(120);
              }}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#3584e4]/40 font-medium"
            />
            {search && (
              <button 
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {QUICK_FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setActiveFilter(f.id);
                  setDisplayCount(120);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-[#3584e4] text-white shadow-xs'
                    : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Icons Grid */}
        <div 
          className="flex-1 overflow-y-auto pr-1 border border-black/5 dark:border-white/5 rounded-xl p-2 bg-black/[0.01] dark:bg-white/[0.01]"
          onScroll={(e) => {
            const target = e.currentTarget;
            if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
              if (displayCount < filteredIcons.length) {
                setDisplayCount(prev => Math.min(prev + 100, filteredIcons.length));
              }
            }
          }}
        >
          {filteredIcons.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs text-zinc-400 font-medium">Nenhum ícone encontrado para "{search}".</p>
              <button
                type="button"
                onClick={() => { setSearch(''); setActiveFilter('all'); }}
                className="mt-2 text-xs font-semibold text-[#3584e4] hover:underline cursor-pointer"
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
              {visibleIcons.map(iconName => {
                const IconComp = (icons as Record<string, any>)[iconName];
                if (!IconComp) return null;
                const isSelected = selectedIcon === iconName;

                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    className={`h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                      isSelected
                        ? `${currentColor.bgColor} ${currentColor.darkBgColor} ring-2 ring-[#3584e4] shadow-sm scale-105`
                        : 'bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                    title={iconName}
                  >
                    <IconComp 
                      size={20} 
                      className={isSelected ? `${currentColor.textColor} ${currentColor.darkTextColor}` : ''} 
                      strokeWidth={isSelected ? 2.5 : 2}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {displayCount < filteredIcons.length && (
            <div className="text-center pt-3 pb-1">
              <button
                type="button"
                onClick={() => setDisplayCount(prev => Math.min(prev + 120, filteredIcons.length))}
                className="adw-btn text-[11px] font-semibold py-1 px-3 cursor-pointer"
              >
                Carregar mais ícones ({filteredIcons.length - displayCount} restantes)
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3 mt-3">
          <button
            type="button"
            onClick={onClose}
            className="adw-btn text-xs font-semibold px-4 py-2 cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            className="adw-btn suggested-action text-xs font-semibold px-5 py-2 inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Check size={14} />
            <span>Aplicar Ícone & Cor</span>
          </button>
        </div>

      </div>
    </div>
  );
};
