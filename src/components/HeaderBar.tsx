import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft } from 'lucide-react';
import { FinanteIcon } from './FinanteIcon';

interface HeaderBarProps {
  title: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  return (
    <div className="header-bar" data-tauri-drag-region>
      <div className="header-bar-title" data-tauri-drag-region style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!isHome && (
          <button className="btn btn-icon" onClick={() => navigate(-1)} style={{ marginRight: '4px' }}>
            <ChevronLeft size={24} />
          </button>
        )}
        {isHome && <FinanteIcon size={24} />}
        {title}
      </div>
      
      <div className="header-bar-controls">
        <button className="btn btn-icon" style={{ position: 'relative' }}>
          <Bell size={20} />
          {/* Badge de notificação */}
          <span style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '8px',
            height: '8px',
            backgroundColor: 'var(--destructive-color)',
            borderRadius: '50%',
            boxShadow: '0 0 0 2px var(--headerbar-bg-color)'
          }} />
        </button>
      </div>
    </div>
  );
};
