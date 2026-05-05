document.addEventListener('DOMContentLoaded', () => {
  // Auth Logic
  const authScreen = document.getElementById('auth-screen');
  const streamScreen = document.getElementById('stream-screen');
  const tabs = document.querySelectorAll('.tab');
  const nameGroup = document.getElementById('name-group');
  const authForm = document.getElementById('auth-form');

  let currentMode = 'login';
  let userName = 'Guest';

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMode = tab.dataset.target;

      if (currentMode === 'signup') {
        nameGroup.style.display = 'block';
        nameGroup.querySelector('input').required = true;
      } else {
        nameGroup.style.display = 'none';
        nameGroup.querySelector('input').required = false;
      }
    });
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const nameInput = document.getElementById('name').value;

    // Set username for the video chat and streaming
    userName = nameInput || 'TumangleUser' + Math.floor(Math.random() * 100);

    // Transition directly to stream screen
    authScreen.classList.remove('active');
    setTimeout(() => {
      streamScreen.classList.add('active');
      watchRandomStream();
    }, 500);
  });

  // Streaming Logic
  const localVideo
  const loadingOverlay = document.getElementById('loading-overlay');
  const nextStreamBtn = document.getElementById('next-stream-btn');
  const goLiveBtn = document.getElementById('go-live-btn');
  const broadcasterWrapper = document.getElementById('broadcaster-video-wrapper');
  const remoteStatus = document.getElementById('remote-status');
  const skipBtn = document.getElementById('skip-btn');
  const endCallBtn = document.getElementById('end-call-btn');

  const streamTitle = document.getElementById('stream-title');
  const streamerName = document.getElementById('streamer-name');
  const viewerCount = document.getElementById('viewer-count');

  let isLive = false;
  let simulatedChatInterval;


  function watchRandomStream() {
    isLive = false;
    broadcasterWrapper.style.display = 'none';
    broadcasterWrapper.classList.remove('full-screen');
    streamVideo.classList.remove('active');
    streamVideo.pause();
    loadingOverlay.classList.add('active');

    // Hide Call Controls in watch mode
    skipBtn.parentElement.style.display = 'none';
    remoteStatus.parentElement.style.display = 'none';

    clearInterval(simulatedChatInterval);

    setTimeout(() => {
      const randomStream = mockStreams[Math.floor(Math.random() * mockStreams.length)];
      streamVideo.src = randomStream.url;
      streamTitle.innerText = randomStream.title;
      streamerName.innerText = randomStream.streamer;
      viewerCount.innerText = (Math.floor(Math.random() * 5000) + 100).toLocaleString();

      streamVideo.play().catch(e => console.log('Autoplay prevented', e));
      streamVideo.classList.add('active');
      loadingOverlay.classList.remove('active');

      startSimulatedChat();
    }, 1500);
  }
  const randomChatBtn = document.getElementById('random-chat-btn');
  const genderFilter = document.getElementById('gender-filter');

  randomChatBtn.addEventListener('click', async () => {
    isLive = false;

    clearInterval(simulatedChatInterval);
    streamVideo.pause();
    streamVideo.classList.remove('active');
    loadingOverlay.classList.add('active');

    streamTitle.innerText = "Connecting...";
    streamerName.innerText = "Finding " + genderFilter.value + "...";
    remoteStatus.innerText = "Searching...";
    remoteStatus.parentElement.style.display = 'block';
    skipBtn.parentElement.style.display = 'flex';
    viewerCount.innerText = "1";

    try {
      if (!localVideo.srcObject) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = stream;
      }
      broadcasterWrapper.classList.remove('full-screen');
      broadcasterWrapper.style.display = 'block';

      setTimeout(() => {
        const randomStream = mockStreams[Math.floor(Math.random() * mockStreams.length)];
        streamVideo.src = randomStream.url;
        streamVideo.play().catch(e => console.log('Autoplay prevented', e));
        streamVideo.classList.add('active');
        loadingOverlay.classList.remove('active');

        streamTitle.innerText = "Random Video Chat";
        streamerName.innerText = "Stranger (" + genderFilter.value + ")";
        remoteStatus.innerText = "Connected: Stranger (" + genderFilter.value + ")";

        addMessage(`Connected to a stranger (${genderFilter.value})! Say hi!`, "System");
      }, 2000);

    } catch (err) {
      alert("Camera access is required to use random video chat.");
      watchRandomStream();
    }
  });

  skipBtn.addEventListener('click', () => {
    randomChatBtn.click();
  });

  endCallBtn.addEventListener('click', () => {
    // Stop local video tracks
    const tracks = localVideo.srcObject?.getTracks();
    if (tracks) tracks.forEach(track => track.stop());
    localVideo.srcObject = null;

    // Reset state and watch a normal stream
    watchRandomStream();
    addMessage("Call ended.", "System");
  });

  nextStreamBtn.addEventListener('click', () => {
    if (isLive) {
      // If we are broadcasting, stop broadcasting before switching
      const tracks = localVideo.srcObject?.getTracks();
      if (tracks) tracks.forEach(track => track.stop());
    }
    watchRandomStream();
  });

  goLiveBtn.addEventListener('click', async () => {
    if (isLive) return; // Already live

    clearInterval(simulatedChatInterval);
    streamVideo.pause();
    streamVideo.classList.remove('active');
    loadingOverlay.classList.add('active');

    // Hide Call Controls in live mode
    skipBtn.parentElement.style.display = 'none';
    remoteStatus.parentElement.style.display = 'none';

    streamTitle.innerText = "My Awesome Stream";
    streamerName.innerText = userName;
    viewerCount.innerText = "0";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = stream;

      loadingOverlay.classList.remove('active');
      broadcasterWrapper.classList.add('full-screen');
      broadcasterWrapper.style.display = 'block';
      isLive = true;

      addMessage("You are now live!", "System");

      // Simulate viewers joining
      let viewers = 0;
      simulatedChatInterval = setInterval(() => {
        viewers += Math.floor(Math.random() * 5);
        viewerCount.innerText = viewers.toLocaleString();

        if (Math.random() > 0.6) {
          const hype = ["W stream", "hello!", "first time viewer", "nice quality", "let's go!"];
          addMessage(hype[Math.floor(Math.random() * hype.length)], "Viewer" + Math.floor(Math.random() * 1000));
        }
      }, 3000);

    } catch (err) {
      alert("Camera access denied! Cannot go live.");
      watchRandomStream();
    }
  });

  // Chat Logic
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (text) {
      addMessage(text, userName, true);
      chatInput.value = '';
    }
  });

  function addMessage(text, sender, isSelf = false) {
    const msgEl = document.createElement('div');
    msgEl.classList.add('chat-message');
    if (isSelf) msgEl.classList.add('self');

    const contentEl = document.createElement('div');

    const senderEl = document.createElement('span');
    senderEl.classList.add('chat-sender');
    senderEl.innerText = sender + ":";

    const textEl = document.createElement('span');
    textEl.classList.add('chat-text');
    textEl.innerText = " " + text;

    contentEl.appendChild(senderEl);
    contentEl.appendChild(textEl);
    msgEl.appendChild(contentEl);

    chatMessages.appendChild(msgEl);

    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function startSimulatedChat() {
    simulatedChatInterval = setInterval(() => {
      const messages = ["PogChamp", "lol", "nice!", "what is this?", "W stream", "hello chat!"];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      addMessage(msg, "User" + Math.floor(Math.random() * 9999));
    }, 4000);
  }
});
