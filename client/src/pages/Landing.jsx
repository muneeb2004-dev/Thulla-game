import { Link } from "react-router-dom";
import DottedSurface from "../components/DottedSurface.jsx";

const FEATURES = [
  {
    suit: "♠",
    suitColor: "text-white",
    ringColor: "ring-white/20",
    bgColor: "bg-white/5",
    borderTop: "border-t-white/40",
    title: "Ace of Spades Leads",
    desc: "Cards are dealt evenly. Whoever holds the Ace of Spades opens the very first trick — no negotiation.",
  },
  {
    suit: "🚨",
    suitColor: "text-red-400",
    ringColor: "ring-red-900",
    bgColor: "bg-red-950/30",
    borderTop: "border-t-red-500",
    title: "Thulla — the Penalty",
    desc: "Can't follow the lead suit? Play any card and trigger a Thulla. The player with the highest lead-suit card picks up everything.",
  },
  {
    suit: "🛡️",
    suitColor: "text-emerald-400",
    ringColor: "ring-emerald-900",
    bgColor: "bg-emerald-950/30",
    borderTop: "border-t-emerald-500",
    title: "Play to Be Safe",
    desc: "Empty your hand and you're safe — removed from play. The last player still holding cards is the Thulla loser.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen text-white">
      <DottedSurface opacity={0.85} />

      {/* All content above the canvas */}
      <div className="relative z-10">

        {/* ── Top nav ─────────────────────────────────────────── */}
        <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">🃏</span>
            <span className="font-bold text-sm tracking-wide text-white">Card Blitz</span>
          </div>
          <Link
            to="/play"
            className="text-xs font-semibold px-4 py-2 rounded-lg
                       bg-white/8 hover:bg-white/15 border border-white/12
                       text-gray-300 hover:text-white transition"
          >
            Play Now
          </Link>
        </header>

        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-12">

          {/* Suit row */}
          <div className="flex items-center gap-6 mb-8 select-none">
            {[
              { s: "♥", c: "text-red-500" },
              { s: "♠", c: "text-white" },
              { s: "♦", c: "text-red-500" },
              { s: "♣", c: "text-white" },
            ].map(({ s, c }, i) => (
              <span key={i} className={`text-4xl md:text-5xl opacity-60 ${c}`}>{s}</span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tighter text-center mb-5 leading-none">
            <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              Card Blitz
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-gray-400 text-base sm:text-lg text-center max-w-sm sm:max-w-md mb-2 leading-relaxed">
            The classic <span className="text-white font-semibold">Thulla</span> trick-taking
            game — real-time, online, no signup needed.
          </p>
          <p className="text-gray-600 text-sm text-center mb-10 tracking-wide">
            2 – 4 players · Follow suit or face the consequences
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/play">
              <button className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500
                                 text-white font-bold text-base transition-all duration-200
                                 shadow-lg shadow-blue-950/60 hover:shadow-blue-800/40
                                 hover:-translate-y-0.5 active:translate-y-0">
                Play Now →
              </button>
            </Link>
            <a href="#how-to-play">
              <button className="px-8 py-3.5 rounded-xl
                                 bg-white/6 hover:bg-white/12 border border-white/12
                                 text-gray-300 hover:text-white font-semibold text-base
                                 transition-all duration-200">
                How to Play
              </button>
            </a>
          </div>

          {/* Scroll hint */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-30">
            <span className="text-xs text-gray-500 tracking-widest uppercase">Scroll</span>
            <div className="w-px h-8 bg-gradient-to-b from-gray-500 to-transparent" />
          </div>
        </section>

        {/* ── How to play ─────────────────────────────────────── */}
        <section id="how-to-play" className="max-w-5xl mx-auto px-4 pb-24 pt-12">

          <div className="text-center mb-12">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase
                             text-blue-400 mb-3">
              Game Rules
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Simple to learn. Hard to survive.
            </h2>
            <p className="text-gray-600 mt-2 text-sm max-w-xs mx-auto">
              Three rules drive every round of Card Blitz.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map(({ suit, suitColor, ringColor, bgColor, borderTop, title, desc }) => (
              <div key={title}
                   className={`relative rounded-2xl border border-white/8 p-6
                               bg-[#0f0f0f]/80 backdrop-blur-sm
                               border-t-2 ${borderTop}
                               hover:border-white/15 transition-all duration-300
                               hover:-translate-y-1`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                                 ring-1 ${ringColor} ${bgColor} mb-5`}>
                  <span className={`text-xl ${suitColor}`}>{suit}</span>
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Quick setup */}
          <div className="mt-10 rounded-2xl border border-white/8 bg-[#0f0f0f]/70
                          backdrop-blur-sm p-6 flex flex-col sm:flex-row
                          items-center justify-between gap-5">
            <div>
              <p className="font-semibold text-white mb-1">Ready to deal?</p>
              <p className="text-gray-600 text-sm">
                Create a room, share the 6-letter code, and start in seconds.
              </p>
            </div>
            <Link to="/play" className="flex-shrink-0">
              <button className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
                                 text-white font-semibold text-sm transition-all
                                 hover:-translate-y-0.5 shadow-md shadow-blue-950/50">
                Create a Room
              </button>
            </Link>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="border-t border-white/5 py-8 text-center">
          <div className="flex items-center justify-center gap-3 text-gray-700 text-sm">
            <span className="text-red-800">♥</span>
            <span>Card Blitz · Thulla Online</span>
            <span className="text-gray-800">♠</span>
          </div>
        </footer>

      </div>{/* end z-10 */}
    </div>
  );
}
