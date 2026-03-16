import { useState } from 'react'

const C = {
  green: "#2d4a35",
  greenLight: "#e2eedf",
  cream: "#f5f1ea",
  text: "#1e1e1e",
  muted: "#6b6560",
  white: "#fff",
}

const font = `'Source Serif 4', Georgia, serif`
const sans = `'DM Sans', 'Segoe UI', sans-serif`

export default function LandingPage() {
  return (
    <div style={{ fontFamily: sans, color: C.text, background: C.cream, minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.green, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 26 }}>⊞</span> ChairVoyant
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="#/app" style={{ padding: "10px 24px", borderRadius: 6, background: C.green, color: C.white, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
            Open Tool →
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 32px 60px", textAlign: "center" }}>
        <h1 style={{ fontFamily: font, fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, lineHeight: 1.2, color: C.green, marginBottom: 20 }}>
          Build a Behavior-Informed and Needs-Based Seating Chart.
        </h1>
        <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: C.muted, maxWidth: 640, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Drag-and-drop desk layouts. IEP & accommodation tracking. Smart auto-assign that separates talkers and keeps conflicts apart. Built by a teacher, for teachers.
        </p>
        <a href="#/app" style={{
          display: "inline-block", padding: "14px 36px", borderRadius: 8, background: C.green, color: C.white,
          textDecoration: "none", fontWeight: 700, fontSize: 17, boxShadow: "0 4px 20px rgba(45,74,53,.25)",
          transition: "transform .15s", cursor: "pointer",
        }}>
          Start Arranging →
        </a>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>No account required. Your data saves automatically in your browser.</p>
      </section>

      {/* Feature grid */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 32px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {[
            ["🪑", "Drag & Drop Layouts", "Place single desks, pairs, groups of 4, groups of 6, and rows. Rotate, lock, and zoom. Save layouts as reusable templates."],
            ["🧠", "Smart Auto-Assign", "One click seats your whole class. Accommodations go near the board. Friends get separated. Conflicts stay far apart."],
            ["📋", "IEP & 504 Tracking", "Mark accommodations per student — preferential seating, separate settings, custom notes. Everything shows up on the printed chart."],
            ["📝", "Test Day Mode", "Toggle test day to see who goes to the separate setting room. A printable list generates automatically."],
            ["👫", "Relationship Mapping", "Mark which students are friends who'll talk and which have conflicts. Visual lines show you the relationships."],
            ["🏫", "Multi-Room, Multi-Period", "One room layout, many class periods. Or many rooms for traveling teachers."],
            ["🖨️", "Print-Ready Export", "Clean, professional seating charts with student names, IEP indicators, and a full roster table. Ready to print."],
            ["🔒", "Lock & Drag Students", "Lock your layout, then drag students between seats. Swap two students by dropping one on another."],
            ["🚫", "Disable Seats", "Block off individual seats for broken chairs, or just to leave gaps. Disabled seats carry across all periods."],
          ].map(([icon, title, desc], i) => (
            <div key={i} style={{ background: C.white, borderRadius: 12, padding: "24px 20px", border: "1px solid #e0dcd4" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
              <h3 style={{ fontFamily: font, fontSize: 17, fontWeight: 700, marginBottom: 8, color: C.green }}>{title}</h3>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.55 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quote Section */}
      <section style={{ background: C.green, color: C.white, padding: "60px 32px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <p style={{ fontFamily: font, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 600, lineHeight: 1.5, fontStyle: "italic", marginBottom: 16 }}>
            "I used to spend the first week of school rearranging seats by hand. This does it in 30 seconds — and it actually knows which kids can't sit together."
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px", textAlign: "center", fontSize: 13, color: C.muted }}>
        <div style={{ fontFamily: font, fontWeight: 700, color: C.green, marginBottom: 6 }}>⊞ ChairVoyant</div>
        Built with love for teachers.
      </footer>
    </div>
  )
}