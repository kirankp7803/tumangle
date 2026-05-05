import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// Initializing socket connection
const socket = io('https://api.tumangle.site');

const App = () => {
  const [screen, setScreen] = useState('auth');
  const [userName, setUserName] = useState('Guest');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [authMode, setAuthMode] = useState('login');

  // Mapped State Logic
  const [currentState, setCurrentState] = useState('START_NODE');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [genderFilter, setGenderFilter] = useState('both');
  
  const [messages, setMessages] = useState([{ text: "Welcome to Tumangle! Start chatting with the world.", sender: userName, isSelf: false }]);
  const [chatInput, setChatInput] = useState('');

  const userProfileDP = `https://i.pravatar.cc/300?u=${userName}`;
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatMessagesRef = useRef(null);

  const strangerAvatar = "https://i.pravatar.cc/300?u=stranger";

  // 1. Initialize Camera
  useEffect(() => {
    if (screen === 'stream') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          setLocalStream(stream);
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        })
        .catch(err => console.error("Camera access denied", err));
    }

    // Socket Listeners
    socket.on('partner-found', (data) => {
      // Simulation of receiving a remote stream/data
      // In a real WebRTC app, this would involve offer/answer exchange
      console.log('Partner found:', data);
      setCurrentState('CONNECTED_NODE');
      addMessage("Connected to a new partner!", "System");
    });

    socket.on('partner-disconnected', () => {
      setRemoteStream(null);
      setCurrentState('SEARCHING_NODE');
      addMessage("Partner disconnected.", "System");
    });

    return () => {
      socket.off('partner-found');
      socket.off('partner-disconnected');
    };
  }, [screen]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const finalName = signupName || 'TumangleUser' + Math.floor(Math.random() * 100);
    setUserName(finalName);
    setScreen('stream');
  };

  // 2. The "Articy Trigger" Logic adapted for this app
  const handleNext = () => {
    // Logic: Transition to searching
    setCurrentState('SEARCHING_NODE');
    setRemoteStream(null);

    // Emit search to socket
    socket.emit('find-random-partner', { gender: genderFilter });

    addMessage("Searching for a new partner...", "System");
  };

  const endCall = () => {
    socket.emit('leave-chat');
    setRemoteStream(null);
    setCurrentState('START_NODE');
    addMessage("Call ended.", "System");
  };

  const addMessage = (text, sender, isSelf = false) => {
    setMessages(prev => [...prev, { text, sender, isSelf }]);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      addMessage(chatInput, userName, true);
      socket.emit('send-chat-message', { text: chatInput, sender: userName });
      setChatInput('');
    }
  };

  if (screen === 'auth') {
    return (
      <div id="auth-screen" className="screen active">
        <div className="auth-container glass">
          <div className="brand">
            <h1 className="logo-text"><span className="brand-name">Tumangle</span><span className="dot">Live</span></h1>
            <p className="tagline">Connect with the world, instantly.</p>
          </div>

          <div className="auth-tabs">
            <button className={`tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>Login</button>
            <button className={`tab ${authMode === 'signup' ? 'active' : ''}`} onClick={() => setAuthMode('signup')}>Sign Up</button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'signup' && (
              <div className="input-group">
                <input type="text" placeholder="Your Username" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
              </div>
            )}
            <div className="input-group">
              <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary glow-effect">
              Enter Platform
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </button>
          </form>
        </div>

        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
      </div>
    );
  }

  return (
    <div id="stream-screen" className="screen active">
      <header className="top-nav glass">
        <div className="logo"><span className="brand-name">Tumangle</span><span className="dot">Live</span></div>
        <div className="nav-links">
          <div className="filter-group">
            <label>Find:</label>
            <select className="gender-select" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
              <option value="both">Both</option>
              <option value="girls">Girls</option>
              <option value="boys">Boys</option>
            </select>
          </div>
          <button
            className="btn-primary-small glow-effect"
            style={{ padding: '10px 24px', fontSize: '1.1rem' }}
            onClick={handleNext}
          >
            {currentState === 'SEARCHING_NODE' ? 'Searching...' : 'Next Partner'}
          </button>
        </div>
      </header>

      <div className="stream-layout">
        <div className="main-content">
          <div className="video-call-container glass">
            <div className="remote-video-wrapper">
              {/* Remote Video Frame */}
              <video ref={remoteVideoRef} autoPlay playsInline style={{ display: remoteStream ? 'block' : 'none' }}></video>

              {/* Stranger Profile DP as placeholder */}
              {currentState === 'CONNECTED_NODE' && !remoteStream && (
                <div className="stranger-placeholder">
                  <div className="stranger-profile-dp">
                    <img src={strangerAvatar} alt="Stranger" />
                  </div>
                </div>
              )}

              {/* Initial Idle State */}
              {currentState === 'START_NODE' && (
                <div className="normal-frame">
                  <div className="connect-icon-large">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                  </div>
                  <h2>Start Connecting</h2>
                  <p>Click 'Next Partner' to find someone new.</p>
                </div>
              )}

              {/* Searching State Overlay */}
              <div className={`matching-overlay ${currentState === 'SEARCHING_NODE' ? 'active' : ''}`}>
                <div className="loader-pulse"></div>
                <h2>Searching for a partner...</h2>
              </div>

              {currentState === 'CONNECTED_NODE' && (
                <div className="remote-info-overlay">
                  <span className="status-badge">In Call: Stranger</span>
                </div>
              )}
            </div>

            {/* Local Video Frame */}
            <div className="local-video-frame" style={{ display: localStream ? 'block' : 'none' }}>
              <video ref={localVideoRef} autoPlay playsInline muted></video>
              <div className="local-tag">You</div>
            </div>

            {currentState === 'CONNECTED_NODE' && (
              <div className="call-controls">
                <button className="control-btn skip glow-effect" onClick={handleNext} title="Next Stranger">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4l10 8-10 8V4zM19 5v14"></path></svg>
                </button>
                <button className="control-btn end-call" onClick={endCall} title="End Call">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="2" x2="1" y2="22"></line></svg>
                </button>
              </div>
            )}
          </div>

          <div className="stream-info glass">
            <div className="streamer-profile">
              <div className="streamer-avatar">
                <img src={userProfileDP} alt={userName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <div className="stream-details">
                <h2>{currentState === 'CONNECTED_NODE' ? 'Active Chat' : 'Ready to Connect'}</h2>
                <p>{userName}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="chat-sidebar glass">
          <div className="chat-header">
            <h3>Live Chat</h3>
          </div>
          <div ref={chatMessagesRef} className="chat-messages-scroll">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.isSelf ? 'self' : ''}`}>
                <div>
                  <span className="chat-sender">{msg.sender}:</span>
                  <span className="chat-text"> {msg.text}</span>
                </div>
              </div>
            ))}
          </div>

          <form className="chat-form-fixed" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Send a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn-send">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;
