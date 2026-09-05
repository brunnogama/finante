import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownItem {
  value: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
}

interface PortalDropdownProps {
  value: string;
  options: (string | DropdownItem)[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  renderTrigger?: (selected: DropdownItem, isOpen: boolean) => React.ReactNode;
  renderOption?: (item: DropdownItem, isSelected: boolean) => React.ReactNode;
  disabled?: boolean;
}

export const PortalDropdown: React.FC<PortalDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Selecione...',
  className = 'relative',
  buttonClassName = 'adw-entry text-xs flex items-center justify-between cursor-pointer w-full',
  menuClassName = '',
  renderTrigger,
  renderOption,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  }>({ left: 0, width: 0, maxHeight: 220 });

  const normalizedOptions: DropdownItem[] = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedItem: DropdownItem = normalizedOptions.find(o => o.value === value) || {
    value,
    label: value || placeholder
  };

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 210 && spaceAbove > spaceBelow;

    const maxH = openUpward 
      ? Math.min(240, Math.max(120, spaceAbove - 16)) 
      : Math.min(240, Math.max(120, spaceBelow - 16));

    setCoords({
      top: openUpward ? undefined : rect.bottom + 4,
      bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      width: rect.width,
      maxHeight: maxH
    });
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = (e: Event) => {
      // If scroll happened inside the dropdown menu itself, do nothing
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={buttonClassName}
      >
        {renderTrigger ? (
          renderTrigger(selectedItem, isOpen)
        ) : (
          <>
            <div className="flex items-center gap-2 truncate">
              {selectedItem.icon}
              <span className="truncate">{selectedItem.label || placeholder}</span>
            </div>
            <ChevronDown 
              size={14} 
              className={`text-zinc-400 transition-transform shrink-0 ml-1.5 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </>
        )}
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className={`fixed adw-popover rounded-xl p-1.5 shadow-2xl overflow-y-auto border border-black/10 dark:border-white/10 animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
          style={{
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            width: coords.width,
            maxHeight: coords.maxHeight,
            zIndex: 999999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {normalizedOptions.map((item) => {
            const isSelected = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onChange(item.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#3584e4]/15 text-[#3584e4] font-bold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {renderOption ? (
                  renderOption(item, isSelected)
                ) : (
                  <>
                    <div className="flex items-center gap-2 truncate">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-[#3584e4] shrink-0 ml-1" />}
                  </>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};
