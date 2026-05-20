import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import logoImg from './assets/logo.jpeg';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://large-rings-itch.loca.lt';
const socket = io(BACKEND_URL);

const App = () => {
  const [screen, setScreen] = useState('auth'); // auth, profile-setup, stream, profile-edit
  const [user, setUser] = useState(null);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [authMode, setAuthMode] = useState('login');

  // Profile state
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('rather-not-say');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Edit Profile state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  
  // Stream state
  const [currentState, setCurrentState] = useState('START_NODE'); // START_NODE, SEARCHING_NODE, CONNECTED_NODE
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [genderFilter, setGenderFilter] = useState('both');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoStopped, setIsVideoStopped] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  const [messages, setMessages] = useState([{ text: "Welcome to Tumangle! Start chatting with the world.", sender: 'User', isSelf: false }]);
  const [chatInput, setChatInput] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const peerConnection = useRef(null);
  const fileInputRef = useRef(null);

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  };

  // Assign local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, screen]);

  // Assign remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("Setting remote srcObject", remoteStream);
      remoteVideoRef.current.srcObject = remoteStream;
      
      // Ensure it plays
      remoteVideoRef.current.play().catch(e => console.error("Remote video play error:", e));
    }
  }, [remoteStream, currentState]);

  // 1. Initialize Camera
  useEffect(() => {
    if (screen === 'stream') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          setLocalStream(stream);
          console.log("Local stream initialized");
        })
        .catch(err => {
          console.error("Camera access denied", err);
          alert("Camera/Microphone access is required for video chat.");
        });
    }

    // Socket Listeners
    socket.on('partner-found', async (data) => {
      console.log('Partner found:', data);
      setCurrentState('CONNECTED_NODE');
      addMessage("Connected to a new partner!", "User");
    });

    socket.on('signal-partner', async (data) => {
      console.log('Received signal:', data.type);
      if (data.type === 'offer') {
        await handleOffer(data.offer);
      } else if (data.type === 'answer') {
        await handleAnswer(data.answer);
      } else if (data.type === 'candidate') {
        await handleCandidate(data.candidate);
      }
    });

    socket.on('partner-disconnected', () => {
      console.log('Partner disconnected');
      closePeerConnection();
      setRemoteStream(null);
      setCurrentState('SEARCHING_NODE');
      addMessage("Partner disconnected.", "User");
      handleNext();
    });

    socket.on('update-online-count', (data) => {
      setOnlineCount(data.count);
    });

    return () => {
      socket.off('partner-found');
      socket.off('signal-partner');
      socket.off('partner-disconnected');
      socket.off('update-online-count');
      socket.off('receive-chat-message');
    };
  }, [screen]);

  // Handle incoming chat messages
  useEffect(() => {
    socket.on('receive-chat-message', (data) => {
      if (data.sender !== user?.name) {
        addMessage(data.text, data.sender, false);
      }
    });
    return () => socket.off('receive-chat-message');
  }, [user]);

  // WebRTC Functions
  const createPeerConnection = () => {
    if (peerConnection.current) {
        console.log("Returning existing peer connection");
        return peerConnection.current;
    }

    console.log("Creating new RTCPeerConnection");
    const pc = new RTCPeerConnection(iceServers);
    
    if (localStream) {
      console.log("Adding local tracks to PC");
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        socket.emit('signal-partner', { type: 'candidate', candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    pc.oniceconnectionstatechange = () => {
        console.log("ICE Connection State:", pc.iceConnectionState);
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
            setRemoteStream(null);
        }
    };

    peerConnection.current = pc;
    return pc;
  };

  const handleOffer = async (offer) => {
    console.log("Handling offer");
    const pc = createPeerConnection();
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal-partner', { type: 'answer', answer });
    } catch (e) {
        console.error("Error handling offer:", e);
    }
  };

  const handleAnswer = async (answer) => {
    console.log("Handling answer");
    if (peerConnection.current) {
      try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {
          console.error("Error handling answer:", e);
      }
    }
  };

  const handleCandidate = async (candidate) => {
    console.log("Handling candidate");
    if (peerConnection.current) {
      try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
          console.error("Error handling candidate:", e);
      }
    }
  };

  const initiateCall = async () => {
    console.log("Initiating call (creating offer)");
    const pc = createPeerConnection();
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal-partner', { type: 'offer', offer });
    } catch (e) {
        console.error("Error initiating call:", e);
    }
  };

  const closePeerConnection = () => {
    console.log("Closing peer connection");
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  };

  // 1. Auth Submission
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    
    const endpoint = authMode === 'signup' ? '/signup' : '/login';
    const payload = authMode === 'signup' 
      ? { email, name: signupName, password } 
      : { email, password };

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': import.meta.env.VITE_API_KEY
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setBio(data.user.bio || '');
        setGender(data.user.gender || 'male');
        setAvatarUrl(data.user.avatar_url || '');
        
        if (!data.user.gender) {
          setScreen('profile-setup');
        } else {
          setScreen('stream');
        }
      } else {
        alert(data.error || "Authentication failed");
      }
    } catch (err) {
      console.error("Auth error:", err);
      alert("Could not connect to server");
    }
  };

  // 2. Profile Submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      id: user.id,
      bio,
      gender,
      avatar_url: avatarUrl || `https://i.pravatar.cc/300?u=${user.id}`
    };

    if (screen === 'profile-edit') {
      if (editName) payload.name = editName;
      if (editEmail) payload.email = editEmail;
      if (editPassword) payload.password = editPassword;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/update-profile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': import.meta.env.VITE_API_KEY
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setScreen('stream');
        setEditPassword(''); // Clear password after update
      } else {
        alert(data.error || "Profile update failed");
      }
    } catch (err) {
      console.error("Profile error:", err);
      alert("Could not update profile");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch(`${BACKEND_URL}/upload-avatar`, {
        method: 'POST',
        headers: { 
          'X-API-Key': import.meta.env.VITE_API_KEY
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setAvatarUrl(data.url);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Could not upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditProfile = () => {
    setBio(user.bio || '');
    setGender(user.gender || 'male');
    setAvatarUrl(user.avatar_url || '');
    setEditName(user.name);
    setEditEmail(user.email);
    setScreen('profile-edit');
  };

  const handleLogout = () => {
    setUser(null);
    setScreen('auth');
    setEmail('');
    setPassword('');
    setSignupName('');
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    closePeerConnection();
  };

  const handleNext = () => {
    console.log("Searching for next partner...");
    closePeerConnection();
    setRemoteStream(null);
    setCurrentState('SEARCHING_NODE');
    
    socket.once('partner-found', () => {
      console.log("Partner-found event received, starting call...");
      initiateCall();
    });

    socket.emit('find-random-partner', { gender: genderFilter });
    addMessage("Searching for a new partner...", "User");
  };

  const endCall = () => {
    socket.emit('leave-chat');
    closePeerConnection();
    setRemoteStream(null);
    setCurrentState('START_NODE');
    addMessage("Call ended.", "User");
  };

  const handleCancelSearch = () => {
    socket.emit('leave-chat');
    setCurrentState('START_NODE');
    addMessage("Search cancelled.", "User");
  };

  const addMessage = (text, sender, isSelf = false) => {
    setMessages(prev => [...prev, { text, sender, isSelf }]);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      const msgSender = user?.name || 'Guest';
      addMessage(chatInput, msgSender, true);
      socket.emit('send-chat-message', { text: chatInput, sender: msgSender });
      setChatInput('');
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsAudioMuted(!localStream.getAudioTracks()[0].enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoStopped(!localStream.getVideoTracks()[0].enabled);
    }
  };

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Render Logic
  if (screen === 'auth') {
    return (
      <div id="auth-screen" className="screen active">
        <div className="auth-container glass">
          <div className="brand">
            <img src={logoImg} alt="Tumangle Logo" className="logo-img-large" />
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

  if (screen === 'profile-setup' || screen === 'profile-edit') {
    return (
      <div id="profile-setup-screen" className="screen active">
        <div className="profile-setup-container glass" style={{ maxWidth: '600px', overflowY: 'auto', maxHeight: '90vh' }}>
          <h2>{screen === 'profile-setup' ? 'Create Your Profile' : 'Edit Your Profile'}</h2>
          
          <div className="avatar-upload-section" style={{ position: 'relative', width: 'fit-content', margin: '0 auto 1.5rem' }}>
            <div 
              className="avatar-preview-large" 
              onClick={() => fileInputRef.current.click()}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <img src={avatarUrl || user?.avatar_url || `https://i.pravatar.cc/300?u=${user?.id}`} alt="Preview" />
              <div className="avatar-overlay" style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
                alignItems: 'center', opacity: 0, transition: 'opacity 0.3s'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
            </div>
            {isUploading && <div className="loader-mini" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*"
              onChange={handleAvatarUpload}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Click to upload photo</p>
          </div>

          <form className="setup-form" onSubmit={handleProfileSubmit}>
            {screen === 'profile-edit' && (
              <>
                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Email Address</label>
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>New Password (leave blank to keep current)</label>
                  <input type="password" placeholder="Min 8 characters" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                </div>
              </>
            )}
            
            <div>
              <label>Tell us about yourself</label>
              <textarea 
                placeholder="Write a short bio..." 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label>Gender Identity</label>
              <div className="gender-options">
                <button type="button" className={`gender-btn ${gender === 'male' ? 'active' : ''}`} onClick={() => setGender('male')}>Male</button>
                <button type="button" className={`gender-btn ${gender === 'female' ? 'active' : ''}`} onClick={() => setGender('female')}>Female</button>
                <button type="button" className={`gender-btn ${gender === 'other' ? 'active' : ''}`} onClick={() => setGender('other')}>Other</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary glow-effect">Save Changes</button>
              {screen === 'profile-edit' && (
                <button type="button" className="btn-secondary" style={{ padding: '16px', borderRadius: '12px' }} onClick={() => setScreen('stream')}>Cancel</button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div id="stream-screen" className="screen active">
      <header className="top-nav glass">
        <div className="logo">
          <img src={logoImg} alt="Tumangle Logo" className="logo-img-small" />
          <div className="online-indicator">
            <span className="pulse-dot"></span>
            <span className="count-text">{onlineCount} Online</span>
          </div>
        </div>
        <div className="nav-links">
          <div className="filter-group">
            <label>Find:</label>
            <select className="gender-select" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
              <option value="both">Both</option>
              <option value="female">Girls</option>
              <option value="male">Boys</option>
            </select>
          </div>
          <button className="btn-primary-small glow-effect" onClick={handleNext}>
            {currentState === 'SEARCHING_NODE' ? 'Searching...' : 'Next Partner'}
          </button>
          <div className="user-actions" style={{ marginLeft: '10px', display: 'flex', gap: '10px' }}>
             <button className="btn-secondary-small" onClick={handleEditProfile} title="Edit Profile">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
             </button>
             <button className="btn-secondary-small" onClick={handleLogout} title="Logout" style={{ color: '#ff3b30' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
             </button>
          </div>
        </div>
      </header>

      <div className="stream-layout">
        <div className="main-content">
          <div className="video-call-container glass">
            <div className="remote-video-wrapper" style={{ background: '#000', position: 'relative' }}>
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                style={{ 
                    display: remoteStream ? 'block' : 'none', 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                }}
              ></video>
              
              {currentState === 'CONNECTED_NODE' && !remoteStream && (
                <div className="stranger-placeholder">
                  <div className="loader-pulse"></div>
                  <p>Connecting video...</p>
                </div>
              )}

              {currentState === 'START_NODE' && (
                <div className="normal-frame">
                  <div className="connect-icon-large">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                  </div>
                  <h2>Start Connecting</h2>
                  <p>Click 'Next Partner' to find someone new.</p>
                </div>
              )}

              <div className={`matching-overlay ${currentState === 'SEARCHING_NODE' ? 'active' : ''}`}>
                <div className="loader-pulse"></div>
                <h2>Searching for a partner...</h2>
                <button className="btn-secondary" style={{ marginTop: '20px' }} onClick={handleCancelSearch}>Cancel Search</button>
              </div>
            </div>

            <div className="local-video-frame" style={{ display: localStream ? 'block' : 'none' }}>
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ opacity: isVideoStopped ? 0.3 : 1 }}
              ></video>
              <div className="local-tag">You {isAudioMuted && '(Muted)'}</div>
              <div className="local-media-controls">
                <button className={`media-btn ${isAudioMuted ? 'disabled' : ''}`} onClick={toggleAudio}>
                  {isAudioMuted ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>}
                </button>
                <button className={`media-btn ${isVideoStopped ? 'disabled' : ''}`} onClick={toggleVideo}>
                  {isVideoStopped ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 17.16V7l-5.73 4.08-1.57-1.12L21 4.54v2.3L15.34 11M3 3.32L9.46 8H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 1.24-.44L20 22.42"></path></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>}
                </button>
              </div>
            </div>

            {currentState === 'CONNECTED_NODE' && (
              <div className="call-controls">
                <button className="control-btn skip glow-effect" onClick={handleNext}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4l10 8-10 8V4zM19 5v14"></path></svg></button>
                <button className="control-btn end-call" onClick={endCall}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="2" x2="1" y2="22"></line></svg></button>
              </div>
            )}
          </div>

          <div className="stream-info glass">
            <div className="streamer-profile">
              <div className="streamer-avatar">
                <img src={user?.avatar_url || `https://i.pravatar.cc/300?u=${user?.id}`} alt={user?.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <div className="stream-details">
                <h2>{currentState === 'CONNECTED_NODE' ? 'Active Chat' : 'Ready to Connect'}</h2>
                <p>{user?.name || 'Guest'}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user?.email}</p>
                {user?.bio && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '400', marginTop: '5px' }}>{user.bio}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="chat-sidebar glass">
          <div className="chat-header"><h3>Live Chat</h3></div>
          <div ref={chatMessagesRef} className="chat-messages-scroll">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.isSelf ? 'self' : ''}`}>
                <div><span className="chat-sender">{msg.sender}:</span><span className="chat-text"> {msg.text}</span></div>
              </div>
            ))}
          </div>
          <form className="chat-form-fixed" onSubmit={handleSendMessage}>
            <input type="text" placeholder="Send a message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} autoComplete="off" />
            <button type="submit" className="btn-send"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg></button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;
