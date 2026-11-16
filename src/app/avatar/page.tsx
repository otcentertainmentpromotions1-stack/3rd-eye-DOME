'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ExternalLink, Globe2, Mic, MicOff, Search, ShieldCheck, Sparkles, Volume2, VolumeX } from 'lucide-react';

type SpeechResult = { transcript: string };
type Message = { id: number; role: 'assistant' | 'user'; text: string };
type PendingAction = { label: string; url: string };
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<SpeechResult> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
type AppRoute = { path: string; label: string; aliases: string[] };

// Keep voice destinations aligned with the complete app navigation.
const appRoutes: AppRoute[] = [
  { path: '/', label: 'Home Portal', aliases: ['home', 'home portal', 'portal', 'home page'] },
  { path: '/dashboard', label: 'Dashboard', aliases: ['dashboard'] },
  { path: '/studio', label: 'AI Studio', aliases: ['ai studio', 'studio'] },
  { path: '/nft-gallery', label: 'NFT Gallery', aliases: ['nft gallery', 'gallery'] },
  { path: '/avatar', label: 'Avatar Room', aliases: ['avatar room', 'avatar'] },
  { path: '/data-entry', label: 'Data Entry', aliases: ['data entry', 'data'] },
  { path: '/reports', label: 'Reports', aliases: ['reports', 'report'] },
  { path: '/forecasting', label: 'AI Forecasting', aliases: ['ai forecasting', 'forecasting', 'forecast'] },
  { path: '/chain', label: 'Chain Log', aliases: ['chain log', 'chain'] },
  { path: '/voice', label: 'Voice Systems', aliases: ['voice systems', 'voice'] },
  { path: '/phase-map', label: 'Phase Map', aliases: ['phase map'] },
  { path: '/threats', label: 'Threat Alerts', aliases: ['threat alerts', 'threats'] },
  { path: '/frequency-sync', label: 'Frequency Sync', aliases: ['frequency sync'] },
  { path: '/frequency-oracle', label: 'Frequency Oracle', aliases: ['frequency oracle'] },
  { path: '/round-table', label: 'Round Table', aliases: ['round table'] },
  { path: '/passport', label: 'Resonance Passport', aliases: ['resonance passport', 'passport'] },
  { path: '/badges', label: 'Soulbound Badges', aliases: ['soulbound badges', 'badges'] },
  { path: '/node-init', label: 'Node Init', aliases: ['node init'] },
  { path: '/domain', label: 'Domain Sovereignty', aliases: ['domain sovereignty', 'domain'] },
  { path: '/vault', label: 'Quantum Vault', aliases: ['quantum vault', 'vault'] },
  { path: '/lightning', label: 'Lightning Bridge', aliases: ['lightning bridge', 'lightning'] },
  { path: '/legacy-artifacts', label: 'Legacy Artifacts', aliases: ['legacy artifacts'] },
  { path: '/genesis-bridge', label: 'Genesis Bridge', aliases: ['genesis bridge'] },
  { path: '/mystery-box', label: 'Mystery Box Hub', aliases: ['mystery box hub', 'mystery box'] },
  { path: '/ascension', label: 'Tiered Ascension', aliases: ['tiered ascension', 'ascension'] },
  { path: '/guardian-node', label: 'Guardian Node', aliases: ['guardian node'] },
  { path: '/cipher-sanctuary', label: 'Cipher Sanctuary', aliases: ['cipher sanctuary'] },
  { path: '/quest-log', label: 'Encrypted Quest Log', aliases: ['encrypted quest log', 'quest log'] },
  { path: '/soul-core', label: 'Soul Matrix Core', aliases: ['soul matrix core', 'soul core'] },
  { path: '/prophecy', label: 'Legacy Prophecy', aliases: ['legacy prophecy', 'prophecy'] },
  { path: '/blockchain', label: 'Blockchain', aliases: ['blockchain'] },
];

const initialMessages: Message[] = [{ id: 1, role: 'assistant', text: 'Hello. I’m your voice-first browser companion. Ask me to open any app section, read this page, or prepare a web search.' }];
const hasPhrase = (text: string, phrase: string) => (` ${text} `).includes(` ${phrase} `);

export default function AvatarPage() {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [notice, setNotice] = useState('Ready when you are.');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const transcriptRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback((role: Message['role'], text: string) => {
    setMessages((current) => [...current, { id: Date.now() + Math.random(), role, text }]);
  }, []);
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);
  const respond = useCallback((text: string) => { addMessage('assistant', text); speak(text); }, [addMessage, speak]);

  const handleCommand = useCallback((raw: string) => {
    const command = raw.trim();
    if (!command) return;
    addMessage('user', command);
    setInput('');
    setInterim('');
    setPendingAction(null);
    const normalized = command.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();

    const routeIntent = /\b(open|go to|navigate to|take me to|show me|show|visit)\b/.test(normalized);
    if (routeIntent) {
      const target = normalized.replace(/^.*?\b(open|go to|navigate to|take me to|show me|show|visit)\b\s*/, '').replace(/^(the|my)\s+/, '').trim();
      const route = appRoutes.find((item) => item.aliases.some((alias) => hasPhrase(target, alias)));
      if (route) {
        const answer = `Opening ${route.label}.`;
        addMessage('assistant', answer);
        speak(answer);
        router.push(route.path);
        return;
      }
      respond(`I could not match “${target || command}” to an app page. Say “help with pages” to hear examples.`);
      return;
    }

    if (/\b(search|look up|google)\b/.test(normalized)) {
      const query = command.replace(/^(please\s+)?(search|look up|google)(\s+the web)?(\s+for)?\s*/i, '').trim();
      if (!query) { respond('Tell me what you would like to search for. I’ll prepare it and wait for your confirmation.'); return; }
      setPendingAction({ label: `Search the web for “${query}”`, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` });
      respond(`I prepared a web search for ${query}. Select the search button to open it in a new tab.`);
      return;
    }
    if (/\b(read|summarize|summarise)\b/.test(normalized)) {
      const pageText = document.querySelector('main')?.textContent || document.body.textContent || '';
      const excerpt = pageText.replace(/\s+/g, ' ').trim().slice(0, 360);
      respond(excerpt ? `Here is the beginning of the visible page text: ${excerpt}${pageText.length > 360 ? '…' : ''}` : 'I could not find readable page text here.');
      return;
    }
    if (/\b(help|pages|what can you do)\b/.test(normalized)) {
      respond('Say open followed by a page name: Home Portal, Dashboard, AI Studio, NFT Gallery, Avatar Room, Data Entry, Reports, AI Forecasting, Chain Log, Voice Systems, Phase Map, Threat Alerts, Frequency Sync, Frequency Oracle, Round Table, Resonance Passport, Soulbound Badges, Node Init, Domain Sovereignty, Quantum Vault, Lightning Bridge, Legacy Artifacts, Genesis Bridge, Mystery Box Hub, Tiered Ascension, Guardian Node, Cipher Sanctuary, Encrypted Quest Log, Soul Matrix Core, Legacy Prophecy, or Blockchain. I can also read the current page or prepare a web search.');
      return;
    }
    respond('I can navigate to any app page, read the current page, or prepare a web search for your confirmation. Say “help with pages” for the page list.');
  }, [addMessage, respond, router, speak]);

  useEffect(() => {
    const browser = window as SpeechWindow;
    const SpeechRecognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognition));
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0]?.transcript ?? '';
        else interimText += result[0]?.transcript ?? '';
      }
      if (interimText) { transcriptRef.current = interimText; setInterim(interimText); }
      if (finalText.trim()) { transcriptRef.current = ''; setInterim(''); handleCommand(finalText); }
    };
    recognition.onerror = (event) => {
      setListening(false);
      setNotice(event.error === 'not-allowed' ? 'Microphone permission denied. You can still type.' : 'Voice input stopped. Try again or type your request.');
    };
    recognition.onend = () => {
      setListening(false);
      const remaining = transcriptRef.current.trim();
      transcriptRef.current = '';
      if (remaining) handleCommand(remaining);
    };
    recognitionRef.current = recognition;
    return () => { recognition.onresult = null; recognition.onerror = null; recognition.onend = null; recognition.stop(); window.speechSynthesis?.cancel(); };
  }, [handleCommand]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages]);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) { setNotice('Speech recognition is not available in this browser. Type your request instead.'); return; }
    if (listening) { recognition.stop(); setListening(false); return; }
    try { transcriptRef.current = ''; setInterim(''); setNotice('Listening — your browser may ask for microphone permission.'); recognition.start(); setListening(true); }
    catch { setNotice('Could not start the microphone. Check browser permission and try again.'); }
  };
  const submitText = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); handleCommand(input); };
  const openSearch = () => {
    if (!pendingAction) return;
    window.open(pendingAction.url, '_blank', 'noopener,noreferrer');
    addMessage('assistant', 'Opened the search in a new tab.');
    setPendingAction(null);
  };
  const toggleVoice = () => {
    if (voiceEnabled) window.speechSynthesis?.cancel();
    setVoiceEnabled((enabled) => !enabled);
    setSpeaking(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl py-2 sm:py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-primary"><Sparkles className="h-4 w-4"/>Voice-first browser assistant</div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Avatar Resonance Room</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">Talk naturally, get spoken responses, and navigate every Fisk Dimension app page with your voice.</p></div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><ShieldCheck className="h-4 w-4"/>Local browser controls · no wallet access</div>
      </header>
      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative flex min-h-[430px] flex-col overflow-hidden rounded-3xl border border-primary/20 bg-[radial-gradient(ellipse_at_50%_30%,rgba(124,58,237,0.22),transparent_58%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--background)))] p-5 sm:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/5 blur-3xl"/><div className="relative flex items-center justify-between"><div><p className="text-sm font-medium">Your guide</p><p className="mt-1 text-xs text-muted-foreground">Provisional avatar rendering</p></div><span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-primary">{listening ? 'Listening' : speaking ? 'Speaking' : 'Ready'}</span></div>
          <div className={`relative mx-auto my-6 flex w-full max-w-[330px] flex-1 items-center justify-center ${speaking || listening ? 'avatar-glow-active' : ''}`} aria-label="Abstract cosmic avatar"><div className="absolute aspect-square w-[82%] rounded-full border border-cyan-300/20 avatar-orbit"/><div className="absolute aspect-square w-[65%] rounded-full border border-violet-300/20 avatar-orbit-reverse"/><div className="relative flex aspect-square w-[54%] items-center justify-center rounded-full border border-violet-200/30 bg-gradient-to-br from-violet-500/25 via-slate-950 to-cyan-400/20 shadow-[0_0_70px_rgba(124,58,237,0.2)]"><svg viewBox="0 0 220 220" role="img" aria-label="Abstract lion face made of cosmic light" className="w-[78%] drop-shadow-[0_0_18px_rgba(103,232,249,0.4)]"><defs><linearGradient id="mane" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c4b5fd"/><stop offset=".52" stopColor="#8b5cf6"/><stop offset="1" stopColor="#22d3ee"/></linearGradient><linearGradient id="face" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stopColor="#f5f3ff"/><stop offset="1" stopColor="#a5f3fc"/></linearGradient></defs><path d="M110 13 135 26 160 23 169 49 192 64 183 91 199 114 180 136 179 165 150 174 132 201 107 190 81 202 66 177 37 170 39 140 18 120 33 95 25 68 51 51 59 25 88 28Z" fill="url(#mane)"/><path d="M110 43 136 53 156 76 151 110 164 129 148 157 125 170 110 163 95 170 72 157 56 129 69 110 64 76 84 53Z" fill="url(#face)"/><path d="M76 101q14-12 28 0m12 0q14-12 28 0" fill="none" stroke="#312e81" strokeWidth="6" strokeLinecap="round"/><path d="m110 119-8 8q8 8 16 0Zm0 8v10m0 0q-13 13-25 1m25-1q13 13 25 1" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round"/><circle cx="86" cy="101" r="3" fill="#22d3ee"/><circle cx="134" cy="101" r="3" fill="#22d3ee"/></svg></div><div className="absolute bottom-[13%] rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-300">Cosmic guide · concept art</div></div>
          <div className="relative flex flex-wrap items-center justify-center gap-3"><button type="button" onClick={toggleListening} aria-pressed={listening} className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white ${listening ? 'bg-rose-500' : 'bg-gradient-to-r from-primary to-violet-500'}`}>{listening ? <MicOff className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}{listening ? 'Stop listening' : 'Talk to your guide'}</button><button type="button" onClick={toggleVoice} aria-label={voiceEnabled ? 'Mute spoken responses' : 'Enable spoken responses'} className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">{voiceEnabled ? <Volume2 className="h-5 w-5"/> : <VolumeX className="h-5 w-5"/>}</button></div>
          <p className="relative mt-3 text-center text-xs text-muted-foreground" aria-live="polite">{notice}</p>{!voiceSupported && <p className="relative mt-1 text-center text-xs text-amber-200/80">Speech recognition unavailable; text chat is ready.</p>}<p className="relative mt-2 text-center text-[11px] text-muted-foreground/80">Illustrative new interface art — not recovered original character canon.</p>
        </section>
        <section className="flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-card/70 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><h2 className="font-semibold">Conversation</h2><p className="mt-0.5 text-xs text-muted-foreground">Voice and text, in one place</p></div><div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Globe2 className="h-4 w-4 text-cyan-300"/>App navigator</div></div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite" aria-label="Assistant conversation">{messages.map((message) => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-white/10 bg-background/80'}`}><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-65">{message.role === 'user' ? 'You' : 'Guide'}</p>{message.text}</div></div>)}{interim && <div className="mr-auto rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100/80">{interim}…</div>}<div ref={messagesEndRef}/></div>
          {pendingAction && <div className="mx-4 mb-3 rounded-xl border border-cyan-300/25 bg-cyan-300/5 p-3 sm:mx-5"><p className="mb-2 text-xs text-muted-foreground">External navigation waits for your confirmation:</p><button type="button" onClick={openSearch} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950"><Search className="h-4 w-4"/>{pendingAction.label}<ExternalLink className="h-3.5 w-3.5"/></button></div>}
          <form onSubmit={submitText} className="border-t border-white/10 p-4 sm:p-5"><label htmlFor="assistant-message" className="sr-only">Message your browser assistant</label><div className="flex gap-2 rounded-2xl border border-white/10 bg-background/70 p-2 focus-within:ring-2 focus-within:ring-primary/60"><input ref={inputRef} id="assistant-message" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Say “open quantum vault” or ask me to read this page…" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"/><button type="submit" disabled={!input.trim()} aria-label="Send message" className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"><ArrowUpRight className="h-5 w-5"/></button></div><div className="mt-3 flex flex-wrap gap-2">{['Open dashboard', 'Open quantum vault', 'Read this page'].map((suggestion) => <button key={suggestion} type="button" onClick={() => { setInput(suggestion); inputRef.current?.focus(); }} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">{suggestion}</button>)}</div><p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Voice navigation covers every app page. It reads only the current app page. External searches require your click; no wallet, payment, account, or other-tab controls.</p></form>
        </section>
      </div>
      <style jsx>{`.avatar-orbit{animation:orbit 22s linear infinite}.avatar-orbit-reverse{animation:orbit 30s linear infinite reverse}.avatar-glow-active{filter:drop-shadow(0 0 24px rgba(34,211,238,.27))}@keyframes orbit{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.avatar-orbit,.avatar-orbit-reverse{animation:none}}`}</style>
    </div>
  );
}
