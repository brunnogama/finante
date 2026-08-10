import React, { useEffect, useState } from 'react';
import { X, GitCommit, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChangelogModalProps {
  onClose: () => void;
  currentVersion: string;
}

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose, currentVersion }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('https://api.github.com/repos/brunnogama/finante/commits?per_page=10')
      .then(res => {
        if (!res.ok) throw new Error('Falha ao buscar novidades');
        return res.json();
      })
      .then(data => {
        setCommits(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="card" style={{ 
        width: '90%', maxWidth: '500px', maxHeight: '80vh', 
        padding: '24px', position: 'relative',
        display: 'flex', flexDirection: 'column'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-color)', cursor: 'pointer', opacity: 0.7 }}
        >
          <X size={24} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', padding: '16px', borderRadius: '50%', marginBottom: '16px', display: 'inline-flex' }}>
            <GitCommit size={40} />
          </div>
          <h2 style={{ margin: 0 }}>Novidades (v{currentVersion})</h2>
          <p style={{ opacity: 0.7, margin: '8px 0 0' }}>Últimas atualizações do aplicativo</p>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', opacity: 0.7 }}>Buscando atualizações...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', color: 'var(--danger-color)' }}>Não foi possível carregar as novidades no momento.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {commits.map((c) => {
                const messageParts = c.commit.message.split('\n')[0];
                return (
                  <div key={c.sha} style={{ 
                    padding: '16px', 
                    borderRadius: '12px', 
                    backgroundColor: 'var(--bg-color)',
                    border: '1px solid var(--card-border-color)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5, fontSize: '12px', marginBottom: '8px' }}>
                      <Clock size={14} />
                      <span>{format(new Date(c.commit.author.date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                    <p style={{ margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                      {messageParts}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
