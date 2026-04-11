"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ============================================================
//  FEATURE DETECTION – Screen Share Support
// ============================================================
const checkScreenShareSupport = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  if (isMobile) return { supported: false, reason: "mobile" };
  if (!navigator.mediaDevices?.getDisplayMedia)
    return { supported: false, reason: "api" };
  return { supported: true, reason: null };
};

// ============================================================
//  ICON COMPONENTS (In‑line SVGs)
// ============================================================
const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const StopIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="3" />
  </svg>
);

const ClearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ErrorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3L14 7L18 8L15 12L16 16L12 14L8 16L9 12L6 8L10 7L12 3Z" />
  </svg>
);

const SuccessIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12L11 15L16 9" />
  </svg>
);

// ============================================================
//  MAIN COMPONENT
// ============================================================
export default function Home() {
  const [goal, setGoal] = useState("");
  const [instruction, setInstruction] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const stopCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setStatus("Stopped");
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
    setStatus("Analyzing frame...");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image, goal }),
      });

      const data = await res.json();
      if (res.ok) {
        setInstruction(data.instruction || "Proceed to the next logical step.");
        setStatus("Analysis complete");
        setError("");
      } else {
        setStatus(`Error: ${data.error || "API error"}`);
        setError(data.error || "Failed to get instruction.");
      }
    } catch (err) {
      console.error(err);
      setStatus("Network error");
      setError("Connection issue. Check your internet.");
    }
  }, [goal]);

  const startCapture = async () => {
    if (!goal.trim()) {
      setError("Please describe your goal first.");
      return;
    }

    const supportCheck = checkScreenShareSupport();
    if (!supportCheck.supported) {
      if (supportCheck.reason === "mobile") {
        setError(
          "📱 Screen sharing is not supported on mobile devices. Please open Beacon on a desktop browser."
        );
      } else {
        setError(
          "❌ Your browser does not support screen sharing. Please use Chrome, Edge, or Firefox on desktop."
        );
      }
      setStatus("Ready");
      return;
    }

    setError("");
    setInstruction("");
    setStatus("Requesting screen access...");

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
        },
        audio: false,
      });

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Detect when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
        setStatus("Screen share ended");
      };

      setIsCapturing(true);
      setStatus("Capturing every 3s");

      intervalRef.current = setInterval(() => {
        captureAndAnalyze();
      }, 3000);

      // Immediate first capture
      captureAndAnalyze();
    } catch (err) {
      console.error(err);
      if (err.name === "NotAllowedError") {
        setError("🚫 Screen sharing permission was denied.");
      } else if (err.name === "AbortError") {
        setError("🛑 Request cancelled. Please try again.");
      } else {
        setError(`❌ Screen sharing failed. Ensure you're using a desktop browser.`);
      }
      setStatus("Ready");
    }
  };

  return (
    <>
      {/* ===== GLOBAL STYLES ===== */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          margin: 0;
          min-height: 100vh;
          background: radial-gradient(circle at 30% 10%, #0b1120 0%, #030712 100%);
          background-attachment: fixed;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Smooth fade-in for body */
        body {
          animation: bodyFadeIn 0.5s ease-out;
        }

        @keyframes bodyFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @media (min-width: 640px) {
          body {
            padding: 30px;
          }
        }
      `}</style>

      {/* ===== COMPONENT STYLES ===== */}
      <style jsx>{`
        .container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          animation: floatUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .glass-panel {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border: 1px solid rgba(56, 189, 248, 0.18);
          border-radius: 48px;
          padding: 36px 28px;
          box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.8),
                      0 0 0 1px rgba(56, 189, 248, 0.1) inset,
                      0 0 40px rgba(56, 189, 248, 0.05);
          transition: box-shadow 0.4s ease, border-color 0.3s ease;
        }

        .glass-panel:hover {
          box-shadow: 0 50px 90px -25px #020617,
                      0 0 0 1.5px rgba(56, 189, 248, 0.25) inset,
                      0 0 50px rgba(56, 189, 248, 0.1);
          border-color: rgba(56, 189, 248, 0.3);
        }

        /* Header */
        .header {
          margin-bottom: 36px;
          position: relative;
        }

        .logo-wrapper {
          position: relative;
          display: inline-block;
        }

        .logo {
          font-size: 3rem;
          font-weight: 700;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #38bdf8 0%, #a78bfa 45%, #f472b6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 8px;
          filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.4));
          transition: transform 0.2s ease;
        }

        .logo:hover {
          transform: scale(1.02);
        }

        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 140%;
          height: 140%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%);
          filter: blur(30px);
          z-index: -1;
          animation: pulseGlow 4s infinite alternate;
        }

        @keyframes pulseGlow {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .tagline {
          font-size: 1rem;
          color: #94a3b8;
          font-weight: 400;
          letter-spacing: 0.2px;
          margin-left: 4px;
        }

        /* Input */
        .input-section {
          margin-bottom: 28px;
        }

        .label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #a5b4fc;
          margin-bottom: 12px;
        }

        .input-wrapper {
          position: relative;
        }

        .goal-input {
          width: 100%;
          padding: 18px 52px 18px 22px;
          font-size: 1.05rem;
          background: rgba(2, 6, 23, 0.55);
          border: 1.5px solid rgba(71, 85, 105, 0.5);
          border-radius: 30px;
          color: #f1f5f9;
          outline: none;
          transition: all 0.25s ease;
          font-weight: 500;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 16px -6px rgba(0, 0, 0, 0.3);
        }

        .goal-input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.2), 0 8px 20px -6px #000;
          background: rgba(15, 23, 42, 0.7);
        }

        .goal-input:disabled {
          opacity: 0.7;
          background: rgba(15, 23, 42, 0.3);
        }

        .goal-input::placeholder {
          color: #64748b;
          font-weight: 400;
        }

        .clear-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .clear-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
        }

        /* Error Banner */
        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: 22px;
          padding: 16px 20px;
          margin-bottom: 28px;
          color: #fca5a5;
          font-size: 0.95rem;
          backdrop-filter: blur(10px);
          animation: shake 0.4s ease-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }

        /* Action Buttons */
        .action-area {
          margin-bottom: 32px;
        }

        .primary-btn, .secondary-btn {
          width: 100%;
          padding: 20px 28px;
          font-size: 1.2rem;
          font-weight: 600;
          border-radius: 60px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          transition: all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1);
          position: relative;
          overflow: hidden;
          letter-spacing: -0.01em;
        }

        .primary-btn {
          background: linear-gradient(145deg, #0f172a 0%, #020617 100%);
          border: 1px solid rgba(56, 189, 248, 0.5);
          color: #e2e8f0;
          box-shadow: 0 15px 30px -8px #00000080, 0 0 0 1px rgba(56,189,248,0.2) inset;
        }

        .primary-btn:hover {
          background: linear-gradient(145deg, #1e293b 0%, #0b1320 100%);
          border-color: #38bdf8;
          box-shadow: 0 20px 40px -12px #000, 0 0 0 2px #38bdf8 inset;
          color: white;
          transform: scale(1.01);
        }

        .primary-btn:active {
          transform: scale(0.99);
        }

        .secondary-btn {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.25);
          color: #cbd5e1;
          backdrop-filter: blur(8px);
        }

        .secondary-btn:hover {
          background: rgba(51, 65, 85, 0.9);
          border-color: rgba(248, 113, 113, 0.5);
          color: #fecaca;
        }

        .btn-glow {
          position: absolute;
          top: 0;
          left: -100%;
          width: 200%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(56,189,248,0.15), transparent);
          transition: left 0.6s;
        }

        .primary-btn:hover .btn-glow {
          left: 100%;
        }

        /* Status & Instruction */
        .info-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .status-row {
          display: flex;
          justify-content: flex-start;
        }

        .status-badge {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(8px);
          padding: 8px 20px;
          border-radius: 40px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #94a3b8;
          border: 1px solid rgba(100, 116, 139, 0.25);
          text-transform: capitalize;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-badge[data-status="error"] {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.45);
          color: #fca5a5;
        }

        .instruction-card {
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(56, 189, 248, 0.25);
          border-radius: 32px;
          padding: 24px 26px;
          box-shadow: 0 20px 40px -16px #000000b3;
          transition: transform 0.25s, border-color 0.25s;
          animation: cardPop 0.3s ease-out;
        }

        @keyframes cardPop {
          0% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }

        .instruction-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          color: #a5b4fc;
          font-weight: 700;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .instruction-text {
          font-size: 1.6rem;
          font-weight: 700;
          line-height: 1.3;
          color: #f8fafc;
          letter-spacing: -0.02em;
          word-break: break-word;
        }

        .footer-note {
          margin-top: 28px;
          text-align: center;
          font-size: 0.8rem;
          color: #475569;
          letter-spacing: 0.3px;
          font-weight: 500;
        }

        .hidden-video, .hidden-canvas {
          display: none;
        }
      `}</style>

      {/* ===== UI RENDER ===== */}
      <main className="container">
        <div className="glass-panel">
          {/* Header */}
          <div className="header">
            <div className="logo-wrapper">
              <div className="logo-glow" />
              <h1 className="logo">Beacon</h1>
            </div>
            <p className="tagline">AI Co‑Pilot for your screen</p>
          </div>

          {/* Goal Input */}
          <div className="input-section">
            <label htmlFor="goal" className="label">
              What do you want to accomplish?
            </label>
            <div className="input-wrapper">
              <input
                id="goal"
                type="text"
                placeholder="e.g., 'Export this design as PDF'"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={isCapturing}
                className="goal-input"
                autoComplete="off"
              />
              {goal && !isCapturing && (
                <button
                  className="clear-btn"
                  onClick={() => setGoal("")}
                  aria-label="Clear goal"
                >
                  <ClearIcon />
                </button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-banner">
              <ErrorIcon />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="action-area">
            {!isCapturing ? (
              <button onClick={startCapture} className="primary-btn">
                <span className="btn-glow" />
                <PlayIcon />
                Start Sharing & Guide Me
              </button>
            ) : (
              <button onClick={stopCapture} className="secondary-btn">
                <StopIcon />
                Stop Sharing
              </button>
            )}
          </div>

          {/* Status & Instruction */}
          <div className="info-section">
            <div className="status-row">
              <span
                className="status-badge"
                data-status={
                  status.toLowerCase().includes("error") ? "error" : "idle"
                }
              >
                {status.toLowerCase().includes("complete") && <SuccessIcon />}
                {status}
              </span>
            </div>

            {instruction && (
              <div className="instruction-card">
                <div className="instruction-header">
                  <SparklesIcon />
                  <span>Next Step</span>
                </div>
                <p className="instruction-text">{instruction}</p>
              </div>
            )}
          </div>

          <div className="footer-note">
            Press &quot;Stop Sharing&quot; when done
          </div>
        </div>

        {/* Hidden elements for screen capture */}
        <video ref={videoRef} className="hidden-video" playsInline muted />
        <canvas ref={canvasRef} className="hidden-canvas" />
      </main>
    </>
  );
}