import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import CallPage from './pages/CallPage';

function App() {
  return (
    <BrowserRouter>
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
      <Navbar />
      <main className="container pt-20 pb-12">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/call" element={<CallPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
