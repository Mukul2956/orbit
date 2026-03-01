import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Badge from "@/components/ui/Badge";
import {
  FlaskConical, Hammer, Activity, Globe2,
  ArrowRight, Sparkles, Check, ChevronRight
} from "lucide-react";

const MODULES = [
  {
    key: "genesis",
    name: "Genesis",
    tagline: "Ideation & Research",
    description:
      "Discover emerging trends before they peak. Analyze 100K+ posts per hour across every major platform and surface content opportunities with quantified scoring.",
    icon: FlaskConical,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.2)",
    features: ["Real-time trend ingestion", "Opportunity scoring engine", "AI creative brief generator", "Semantic gap analysis"],
  },
  {
    key: "forge",
    name: "Forge",
    tagline: "Multi-Modal Content Studio",
    description:
      "Turn a single brief into a full campaign — text, images, video, and audio — all brand-consistent and platform-ready in minutes, not days.",
    icon: Hammer,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    features: ["Text, image, video & audio", "Brand voice enforcement", "Platform-specific formatting", "One-click repurposing"],
  },
  {
    key: "pulse",
    name: "Pulse",
    tagline: "Analytics & Evolution",
    description:
      "Track every piece of content in real time. Understand what resonates, why it does, and exactly where to iterate for maximum performance.",
    icon: Activity,
    color: "#10B981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
    features: ["Real-time performance metrics", "Cross-platform attribution", "Content evolution scoring", "Custom analytics dashboards"],
  },
  {
    key: "orbit",
    name: "Orbit",
    tagline: "Distribution & Scheduling",
    description:
      "Publish to every platform from one place. Smart scheduling finds the best times for your audience while automated workflows handle the rest.",
    icon: Globe2,
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.2)",
    features: ["Smart publish scheduling", "10+ platform integrations", "Automated distribution queues", "UTM & tracking built-in"],
  },
];



const STEPS = [
  { n: "01", title: "Discover", body: "Genesis monitors trends across platforms and pinpoints the exact topics your audience will care about next." },
  { n: "02", title: "Create",   body: "Forge transforms your brief into polished, multi-format content — video, copy, visuals, and audio — automatically." },
  { n: "03", title: "Analyze",  body: "Pulse tracks every published piece in real time, correlating engagement signals with content decisions." },
  { n: "04", title: "Scale",    body: "Orbit distributes across all your channels at optimal times, so every piece reaches its full potential." },
];





export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] overflow-x-hidden">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="absolute inset-0 grid-pattern opacity-60 pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] mb-8">
            <Sparkles size={12} className="text-[#818CF8]" />
            <span className="text-xs font-medium text-[#818CF8]">Now in early access</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6">
            <span className="text-[var(--text-primary)]">Content that keeps<br/>up with the world.</span>
          </h1>

          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed mb-10">
            Synapse connects trend discovery, multi-modal production, real-time analytics, and cross-platform distribution
            in one seamless workflow — so you spend less time coordinating and more time creating.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {[
              { label: "Genesis", variant: "genesis" as const },
              { label: "Forge",   variant: "forge"   as const },
              { label: "Pulse",   variant: "pulse"   as const },
              { label: "Orbit",   variant: "orbit"   as const },
            ].map(({ label, variant }) => (
              <Badge key={label} variant={variant} dot>{label}</Badge>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4A017] text-black text-sm font-semibold hover:bg-[#E8BA25] transition-all hover:shadow-[0_0_30px_rgba(212,160,23,0.45)] group"
            >
              Get started
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--border-strong)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
            >
              See how it works
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Product preview */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
              <span className="w-3 h-3 rounded-full bg-[#F87171]/60" />
              <span className="w-3 h-3 rounded-full bg-[#FBBF24]/60" />
              <span className="w-3 h-3 rounded-full bg-[#34D399]/60" />
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-0.5 rounded-md bg-[var(--bg-muted)] text-[10px] text-[var(--text-muted)]">
                  app.synapse.io/dashboard
                </div>
              </div>
            </div>
            <div className="flex h-72 sm:h-96">
              <div className="w-40 border-r border-[var(--border)] bg-[var(--bg-surface)] px-3 py-4 hidden sm:flex flex-col gap-1">
                {["Overview", "Genesis", "Forge", "Pulse", "Orbit"].map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium ${
                      i === 0 ? "bg-[rgba(99,102,241,0.12)] text-[#818CF8]" : "text-[var(--text-muted)]"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      i === 1 ? "bg-[#8B5CF6]" : i === 2 ? "bg-[#F59E0B]" : i === 3 ? "bg-[#10B981]" : i === 4 ? "bg-[#3B82F6]" : "bg-[#6366F1]"
                    }`} />
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-4 sm:p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Good morning, Mukul</p>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">Platform Overview</h2>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] text-[10px] text-[#818CF8] font-medium">
                    Feb 27, 2026
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Trends tracked",   value: "2,841", delta: "+12%", color: "#6366F1" },
                    { label: "Briefs generated", value: "194",   delta: "+8%",  color: "#8B5CF6" },
                    { label: "Published today",  value: "47",    delta: "+23%", color: "#10B981" },
                    { label: "Avg. engagement",  value: "6.8%",  delta: "+1.2%",color: "#3B82F6" },
                  ].map(({ label, value, delta, color }) => (
                    <div key={label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3">
                      <p className="text-[9px] text-[var(--text-muted)] mb-1">{label}</p>
                      <p className="text-sm font-bold" style={{ color }}>{value}</p>
                      <p className="text-[9px] text-[#34D399] mt-0.5">{delta}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 h-20 flex items-end gap-1 overflow-hidden">
                  {[40,55,45,70,60,80,65,90,75,95,82,98].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{
                        height: `${h}%`,
                        background: i === 11
                          ? "linear-gradient(to top, #6366F1, #818CF8)"
                          : `rgba(99,102,241,${0.2 + (i / 11) * 0.25})`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-lg">
            <div className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse-slow" />
            <span className="text-xs text-[var(--text-secondary)]">
              <span className="text-[var(--text-primary)] font-semibold">847 trends</span> discovered in the last hour
            </span>
          </div>
        </div>
      </section>



      {/* ── MODULES ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="default" className="mb-4">Platform modules</Badge>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight mb-4">Four tools. One workflow.</h2>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              Each module is powerful on its own. Together, they form the only content platform that covers the full lifecycle.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {MODULES.map(({ key, name, tagline, description, icon: Icon, color, bg, border, features }) => (
              <div
                key={key}
                className="rounded-2xl border p-6 transition-all duration-200 hover:scale-[1.01] group"
                style={{ background: bg, borderColor: border }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, border: `1px solid ${border}` }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">{name}</h3>
                      <span className="text-xs text-[var(--text-muted)]">· {tagline}</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
                  </div>
                </div>
                <ul className="grid grid-cols-2 gap-1.5 mb-5">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                      <Check size={11} style={{ color }} className="flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-medium transition-all group-hover:gap-1.5" style={{ color }}>
                  Explore {name} <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="modules" className="py-24 px-6 relative">
        <div className="absolute inset-0 dot-pattern opacity-40 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="default" className="mb-4">How it works</Badge>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight mb-4">From idea to impact in four steps.</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="relative">
                <div className="text-xs font-mono text-[var(--accent)] mb-3">{n}</div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>





      {/* ── FINAL CTA ── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] pointer-events-none" />
            <div className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-12">
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.3)] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="#6366F1" strokeWidth="1.5" strokeLinejoin="round"/>
                    <circle cx="8" cy="8" r="2" fill="#6366F1"/>
                  </svg>
                </div>
              </div>
              <h2 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight mb-4">
                Your content workflow, finally complete.
              </h2>
              <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
                Synapse brings trend discovery, content creation, analytics, and distribution into a single seamless workflow.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#D4A017] text-black font-semibold text-sm hover:bg-[#E8BA25] transition-all hover:shadow-[0_0_30px_rgba(212,160,23,0.45)] group"
              >
                Open dashboard
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[var(--border)] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.3)] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="#6366F1" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="8" cy="8" r="2" fill="#6366F1"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">Synapse</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">© 2026 Synapse. Prototype — work in progress.</p>
        </div>
      </footer>
    </div>
  );
}
