import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, Send, PhoneOff } from 'lucide-react';
import { socket } from '../socket';

const CallPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { text: 'System: Connecting server...', sender: 'system' }
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
    // Start matching process
    socket.emit('find_stranger');

    socket.on('waiting_for_stranger', () => {
      setMessages([{ text: 'System: Searching for a stranger...', sender: 'system' }]);
      setIsMatched(false);
    });

    socket.on('stranger_matched', (data) => {
      setIsMatched(true);
      setMessages([{ text: 'System: You are now chatting with a stranger!', sender: 'system' }]);
    });

    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, { text: data.text, sender: 'stranger' }]);
    });

    socket.on('stranger_disconnected', () => {
      setIsMatched(false);
      setMessages(prev => [...prev, { text: 'System: Stranger disconnected. Searching for a new stranger...', sender: 'system' }]);
      // auto re-queue
      socket.emit('find_stranger');
    });

    return () => {
      socket.emit('end_call'); // Ensure we clean up when leaving the page
      socket.off('waiting_for_stranger');
      socket.off('stranger_matched');
      socket.off('receive_message');
      socket.off('stranger_disconnected');
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !isMatched) return;
    
    setMessages([...messages, { text: inputMsg, sender: 'me' }]);
    socket.emit('send_message', { text: inputMsg });
    setInputMsg('');
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
    socket.emit('end_call');
    setIsMatched(false);
    setMessages([{ text: 'System: You disconnected. Searching for a new stranger...', sender: 'system' }]);
    socket.emit('find_stranger');
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', marginTop: '80px', gap: '1rem', paddingBottom: '1rem' }}>
      
      {/* Immersive Video Area */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        
        {/* Stranger Main Camera */}
        <div style={{ 
          width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isMatched ? 'transparent' : 'var(--bg-glass)'
        }}>
          {isMatched ? (
            <img 
              src="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=1000" 
              alt="Stranger" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div className="flex-col items-center gap-4">
              <div className="animate-pulse-glow" style={{ 
                width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent-primary)' 
              }}></div>
              <p style={{ fontWeight: 600 }}>{messages[messages.length - 1]?.text}</p>
            </div>
          )}
          
          {/* Floating Chat Overlay */}
          <div style={{
             position: 'absolute', bottom: '5rem', left: '1rem', right: '1rem', zIndex: 20,
             display: 'flex', flexDirection: 'column', gap: '0.5rem',
             pointerEvents: 'none', // Allows clicking through chat to the video
             maxHeight: '60%', justifyContent: 'flex-end',
             overflow: 'hidden'
          }}>
            {messages.slice(-6).map((msg, i) => {
              if (msg.sender === 'system') return null; // We display system messages differently now
              return (
                <div key={i} style={{ 
                  alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'me' ? 'var(--accent-primary)' : 'rgba(0,0,0,0.5)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '1.2rem', backdropFilter: 'blur(8px)',
                  fontSize: '0.95rem',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  fontWeight: '500',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                  {msg.text}
                </div>
              );
            })}
          </div>
          
          {/* Action Controls Overlay */}
          <div style={{
            position: 'absolute', bottom: '1rem', left: '0', right: '0',
            display: 'flex', justifyContent: 'center', gap: '1rem', zIndex: 30
          }}>
            <button onClick={toggleAudio} className={`btn ${isAudioOff ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '50%', padding: '0.75rem', background: isAudioOff ? '#ef4444' : 'rgba(0,0,0,0.4)', borderColor: isAudioOff ? '#ef4444' : 'transparent', backdropFilter: 'blur(8px)' }}>
              {isAudioOff ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button onClick={toggleVideo} className={`btn ${isVideoOff ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: '50%', padding: '0.75rem', background: isVideoOff ? '#ef4444' : 'rgba(0,0,0,0.4)', borderColor: isAudioOff ? '#ef4444' : 'transparent', backdropFilter: 'blur(8px)' }}>
              {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
            <button onClick={endCall} style={{ background: '#ef4444', color: 'white', borderRadius: '50%', padding: '0.75rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}>
              <PhoneOff size={20} />
            </button>
          </div>
        </div>

        {/* Local Camera (Self) Picture-in-Picture */}
        <div className="glass-panel" style={{ 
          position: 'absolute', top: '1rem', right: '1rem', width: '100px', height: '140px', zIndex: 40,
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {isVideoOff ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a24' }}>
               <VideoOff size={24} color="var(--text-secondary)" />
            </div>
          ) : (
            <video 
              ref={localVideoRef}
              autoPlay 
              playsInline 
              muted // Prevent mic echo loop
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
          )}
        </div>
      </div>

      {/* Persistent Chat Input Bar at Bottom */}
      <div style={{ flex: 'none' }}>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.75rem' }}>
          <input 
            type="text" 
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder={isMatched ? "Message the stranger..." : "Waiting for match..."}
            disabled={!isMatched}
            style={{ 
              flex: 1, background: 'var(--bg-glass)', border: '1px solid var(--border-color)', 
              color: 'white', padding: '1rem 1.5rem', borderRadius: 'var(--radius-full)', outline: 'none',
              backdropFilter: 'blur(16px)', fontSize: '1rem', transition: 'border-color 0.3s'
            }}
          />
          <button type="submit" disabled={!isMatched} className="btn btn-primary" style={{ padding: '1rem', borderRadius: '50%' }}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CallPage;
