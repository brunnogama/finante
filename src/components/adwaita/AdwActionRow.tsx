import React from 'react';

interface AdwActionRowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const AdwActionRow: React.FC<AdwActionRowProps> = ({
  title,
  subtitle,
  prefix,
  suffix,
  onClick,
  className = ''
}) => {
  const isInteractive = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`boxed-list-row ${isInteractive ? 'boxed-list-row-interactive' : ''} ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {prefix && <div className="shrink-0 flex items-center justify-center">{prefix}</div>}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {suffix && <div className="shrink-0 flex items-center gap-2 pl-3">{suffix}</div>}
    </div>
  );
};
