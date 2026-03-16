import { useState } from 'react'

const C = {
  orange: "#fe5000", // IHS Tiger Orange
  black: "#1a1a1a",  // Deep Charcoal
  grayLight: "#f4f4f4",
  text: "#222222",
  muted: "#666666",
  white: "#fff",
}

const font = `'Source Serif 4', Georgia, serif`
const sans = `'DM Sans', 'Segoe UI', sans-serif`

export default function LandingPage() {
  return (
    <div style={{ fontFamily: sans, color: C.text, background: C.white, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.black, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: C.orange, fontSize: 26 }}>⊞</span> ChairVoyant
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="#/app" style={{ padding: "10px 24px", borderRadius: 6, background: C.orange, color: C.white, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
            Open Tool →
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 32px 60px", textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>🐅</div>
        <h1 style={{ fontFamily: font, fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, lineHeight: 1.2, color: C.black, marginBottom: 20 }}>
          Build a Behavior-Informed and Needs-Based Seating Chart.
        </h1>
        <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: C.muted, maxWidth: 640, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Designed for **Ipswich High School**. Drag-and-drop desk layouts, IEP tracking, and smart auto-assign that keeps the peace in your classroom.
        </p>
        <a href="#/app" style={{
          display: "inline-block", padding: "14px 36px", borderRadius: 8, background: C.black, color: C.white,
          textDecoration: "none", fontWeight: 700, fontSize: 17, boxShadow: "0 4px 20px rgba(0,0,0,.15)",
          transition: "transform .15s", cursor: "pointer",
        }}>
          Start Arranging →
        </a>
      </section>

      {/* Feature grid */}
      <section style={{ background: C.grayLight, padding: "80px 32px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {[
            ["🪑", "Tiger-Tough Layouts", "Place single desks, pairs, or groups. Save layouts as reusable templates for every period."],
            ["🧠", "Smart Auto-Assign", "One click seats the class. Accommodations go front and center. Conflicts stay separated."],
            ["📋", "IEP & 504 Tracking", "Mark preferential seating and separate settings. Everything carries over to your printouts."],
          ].map(([icon, title, desc], i) => (
            <div key={i} style={{ background: C.white, borderRadius: 12, padding: "24px 20px", border: `1px solid #ddd` }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
              <h3 style={{ fontFamily: font, fontSize: 17, fontWeight: 700, marginBottom: 8, color: C.orange }}>{title}</h3>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.55 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 32px", textAlign: "center", fontSize: 13, color: C.muted }}>
        <div style={{ fontFamily: font, fontWeight: 700, color: C.black, marginBottom: 6 }}>⊞ ChairVoyant</div>
        Go Tigers. 🐅
      </footer>
    </div>
  )
}