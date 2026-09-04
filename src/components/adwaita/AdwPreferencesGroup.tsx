import React from 'react';

interface AdwPreferencesGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const AdwPreferencesGroup: React.FC<AdwPreferencesGroupProps> = ({
  title,
  description,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {(title || description) && (
        <div className="px-3">
          {title && (
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="boxed-list">
        {children}
      </div>
    </div>
  );
};
