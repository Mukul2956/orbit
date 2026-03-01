"use client";
import { useState } from "react";
import {
  Settings, User, Bell, Shield,
  Users, Key, Trash2, Check, Upload, Plus
} from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

type SettingsTab = "profile" | "notifications" | "security" | "team";

const TABS: { key: SettingsTab; label: string; icon: typeof Settings }[] = [
  { key: "profile",       label: "Profile",       icon: User    },
  { key: "notifications", label: "Notifications", icon: Bell    },
  { key: "security",      label: "Security",      icon: Shield  },
  { key: "team",          label: "Team",          icon: Users   },
];

const TEAM_MEMBERS = [
  { name: "Mukul Singh",          email: "mukul@synapse.io",    role: "Owner",  avatar: "MS", status: "active"  },
  { name: "Sayantan Mandal",      email: "sayantan@synapse.io", role: "Admin",  avatar: "SM", status: "active"  },
  { name: "Praneeth Yeddu",       email: "praneeth@synapse.io", role: "Editor", avatar: "PY", status: "active"  },
  { name: "Dibya Debashish Bhoi", email: "dibya@synapse.io",    role: "Editor", avatar: "DB", status: "active"  },
];

const NOTIF_SETTINGS = [
  { label: "Brief generated",          sub: "When Genesis creates a content brief",        enabled: true  },
  { label: "Content ready",            sub: "When Forge finishes generating content",       enabled: true  },
  { label: "Post published",           sub: "Confirmation when Orbit publishes",            enabled: false },
  { label: "Analytics report",         sub: "Weekly Pulse digest delivered every Monday",   enabled: true  },
  { label: "Trend alerts",             sub: "When Genesis detects emerging opportunities",  enabled: true  },
  { label: "Team activity",            sub: "When team members create or edit content",     enabled: false },

];

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [notifs, setNotifs] = useState(NOTIF_SETTINGS.map(n => n.enabled));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-[1000px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.25)] flex items-center justify-center">
          <Settings size={18} className="text-[#818CF8]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Settings</h1>
          <p className="text-sm text-[var(--text-secondary)]">Manage your account, team, and preferences.</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="flex flex-col gap-0.5">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                  tab === key
                    ? "bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] text-[#818CF8]"
                    : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {tab === "profile" && (
            <>
              <Card padding="lg">
                <CardHeader><CardTitle>Profile information</CardTitle></CardHeader>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xl font-bold">
                    MS
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Profile photo</p>
                    <p className="text-xs text-[var(--text-muted)] mb-2">JPG, PNG or GIF · Max 5MB</p>
                    <Button variant="secondary" size="sm" icon={<Upload size={12} />}>Upload photo</Button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: "First name",    value: "Mukul" },
                    { label: "Last name",     value: "Singh" },
                    { label: "Email address", value: "mukul@synapse.io" },
                    { label: "Job title",     value: "Head of Content" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <label className="text-xs text-[var(--text-muted)] block mb-1.5">{label}</label>
                      <input defaultValue={value} className="input-base text-sm" />
                    </div>
                  ))}
                </div>
              </Card>

              <Card padding="lg">
                <CardHeader><CardTitle>Brand voice</CardTitle><Badge variant="default">Custom</Badge></CardHeader>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1.5">Brand description</label>
                    <textarea
                      defaultValue="Acme Corp creates tools that help modern teams move faster. We value clarity, precision, and a touch of wit. We write like smart humans, not corporate robots."
                      className="input-base text-sm resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1.5">Default tone</label>
                      <select className="input-base text-sm"><option>Professional</option><option>Casual</option><option>Authoritative</option></select>
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)] block mb-1.5">Industry</label>
                      <select className="input-base text-sm"><option>Technology</option><option>Marketing</option><option>Finance</option></select>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="flex justify-end">
                <Button variant="primary" onClick={handleSave} icon={saved ? <Check size={13} /> : undefined}>
                  {saved ? "Saved!" : "Save changes"}
                </Button>
              </div>
            </>
          )}

          {tab === "notifications" && (
            <Card padding="lg">
              <CardHeader><CardTitle>Notification preferences</CardTitle></CardHeader>
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {NOTIF_SETTINGS.map(({ label, sub }, i) => (
                  <li key={label} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm text-[var(--text-primary)] font-medium">{label}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>
                    </div>
                    <button
                      onClick={() => setNotifs(n => n.map((v, j) => j === i ? !v : v))}
                      className={`relative w-10 h-5.5 rounded-full transition-all ${notifs[i] ? "bg-[#6366F1]" : "bg-[var(--bg-muted)]"}`}
                      style={{ height: "22px" }}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifs[i] ? "left-[22px]" : "left-[2px]"}`} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {tab === "security" && (
            <>
              <Card padding="lg">
                <CardHeader><CardTitle>Password</CardTitle></CardHeader>
                <div className="flex flex-col gap-3 max-w-sm">
                  {["Current password", "New password", "Confirm new password"].map(l => (
                    <div key={l}>
                      <label className="text-xs text-[var(--text-muted)] block mb-1.5">{l}</label>
                      <input type="password" className="input-base text-sm" />
                    </div>
                  ))}
                  <Button variant="primary" size="sm" className="w-fit mt-1">Update password</Button>
                </div>
              </Card>
              <Card padding="lg">
                <CardHeader><CardTitle>Two-factor authentication</CardTitle><Badge variant="warning">Recommended</Badge></CardHeader>
                <p className="text-sm text-[var(--text-secondary)] mb-4">Add an additional layer of security to your account using a one-time password.</p>
                <Button variant="secondary" size="sm" icon={<Shield size={13} />}>Enable 2FA</Button>
              </Card>
              <Card padding="lg">
                <CardHeader><CardTitle>API keys</CardTitle></CardHeader>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)] mb-3">
                  <Key size={13} className="text-[var(--text-muted)]" />
                  <code className="text-xs text-[var(--text-secondary)] flex-1">syn_live_••••••••••••••••••••••••••••••4f2a</code>
                  <button className="text-xs text-[#818CF8] hover:underline">Reveal</button>
                </div>
                <Button variant="secondary" size="sm" icon={<Plus size={12} />} className="text-[10px]">Generate new key</Button>
              </Card>
            </>
          )}



          {tab === "team" && (
            <Card padding="lg">
              <CardHeader>
                <CardTitle>Team members</CardTitle>
                <Button variant="primary" size="sm" icon={<Users size={12} />}>Invite member</Button>
              </CardHeader>
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {TEAM_MEMBERS.map(({ name, email, role, avatar, status }) => (
                  <li key={email} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{email}</p>
                    </div>
                    <Badge variant={status === "pending" ? "warning" : "default"}>{role}</Badge>
                    <button className="p-1.5 hover:bg-white/5 rounded-md text-[var(--text-muted)] hover:text-[#F87171] transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

