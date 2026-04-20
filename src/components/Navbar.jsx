import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Video, User, Users } from 'lucide-react';
import { socket } from '../socket';

const Navbar = () => {
  const location = useLocation();
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    socket.on('stats_update', (data) => {
      setActiveUsers(data.activeUsers);
    });
    return () => {
      socket.off('stats_update');
    };
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(10, 10, 15, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '1rem 0'
    }}>
      <div className="container flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'white' }}>
          <div style={{
            background: 'var(--accent-gradient)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Video size={24} color="white" />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Tumangle</span>
        </Link>

        <div className="flex items-center gap-4">
          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
            <Users size={18} /> <span style={{ color: 'var(--accent-primary)' }}>{activeUsers}</span> Online
          </div>
          <Link to="/call" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <User size={18} /> Call Now
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
