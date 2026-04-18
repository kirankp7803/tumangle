import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, Send, PhoneOff } from 'lucide-react';

const CallPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { text: 'System: Searching for a stranger...', sender: 'system' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isMatched, setIsMatched] = useState(false);
  
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isAudioOff, setIsAudioOff] = useState(false);
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // Request camera and microphone access
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Error accessing media devices.", err);
      });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    // Simulate matching after 3 seconds
    const timer = setTimeout(() => {
      setIsMatched(true);
      setMessages(prev => [...prev, { text: 'System: You are now chatting with a stranger!', sender: 'system' }]);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages([...messages, { text: inputMsg, sender: 'me' }]);
    setInputMsg('');
    
    // Simulate reply if matched
    if (isMatched) {
      setTimeout(() => {
        setMessages(prev => [...prev, { text: 'Hello! Nice to meet you 😊', sender: 'stranger' }]);
      }, 1500);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOff(!audioTrack.enabled);
      }
    }
  };

  const endCall = () => {
    setIsMatched(false);
    setMessages([{ text: 'System: You disconnected. Searching for a new stranger...', sender: 'system' }]);
    setTimeout(() => {
      setIsMatched(true);
      setMessages(prev => [...prev, { text: 'System: You are now chatting with a stranger!', sender: 'system' }]);
    }, 3000);
  };

  return (
    <div className="flex gap-6 h-full" style={{ height: 'calc(100vh - 150px)' }}>
      {/* Video Grid Section */}
      <div className="flex-col gap-4" style={{ flex: '2' }}>
        <div style={{ display: 'flex', gap: '1rem', height: '100%' }}>
          {/* Stranger Video */}
          <div className="glass-panel" style={{ 
            flex: 1, 
            position: 'relative', 
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isMatched ? 'transparent' : 'var(--bg-glass)'
          }}>
            {isMatched ? (
              <img 
                src="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=1000" 
                alt="Stranger" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div className="animate-pulse-glow" style={{ 
                width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent-primary)' 
              }}></div>
            )}
            <div style={{
              position: 'absolute', bottom: '1rem', left: '1rem',
              background: 'rgba(0,0,0,0.6)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)',
              backdropFilter: 'blur(4px)'
            }}>
              Stranger
            </div>
          </div>

          {/* Local Video */}
          <div className="glass-panel" style={{ 
            flex: 1, 
            position: 'relative', 
            overflow: 'hidden',
            background: '#1a1a24'
          }}>
            {isVideoOff ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <VideoOff size={48} color="var(--text-secondary)" />
              </div>
            ) : (
              <video 
                ref={localVideoRef}
                autoPlay 
                playsInline 
                muted // Muted to prevent echo loop of your own mic
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            )}
            <div style={{
              position: 'absolute', bottom: '1rem', left: '1rem',
              background: 'rgba(0,0,0,0.6)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)',
              backdropFilter: 'blur(4px)'
            }}>
              You
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-panel flex justify-center items-center gap-6" style={{ padding: '1rem' }}>
          <button onClick={toggleAudio} className={`btn ${isAudioOff ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '50%', padding: '1rem', width: '50px', height: '50px', background: isAudioOff ? '#ef4444' : undefined, borderColor: isAudioOff ? '#ef4444' : undefined }}>
            {isAudioOff ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button onClick={toggleVideo} className={`btn ${isVideoOff ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '50%', padding: '1rem', width: '50px', height: '50px', background: isVideoOff ? '#ef4444' : undefined, borderColor: isVideoOff ? '#ef4444' : undefined }}>
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
          <button onClick={endCall} style={{ 
            background: '#ef4444', color: 'white', borderRadius: '50%', padding: '1rem', width: '50px', height: '50px',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <PhoneOff size={20} />
          </button>
        </div>
      </div>

      {/* Chat Section */}
      <div className="glass-panel flex-col" style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          padding: '1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600
        }}>
          Live Chat
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ 
              alignSelf: msg.sender === 'me' ? 'flex-end' : msg.sender === 'system' ? 'center' : 'flex-start',
              background: msg.sender === 'me' ? 'var(--accent-primary)' : msg.sender === 'system' ? 'transparent' : 'rgba(255,255,255,0.1)',
              color: msg.sender === 'system' ? 'var(--text-secondary)' : 'white',
              fontSize: msg.sender === 'system' ? '0.875rem' : '1rem',
              padding: msg.sender === 'system' ? '0' : '0.5rem 1rem',
              borderRadius: msg.sender === 'me' ? '1rem 1rem 0 1rem' : msg.sender === 'system' ? '0' : '1rem 1rem 1rem 0',
              maxWidth: '80%'
            }}>
              {msg.text}
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} style={{ 
          padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem'
        }}>
          <input 
            type="text" 
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder={isMatched ? "Type a message..." : "Waiting..."}
            disabled={!isMatched}
            style={{ 
              flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', 
              color: 'white', padding: '0.75rem 1rem', borderRadius: 'var(--radius-full)', outline: 'none'
            }}
          />
          <button type="submit" disabled={!isMatched} className="btn btn-primary" style={{ padding: '0.75rem', borderRadius: '50%' }}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CallPage;
