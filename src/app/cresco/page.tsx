'use client'

import { useState } from 'react'

/**
 * Cresco Susu — coming soon.
 * A rotational savings scheme. "Cresco" is Latin for "I grow", so the page is
 * built around a seed becoming something: a single sprout mark, growth rings,
 * and language about patience rather than hype.
 */
export default function CrescoSusuPage() {
  const [phone, setPhone] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function notifyMe() {
    const p = phone.trim()
    if (p.replace(/\D/g, '').length < 9) return
    setBusy(true)
    // No backend yet — the interest is captured on WhatsApp so nothing is lost
    // before the product launches.
    const msg = encodeURIComponent(`Hello, I'd like to be notified when Cresco Susu launches. My number is ${p}.`)
    window.open(`https://wa.me/233558659948?text=${msg}`, '_blank')
    setBusy(false)
    setDone(true)
  }

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: '#07231a' }}>

      {/* ── Ambient background ── growth rings spreading from the seed ── */}
      <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(120% 80% at 50% -10%, rgba(16,185,129,.20), transparent 60%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(90% 60% at 85% 110%, rgba(212,175,55,.10), transparent 60%)',
        }} />
        {[300, 460, 640, 860].map((d, i) => (
          <div key={d} className="absolute rounded-full" style={{
            width: d, height: d, left: '50%', top: '38%',
            transform: 'translate(-50%,-50%)',
            border: `1px solid rgba(255,255,255,${0.055 - i * 0.011})`,
          }} />
        ))}
      </div>

      {/* ── Content ── */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-14 text-center">

        {/* Seed mark */}
        <div className="w-[74px] h-[74px] rounded-[26px] flex items-center justify-center mb-8"
          style={{
            background: 'linear-gradient(155deg, #10b981, #059669)',
            boxShadow: '0 18px 44px -14px rgba(16,185,129,.55)',
          }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white"
            strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21V11" />
            <path d="M12 11c0-3.5 2.6-6.4 6-6.8-.2 3.6-2.7 6.4-6 6.8Z" />
            <path d="M12 14c-3.1-.3-5.5-2.9-5.7-6.2 3.2.4 5.6 3 5.7 6.2Z" />
          </svg>
        </div>

        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] mb-5"
          style={{ color: 'rgba(212,175,55,.9)' }}>
          Coming soon
        </span>

        <h1 className="text-[38px] sm:text-[54px] font-black leading-[1.02] tracking-[-0.035em] text-white">
          Cresco<span style={{ color: '#34d399' }}> Susu</span>
        </h1>

        <p className="mt-5 text-[17px] sm:text-[19px] font-medium text-white/80">
          Save today, secure tomorrow.
        </p>

        <p className="mt-2.5 text-[14px] sm:text-[15px] italic" style={{ color: 'rgba(212,175,55,.85)' }}>
          Where every seed grows.
        </p>

        <p className="mt-8 max-w-[380px] text-[14.5px] leading-relaxed text-white/55">
          A rotational savings plan built for people who are serious about
          putting something aside. We are getting it ready — stay tuned.
        </p>

        {/* Notify */}
        <div className="mt-10 w-full max-w-[360px]">
          {done ? (
            <div className="rounded-2xl px-5 py-4 text-center"
              style={{ background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.28)' }}>
              <p className="text-[14px] font-semibold text-white">You're on the list</p>
              <p className="text-[13px] text-white/60 mt-1">We'll message you the day we open.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="Your phone number"
                  className="flex-1 h-[52px] px-4 rounded-xl text-[16px] text-white placeholder:text-white/35 outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.14)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(52,211,153,.6)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.14)')}
                />
                <button
                  onClick={notifyMe}
                  disabled={busy}
                  className="press h-[52px] px-5 rounded-xl text-[14px] font-bold text-[#04160f] whitespace-nowrap flex-shrink-0 disabled:opacity-60"
                  style={{ background: '#34d399' }}>
                  Notify me
                </button>
              </div>
              <p className="mt-3 text-[12px] text-white/35">
                We'll only message you about the launch.
              </p>
            </>
          )}
        </div>

        {/* What it is, briefly — enough to be credible, not a full pitch */}
        <div className="mt-14 grid grid-cols-3 gap-3 w-full max-w-[420px]">
          {[
            { t: 'Rotational', d: 'Everyone takes a turn' },
            { t: 'Tracked', d: 'Every cedi recorded' },
            { t: 'Trusted', d: 'By ChaleData' },
          ].map(x => (
            <div key={x.t} className="rounded-2xl px-3 py-4"
              style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
              <div className="text-[12.5px] font-bold text-white">{x.t}</div>
              <div className="text-[11px] text-white/45 mt-1 leading-snug">{x.d}</div>
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative pb-8 px-6 text-center">
        <a href="https://wa.me/233558659948" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-white/55 hover:text-white transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.001 2C6.478 2 2 6.478 2 12c0 1.846.502 3.574 1.37 5.063L2 22l5.09-1.33A9.956 9.956 0 0012.001 22C17.523 22 22 17.522 22 12S17.523 2 12.001 2z" />
          </svg>
          Questions? Talk to us
        </a>
        <p className="mt-5 text-[11.5px] text-white/25">
          Cresco Susu &middot; a ChaleData company
        </p>
        <a href="/" className="inline-block mt-3 text-[11.5px] text-white/35 hover:text-white/70 transition-colors">
          &larr; Back to ChaleData
        </a>
      </footer>
    </div>
  )
}
