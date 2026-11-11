"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Layers,
  Database,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  UserCheck,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Filter,
  Eye,
  Sliders,
  Trash2,
  UserX,
  Copy,
  Check,
  X,
  FileText
} from "lucide-react";

const API_BASE = "http://localhost:8000/api";

interface Candidate {
  id: number;
  email: string;
  pattern: string;
  status: string;
  mx_found: boolean;
  smtp_code: number | null;
}

interface Lead {
  id: number;
  workspace_id: number;
  source: string;
  full_name: string;
  first_name: string;
  last_name: string;
  job_title: string;
  company_name: string;
  company_domain: string;
  city: string;
  state: string;
  country: string;
  linkedin_url: string;
  email: string | null;
  email_status: string;
  email_score: number;
  outreach_status: string;
  enrichment_data: string | null;
  candidates: Candidate[];
}

interface Workspace {
  id: number;
  slug: string;
  name: string;
  domain: string;
  tagline: string;
  target_audience: string;
  value_prop: string;
  is_active: boolean;
}

interface EmailDraft {
  id: number;
  workspace_id: number;
  lead_id: number;
  step: number;
  subject: string;
  body_text: string;
  hook_rationale: string;
  status: string;
  approved_by: string | null;
  sent_at: string | null;
}

interface Stats {
  total_leads: number;
  verified_leads: number;
  total_drafts: number;
  approved_drafts: number;
  sent_emails: number;
}

export default function Dashboard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWs, setCurrentWs] = useState<Workspace | null>(null);
  const [stats, setStats] = useState<Stats>({
    total_leads: 0,
    verified_leads: 0,
    total_drafts: 0,
    approved_drafts: 0,
    sent_emails: 0,
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [activeTab, setActiveTab] = useState<"leads" | "drafts" | "operator" | "suppression">("leads");
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Research & Pitch Modal
  const [pitchModalLead, setPitchModalLead] = useState<Lead | null>(null);
  const [pitchModalDossier, setPitchModalDossier] = useState<any>(null);
  const [pitchModalEmail, setPitchModalEmail] = useState<{
    subject: string;
    body_text: string;
    recipient: string;
    draft_id?: number;
    status?: string;
  } | null>(null);
  const [pitchLoading, setPitchLoading] = useState(false);

  // Clay Import State
  const [clayImporting, setClayImporting] = useState(false);
  const [batchResearching, setBatchResearching] = useState(false);

  // Operator State
  const [operatorProfile, setOperatorProfile] = useState<any>(null);

  // Fetch initial data
  useEffect(() => {
    fetchWorkspaces();
    fetchOperatorProfile();
  }, []);

  useEffect(() => {
    if (currentWs) {
      loadWorkspaceData(currentWs.id);
    }
  }, [currentWs]);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch(`${API_BASE}/workspaces`);
      const data = await res.json();
      setWorkspaces(data);
      if (data.length > 0 && !currentWs) {
        setCurrentWs(data[0]);
      }
    } catch (e) {
      console.error("Error fetching workspaces", e);
    }
  };

  const loadWorkspaceData = async (wsId: number) => {
    setLoading(true);
    try {
      const [sRes, lRes, dRes] = await Promise.all([
        fetch(`${API_BASE}/workspaces/${wsId}/stats`),
        fetch(`${API_BASE}/leads?workspace_id=${wsId}&limit=100`),
        fetch(`${API_BASE}/drafts?workspace_id=${wsId}&limit=100`),
      ]);
      setStats(await sRes.json());
      setLeads(await lRes.json());
      setDrafts(await dRes.json());
    } catch (e) {
      console.error("Error loading workspace data", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperatorProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/operator`);
      setOperatorProfile(await res.json());
    } catch (e) {
      console.error("Error fetching operator profile", e);
    }
  };

  const copyToClipboard = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenPitchModal = async (lead: Lead) => {
    setPitchModalLead(lead);
    setPitchLoading(true);

    try {
      // Check if research already exists
      const res = await fetch(`${API_BASE}/leads/${lead.id}/research-and-pitch`, {
        method: "POST",
      });
      const data = await res.json();
      setPitchModalDossier(data.dossier);
      setPitchModalEmail(data.pitch_email);

      // Refresh lead in state
      if (currentWs) loadWorkspaceData(currentWs.id);
    } catch (e) {
      setActionMessage(`Error generating pitch: ${e}`);
    } finally {
      setPitchLoading(false);
    }
  };

  const handleSelectCandidateEmail = async (leadId: number, email: string) => {
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/select-email`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, status: "selected" }),
      });
      const data = await res.json();
      setActionMessage(`Updated work email for Lead #${leadId} to: ${data.selected_email}`);
      if (pitchModalLead && pitchModalLead.id === leadId) {
        setPitchModalLead({ ...pitchModalLead, email: data.selected_email });
        if (pitchModalEmail) {
          setPitchModalEmail({ ...pitchModalEmail, recipient: data.selected_email });
        }
      }
      if (currentWs) loadWorkspaceData(currentWs.id);
    } catch (e) {
      setActionMessage(`Failed to update email: ${e}`);
    }
  };

  const handleVerifyLead = async (leadId: number) => {
    try {
      setActionMessage(`Verifying DNS MX & RFC 5321 SMTP handshake for Lead #${leadId}...`);
      const res = await fetch(`${API_BASE}/leads/${leadId}/verify`, { method: "POST" });
      const data = await res.json();
      setActionMessage(`Lead #${leadId} verified! Result: ${data.email_status} (${data.selected_email || "no email"})`);
      if (currentWs) loadWorkspaceData(currentWs.id);
    } catch (e) {
      setActionMessage(`Verification failed: ${e}`);
    }
  };

  const handleBatchResearch = async () => {
    if (!currentWs) return;
    setBatchResearching(true);
    setActionMessage("Synthesizing research & generating ready-to-send pitches for top 30 leads...");
    try {
      const res = await fetch(`${API_BASE}/leads/batch-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: currentWs.id, limit: 30 }),
      });
      const data = await res.json();
      setActionMessage(`Research complete! Generated ready-to-send pitches for ${data.researched_count} leads.`);
      loadWorkspaceData(currentWs.id);
    } catch (e) {
      setActionMessage(`Batch research error: ${e}`);
    } finally {
      setBatchResearching(false);
    }
  };

  const handleApproveDraft = async (draftId: number, approve: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/drafts/${draftId}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: approve }),
      });
      const data = await res.json();
      setActionMessage(`Draft #${draftId} marked as ${data.draft_status}!`);
      if (pitchModalEmail && pitchModalEmail.draft_id === draftId) {
        setPitchModalEmail({ ...pitchModalEmail, status: data.draft_status });
      }
      if (currentWs) loadWorkspaceData(currentWs.id);
    } catch (e) {
      setActionMessage(`Approval update failed: ${e}`);
    }
  };

  const handleSendDraft = async (draftId: number) => {
    try {
      setActionMessage(`Initiating outbound dispatch for Draft #${draftId}...`);
      const res = await fetch(`${API_BASE}/drafts/${draftId}/send`, { method: "POST" });
      const data = await res.json();
      if (data.status === "dry_run") {
        setActionMessage(`[Safe Dry Run Mode] ${data.message}`);
      } else if (data.status === "success") {
        setActionMessage(`Dispatched successfully to ${data.recipient || "prospect"}!`);
      } else {
        setActionMessage(`Dispatch note: ${data.message || JSON.stringify(data)}`);
      }
      if (currentWs) loadWorkspaceData(currentWs.id);
    } catch (e) {
      setActionMessage(`Send failed: ${e}`);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.full_name?.toLowerCase().includes(q) ||
      l.company_name?.toLowerCase().includes(q) ||
      l.job_title?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.company_domain?.toLowerCase().includes(q) ||
      l.city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-brand-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-base tracking-tight text-white">Personal GTM OS</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ₹0/mo Local
                </span>
              </div>
              <p className="text-xs text-slate-400">AIVI Intelligence Private Limited</p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-2" />

          {/* Workspace Switcher */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Workspace:</span>
            <div className="flex space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setCurrentWs(ws)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                    currentWs?.id === ws.id
                      ? "bg-brand-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {ws.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBatchResearch}
            disabled={batchResearching}
            className="flex items-center space-x-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg border border-indigo-400/30 transition shadow-sm disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${batchResearching ? "animate-spin" : ""}`} />
            <span>{batchResearching ? "Researching..." : "Research Top 30 Leads"}</span>
          </button>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>1,000 Leads Synced</span>
          </div>
        </div>
      </header>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="bg-brand-950 border-b border-brand-800/60 px-6 py-2 flex items-center justify-between text-xs text-brand-200">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Workspace Summary Bar */}
        {currentWs && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-semibold text-white">{currentWs.name}</h1>
                <a
                  href={`https://${currentWs.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-400 hover:underline flex items-center space-x-1"
                >
                  <span>{currentWs.domain}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{currentWs.tagline}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-slate-400">Target ICP:</span>
              <p className="text-xs text-slate-300 max-w-md line-clamp-1">{currentWs.target_audience}</p>
            </div>
          </div>
        )}

        {/* 5-Metric Telemetry Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Leads</span>
              <Database className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1.5">{stats.total_leads}</div>
            <span className="text-[11px] text-slate-400">All with Visible Work Email</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-emerald-400 text-xs">
              <span>Verified / Direct</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1.5">{stats.verified_leads}</div>
            <span className="text-[11px] text-slate-400">Clay Direct / RFC Handshake</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-brand-400 text-xs">
              <span>Sequence Drafts</span>
              <Layers className="w-4 h-4 text-brand-400" />
            </div>
            <div className="text-2xl font-bold text-brand-400 mt-1.5">{stats.total_drafts}</div>
            <span className="text-[11px] text-slate-400">Ready to Send Pitch</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-amber-400 text-xs">
              <span>Approved by Human</span>
              <UserCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-1.5">{stats.approved_drafts}</div>
            <span className="text-[11px] text-slate-400">Mandatory Review Gate</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-indigo-400 text-xs">
              <span>Dispatched</span>
              <Send className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-indigo-400 mt-1.5">{stats.sent_emails}</div>
            <span className="text-[11px] text-slate-400">Via SMTP / Gmail</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab("leads")}
            className={`pb-3 transition-colors flex items-center space-x-2 ${
              activeTab === "leads"
                ? "border-b-2 border-brand-500 text-brand-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Leads, Work Emails & Research ({leads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("drafts")}
            className={`pb-3 transition-colors flex items-center space-x-2 ${
              activeTab === "drafts"
                ? "border-b-2 border-brand-500 text-brand-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Ready-to-Send Pitches ({drafts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("operator")}
            className={`pb-3 transition-colors flex items-center space-x-2 ${
              activeTab === "operator"
                ? "border-b-2 border-brand-500 text-brand-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Operator LinkedIn Studio</span>
          </button>

          <button
            onClick={() => setActiveTab("suppression")}
            className={`pb-3 transition-colors flex items-center space-x-2 ${
              activeTab === "suppression"
                ? "border-b-2 border-brand-500 text-brand-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserX className="w-4 h-4" />
            <span>Suppression List</span>
          </button>
        </div>

        {/* Tab 1: Leads, Work Emails & Research */}
        {activeTab === "leads" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, company, email, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 w-full focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">
                  Showing {filteredLeads.length} of {leads.length} leads
                </span>
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Contact & Title</th>
                      <th className="py-3 px-4">Company & Domain</th>
                      <th className="py-3 px-4">Work Email (Visible)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">HackMyWebsite Pitch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{lead.full_name}</div>
                          <div className="text-slate-400 text-[11px] line-clamp-1">{lead.job_title || "Tech Executive"}</div>
                          {lead.linkedin_url && (
                            <a
                              href={lead.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-400 hover:underline text-[10px] inline-flex items-center space-x-0.5 mt-0.5"
                            >
                              <span>LinkedIn Profile</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200">{lead.company_name}</div>
                          <div className="text-slate-400 text-[11px] font-mono">{lead.company_domain}</div>
                          <div className="text-slate-400 text-[10px]">
                            {[lead.city, lead.state, lead.country].filter(Boolean).join(", ")}
                          </div>
                        </td>

                        {/* Visible Work Email & Permutations Selector */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-xs font-semibold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-cyan-800/40">
                                {lead.email || "No email available"}
                              </span>

                              {lead.email && (
                                <button
                                  onClick={() => copyToClipboard(lead.email!, `lead-email-${lead.id}`)}
                                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                  title="Copy Work Email"
                                >
                                  {copiedId === `lead-email-${lead.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Dropdown for other candidate email permutations */}
                            {lead.candidates.length > 1 && (
                              <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                                <span>Switch:</span>
                                <select
                                  value={lead.email || ""}
                                  onChange={(e) => handleSelectCandidateEmail(lead.id, e.target.value)}
                                  className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-[10px] font-mono text-slate-300 focus:outline-none"
                                >
                                  {lead.candidates.map((c) => (
                                    <option key={c.id} value={c.email}>
                                      {c.email} ({c.pattern || "auto"})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                lead.email_status === "valid"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : lead.email_status === "candidate" || lead.email_status === "selected"
                                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                                  : lead.email_status === "mx_verified"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              }`}
                            >
                              {lead.email_status}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {lead.outreach_status === "researched"
                                ? "✨ Pitch Ready"
                                : lead.outreach_status === "drafted"
                                ? "📝 Drafted"
                                : "New"}
                            </div>
                          </div>
                        </td>

                        {/* Actions: Open Research & Pitch */}
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenPitchModal(lead)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-sm shadow-brand-500/20 transition border border-brand-400/30"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Research & Pitch</span>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          No leads match the query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Ready-to-Send Pitches (Drafts) */}
        {activeTab === "drafts" && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Human Gate Active:</strong> Review the tailored research pitch before dispatching. You can open
                  directly in your email client (`mailto:`) or approve for automated SMTP dispatch.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.map((draft) => {
                const lead = leads.find((l) => l.id === draft.lead_id);
                const mailtoUrl = lead?.email
                  ? `mailto:${lead.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body_text)}`
                  : "";

                return (
                  <div
                    key={draft.id}
                    className="border border-slate-800 bg-slate-900 rounded-xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/30">
                          {draft.step === 0 ? "Observation Pitch" : draft.step === 1 ? "Day 3 • Value" : "Day 7 • Breakup"}
                        </span>

                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                            draft.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : draft.status === "sent"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {draft.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-200">
                        <span className="text-slate-400">To:</span> <strong className="font-semibold text-white">{lead?.full_name}</strong> ({lead?.company_name})
                        <div className="font-mono text-cyan-300 text-[11px] mt-0.5">{lead?.email}</div>
                      </div>

                      <div className="text-xs text-white font-semibold line-clamp-1">
                        Subject: {draft.subject}
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {draft.body_text}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => copyToClipboard(`${draft.subject}\n\n${draft.body_text}`, `draft-copy-${draft.id}`)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center space-x-1"
                          title="Copy Subject and Body"
                        >
                          {copiedId === `draft-copy-${draft.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>Copy</span>
                        </button>

                        {mailtoUrl && (
                          <a
                            href={mailtoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs flex items-center space-x-1 font-medium"
                            title="Open in Apple Mail, Outlook or Gmail"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Mail App</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {draft.status === "approved" ? (
                          <button
                            onClick={() => handleApproveDraft(draft.id, false)}
                            className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApproveDraft(draft.id, true)}
                            className="text-[11px] px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium border border-amber-500/40"
                          >
                            Approve
                          </button>
                        )}

                        <button
                          onClick={() => handleSendDraft(draft.id)}
                          disabled={draft.status !== "approved"}
                          className="text-[11px] px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white font-medium border border-brand-500/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>SMTP</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {drafts.length === 0 && (
                <div className="col-span-3 text-center py-12 text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                  No pitches generated yet. In the Leads tab, click <strong>Research & Pitch</strong> on any contact!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Operator LinkedIn Studio */}
        {activeTab === "operator" && operatorProfile && (
          <div className="space-y-4 max-w-3xl">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">{operatorProfile.full_name}</h2>
                  <p className="text-xs text-brand-400 font-mono mt-0.5">{operatorProfile.title}</p>
                </div>
                <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                  <span className="text-xs text-emerald-400 font-medium">Readiness Score:</span>
                  <span className="text-sm font-bold text-emerald-400">{operatorProfile.readiness_score}/100</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Current Authority Headline</label>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-200">
                  {operatorProfile.headline}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Executive Summary / About</label>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap">
                  {operatorProfile.about}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Audit Insights & Recommendations</label>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300">
                  {operatorProfile.audit_notes}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Banner Design Prompt</label>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-brand-300 font-mono">
                  {operatorProfile.banner_suggestion}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Suppression & Compliance */}
        {activeTab === "suppression" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 max-w-2xl">
            <h2 className="text-sm font-semibold text-white">Automated Opt-Out & Suppression List</h2>
            <p className="text-xs text-slate-400">
              Contacts or domains listed here are automatically suppressed by the mailer engine. Any draft targeting these
              addresses is automatically cancelled before dispatch.
            </p>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-400 text-center">
              Zero active suppressions. When a prospect replies with "unsubscribe" or opts out, they are instantly added here.
            </div>
          </div>
        )}
      </main>

      {/* Slide-Over / Modal: Research & Ready-to-Send Pitch */}
      {pitchModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>{pitchModalLead.full_name}</span>
                    <span className="text-xs font-normal text-slate-400">• {pitchModalLead.job_title}</span>
                  </h2>
                  <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                    <span className="font-semibold text-slate-300">{pitchModalLead.company_name}</span>
                    <span>({pitchModalLead.company_domain})</span>
                    {pitchModalLead.linkedin_url && (
                      <a
                        href={pitchModalLead.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-400 hover:underline flex items-center space-x-0.5"
                      >
                        <span>LinkedIn</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPitchModalLead(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {pitchLoading ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Analyzing company attack surface and crafting HackMyWebsite pitch...</p>
                </div>
              ) : (
                <>
                  {/* Section 1: Research Dossier */}
                  {pitchModalDossier && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-brand-400 font-semibold tracking-wider flex items-center space-x-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Prospect Intelligence & Security Research</span>
                        </span>
                        <span className="text-[10px] bg-brand-500/10 text-brand-300 px-2 py-0.5 rounded border border-brand-500/20">
                          {pitchModalDossier.category}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 block text-[10px]">Business & Delivery Model</span>
                          <span className="font-medium text-slate-200">{pitchModalDossier.business_model}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 block text-[10px]">Recommended Pitch Angle</span>
                          <span className="font-medium text-indigo-300">{pitchModalDossier.pitch_angle}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-medium text-slate-300 block">Key Attack Surface Findings:</span>
                        <ul className="space-y-1 text-xs text-slate-400">
                          {pitchModalDossier.findings.map((f: string, i: number) => (
                            <li key={i} className="flex items-start space-x-2">
                              <span className="text-brand-400 mt-1">•</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Section 2: Ready-to-Send Email Pitch */}
                  {pitchModalEmail && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider flex items-center space-x-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          <span>Ready-to-Send Pitch: HackMyWebsite</span>
                        </span>

                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                            pitchModalEmail.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {pitchModalEmail.status === "approved" ? "Approved for Send" : "Draft (Review Required)"}
                        </span>
                      </div>

                      {/* Recipient & Work Email Switcher */}
                      <div className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400">To:</span>
                          <span className="font-mono font-semibold text-cyan-300">{pitchModalEmail.recipient}</span>
                        </div>

                        {pitchModalLead.candidates.length > 1 && (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-slate-400 text-[10px]">Select Alternate:</span>
                            <select
                              value={pitchModalEmail.recipient}
                              onChange={(e) => handleSelectCandidateEmail(pitchModalLead.id, e.target.value)}
                              className="bg-slate-950 border border-slate-700 text-xs font-mono rounded px-2 py-1 text-slate-200"
                            >
                              {pitchModalLead.candidates.map((c) => (
                                <option key={c.id} value={c.email}>
                                  {c.email}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Subject Line */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-medium">Subject Line</label>
                        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs font-medium text-white">
                          <span>{pitchModalEmail.subject}</span>
                          <button
                            onClick={() => copyToClipboard(pitchModalEmail.subject, "modal-subject")}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Copy Subject"
                          >
                            {copiedId === "modal-subject" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Email Body */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] text-slate-400 font-medium">Email Body (Zero AI Buzzwords)</label>
                          <button
                            onClick={() => copyToClipboard(pitchModalEmail.body_text, "modal-body")}
                            className="text-[11px] text-brand-400 hover:underline flex items-center space-x-1"
                          >
                            {copiedId === "modal-body" ? (
                              <span className="text-emerald-400">Copied Body!</span>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Body</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                          {pitchModalEmail.body_text}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer / Dispatch Actions */}
            {pitchModalEmail && (
              <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${pitchModalEmail.subject}\n\n${pitchModalEmail.body_text}`,
                        "modal-full-copy"
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5"
                  >
                    {copiedId === "modal-full-copy" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied Full Email!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Full Email</span>
                      </>
                    )}
                  </button>

                  {/* Mailto Link (Open in Gmail / Apple Mail) */}
                  <a
                    href={`mailto:${pitchModalEmail.recipient}?subject=${encodeURIComponent(
                      pitchModalEmail.subject
                    )}&body=${encodeURIComponent(pitchModalEmail.body_text)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-medium border border-indigo-500/40 flex items-center space-x-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open in Gmail / Mail App</span>
                  </a>
                </div>

                <div className="flex items-center space-x-2">
                  {pitchModalEmail.draft_id && (
                    <>
                      {pitchModalEmail.status === "approved" ? (
                        <button
                          onClick={() => handleApproveDraft(pitchModalEmail.draft_id!, false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
                        >
                          Revoke Approval
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproveDraft(pitchModalEmail.draft_id!, true)}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium border border-amber-500/40"
                        >
                          Approve for Send
                        </button>
                      )}

                      <button
                        onClick={() => handleSendDraft(pitchModalEmail.draft_id!)}
                        disabled={pitchModalEmail.status !== "approved"}
                        className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold border border-brand-500/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch SMTP</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
