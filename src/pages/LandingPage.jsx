import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Shield, Zap, Globe } from 'lucide-react';

const FeatureCard = ({ icon, title, description }) => (
  <div className="glass-panel" style={{ padding: '2rem', flex: 1, minWidth: '250px' }}>
    <div style={{
      display: 'inline-flex',
      padding: '1rem',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(139, 92, 246, 0.1)',
      color: 'var(--accent-primary)',
      marginBottom: '1.5rem'
    }}>
      {icon}
    </div>
    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{title}</h3>
    <p style={{ fontSize: '1rem' }}>{description}</p>
  </div>
);

const LandingPage = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/call');
  };

  return (
    <div className="flex-col items-center justify-center text-center mt-8 gap-8">
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 0' }} className="animate-float">
        <div style={{
          display: 'inline-block',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-color)',
          fontSize: '0.875rem',
          marginBottom: '2rem',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ color: 'var(--accent-secondary)' }}>✨ New</span> Premium Random Video Chat
        </div>
        
        <h1 style={{ marginBottom: '1.5rem' }}>
          Meet new people in <br />
          <span className="text-gradient">High Quality Video</span>
        </h1>
        
        <p style={{ marginBottom: '3rem', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
          Experience the next generation of random video chatting. Enjoy ad-free, high-definition connections with people around the world.
        </p>
        
        <div className="flex justify-center gap-4">
          <button onClick={handleStart} className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem' }}>
            <Video size={24} />
            Start Chatting
          </button>
        </div>
      </div>

      <div className="flex gap-6 mt-8" style={{ flexWrap: 'wrap', width: '100%', maxWidth: '1000px', margin: '4rem auto 0 auto' }}>
        <FeatureCard 
          icon={<Zap size={32} />}
          title="Instant Connections"
          description="Match with strangers instantly without any loading times. Our algorithm ensures lightning-fast pairings."
        />
        <FeatureCard 
          icon={<Shield size={32} />}
          title="Premium & Secure"
          description="A subscription-based model keeps bots and trolls out, ensuring a safe and high-quality community."
        />
        <FeatureCard 
          icon={<Globe size={32} />}
          title="Global Reach"
          description="Connect with interesting people from over 190 countries in crystal clear 1080p video."
        />
      </div>
    </div>
  );
};

export default LandingPage;
