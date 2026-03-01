"use client";
import { useState } from "react";
import {
  Hammer, FileText, Image as ImageIcon, Video, Music,
  Wand2, Zap, ChevronDown, RefreshCw, Download, Send,
  Copy, Check, Layers, Palette, Globe2, Clock, ArrowRight
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Modality = "text" | "image" | "video" | "audio";
type Tone = "professional" | "casual" | "authoritative" | "friendly";

const MODALITIES: { key: Modality; label: string; icon: typeof FileText; color: string; bg: string }[] = [
  { key: "text",  label: "Text",  icon: FileText,   color: "#F59E0B", bg: "rgba(245,158,11,0.1)"  },
  { key: "image", label: "Image", icon: ImageIcon,  color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
  { key: "video", label: "Video", icon: Video,      color: "#3B82F6", bg: "rgba(59,130,246,0.1)"  },
  { key: "audio", label: "Audio", icon: Music,      color: "#10B981", bg: "rgba(16,185,129,0.1)"  },
];

const PLATFORMS = ["Twitter / X", "LinkedIn", "Instagram", "TikTok", "YouTube", "Blog", "Newsletter"];

const GENERATED_TEXT = `# Why Agentic AI Is Changing How Teams Work in 2026

The way we think about software at work is undergoing a quiet but fundamental shift. For years, productivity tools asked you to initiate every action: open this app, click this button, write this prompt. The burden of orchestration sat entirely with you.

Agentic AI systems flip that model. Instead of waiting to be asked, they observe goals, break them into tasks, and execute — coordinating across tools, APIs, and data sources without a human in the loop for every step.

## What makes an AI agent different

A copilot is a tool that enhances what you can do. An agent is a system that can work *towards* a goal — deciding what steps to take, what tools to use, and what to do when something goes wrong.

This distinction matters enormously for teams. The cost of automation is no longer "write the right prompt." It's "define the outcome clearly and trust the system to figure out how."

## Where it's actually working today

Early adopters aren't the outliers you might expect. Operations teams at mid-sized companies are using agents to...`;

const RECENT_GENERATIONS = [
  { title: "5 Productivity Hacks for 2026", type: "text",  platform: "LinkedIn", status: "ready", time: "2m ago",  words: 1840 },
  { title: "Spring Campaign Visuals",       type: "image", platform: "Instagram",status: "ready", time: "12m ago", words: 4 },
  { title: "Agentic AI explainer video",    type: "video", platform: "YouTube",  status: "rendering",time: "18m ago",words: 0 },
  { title: "Weekly podcast intro",          type: "audio", platform: "Spotify",  status: "ready", time: "1h ago",  words: 0 },
];

const TYPE_ICON: Record<string, typeof FileText> = {
  text: FileText, image: ImageIcon, video: Video, audio: Music,
};
const TYPE_COLOR: Record<string, string> = {
  text: "#F59E0B", image: "#8B5CF6", video: "#3B82F6", audio: "#10B981",
};

export default function ForgePage() {
  const [modality, setModality] = useState<Modality>("text");
  const [tone, setTone] = useState<Tone>("professional");
  const [platform, setPlatform] = useState("LinkedIn");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(true);
  const [copied, setCopied] = useState(false);
  const [brief, setBrief] = useState("Why Agentic AI Is Changing How Teams Work in 2026 — target operations managers, 2000 words, include real examples and risks.");

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2200);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] flex items-center justify-center">
            <Hammer size={18} className="text-[#FCD34D]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Forge</h1>
            <p className="text-sm text-[var(--text-secondary)]">Multi-Modal Content Creation Studio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="forge" dot>100 concurrent workflows</Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Left panel — input */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Brief */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>Content DNA</CardTitle>
              <Badge variant="genesis">From Genesis</Badge>
            </CardHeader>
            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              className="input-base resize-none text-sm leading-relaxed"
              rows={4}
              placeholder="Describe your content, paste a brief, or import from Genesis…"
            />
          </Card>

          {/* Modality selector */}
          <Card padding="md">
            <CardHeader><CardTitle>Output format</CardTitle></CardHeader>
            <div className="grid grid-cols-4 gap-2">
              {MODALITIES.map(({ key, label, icon: Icon, color, bg }) => (
                <button
                  key={key}
                  onClick={() => setModality(key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    modality === key
                      ? "border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.08)]"
                      : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-white/5"
                  }`}
                >
                  <Icon size={15} style={{ color: modality === key ? color : "var(--text-muted)" }} />
                  <span className="text-[10px] font-medium text-[var(--text-secondary)]">{label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Options */}
          <Card padding="md">
            <CardHeader><CardTitle>Options</CardTitle></CardHeader>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Platform</label>
                <div className="relative">
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value)}
                    className="input-base pr-8 appearance-none text-sm"
                  >
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Tone</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["professional", "casual", "authoritative", "friendly"] as Tone[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                        tone === t
                          ? "bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] text-[#FCD34D]"
                          : "border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Word count target</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={100} max={5000} defaultValue={2000} className="flex-1 accent-[#F59E0B]" />
                  <span className="text-xs text-[var(--text-secondary)] w-14 text-right">~2,000</span>
                </div>
              </div>
            </div>
          </Card>

          <Button
            variant="primary"
            size="lg"
            loading={generating}
            icon={<Wand2 size={15} />}
            className="w-full bg-[#F59E0B] hover:bg-[#FCD34D] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] text-black font-semibold"
            onClick={handleGenerate}
          >
            {generating ? "Generating…" : "Generate content"}
          </Button>
        </div>

        {/* Right panel — output */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {generated && (
            <Card padding="none">
              {/* Output toolbar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-1.5">
                  <FileText size={13} className="text-[#FCD34D]" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">Article · LinkedIn</span>
                </div>
                <Badge variant="forge" className="text-[10px]">~1,840 words</Badge>
                <div className="ml-auto flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" icon={<RefreshCw size={12} />} onClick={handleGenerate} loading={generating}>
                    Regenerate
                  </Button>
                  <Button variant="ghost" size="sm" icon={copied ? <Check size={12} /> : <Copy size={12} />} onClick={handleCopy}>
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="ghost" size="sm" icon={<Download size={12} />}>Export</Button>
                  <Button variant="primary" size="sm" icon={<Send size={12} />} className="bg-[#3B82F6] hover:bg-[#60A5FA]">
                    Send to Orbit
                  </Button>
                </div>
              </div>

              {/* Generated content */}
              <div className="p-5 h-[460px] overflow-y-auto">
                <pre className="text-sm text-[var(--text-secondary)] leading-7 whitespace-pre-wrap font-sans">
                  {GENERATED_TEXT}
                </pre>
                <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)]">
                  <Layers size={12} className="text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-muted)]">Content continues for ~1,400 more words. Scroll or export to view all.</span>
                </div>
              </div>

              {/* Brand voice score */}
              <div className="px-4 py-3 border-t border-[var(--border)] flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Palette size={12} className="text-[var(--text-muted)]" />
                  <span className="text-[11px] text-[var(--text-muted)]">Brand voice match</span>
                </div>
                <div className="flex-1 progress-bar">
                  <div className="progress-fill" style={{ width: "97%", background: "linear-gradient(90deg,#F59E0B,#FCD34D)" }} />
                </div>
                <span className="text-xs font-medium text-[#FCD34D]">97%</span>
                <div className="flex items-center gap-1.5 ml-2">
                  <Globe2 size={12} className="text-[var(--text-muted)]" />
                  <span className="text-[11px] text-[var(--text-muted)]">SEO score</span>
                </div>
                <div className="w-16 progress-bar">
                  <div className="progress-fill" style={{ width: "88%", background: "linear-gradient(90deg,#8B5CF6,#A78BFA)" }} />
                </div>
                <span className="text-xs font-medium text-[#A78BFA]">88</span>
              </div>
            </Card>
          )}

          {/* Platform previews strip */}
          {generated && (
            <Card padding="md">
              <CardHeader>
                <CardTitle>Platform variants</CardTitle>
                <span className="text-xs text-[var(--text-muted)]">Adapted from same brief</span>
              </CardHeader>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { platform: "Twitter thread", chars: "12 tweets", icon: "𝕏",  color: "#818CF8" },
                  { platform: "Instagram caption", chars: "2,200 chars", icon: "IG", color: "#F59E0B" },
                  { platform: "Newsletter",     chars: "~850 words", icon: "✉",  color: "#10B981" },
                ].map(({ platform: p, chars, icon, color }) => (
                  <button
                    key={p}
                    className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] text-left hover:border-[var(--border-strong)] hover:bg-[var(--bg-card)] transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base">{icon}</span>
                      <ArrowRight size={11} style={{ color }} />
                    </div>
                    <p className="text-xs font-medium text-[var(--text-primary)] mb-0.5">{p}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{chars}</p>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Recent generations */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>Recent generations</CardTitle>
              <Badge variant="default">{RECENT_GENERATIONS.length}</Badge>
            </CardHeader>
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {RECENT_GENERATIONS.map(({ title, type, platform: p, status, time }) => {
                const Icon = TYPE_ICON[type];
                const color = TYPE_COLOR[type];
                return (
                  <li key={title} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                      <Icon size={13} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{title}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{p}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-medium ${status === "ready" ? "text-[#34D399]" : "text-[#FBBF24]"}`}>
                        {status}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1"><Clock size={9} />{time}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
