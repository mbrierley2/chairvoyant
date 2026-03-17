import { useState } from 'react'
// This is the essential bridge to your database
import { supabase } from './supabaseClient'

const C = {
  orange: "#fe5000", // IHS Tiger Orange
  black: "#1a1a1a",  // Deep Charcoal/Black
  white: "#fff",
  text: "#222222",
  muted: "#666666",
}

const font = `'Source Serif 4', Georgia, serif`
const sans = `'DM Sans', 'Segoe UI', sans-serif`

export default function LandingPage() {
  
  // The "Brain" that handles the Google Login
  const handleGoogleLogin = async (e) => {
    e.preventDefault(); // Prevents the page from reloading weirdly
    console.log("Redirecting to Google...");
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Automatically detects if you are on localhost or Vercel
        redirectTo: window.location.origin 
      }
    });

    if (error) {
      alert("Login failed: " + error.message);
    }
  };

  return (
    <div style={{ fontFamily: sans, color: C.text, background: C.white, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <div style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.black, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: C.orange, fontSize: 26 }}>⊞</span> ChairVoyant
        </div>
        {/* Changed from <a> to <button> for the login action */}
        <button 
          onClick={handleGoogleLogin}
          style={{ padding: "10px 24px", borderRadius: 6, background: C.orange, color: C.white, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          Sign In →
        </button>
      </nav>

      {/* Hero */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", maxWidth: 800, margin: "0 auto", padding: "60px 32px", textAlign: "center" }}>
        
        <div style={{ fontSize: 100, marginBottom: 30, color: C.orange, border: `2px dashed ${C.orange}`, padding: 20, borderRadius: "50%" }}>
          🐅
        </div>

        <h1 style={{ fontFamily: font, fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 800, lineHeight: 1.1, color: C.black, marginBottom: 24, letterSpacing: "-0.5px" }}>
          Build a Behavior-Informed and Needs-Based Seating Chart.
        </h1>
        
        <p style={{ fontSize: "clamp(16px, 2.5vw, 22px)", color: C.muted, maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.5, fontWeight: 400 }}>
          Drag-and-drop layouts. IEP tracking. Smart auto-assign. Custom-built for **Ipswich High School** teachers.
        </p>
        
        {/* The Main "Start" Button now triggers Google Login */}
        <button 
          onClick={handleGoogleLogin}
          style={{
            display: "inline-block", padding: "18px 48px", borderRadius: 12, background: C.black, color: C.white,
            border: 'none', fontWeight: 700, fontSize: 19, boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease", cursor: "pointer",
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 15px 40px rgba(0,0,0,0.3)"; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.2)"; }}
        >
          Start Arranging
        </button>
      </section>

      <footer style={{ padding: "30px 32px", textAlign: "center", fontSize: 13, color: C.muted, borderTop: "1px solid #eee" }}>
        Built with 🧡 for IHS Tigers.
      </footer>
    </div>
  )
}