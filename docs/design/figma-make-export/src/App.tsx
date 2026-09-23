import React, { useState, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Screen = 'login' | 'profiles' | 'home' | 'create' | 'prompt' | 'chapter' | 'storypath' | 'heroselect' | 'library' | 'audio'

interface Profile  { id: string; name: string; ageRange: string; color: string; avatar: string }
interface Decision { id: string; context: string; chosen: string; options: string[] }
interface Hero     { id: string; name: string; story: string; color: string; emoji: string; desc: string }

// ── Data ──────────────────────────────────────────────────────────────────────

const PROFILES: Profile[] = [
  { id: '1', name: 'Emma', ageRange: '4–6', color: '#F472B6', avatar: 'E' },
  { id: '2', name: 'Leo',  ageRange: '6–8', color: '#60A5FA', avatar: 'L' },
]

// Colorful edge-to-center gradients: saturated at border, bright inside
const CHAPTER_GRADIENTS = [
  'radial-gradient(ellipse 90% 80% at 50% 50%, #FFFBF0 0%, #FFFBF0 20%, #FDE68A 55%, #FBBF24 75%, #F97316 100%)',
  'radial-gradient(ellipse 90% 80% at 50% 50%, #F0F7FF 0%, #F0F7FF 20%, #BAE6FD 55%, #60A5FA 75%, #6366F1 100%)',
  'radial-gradient(ellipse 90% 80% at 50% 50%, #F0FFF8 0%, #F0FFF8 20%, #A7F3D0 55%, #34D399 75%, #0EA5E9 100%)',
]

const STORY = {
  title: 'The Fox Who Lost Her Shadow',
  paragraphs: [
    'Luna was a small fox with a big, bushy tail — the kind that sweeps fallen leaves into little spirals when she walks.',
    'Every morning, she\'d check that her shadow was still there, stretching long behind her in the golden light.',
    'But one quiet autumn morning, Luna woke to find her shadow was gone.',
    '"Shadows don\'t just leave," said the old Hedgehog, peering at the empty ground. "Yours must have gone looking for something."',
    'So Luna packed a tiny satchel — bread, a candle, and one very curious heart — and set off into the Forest of Echoes.',
  ],
}

// Decisions phrased as character actions, not chapter titles
const CHOICE_PROMPT = 'Luna stands at the forest\'s edge. What does she do?'
const BRANCH_OPTIONS = [
  'She follows the dark footprints leading toward the frozen lake.',
  'She stops to hear the raven\'s offer — a guide in exchange for a riddle.',
  'She pushes open the small door carved into the oldest oak in the forest.',
]

const HEROES: Hero[] = [
  { id: '1', name: 'Luna',  story: 'The Fox Who Lost Her Shadow',  color: '#F97316', emoji: '🦊', desc: 'A curious fox searching for what was lost' },
  { id: '2', name: 'Eli',   story: 'The Boy Who Spoke to Rain',    color: '#60A5FA', emoji: '🌧️', desc: 'A quiet boy who whispers to the clouds' },
  { id: '3', name: 'Mira',  story: 'A Lantern for Sleeping Stars', color: '#8B5CF6', emoji: '🌟', desc: 'The keeper of forgotten light' },
  { id: '4', name: 'Theo',  story: "The Clockmaker's Dream",       color: '#10B981', emoji: '⚙️', desc: 'An inventor who dreams impossible things' },
  { id: '5', name: 'Nola',  story: 'The Girl Made of Fog',         color: '#94A3B8', emoji: '🌫️', desc: 'She appears when the morning is still asleep' },
  { id: '6', name: 'Sam',   story: 'Where the Wild Clouds Sleep',  color: '#F59E0B', emoji: '☁️', desc: 'A wanderer who maps the sky' },
]

const LIBRARY_STORIES = [
  { id: '1', title: 'The Fox Who Lost Her Shadow',  chapters: 3, gradient: 'linear-gradient(135deg,#FBBF24,#EC4899)', hero: 'Luna' },
  { id: '2', title: 'The Boy Who Spoke to Rain',    chapters: 5, gradient: 'linear-gradient(135deg,#60A5FA,#6366F1)', hero: 'Eli'  },
  { id: '3', title: 'A Lantern for Sleeping Stars', chapters: 2, gradient: 'linear-gradient(135deg,#8B5CF6,#EC4899)', hero: 'Mira' },
  { id: '4', title: "The Clockmaker's Dream",       chapters: 7, gradient: 'linear-gradient(135deg,#10B981,#0EA5E9)', hero: 'Theo' },
  { id: '5', title: 'The Girl Made of Fog',         chapters: 1, gradient: 'linear-gradient(135deg,#94A3B8,#6366F1)', hero: 'Nola' },
  { id: '6', title: 'Where the Wild Clouds Sleep',  chapters: 4, gradient: 'linear-gradient(135deg,#F59E0B,#10B981)', hero: 'Sam'  },
]

// ── Fox illustration ──────────────────────────────────────────────────────────

function FoxIllustration({ detail = 1 }: { detail?: 1 | 2 | 3 }) {
  return (
    <svg viewBox="0 0 240 270" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <ellipse cx="120" cy="258" rx="68" ry="10" fill="rgba(0,0,0,0.06)" />
      <path d="M 80 205 C 40 195 18 170 22 145 C 26 120 55 118 70 138 C 82 154 95 172 108 185 Z" fill="#F97316" />
      <path d="M 22 145 C 26 120 55 118 60 130 C 38 134 35 152 40 165 C 45 175 58 180 65 178 Z" fill="#FEF3C7" />
      <ellipse cx="125" cy="198" rx="54" ry="46" fill="#F97316" />
      <ellipse cx="125" cy="195" rx="32" ry="30" fill="#FED7AA" opacity="0.85" />
      <ellipse cx="125" cy="150" rx="20" ry="18" fill="#F97316" />
      <circle cx="125" cy="112" r="46" fill="#F97316" />
      <polygon points="88,82 74,38 115,72" fill="#F97316" />
      <polygon points="91,78 80,50 110,70" fill="#FECACA" />
      <polygon points="154,72 168,36 138,82" fill="#F97316" />
      <polygon points="151,70 162,48 140,78" fill="#FECACA" />
      <ellipse cx="125" cy="124" rx="26" ry="21" fill="#FED7AA" />
      <circle cx="108" cy="106" r="8" fill="#1C1917" />
      <circle cx="110" cy="104" r="3.5" fill="white" />
      <circle cx="109" cy="103" r="1.5" fill="#1C1917" />
      <circle cx="142" cy="106" r="8" fill="#1C1917" />
      <circle cx="144" cy="104" r="3.5" fill="white" />
      <circle cx="143" cy="103" r="1.5" fill="#1C1917" />
      <ellipse cx="125" cy="120" rx="5.5" ry="4.5" fill="#1C1917" />
      <path d="M 119 125 Q 125 131 131 125" stroke="#9A3412" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <rect x="96" y="230" width="24" height="30" rx="12" fill="#F97316" />
      <rect x="132" y="230" width="24" height="30" rx="12" fill="#F97316" />
      <ellipse cx="108" cy="259" rx="15" ry="8" fill="#FED7AA" />
      <ellipse cx="144" cy="259" rx="15" ry="8" fill="#FED7AA" />
      {detail >= 2 && <>
        <path d="M 95 172 Q 125 182 155 172" stroke="#EA580C" strokeWidth="2" fill="none" opacity="0.5" />
        <rect x="150" y="175" width="30" height="24" rx="6" fill="#92400E" />
        <rect x="148" y="170" width="34" height="7" rx="3.5" fill="#78350F" />
        <circle cx="165" cy="187" r="4.5" fill="#F59E0B" />
        <line x1="163" y1="187" x2="167" y2="187" stroke="#78350F" strokeWidth="1.5" />
        <line x1="165" y1="185" x2="165" y2="189" stroke="#78350F" strokeWidth="1.5" />
      </>}
      {detail >= 3 && <>
        <path d="M 80 170 Q 55 175 42 195 Q 55 200 80 192 Z" fill="#BFDBFE" opacity="0.6" />
        <circle cx="62" cy="183" r="2.5" fill="white" opacity="0.8" />
        <circle cx="75" cy="178" r="1.8" fill="white" opacity="0.6" />
      </>}
    </svg>
  )
}

// ── Lute logo mark ────────────────────────────────────────────────────────────

function LuteMark({ className = 'w-10 h-12', color = '#D97706' }: { className?: string; color?: string }) {
  const c2 = color === '#D97706' ? '#92400E' : color
  return (
    <svg viewBox="0 0 40 50" className={className} fill="none">
      {/* Body */}
      <path d="M20 48 C9 48 3 41 3 33 C3 24 9 19 20 19 C31 19 37 24 37 33 C37 41 31 48 20 48Z" fill={color}/>
      {/* Body highlight */}
      <path d="M8 28 Q6 33 7 38" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Sound hole */}
      <circle cx="20" cy="34" r="5" fill={c2} opacity="0.75"/>
      {/* Neck */}
      <rect x="17.5" y="9" width="5" height="12" rx="2" fill={c2} opacity="0.9"/>
      {/* Pegbox */}
      <path d="M16.5 9.5 L18.5 3.5 L23.5 3.5 L21.5 9.5Z" fill={c2}/>
      {/* Tuning pegs */}
      <circle cx="17" cy="4.5" r="2" fill={color}/>
      <circle cx="20" cy="3.5" r="2" fill={color}/>
      <circle cx="23" cy="4.5" r="2" fill={color}/>
      {/* Strings */}
      <line x1="18.5" y1="9.5" x2="15" y2="45" stroke="rgba(255,253,235,0.8)" strokeWidth="0.55"/>
      <line x1="20"   y1="9.5" x2="18" y2="45" stroke="rgba(255,253,235,0.7)" strokeWidth="0.55"/>
      <line x1="21"   y1="9.5" x2="22" y2="45" stroke="rgba(255,253,235,0.7)" strokeWidth="0.55"/>
      <line x1="22.5" y1="9.5" x2="25" y2="45" stroke="rgba(255,253,235,0.8)" strokeWidth="0.55"/>
    </svg>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IcoHome     = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
const IcoBooks    = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/></svg>
const IcoSearch   = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
const IcoSettings = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
const IcoChevL    = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
const IcoMic      = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
const IcoPlay     = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M8 5v14l11-7z"/></svg>
const IcoPause    = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
const IcoX        = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
const IcoSkip     = ({ flip }: { flip?: boolean }) => <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" style={flip ? { transform: 'scaleX(-1)' } : {}}><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
const IcoBranch   = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
    <circle cx="6"  cy="4"  r="2.2" fill="currentColor"/>
    <circle cx="6"  cy="20" r="2.2" fill="currentColor"/>
    <circle cx="18" cy="9"  r="2.2" fill="currentColor"/>
    <line x1="6" y1="6.2" x2="6" y2="17.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 6.5 C6 8.5 10 9 18 9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
  </svg>
)
const IcoCheck    = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>

// ── Status bar ────────────────────────────────────────────────────────────────

function StatusBar({ light }: { light?: boolean }) {
  const color = light ? 'text-[#1C1829]/80' : 'text-white/90'
  return (
    <div className={`flex justify-between items-center px-7 pt-3 pb-1 text-[11px] font-bold ${color}`}>
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg viewBox="0 0 17 12" className="w-4 h-3" fill="currentColor">
          <rect x="0" y="9" width="3" height="3" rx="0.5"/>
          <rect x="4.5" y="6" width="3" height="6" rx="0.5"/>
          <rect x="9" y="3" width="3" height="9" rx="0.5"/>
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" opacity="0.4"/>
        </svg>
        <svg viewBox="0 0 16 12" className="w-4 h-3" fill="currentColor">
          <path d="M8 9.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
          <path d="M8 6C6.07 6 4.32 6.78 3.03 8.03l1.42 1.42C5.38 8.53 6.63 8 8 8s2.62.53 3.55 1.45l1.42-1.42C11.68 6.78 9.93 6 8 6z" opacity="0.7"/>
          <path d="M8 2C5.01 2 2.29 3.16.34 5.1l1.42 1.42C3.13 5.18 5.45 4 8 4s4.87 1.18 6.24 2.52l1.42-1.42C13.71 3.16 10.99 2 8 2z" opacity="0.4"/>
        </svg>
        <svg viewBox="0 0 25 12" className="w-6 h-3" fill="currentColor">
          <rect x="0" y="1" width="21" height="10" rx="2" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.35"/>
          <rect x="22" y="4" width="2" height="4" rx="1" opacity="0.4"/>
          <rect x="1.5" y="2.5" width="16" height="7" rx="1" opacity="0.85"/>
        </svg>
      </div>
    </div>
  )
}

// ── Bottom nav ─────────────────────────────────────────────────────────────────

function BottomNav({ active, onNav }: { active: 'home' | 'library'; onNav: (s: Screen) => void }) {
  const tabs = [
    { key: 'home'    as const, Icon: IcoHome,     label: 'Home',    screen: 'home'    as Screen },
    { key: 'library' as const, Icon: IcoBooks,    label: 'Library', screen: 'library' as Screen },
    { key: 'search'  as const, Icon: IcoSearch,   label: 'Search',  screen: 'library' as Screen },
    { key: 'you'     as const, Icon: IcoSettings, label: 'You',     screen: 'home'    as Screen },
  ]
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl"
      style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
      <div className="flex">
        {tabs.map(({ key, Icon, label, screen }, i) => {
          const isActive = (i === 0 && active === 'home') || (i === 1 && active === 'library')
          return (
            <button key={key + i} onClick={() => onNav(screen)}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${isActive ? 'text-amber-500' : 'text-[#1C1829]/30'}`}>
              <Icon />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          )
        })}
      </div>
      <div className="h-5 flex items-center justify-center">
        <div className="w-32 h-1 bg-black/15 rounded-full" />
      </div>
    </div>
  )
}

// ── Screen: Login ──────────────────────────────────────────────────────────────

function LoginScreen({ onNext }: { onNext: () => void }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  return (
    <div className="absolute inset-0 flex flex-col bg-[#FAFAF7]">
      <StatusBar light />
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-3">
        <div className="flex flex-col items-center gap-4 mb-2">
          <div className="w-20 h-20 rounded-[28px] flex items-center justify-center"
            style={{ background: 'linear-gradient(145deg, #FEF3C7, #FDE68A)', boxShadow: '0 4px 24px rgba(251,191,36,0.3)' }}>
            <LuteMark className="w-9 h-11" color="#D97706" />
          </div>
          <div>
            <h1 className="text-[42px] font-light text-[#1C1829] tracking-tight text-center"
              style={{ fontFamily: 'Fraunces, Georgia, serif', fontStyle: 'italic', lineHeight: 1 }}>
              Bardery
            </h1>
            <p className="text-[#1C1829]/40 text-sm text-center mt-1.5">Stories that grow with your child</p>
          </div>
        </div>
      </div>
      <div className="px-7 pb-5 flex flex-col gap-3">
        <div>
          <div className="text-[#1C1829]/40 text-[10px] font-bold uppercase tracking-[0.12em] mb-2">Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@family.com"
            className="w-full rounded-2xl px-4 py-3.5 text-[#1C1829] text-sm placeholder-[#1C1829]/25 outline-none bg-white"
            style={{ border: '1.5px solid rgba(0,0,0,0.1)' }}/>
        </div>
        <div>
          <div className="text-[#1C1829]/40 text-[10px] font-bold uppercase tracking-[0.12em] mb-2">Password</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-2xl px-4 py-3.5 text-[#1C1829] text-sm placeholder-[#1C1829]/25 outline-none bg-white"
            style={{ border: '1.5px solid rgba(0,0,0,0.1)' }}/>
        </div>
        <button onClick={onNext}
          className="mt-1 w-full rounded-2xl py-4 font-bold text-sm text-white transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
          Sign in
        </button>
        <button className="text-[#1C1829]/35 text-xs text-center py-1.5 hover:text-[#1C1829]/55 transition-colors">
          New here? Create your family →
        </button>
      </div>
      <div className="h-8 flex items-center justify-center">
        <div className="w-32 h-1 bg-black/12 rounded-full" />
      </div>
    </div>
  )
}

// ── Screen: Profile select ─────────────────────────────────────────────────────

function ProfilesScreen({ onSelect }: { onSelect: (p: Profile) => void }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#FAFAF7]">
      <StatusBar light />
      <div className="px-6 pt-3 flex justify-end">
        <button className="text-[#1C1829]/35 text-xs font-semibold px-3 py-1.5 rounded-xl bg-black/5">
          ⚙ Parent settings
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-10">
        <h2 className="text-[28px] font-light text-[#1C1829] text-center"
          style={{ fontFamily: 'Fraunces, Georgia, serif', fontStyle: 'italic' }}>
          Who's reading today?
        </h2>
        <div className="flex gap-5 items-end">
          {PROFILES.map(p => (
            <button key={p.id} onClick={() => onSelect(p)}
              className="flex flex-col items-center gap-3.5 group">
              <div className="w-28 h-28 rounded-[32px] flex items-center justify-center text-[40px] font-bold text-white shadow-lg group-hover:scale-105 group-active:scale-95 transition-all duration-200"
                style={{ background: `linear-gradient(145deg, ${p.color}88, ${p.color})` }}>
                {p.avatar}
              </div>
              <div className="text-center">
                <div className="text-[#1C1829] font-bold text-base">{p.name}</div>
                <div className="text-[#1C1829]/40 text-xs mt-0.5">Age {p.ageRange}</div>
              </div>
            </button>
          ))}
          <button className="flex flex-col items-center gap-3.5 group">
            <div className="w-24 h-24 rounded-[28px] flex items-center justify-center text-[#1C1829]/20 text-3xl group-hover:text-[#1C1829]/40 transition-colors"
              style={{ border: '2px dashed rgba(0,0,0,0.15)' }}>+</div>
            <div className="text-[#1C1829]/30 text-sm font-medium">Add</div>
          </button>
        </div>
      </div>
      <div className="h-8 flex items-center justify-center">
        <div className="w-32 h-1 bg-black/12 rounded-full" />
      </div>
    </div>
  )
}

// ── Screen: Home ──────────────────────────────────────────────────────────────

function HomeScreen({ profile, onNav }: { profile: Profile; onNav: (s: Screen) => void }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#FAFAF7]">
      <StatusBar light />
      <div className="px-6 pt-2 pb-5 flex justify-between items-center">
        <div>
          <div className="text-[#1C1829]/35 text-[10px] font-bold uppercase tracking-[0.12em]">Reading as</div>
          <div className="text-[#1C1829] text-xl font-bold mt-0.5"
            style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
            Hi, {profile.name}!
          </div>
        </div>
        <button onClick={() => onNav('profiles')}
          className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white font-bold text-sm"
          style={{ background: `linear-gradient(145deg, ${profile.color}88, ${profile.color})` }}>
          {profile.avatar}
        </button>
      </div>

      {/* New story CTA */}
      <div className="px-6 mb-6">
        <button onClick={() => onNav('create')}
          className="w-full rounded-3xl py-5 font-bold text-base text-white flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg"
          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', boxShadow: '0 8px 24px rgba(217,119,6,0.35)' }}>
          <LuteMark className="w-5 h-6" color="white" />
          Begin a new story
        </button>
      </div>

      {/* Stories + Heroes — scrollable area */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* Stories grid */}
        <div className="px-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[#1C1829]/40 text-[10px] font-bold uppercase tracking-[0.12em]">{profile.name}'s stories</div>
            <button onClick={() => onNav('library')} className="text-amber-500 text-xs font-semibold">See all</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {LIBRARY_STORIES.slice(0, 4).map(s => (
              <button key={s.id} onClick={() => onNav('chapter')}
                className="rounded-3xl overflow-hidden active:scale-[0.96] transition-transform text-left shadow-sm"
                style={{ background: s.gradient }}>
                <div className="p-4 h-28 flex flex-col justify-between">
                  <div className="text-white/60 text-[9px] font-bold uppercase tracking-wide">{s.chapters} parts · {s.hero}</div>
                  <div className="text-white font-bold text-[13px] leading-snug"
                    style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
                    {s.title}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Hero carousel */}
        <div className="px-6">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[#1C1829]/40 text-[10px] font-bold uppercase tracking-[0.12em]">{profile.name}'s heroes</div>
            <button onClick={() => onNav('heroselect')} className="text-amber-500 text-xs font-semibold">See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {HEROES.map(h => (
              <button key={h.id} onClick={() => onNav('heroselect')}
                className="flex-shrink-0 flex flex-col items-center gap-2 active:scale-95 transition-transform">
                <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-2xl shadow-sm"
                  style={{ background: `linear-gradient(145deg, ${h.color}44, ${h.color}88)`, border: `2px solid ${h.color}55` }}>
                  {h.emoji}
                </div>
                <div className="text-[#1C1829] text-[11px] font-bold">{h.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="home" onNav={onNav} />
    </div>
  )
}

// ── Screen: Create ────────────────────────────────────────────────────────────

function CreateScreen({ profile, onBack, onNav, onSurprise }: {
  profile: Profile; onBack: () => void; onNav: (s: Screen) => void; onSurprise: () => void
}) {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#FAFAF7]">
      <StatusBar light />
      <div className="px-6 pt-2 pb-6 flex items-center gap-3">
        <button onClick={onBack} className="text-[#1C1829]/40 hover:text-[#1C1829] transition-colors"><IcoChevL /></button>
        <div>
          <div className="text-[#1C1829]/35 text-[10px] font-bold uppercase tracking-[0.12em]">New story for {profile.name}</div>
          <div className="text-[#1C1829] font-semibold text-lg" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
            How shall we begin?
          </div>
        </div>
      </div>
      <div className="px-6 flex-1 flex flex-col gap-4">
        {/* Option 1: Surprise me — jumps straight to chapter */}
        <button onClick={onSurprise}
          className="w-full rounded-3xl overflow-hidden active:scale-[0.97] transition-transform text-left shadow-md"
          style={{ background: 'linear-gradient(135deg,#FBBF24 0%,#F97316 100%)' }}>
          <div className="p-6">
            <div className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Auto-generate</div>
            <div className="text-white font-bold text-xl mb-1" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
              Surprise me!
            </div>
            <div className="text-white/75 text-sm">Bardery picks a story and starts right away — no setup needed.</div>
          </div>
        </button>

        {/* Option 2: Write a prompt — goes to prompt form */}
        <button onClick={() => onNav('prompt')}
          className="w-full rounded-3xl overflow-hidden active:scale-[0.97] transition-transform text-left shadow-md"
          style={{ background: 'linear-gradient(135deg,#8B5CF6 0%,#6366F1 100%)' }}>
          <div className="p-6">
            <div className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Custom prompt</div>
            <div className="text-white font-bold text-xl mb-1" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
              I have an idea
            </div>
            <div className="text-white/75 text-sm">Describe your story and Bardery will weave it into life.</div>
          </div>
        </button>

        {/* Option 3: Hero from previous story */}
        <button onClick={() => onNav('heroselect')}
          className="w-full rounded-3xl overflow-hidden active:scale-[0.97] transition-transform text-left shadow-md"
          style={{ background: 'linear-gradient(135deg,#0EA5E9 0%,#10B981 100%)' }}>
          <div className="p-6">
            <div className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Bring back a favourite</div>
            <div className="text-white font-bold text-xl mb-1" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
              Use a hero
            </div>
            <div className="text-white/75 text-sm">Choose a character from Emma's stories and give them a brand new adventure.</div>
          </div>
        </button>
      </div>
      <div className="h-10" />
    </div>
  )
}

// ── Screen: Prompt ────────────────────────────────────────────────────────────

function PromptScreen({ profile, onBack, onNext }: { profile: Profile; onBack: () => void; onNext: () => void }) {
  const [prompt, setPrompt] = useState('')
  return (
    <div className="absolute inset-0 flex flex-col bg-[#FAFAF7]">
      <StatusBar light />
      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-[#1C1829]/40 hover:text-[#1C1829] transition-colors"><IcoChevL /></button>
        <div>
          <div className="text-[#1C1829]/35 text-[10px] font-bold uppercase tracking-[0.12em]">Your story idea</div>
          <div className="text-[#1C1829] font-semibold" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
            What should it be about?
          </div>
        </div>
      </div>
      <div className="px-6 flex-1 flex flex-col gap-5">
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={7}
          placeholder={'A little fox who loses her shadow and must find it before the forest goes dark…'}
          className="w-full flex-1 rounded-3xl px-5 py-4 text-[#1C1829] text-sm leading-relaxed outline-none resize-none placeholder-[#1C1829]/25 bg-white"
          style={{ border: '1.5px solid rgba(0,0,0,0.08)' }}
        />
        <div className="flex items-center justify-between rounded-2xl px-5 py-4 bg-white"
          style={{ border: '1.5px solid rgba(0,0,0,0.07)' }}>
          <div>
            <div className="text-[#1C1829]/35 text-[10px] font-bold uppercase tracking-[0.12em]">Age range</div>
            <div className="text-[#1C1829] font-bold mt-0.5">{profile.ageRange} years</div>
          </div>
          <div className="text-[#1C1829]/25 text-[11px]">Locked to {profile.name}</div>
        </div>
      </div>
      <div className="px-6 py-5">
        <button onClick={onNext}
          className="w-full rounded-2xl py-4 font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 6px 20px rgba(217,119,6,0.3)' }}>
          Generate story →
        </button>
      </div>
    </div>
  )
}

// ── Screen: Chapter (with inline choices) ─────────────────────────────────────

function ChapterScreen({ chapterIndex, decisions, onDecide, onViewPath, onAudio, onBack }: {
  chapterIndex: number
  decisions: Decision[]
  onDecide: (chosen: string) => void
  onViewPath: () => void
  onAudio: () => void
  onBack: () => void
}) {
  const gradient = CHAPTER_GRADIENTS[chapterIndex % CHAPTER_GRADIENTS.length]
  const detail   = Math.min(chapterIndex + 1, 3) as 1 | 2 | 3
  const [chosen, setChosen]     = useState<string | null>(null)
  const [freeText, setFreeText] = useState('')

  // Reset when chapter changes
  useEffect(() => { setChosen(null); setFreeText('') }, [chapterIndex])

  const handleConfirm = () => {
    const pick = chosen ?? freeText.trim()
    if (!pick) return
    onDecide(pick)
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: gradient }}>
      {/* Header over gradient */}
      <StatusBar />
      <div className="px-6 py-2 flex justify-between items-center relative z-10 flex-shrink-0">
        <button onClick={onBack} className="text-white/80 hover:text-white transition-colors"><IcoChevL /></button>
        <div className="flex gap-1.5 items-center">
          {CHAPTER_GRADIENTS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === chapterIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/35'}`} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onViewPath} className="text-white/80 hover:text-white transition-colors">
            <IcoBranch />
          </button>
          <button onClick={onAudio} className="text-white/80 hover:text-white transition-colors">
            <IcoMic />
          </button>
        </div>
      </div>

      {/* Scrollable paper card */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 pt-2">
        <div className="rounded-[28px] overflow-hidden shadow-xl"
          style={{ background: 'rgba(255,253,245,0.94)', backdropFilter: 'blur(12px)' }}>
          <div className="px-6 py-6">

            {/* Chapter label + title */}
            <div className="text-[#1C1829]/35 text-[9px] font-bold uppercase tracking-[0.15em] mb-2">
              Part {chapterIndex + 1} of the story
            </div>
            <h1 className="text-[24px] font-light text-[#1C1829] leading-tight mb-6"
              style={{ fontFamily: 'Fraunces, Georgia, serif', fontStyle: 'italic' }}>
              {STORY.title}
            </h1>

            {/* First two paragraphs */}
            {STORY.paragraphs.slice(0, 2).map((p, i) => (
              <p key={i} className="text-[#1C1829]/85 text-[15px] leading-[1.85] mb-4"
                style={{ fontFamily: 'Nunito, system-ui, sans-serif' }}>
                {p}
              </p>
            ))}

            {/* Floating illustration */}
            <div className="my-7 w-44 mx-auto" style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.12))' }}>
              <FoxIllustration detail={detail} />
            </div>

            {/* Remaining paragraphs */}
            {STORY.paragraphs.slice(2).map((p, i) => (
              <p key={i} className={`text-[#1C1829]/85 text-[15px] leading-[1.85] mb-4 ${i === 1 ? 'italic' : ''}`}
                style={{ fontFamily: 'Nunito, system-ui, sans-serif' }}>
                {p}
              </p>
            ))}

            {/* ── Inline choice section ── */}
            <div className="mt-8 pt-6" style={{ borderTop: '1.5px solid rgba(0,0,0,0.07)' }}>
              <p className="text-amber-700 text-[13px] leading-relaxed italic mb-4"
                style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
                {CHOICE_PROMPT}
              </p>

              <div className="flex flex-col gap-2.5 mb-4">
                {BRANCH_OPTIONS.map((opt, i) => {
                  const isChosen = chosen === opt
                  return (
                    <button key={i}
                      onClick={() => { setChosen(opt); setFreeText('') }}
                      className="w-full text-left rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98]"
                      style={{
                        background: isChosen ? 'rgba(251,191,36,0.12)' : 'rgba(0,0,0,0.03)',
                        border: isChosen ? '1.5px solid #FBBF24' : '1.5px solid rgba(0,0,0,0.07)',
                      }}>
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isChosen ? 'border-amber-400 bg-amber-400' : 'border-[#1C1829]/20'}`}>
                          {isChosen && <IcoCheck />}
                        </div>
                        <span className={`text-[13px] leading-snug ${isChosen ? 'text-[#1C1829] font-semibold' : 'text-[#1C1829]/70'}`}
                          style={{ fontFamily: 'Nunito, system-ui, sans-serif' }}>
                          {opt}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Free text option */}
              <div className="text-[#1C1829]/35 text-[10px] font-bold uppercase tracking-[0.12em] mb-2">
                Or describe what happens
              </div>
              <div className="relative">
                <input value={freeText}
                  onChange={e => { setFreeText(e.target.value); if (e.target.value) setChosen(null) }}
                  placeholder={'Luna finds a glowing mushroom that speaks in whispers…'}
                  className="w-full rounded-2xl px-4 py-3 pr-10 text-[#1C1829] text-sm outline-none placeholder-[#1C1829]/22 bg-white"
                  style={{ border: '1.5px solid rgba(0,0,0,0.08)' }}
                />
              </div>

              {/* Confirm button */}
              {(chosen || freeText.trim()) && (
                <button onClick={handleConfirm}
                  className="mt-4 w-full rounded-2xl py-4 font-bold text-sm text-white active:scale-[0.98] transition-all"
                  style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 4px 16px rgba(217,119,6,0.3)' }}>
                  Continue the story →
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Screen: Hero select ───────────────────────────────────────────────────────

function HeroSelectScreen({ profile, onBack, onSelect }: {
  profile: Profile
  onBack: () => void
  onSelect: (hero: Hero) => void
}) {
  const [selected, setSelected] = useState<Hero | null>(null)

  return (
    <div className="absolute inset-0 flex flex-col bg-[#FAFAF7]">
      <StatusBar light />
      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-[#1C1829]/40 hover:text-[#1C1829] transition-colors"><IcoChevL /></button>
        <div>
          <div className="text-[#1C1829]/35 text-[10px] font-bold uppercase tracking-[0.12em]">Bring back a favourite</div>
          <div className="text-[#1C1829] font-semibold text-lg" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
            Choose a hero
          </div>
        </div>
      </div>

      <div className="px-5 mb-4">
        <p className="text-[#1C1829]/45 text-sm leading-relaxed">
          Pick one of {profile.name}'s heroes. They'll step into a brand new story — carrying everything they learned before.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-6">
        <div className="flex flex-col gap-3">
          {HEROES.map(h => {
            const isSelected = selected?.id === h.id
            return (
              <button key={h.id}
                onClick={() => setSelected(isSelected ? null : h)}
                className="w-full text-left rounded-3xl p-4 transition-all active:scale-[0.98]"
                style={{
                  background: isSelected ? `${h.color}12` : 'white',
                  border: isSelected ? `2px solid ${h.color}80` : '2px solid rgba(0,0,0,0.07)',
                  boxShadow: isSelected ? `0 4px 16px ${h.color}25` : '0 1px 4px rgba(0,0,0,0.05)',
                }}>
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `linear-gradient(145deg, ${h.color}33, ${h.color}66)` }}>
                    {h.emoji}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[#1C1829] font-bold text-base leading-tight">{h.name}</div>
                    <div className="text-[#1C1829]/45 text-[11px] mt-0.5 leading-snug">{h.desc}</div>
                    <div className="mt-1.5 text-[10px] font-semibold" style={{ color: h.color }}>
                      from · {h.story}
                    </div>
                  </div>
                  {/* Selection indicator */}
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'border-current' : 'border-[#1C1829]/20'}`}
                    style={{ borderColor: isSelected ? h.color : undefined, background: isSelected ? h.color : 'transparent' }}>
                    {isSelected && <IcoCheck />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Confirm CTA */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        <button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="w-full rounded-2xl py-4 font-bold text-sm transition-all active:scale-[0.98]"
          style={{
            background: selected ? `linear-gradient(135deg, ${selected.color}, ${selected.color}CC)` : 'rgba(0,0,0,0.07)',
            color: selected ? 'white' : 'rgba(0,0,0,0.3)',
            boxShadow: selected ? `0 6px 20px ${selected.color}40` : 'none',
          }}>
          {selected ? `Begin a new story with ${selected.name} →` : 'Select a hero to continue'}
        </button>
      </div>
    </div>
  )
}

// ── Screen: Story path ────────────────────────────────────────────────────────

function StoryPathScreen({ decisions, onBack, onBranch }: {
  decisions: Decision[]
  onBack: () => void
  onBranch: (decisionId: string, newChoice: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="absolute inset-0 flex flex-col bg-[#FAFAF7]">
      <StatusBar light />
      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-[#1C1829]/40 hover:text-[#1C1829] transition-colors"><IcoChevL /></button>
        <div>
          <div className="text-[#1C1829]/35 text-[10px] font-bold uppercase tracking-[0.12em]">Story journey</div>
          <div className="text-[#1C1829] font-semibold text-lg" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
            Your decisions
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-10">
        {decisions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="text-[#1C1829]/20 text-5xl">🌿</div>
            <div className="text-[#1C1829]/35 text-sm text-center">No decisions yet.<br/>Keep reading to shape the story.</div>
          </div>
        )}

        <div className="relative">
          {/* Timeline line */}
          {decisions.length > 0 && (
            <div className="absolute left-[18px] top-5 bottom-0 w-[2px] bg-amber-200 rounded-full" />
          )}

          {decisions.map((d, i) => (
            <div key={d.id} className="relative pl-11 mb-7">
              {/* Node dot */}
              <div className="absolute left-[9px] top-1 w-[18px] h-[18px] rounded-full bg-amber-400 flex items-center justify-center z-10">
                <span className="text-white text-[9px] font-black">{i + 1}</span>
              </div>

              {/* Context */}
              <div className="text-[#1C1829]/40 text-[11px] italic mb-2 leading-relaxed">
                "{d.context}"
              </div>

              {/* Chosen path card */}
              <div className="rounded-2xl p-3.5 mb-2"
                style={{ background: 'rgba(251,191,36,0.1)', border: '1.5px solid rgba(251,191,36,0.35)' }}>
                <div className="text-amber-700 text-[9px] font-black uppercase tracking-[0.12em] mb-1.5">Chosen path</div>
                <div className="text-[#1C1829] text-[13px] font-semibold leading-snug"
                  style={{ fontFamily: 'Nunito, system-ui, sans-serif' }}>
                  {d.chosen}
                </div>
              </div>

              {/* Toggle alternatives */}
              <button
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                className="text-amber-600 text-[11px] font-bold flex items-center gap-1">
                {expanded === d.id ? '▲ Hide alternatives' : '▼ See alternatives'}
              </button>

              {expanded === d.id && (
                <div className="mt-2 flex flex-col gap-2">
                  {d.options.filter(o => o !== d.chosen).map((opt, j) => (
                    <div key={j} className="rounded-2xl p-3.5 flex items-start gap-2 bg-white"
                      style={{ border: '1.5px solid rgba(0,0,0,0.07)' }}>
                      <div className="text-[#1C1829]/50 text-[12px] leading-snug flex-1"
                        style={{ fontFamily: 'Nunito, system-ui, sans-serif' }}>
                        {opt}
                      </div>
                      <button
                        onClick={() => onBranch(d.id, opt)}
                        className="flex-shrink-0 text-[10px] font-black text-amber-600 rounded-xl px-2.5 py-1.5 transition-colors"
                        style={{ border: '1.5px solid rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.08)' }}>
                        Branch →
                      </button>
                    </div>
                  ))}
                  {/* Custom branch */}
                  <div className="rounded-2xl p-3.5 bg-white" style={{ border: '1.5px dashed rgba(0,0,0,0.12)' }}>
                    {editingId === d.id ? (
                      <div className="flex flex-col gap-2">
                        <input autoFocus placeholder="Describe a different path…"
                          className="text-[12px] text-[#1C1829] outline-none placeholder-[#1C1829]/25 bg-transparent"
                          onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value) { onBranch(d.id, e.currentTarget.value); setEditingId(null) } }}
                        />
                        <div className="text-[10px] text-[#1C1829]/30">Press Enter to branch</div>
                      </div>
                    ) : (
                      <button onClick={() => setEditingId(d.id)}
                        className="text-[#1C1829]/35 text-[11px] font-semibold">
                        + Write a different path…
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Current position */}
          {decisions.length > 0 && (
            <div className="relative pl-11">
              <div className="absolute left-[9px] top-1 w-[18px] h-[18px] rounded-full bg-white z-10 flex items-center justify-center"
                style={{ border: '2px solid #FBBF24' }}>
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
              <div className="text-[#1C1829]/35 text-xs italic pt-0.5">You are here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Screen: Library ───────────────────────────────────────────────────────────

function LibraryScreen({ profile, onNav }: { profile: Profile; onNav: (s: Screen) => void }) {
  const [query, setQuery] = useState('')
  const filtered = LIBRARY_STORIES.filter(s =>
    s.title.toLowerCase().includes(query.toLowerCase()) ||
    s.hero.toLowerCase().includes(query.toLowerCase())
  )
  return (
    <div className="absolute inset-0 flex flex-col bg-[#FAFAF7]">
      <StatusBar light />
      <div className="px-6 pt-2 pb-4">
        <div className="text-[#1C1829]/35 text-[10px] font-bold uppercase tracking-[0.12em] mb-1">{profile.name}'s library</div>
        <h2 className="text-2xl font-light text-[#1C1829]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Your Stories</h2>
      </div>
      <div className="px-6 mb-5">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1C1829]/30"><IcoSearch /></div>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by story, hero, or theme…"
            className="w-full rounded-2xl pl-11 pr-4 py-3.5 text-[#1C1829] text-sm placeholder-[#1C1829]/25 outline-none bg-white"
            style={{ border: '1.5px solid rgba(0,0,0,0.08)' }}/>
        </div>
        {query && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[#1C1829]/35 text-[11px]">Semantic search · {filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-24">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(s => (
            <button key={s.id} onClick={() => onNav('chapter')}
              className="rounded-3xl overflow-hidden active:scale-[0.96] transition-transform text-left shadow-sm"
              style={{ background: s.gradient }}>
              <div className="p-4 h-36 flex flex-col justify-between">
                <div className="text-white/55 text-[9px] font-bold uppercase tracking-wide">{s.chapters} parts</div>
                <div>
                  <div className="text-white font-bold text-[13px] leading-snug mb-1"
                    style={{ fontFamily: 'Fraunces, Georgia, serif' }}>{s.title}</div>
                  <div className="text-white/60 text-[10px] font-semibold">{s.hero}</div>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12 text-[#1C1829]/25 text-sm">No stories found for "{query}"</div>
          )}
        </div>
      </div>
      <BottomNav active="library" onNav={onNav} />
    </div>
  )
}

// ── Screen: Audio ─────────────────────────────────────────────────────────────

function AudioScreen({ onClose, chapterIndex = 0 }: { onClose: () => void; chapterIndex?: number }) {
  const [playing, setPlaying] = useState(false)
  const [paraIdx, setParaIdx] = useState(0)
  const [voice, setVoice]     = useState('Soft')
  const [speed, setSpeed]     = useState('1×')
  const gradient = CHAPTER_GRADIENTS[chapterIndex % CHAPTER_GRADIENTS.length]

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setParaIdx(i => { if (i >= STORY.paragraphs.length - 1) { setPlaying(false); return i } return i + 1 })
    }, 2800)
    return () => clearInterval(t)
  }, [playing])

  const progress = (paraIdx + 1) / STORY.paragraphs.length

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: gradient }}>
      <div className="absolute inset-0" style={{ background: 'rgba(10,6,30,0.68)', backdropFilter: 'blur(3px)' }} />
      <div className="relative z-10 flex flex-col h-full">
        <StatusBar />
        <div className="px-6 py-3 flex justify-between items-center">
          <div className="text-white/70 font-medium" style={{ fontFamily: 'Fraunces, Georgia, serif', fontStyle: 'italic' }}>
            Listening mode
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors"><IcoX /></button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar px-7 py-4">
          {STORY.paragraphs.map((p, i) => (
            <p key={i} className="text-[15px] leading-[1.9] mb-5 transition-all duration-500"
              style={{
                fontFamily: 'Nunito, system-ui, sans-serif',
                color: i === paraIdx ? '#FCD34D' : i < paraIdx ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.65)',
                transform: i === paraIdx ? 'scale(1.015)' : 'scale(1)',
                transformOrigin: 'left center',
              }}>
              {p}
            </p>
          ))}
        </div>
        <div className="px-6 pb-4">
          <div className="h-1 rounded-full mb-6" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress * 100}%`, background: '#FBBF24' }} />
          </div>
          <div className="flex gap-2 justify-center mb-5">
            {['Soft', 'Clear', 'Warm'].map(v => (
              <button key={v} onClick={() => setVoice(v)}
                className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all"
                style={{ background: voice === v ? '#FBBF24' : 'rgba(255,255,255,0.08)', color: voice === v ? '#0B0818' : 'rgba(255,255,255,0.55)', borderColor: voice === v ? '#FBBF24' : 'rgba(255,255,255,0.18)' }}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-10 mb-5">
            <button onClick={() => setParaIdx(i => Math.max(0, i - 1))} className="text-white/50 hover:text-white transition-colors">
              <IcoSkip flip />
            </button>
            <button onClick={() => setPlaying(p => !p)}
              className="w-16 h-16 rounded-full flex items-center justify-center text-[#0B0818] shadow-xl active:scale-95 transition-all"
              style={{ background: '#FBBF24' }}>
              {playing ? <IcoPause /> : <IcoPlay />}
            </button>
            <button onClick={() => setParaIdx(i => Math.min(STORY.paragraphs.length - 1, i + 1))} className="text-white/50 hover:text-white transition-colors">
              <IcoSkip />
            </button>
          </div>
          <div className="flex gap-2 justify-center">
            {['0.75×', '1×', '1.25×', '1.5×'].map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className="px-3 py-1 rounded-full text-[11px] font-bold border transition-all"
                style={{ background: speed === s ? 'rgba(255,255,255,0.18)' : 'transparent', color: speed === s ? 'white' : 'rgba(255,255,255,0.35)', borderColor: speed === s ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="h-8 flex items-center justify-center">
          <div className="w-32 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
        </div>
      </div>
    </div>
  )
}

// ── Screen nav labels ─────────────────────────────────────────────────────────

const SCREEN_LABELS: Record<Screen, string> = {
  login: 'Login', profiles: 'Profiles', home: 'Home', create: 'Create',
  prompt: 'Prompt', chapter: 'Chapter', storypath: 'Story path',
  heroselect: 'Hero select', library: 'Library', audio: 'Audio',
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen]         = useState<Screen>('login')
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [chapterIndex, setChapter]  = useState(0)
  const [decisions, setDecisions]   = useState<Decision[]>([])

  const go = (s: Screen) => setScreen(s)

  const handleSelectProfile = (p: Profile) => { setProfile(p); go('home') }

  const handleSurprise = () => { setChapter(0); setDecisions([]); go('chapter') }

  const handleStartPrompt = () => { setChapter(0); setDecisions([]); go('chapter') }

  const handleDecide = (chosen: string) => {
    const d: Decision = {
      id: Date.now().toString(),
      context: 'Luna stands at the forest\'s edge, her tiny satchel on her back…',
      chosen,
      options: BRANCH_OPTIONS,
    }
    setDecisions(prev => [...prev, d])
    setChapter(i => i + 1)
    // Stay on chapter screen — state update re-renders with new chapterIndex
  }

  const handleBranch = (decisionId: string, newChoice: string) => {
    const idx = decisions.findIndex(d => d.id === decisionId)
    if (idx === -1) return
    // Truncate decisions from this point and replace with new choice
    const updated = decisions.slice(0, idx)
    const d = decisions[idx]
    updated.push({ ...d, chosen: newChoice })
    setDecisions(updated)
    setChapter(idx + 1)
    go('chapter')
  }

  const p = profile ?? PROFILES[0]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-8"
      style={{ background: '#EEE8DA' }}>

      {/* App label */}
      <div className="flex items-center gap-2.5">
        <LuteMark className="w-4 h-5" color="#B45309" />
        <span className="text-[#1C1829]/45 text-sm font-semibold tracking-widest uppercase">Bardery · Prototype</span>
      </div>

      {/* Phone frame */}
      <div className="relative overflow-hidden"
        style={{
          width: 390, height: 844,
          borderRadius: 52,
          border: '10px solid #D4C5A9',
          boxShadow: '0 0 0 1.5px #C4B598, 0 40px 100px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.5)',
        }}>
        {screen === 'login'     && <LoginScreen     onNext={() => go('profiles')} />}
        {screen === 'profiles'  && <ProfilesScreen  onSelect={handleSelectProfile} />}
        {screen === 'home'      && <HomeScreen       profile={p} onNav={go} />}
        {screen === 'create'    && <CreateScreen     profile={p} onBack={() => go('home')} onNav={go} onSurprise={handleSurprise} />}
        {screen === 'prompt'    && <PromptScreen     profile={p} onBack={() => go('create')} onNext={handleStartPrompt} />}
        {screen === 'chapter'   && <ChapterScreen    chapterIndex={chapterIndex} decisions={decisions} onDecide={handleDecide} onViewPath={() => go('storypath')} onAudio={() => go('audio')} onBack={() => go('home')} />}
        {screen === 'heroselect' && <HeroSelectScreen profile={p} onBack={() => go('create')} onSelect={hero => { setChapter(0); setDecisions([]); go('chapter') }} />}
        {screen === 'storypath' && <StoryPathScreen  decisions={decisions} onBack={() => go('chapter')} onBranch={handleBranch} />}
        {screen === 'library'   && <LibraryScreen    profile={p} onNav={go} />}
        {screen === 'audio'     && <AudioScreen      onClose={() => go('chapter')} chapterIndex={chapterIndex} />}
      </div>

      {/* Screen nav pills */}
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {(Object.keys(SCREEN_LABELS) as Screen[]).map(s => (
          <button key={s} onClick={() => go(s)}
            className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
            style={{
              background: screen === s ? '#D97706' : 'rgba(0,0,0,0.08)',
              color: screen === s ? 'white' : 'rgba(0,0,0,0.45)',
            }}>
            {SCREEN_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  )
}
