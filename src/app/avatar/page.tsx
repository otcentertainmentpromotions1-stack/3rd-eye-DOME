'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ExternalLink,
  Globe2,
  Mic,
  MicOff,
  Search,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

type SpeechRecognitionResult = { transcript: string };
type AssistantMessage = { id: number; role: 'assistant' | 'user'; text: string };
type PendingAction = { label: string; url: string };
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<SpeechRecognitionResult> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
};

const appRoutes = [
  { name: 'home', path: '/' },
  { name: 'portal', path: '/' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'studio', path: '/studio' },
  { name: 'avatar', path: '/avatar' },
  { name: 'voice', path: '/voice' },
  { name: 'reports', path: '/reports' },
  { name: 'forecasting', path: '/forecasting' },
  { name: 'gallery', path: '/nft-gallery' },
  { name: 'phase map', path: '/phase-map' },
];

const starterMessages: AssistantMessage[] = [
  {
    id: 1,
    role: 'assistant',
    text: 'Hello. I’m your voice-first browser companion. Ask me to open a section, read the page, or prepare a web search.',
  },
];

export default function AvatarPage() {
  const router = useRouter();
  const [messages, setMessages] = useState(starterMessages);
  const [input, setInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [notice, setNotice] = useState('Ready when you are.');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback((role: AssistantMessage['role'], text: string) => {
    setMessages((current) => [...current, { id: Date.now() + Math.random(), role, text }]);
  }, []);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 0.96;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const respond = useCallback((text: string) => {
    addMessage('assistant', text);
    speak(text);
  }, [addMessage, speak]);

  const handleCommand = useCallback((rawText: string) => {
    const command = rawText.trim();
    if (!command) return;
    addMessage('user', command);
    setInput('');
    setInterimTranscript('');
    setPendingAction(null);

    const normalized = command.toLowerCase();
    const route = appRoutes.find(({ name }) =>
      new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(normalized),
    );
    if ((normalized.includes('open') || normalized.includes('go to') || normalized.includes('show')) && route) {
      const answer = `Opening ${route.name}.`;
      addMessage('assistant', answer);
      speak(answer);
      router.push(route.path);
      return;
    }

    if (normalized.includes('search') || normalized.includes('look up') || normalized.includes('google')) {
      const query = command
        .replace(/^(please\s+)?(search|look up|google)(\s+the web)?(\s+for)?\s*/i, '')
        .trim();
      if (!query) {
        respond('Tell me what you would like to search for. I’ll prepare the search and wait for you to open it.');
        return;
      }
      const action = { label: `Search the web for “${query}”`, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` };
      setPendingAction(action);
      respond(`I prepared a web search for ${query}. Select the search button to open it in a new tab.`);
      return;
    }

    if (normalized.includes('read') || normalized.includes('summar')) {
      const main = document.querySelector('main')?.innerText || document.body.innerText;
      const excerpt = main.replace(/\s+/g, ' ').trim().slice(0, 360);
      respond(excerpt ? `Here is the beginning of the visible page text: ${excerpt}${main.length > 360 ? '…' : ''}` : 'I could not find readable page text here.');
      return;
    }

    if (normalized.includes('help') || normalized.includes('what can you do')) {
      respond('I can open sections in this app, read visible page text aloud, and prepare a web search for you to open. I do not access other tabs or perform payments or account actions.');
      return;
    }

    respond('I heard you. In this first version, I can open a section in this app, read visible page text, or prepare a web search.');
  }, [addMessage, respond, router, speak]);

  useEffect(() => {
    const browserWindow = window as SpeechWindow;
    const SpeechRecognitionConstructor = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognitionConstructor));
    if (!SpeechRecognitionConstructor) return;

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const fragment = result[0]?.transcript ?? '';
        if (result.isFinal) finalText += fragment;
        else interimText += fragment;
      }
      if (interimText) {
        transcriptRef.current = interimText;
        setInterimTranscript(interimText);
      }
      if (finalText.trim()) {
        transcriptRef.current = '';
        setInterimTranscript('');
        handleCommand(finalText);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      setNotice(event.error === 'not-allowed' ? 'Microphone permission was denied. You can still type.' : 'Voice input stopped. Try again or type your request.');
    };
    recognition.onend = () => {
      setListening(false);
      const remaining = transcriptRef.current.trim();
      transcriptRef.current = '';
      if (remaining) handleCommand(remaining);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      window.speechSynthesis?.cancel();
    };
  }, [handleCommand]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setNotice('Speech recognition is not available in this browser. Type your request instead.');
      return;
    }
    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }
    try {
      transcriptRef.current = '';
      setInterimTranscript('');
      setNotice('Listening — your browser may ask for microphone permission.');
      recognition.start();
      setListening(true);
    } catch {
      setNotice('Could not start the microphone. Check browser permission and try again.');
    }
  };

  const submitText = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleCommand(input);
  };

  const openPendingAction = () => {
    if (!pendingAction) return;
    window.open(pendingAction.url, '_blank', 'noopener,noreferrer');
    addMessage('assistant', 'Opened the search in a new tab.');
    setPendingAction(null);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl py-2 sm:py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-primary">
            <Sparkles className="h-4 w-4" /> Voice-first browser assistant
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Avatar Resonance Room</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Talk naturally, get spoken responses, and navigate the Fisk Dimension with your voice.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> Local browser controls · no wallet access
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative flex min-h-[430px] flex-col overflow-hidden rounded-3xl border border-primary/20 bg-[radial-gradient(ellipse_at_50%_30%,rgba(124,58,237,0.22),transparent_58%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--background)))] p-5 sm:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/5 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Your guide</p>
              <p className="mt-1 text-xs text-muted-foreground">Provisional avatar rendering</p>
            </div>
            <span className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${listening ? 'border-rose-400/30 bg-rose-400/10 text-rose-200' : speaking ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : 'border-primary/20 bg-primary/10 text-primary'}`}>
              <span className={`h-2 w-2 rounded-full ${listening ? 'animate-pulse bg-rose-400' : speaking ? 'animate-pulse bg-amber-300' : 'bg-emerald-400'}`} />
              {listening ? 'Listening' : speaking ? 'Speaking' : 'Ready'}
            </span>
          </div>

          <div className={`relative mx-auto my-6 flex w-full max-w-[330px] flex-1 items-center justify-center ${speaking || listening ? 'avatar-glow-active' : ''}`} aria-label="Abstract cosmic avatar illustration">
            <div className="absolute aspect-square w-[82%] rounded-full border border-cyan-300/20 avatar-orbit" />
            <div className="absolute aspect-square w-[65%] rounded-full border border-violet-300/20 avatar-orbit-reverse" />
            <div className="relative flex aspect-square w-[54%] items-center justify-center rounded-full border border-violet-200/30 bg-gradient-to-br from-violet-500/25 via-slate-950 to-cyan-400/20 shadow-[0_0_70px_rgba(124,58,237,0.2)]">
              <svg viewBox="0 0 220 220" role="img" aria-label="Abstract lion face made of cosmic light" className="w-[78%] drop-shadow-[0_0_18px_rgba(103,232,249,0.4)]">
                <defs>
                  <linearGradient id="mane" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c4b5fd"/><stop offset="0.52" stopColor="#8b5cf6"/><stop offset="1" stopColor="#22d3ee"/></linearGradient>
                  <linearGradient id="face" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0" stopColor="#f5f3ff"/><stop offset="1" stopColor="#a5f3fc"/></linearGradient>
                </defs>
                <path d="M110 13 135 26 160 23 169 49 192 64 183 91 199 114 180 136 179 165 150 174 132 201 107 190 81 202 66 177 37 170 39 140 18 120 33 95 25 68 51 51 59 25 88 28Z" fill="url(#mane)" opacity=".8"/>
                <path d="M110 43 136 53 156 76 151 110 164 129 148 157 125 170 110 163 95 170 72 157 56 129 69 110 64 76 84 53Z" fill="url(#face)" opacity=".94"/>
                <path d="M70 77 48 59 49 94 68 105M150 77 172 59 171 94 152 105" fill="#c4b5fd" stroke="#e9d5ff" strokeWidth="3" strokeLinejoin="round"/>
                <path d="M76 101q14-12 28 0M116 101q14-12 28 0" fill="none" stroke="#312e81" strokeWidth="6" strokeLinecap="round"/>
                <path d="m110 119-8 8q8 8 16 0Z" fill="#7c3aed"/>
                <path d="M110 127v10m0 0q-13 13-25 1m25-1q13 13 25 1" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="86" cy="101" r="3" fill="#22d3ee"/><circle cx="134" cy="101" r="3" fill="#22d3ee"/>
                <path d="M109 51v24m-11-18 11 11 11-11" fill="none" stroke="#fff" strokeWidth="3" opacity=".85"/>
              </svg>
            </div>
            <div className="absolute bottom-[13%] flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-300 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Cosmic guide · concept art
            </div>
          </div>

          <div className="relative flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={toggleListening} aria-pressed={listening} className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${listening ? 'bg-rose-500 text-white hover:bg-rose-400' : 'bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg shadow-primary/20 hover:brightness-110'}`}>
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {listening ? 'Stop listening' : 'Talk to your guide'}
            </button>
            <button type="button" onClick={() => { setVoiceEnabled((enabled) => !enabled); if (voiceEnabled) stopSpeaking(); }} aria-label={voiceEnabled ? 'Mute spoken responses' : 'Enable spoken responses'} className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
          </div>
          <p className="relative mt-3 text-center text-xs text-muted-foreground" aria-live="polite">{notice}</p>
          {!voiceSupported && <p className="relative mt-1 text-center text-xs text-amber-200/80">Speech recognition is not supported here. Text chat is ready to use.</p>}
          <p className="relative mt-2 text-center text-[11px] text-muted-foreground/80">Illustrative new interface art — not recovered original character canon.</p>
        </section>

        <section className="flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-card/70 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="font-semibold">Conversation</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Voice and text, in one place</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Globe2 className="h-4 w-4 text-cyan-300" /> Browser companion</div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite" aria-label="Assistant conversation">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-white/10 bg-background/80 text-foreground'}`}>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-65">{message.role === 'user' ? 'You' : 'Guide'}</p>
                  {message.text}
                </div>
              </div>
            ))}
            {interimTranscript && <div className="mr-auto max-w-[88%] rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100/80">{interimTranscript}<span className="ml-1 animate-pulse">…</span></div>}
            <div ref={messageEndRef} />
          </div>

          {pendingAction && (
            <div className="mx-4 mb-3 rounded-xl border border-cyan-300/25 bg-cyan-300/5 p-3 sm:mx-5">
              <p className="mb-2 text-xs text-muted-foreground">External navigation is paused until you choose:</p>
              <button type="button" onClick={openPendingAction} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
                <Search className="h-4 w-4" /> {pendingAction.label} <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={submitText} className="border-t border-white/10 p-4 sm:p-5">
            <label htmlFor="assistant-message" className="sr-only">Message your browser assistant</label>
            <div className="flex gap-2 rounded-2xl border border-white/10 bg-background/70 p-2 focus-within:ring-2 focus-within:ring-primary/60">
              <input ref={inputRef} id="assistant-message" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask me to open a section or read this page…" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground" />
              <button type="submit" disabled={!input.trim()} aria-label="Send message" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <ArrowUpRight className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Open dashboard', 'Read this page', 'Search the web for '].map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => { setInput(suggestion); inputRef.current?.focus(); }} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground">{suggestion}</button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">This MVP uses your browser’s speech features and only reads the current app page. Web searches open only after you select the confirmation button. No wallet, payment, account, or other-tab controls.</p>
          </form>
        </section>
      </div>

      <style jsx>{`
        .avatar-orbit { animation: orbit 22s linear infinite; }
        .avatar-orbit-reverse { animation: orbit 30s linear infinite reverse; }
        .avatar-glow-active { filter: drop-shadow(0 0 24px rgba(34, 211, 238, .27)); }
        @keyframes orbit { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .avatar-orbit, .avatar-orbit-reverse { animation: none; } }
      `}</style>
    </div>
  );
}
