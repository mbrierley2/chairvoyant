import { useState } from 'react'

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
  return (
    <div style={{ fontFamily: sans, color: C.text, background: C.white, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <div style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.black, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: C.orange, fontSize: 26 }}>⊞</span> ChairVoyant
        </div>
        <a href="#/app" style={{ padding: "10px 24px", borderRadius: 6, background: C.orange, color: C.white, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
          Open Tool →
        </a>
      </nav>

      {/* Hero - The Only Section Now */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", maxWidth: 800, margin: "0 auto", padding: "60px 32px", textAlign: "center" }}>
        
        {/* MASCOT PLACEHOLDER - We will replace this soon! */}
        <div style={{ fontSize: 100, marginBottom: 30, color: C.orange, border: `2px dashed ${C.orange}`, padding: 20, borderRadius: "50%" }}>
          🐅
        </div>

        <h1 style={{ fontFamily: font, fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 800, lineHeight: 1.1, color: C.black, marginBottom: 24, letterSpacing: "-0.5px" }}>
          Build a Behavior-Informed and Needs-Based Seating Chart.
        </h1>
        
        <p style={{ fontSize: "clamp(16px, 2.5vw, 22px)", color: C.muted, maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.5, fontWeight: 400 }}>
          Drag-and-drop layouts. IEP tracking. Smart auto-assign. Custom-built for **Ipswich High School** teachers.
        </p>
        
        <a href="#/app" style={{
          display: "inline-block", padding: "18px 48px", borderRadius: 12, background: C.black, color: C.white,
          textDecoration: "none", fontWeight: 700, fontSize: 19, boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease", cursor: "pointer",
        }}
        onMouseOver={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 15px 40px rgba(0,0,0,0.3)"; }}
        onMouseOut={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 10px 30px rgba(0,0,0,0.2)"; }}
        >
          Start Arranging
        </a>
      </section>

      {/* Minimal Footer */}
      <footer style={{ padding: "30px 32px", textAlign: "center", fontSize: 13, color: C.muted, borderTop: "1px solid #eee" }}>
        Built with 🧡 for IHS Tigers.
      </footer>
    </div>
  )
}