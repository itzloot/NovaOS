"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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

    const base64Image = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
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
      }
    } catch (err) {
      console.error(err);
      setStatus("Network error");
    }
  }, [goal]);

  const startCapture = async () => {
    if (!goal.trim()) {
      setError("Please describe your goal first.");
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

      // Listen for user stopping share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
        setStatus("Screen share ended");
      };

      setIsCapturing(true);
      setStatus("Capturing every 3s");

      intervalRef.current = setInterval(() => {
        captureAndAnalyze();
      }, 3000);

      captureAndAnalyze();
    } catch (err) {
      console.error(err);
      // Differentiate between user cancel and actual error
      if (err.name === "NotAllowedError" || err.name === "AbortError") {
        setError("Screen sharing was cancelled. Please try again.");
      } else {
        setError("Screen sharing failed. Ensure you're using a supported browser (Chrome/Edge).");
      }
      setStatus("Ready");
    }
  };

  return (
    <>
      {/* Global styles injected for premium dark theme */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          margin: 0;
          padding: 16px;
          min-height: 100vh;
          background: radial-gradient(circle at 20% 30%, #0f172a 0%, #020617 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        @media (min-width: 640px) {
          body {
            padding: 24px;
          }
        }
      `}</style>

      <main className="container">
        <div className="glass-panel">
          {/* Header with animated gradient */}
          <div className="header">
            <div className="logo-wrapper">
              <div className="logo-glow" />
              <h1 className="logo">Beacon</h1>
            </div>
            <p className="tagline">AI Co‑Pilot for Your Screen</p>
          </div>

          {/* Goal Input */}
          <div className="input-section">
            <label htmlFor="goal" className="label">
              What do you want to do?
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
              />
              {goal && !isCapturing && (
                <button
                  className="clear-btn"
                  onClick={() => setGoal("")}
                  aria-label="Clear"
                >
                  <ClearIcon />
                </button>
              )}
            </div>
          </div>

          {/* Error display */}
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
              <span className="status-badge" data-status={status.toLowerCase().includes("error") ? "error" : "idle"}>
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

          {/* Subtle footer */}
          <div className="footer-note">
            Press &quot;Stop Sharing&quot; when done
          </div>
        </div>

        {/* Hidden capture elements */}
        <video ref={videoRef} className="hidden-video" playsInline muted />
        <canvas ref={canvasRef} className="hidden-canvas" />
      </main>

      {/* Component styles */}
      <style jsx>{`
        .container {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
        }

        .glass-panel {
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(56, 189, 248, 0.15);
          border-radius: 40px;
          padding: 32px 24px;
          box-shadow: 0 30px 50px -20px rgba(0, 0, 0, 0.8),
                      0 0 0 1px rgba(56, 189, 248, 0.1) inset,
                      0 0 30px rgba(56, 189, 248, 0.05);
          transition: box-shadow 0.3s ease;
        }

        .glass-panel:hover {
          box-shadow: 0 35px 55px -25px rgba(0, 0, 0, 0.9),
                      0 0 0 1px rgba(56, 189, 248, 0.2) inset,
                      0 0 40px rgba(56, 189, 248, 0.1);
        }

        .header {
          margin-bottom: 32px;
          position: relative;
        }

        .logo-wrapper {
          position: relative;
          display: inline-block;
        }

        .logo {
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #38bdf8 0%, #a78bfa 50%, #f472b6 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 6px;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
        }

        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 120%;
          height: 120%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(56,189,248,0.2) 0%, transparent 70%);
          filter: blur(20px);
          z-index: -1;
        }

        .tagline {
          font-size: 0.95rem;
          color: #94a3b8;
          font-weight: 400;
          letter-spacing: 0.3px;
          margin-left: 2px;
        }

        .input-section {
          margin-bottom: 24px;
        }

        .label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #94a3b8;
          margin-bottom: 10px;
        }

        .input-wrapper {
          position: relative;
        }

        .goal-input {
          width: 100%;
          padding: 16px 48px 16px 20px;
          font-size: 1rem;
          background: rgba(2, 6, 23, 0.6);
          border: 1.5px solid rgba(71, 85, 105, 0.4);
          border-radius: 24px;
          color: #fff;
          outline: none;
          transition: all 0.2s ease;
          font-weight: 400;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .goal-input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15), 0 4px 12px rgba(0,0,0,0.3);
        }

        .goal-input:disabled {
          opacity: 0.7;
          background: rgba(15, 23, 42, 0.4);
        }

        .goal-input::placeholder {
          color: #64748b;
          font-weight: 400;
        }

        .clear-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.15s;
        }

        .clear-btn:hover {
          background: rgba(255,255,255,0.08);
          color: #cbd5e1;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 18px;
          padding: 12px 18px;
          margin-bottom: 24px;
          color: #fca5a5;
          font-size: 0.9rem;
          backdrop-filter: blur(8px);
        }

        .action-area {
          margin-bottom: 28px;
        }

        .primary-btn, .secondary-btn {
          width: 100%;
          padding: 18px 24px;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 60px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
          letter-spacing: -0.01em;
        }

        .primary-btn {
          background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(56, 189, 248, 0.4);
          color: #e2e8f0;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.2) inset;
        }

        .primary-btn:hover {
          background: linear-gradient(145deg, #1e293b 0%, #0b1320 100%);
          border-color: #38bdf8;
          box-shadow: 0 15px 30px -8px #020617, 0 0 0 1px #38bdf8 inset;
          color: white;
          transform: scale(1.01);
        }

        .secondary-btn {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #cbd5e1;
          backdrop-filter: blur(8px);
        }

        .secondary-btn:hover {
          background: rgba(51, 65, 85, 0.9);
          border-color: rgba(248, 113, 113, 0.4);
          color: #fca5a5;
        }

        .btn-glow {
          position: absolute;
          top: 0;
          left: -100%;
          width: 200%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(56,189,248,0.1), transparent);
          transition: left 0.5s;
        }

        .primary-btn:hover .btn-glow {
          left: 100%;
        }

        .info-section {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .status-row {
          display: flex;
          justify-content: flex-start;
        }

        .status-badge {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(4px);
          padding: 6px 16px;
          border-radius: 40px;
          font-size: 0.8rem;
          font-weight: 500;
          color: #94a3b8;
          border: 1px solid rgba(100, 116, 139, 0.2);
          text-transform: capitalize;
        }

        .status-badge[data-status="error"] {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #fca5a5;
        }

        .instruction-card {
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 28px;
          padding: 22px 24px;
          box-shadow: 0 15px 30px -12px rgba(0,0,0,0.4);
          transition: transform 0.2s;
        }

        .instruction-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          color: #a5b4fc;
          font-weight: 600;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .instruction-text {
          font-size: 1.4rem;
          font-weight: 600;
          line-height: 1.3;
          color: #f1f5f9;
          letter-spacing: -0.02em;
        }

        .footer-note {
          margin-top: 24px;
          text-align: center;
          font-size: 0.75rem;
          color: #475569;
          letter-spacing: 0.3px;
        }

        .hidden-video, .hidden-canvas {
          display: none;
        }

        /* Icon components inline as SVGs */
        :global(svg) {
          display: block;
        }
      `}</style>
    </>
  );
}

// Icon components (inlined for simplicity)
const PlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const StopIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

const ClearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ErrorIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3L14 7L18 8L15 12L16 16L12 14L8 16L9 12L6 8L10 7L12 3Z" />
  </svg>
);