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
  Sparkles,
  ArrowRight,
  Filter,
  Eye,
  Sliders,
  Trash2,
  UserX
} from "lucide-react";

const API_BASE = "http://localhost:8000/api";

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
  candidates: {
    id: number;
    email: string;
    pattern: string;
    status: string;
    mx_found: boolean;
    smtp_code: number | null;
  }[];
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
  const [activeTab, setActiveTab] = useState<"leads" | "drafts" | "clay" | "operator" | "suppression">("leads");
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Clay Modal / State
  const [clayTables, setClayTables] = useState<any[]>([]);
  const [clayImportLimit, setClayImportLimit] = useState(10);
  const [clayImporting, setClayImporting] = useState(false);

  // Operator State
  const [operatorProfile, setOperatorProfile] = useState<any>(null);

  // Fetch workspaces on mount
  useEffect(() => {
    fetchWorkspaces();
    fetchOperatorProfile();
  }, []);

  // When workspace changes, fetch stats, leads, drafts
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
      // 1. Stats
      const sRes = await fetch(`${API_BASE}/workspaces/${wsId}/stats`);
      const sData = await sRes.json();
      setStats(sData);

      // 2. Leads
      const lRes = await fetch(`${API_BASE}/leads?workspace_id=${wsId}&limit=100`);
      const lData = await lRes.json();
      setLeads(lData);

      // 3. Drafts
      const dRes = await fetch(`${API_BASE}/drafts?workspace_id=${wsId}`);
      const dData = await dRes.json();
      setDrafts(dData);
    } catch (e) {
      console.error("Error loading workspace data", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperatorProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/operator`);
      const data = await res.json();
      setOperatorProfile(data);
    } catch (e) {
      console.error("Error fetching operator profile", e);
    }
  };

  const handleVerifyLead = async (leadId: number) => {
    try {
      setActionMessage(`Verifying DNS MX & SMTP handshake for Lead #${leadId}...`);
      const res = await fetch(`${API_BASE}/leads/${leadId}/verify`, { method: "POST" });
      const data = await res.json();
      setActionMessage(`Lead #${leadId} verified! Result: ${data.email_status} (${data.selected_email || "no email"})`);
      if (currentWs) loadWorkspaceData(currentWs.id);
    } catch (e) {
      setActionMessage(`Verification failed: ${e}`);
    }
  };

  const handleGenerateDrafts = async (leadId: number) => {
    try {
      setActionMessage(`Generating Day 0, Day 3, and Day 7 drafts for Lead #${leadId}...`);
      const res = await fetch(`${API_BASE}/leads/${leadId}/generate-drafts`, { method: "POST" });
      const data = await res.json();
      setActionMessage(`Generated ${data.count} drafts for Lead #${leadId}!`);
      if (currentWs) loadWorkspaceData(currentWs.id);
    } catch (e) {
      setActionMessage(`Generation failed: ${e}`);
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

  const handleClayImport = async (tableId: string = "t_0tocbgtMEc9fyVheti6") => {
    if (!currentWs) return;
    setClayImporting(true);
    setActionMessage(`Ingesting ${clayImportLimit} records from Clay table '${tableId}'...`);
    try {
      const res = await fetch(`${API_BASE}/clay/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: tableId,
          workspace_id: currentWs.id,
          limit: clayImportLimit,
        }),
      });
      const data = await res.json();
      setActionMessage(`Clay import complete! Imported: ${data.imported}, Updated: ${data.updated}`);
      loadWorkspaceData(currentWs.id);
    } catch (e) {
      setActionMessage(`Clay import error: ${e}`);
    } finally {
      setClayImporting(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.full_name?.toLowerCase().includes(q) ||
      l.company_name?.toLowerCase().includes(q) ||
      l.job_title?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q)
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

        {/* Quick Clay Ingest Action & Status */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleClayImport("t_0tocbgtMEc9fyVheti6")}
            disabled={clayImporting}
            className="flex items-center space-x-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg border border-indigo-400/30 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${clayImporting ? "animate-spin" : ""}`} />
            <span>{clayImporting ? "Importing Clay..." : "Ingest HMW Lead1"}</span>
          </button>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Engine Ready</span>
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

      {/* Main Workspace Cockpit */}
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
            <span className="text-[11px] text-slate-400">Sourced from Clay & CSV</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-emerald-400 text-xs">
              <span>Verified Mailboxes</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1.5">{stats.verified_leads}</div>
            <span className="text-[11px] text-slate-400">RFC 5321 250 OK / MX</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-brand-400 text-xs">
              <span>Sequence Drafts</span>
              <Layers className="w-4 h-4 text-brand-400" />
            </div>
            <div className="text-2xl font-bold text-brand-400 mt-1.5">{stats.total_drafts}</div>
            <span className="text-[11px] text-slate-400">Day 0 ➔ Day 3 ➔ Day 7</span>
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
            <span className="text-[11px] text-slate-400">Via Personal SMTP</span>
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
            <span>Leads & RFC Handshake ({leads.length})</span>
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
            <span>Human Review Gate & Sequence Drafts ({drafts.length})</span>
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
            <span>Suppression & Compliance</span>
          </button>
        </div>

        {/* Tab 1: Leads & Verification */}
        {activeTab === "leads" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search leads, companies, or titles..."
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
                      <th className="py-3 px-4">Candidate Mailbox</th>
                      <th className="py-3 px-4">Verification Status</th>
                      <th className="py-3 px-4">Outreach</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-white">{lead.full_name}</div>
                          <div className="text-slate-400 text-[11px]">{lead.job_title || "Tech Executive"}</div>
                          {lead.linkedin_url && (
                            <a
                              href={lead.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-400 hover:underline text-[10px] inline-flex items-center space-x-0.5 mt-0.5"
                            >
                              <span>LinkedIn</span>
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

                        <td className="py-3 px-4">
                          {lead.email ? (
                            <span className="font-mono text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {lead.email}
                            </span>
                          ) : (
                            <div className="text-slate-400 text-[11px]">
                              {lead.candidates.length > 0
                                ? `${lead.candidates.length} permutations generated`
                                : "No candidates"}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              lead.email_status === "valid"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : lead.email_status === "mx_verified"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                : lead.email_status === "catch_all"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : lead.email_status === "invalid"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            }`}
                          >
                            {lead.email_status}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-[11px] text-slate-400 capitalize">
                            {lead.outreach_status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleVerifyLead(lead.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition font-medium border border-slate-700"
                            title="Run DNS MX & RFC 5321 SMTP Handshake"
                          >
                            Verify MX
                          </button>

                          <button
                            onClick={() => handleGenerateDrafts(lead.id)}
                            className="px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white text-[11px] transition font-medium border border-brand-500/40"
                            title="Generate Day 0, Day 3, Day 7 Sequence"
                          >
                            Gen Sequence
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          No leads match the query. Click <strong>Ingest HMW Lead1</strong> above to import from Clay!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Drafts & Human Review Gate */}
        {activeTab === "drafts" && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Mandatory Human Gate:</strong> An email can NEVER be sent without explicit operator approval.
                  Click "Approve for Send" before dispatching.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.map((draft) => {
                const lead = leads.find((l) => l.id === draft.lead_id);
                return (
                  <div
                    key={draft.id}
                    className="border border-slate-800 bg-slate-900 rounded-xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/30">
                          {draft.step === 0 ? "Day 0 • Initial" : draft.step === 1 ? "Day 3 • Value" : "Day 7 • Breakup"}
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

                      <div className="text-xs text-slate-300 font-medium">
                        To: {lead?.full_name} ({lead?.company_name})
                      </div>
                      <div className="text-xs text-white font-semibold line-clamp-1">
                        Subject: {draft.subject}
                      </div>

                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {draft.body_text}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      {draft.status === "approved" ? (
                        <button
                          onClick={() => handleApproveDraft(draft.id, false)}
                          className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        >
                          Revoke Approval
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproveDraft(draft.id, true)}
                          className="text-[11px] px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium border border-amber-500/40"
                        >
                          Approve for Send
                        </button>
                      )}

                      <button
                        onClick={() => handleSendDraft(draft.id)}
                        disabled={draft.status !== "approved"}
                        className="text-[11px] px-3 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white font-medium border border-brand-500/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
                        title={draft.status !== "approved" ? "Approval required first" : "Send email via SMTP"}
                      >
                        <Send className="w-3 h-3" />
                        <span>Dispatch SMTP</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {drafts.length === 0 && (
                <div className="col-span-3 text-center py-12 text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                  No drafts generated yet. In the Leads tab, click <strong>Gen Sequence</strong> on any contact to create Day 0, Day 3, and Day 7 drafts!
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
              Contacts or domains listed here are automatically suppressed by the mailer engine. Any draft targeting these addresses is automatically cancelled before dispatch.
            </p>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-400 text-center">
              Zero active suppressions. When a prospect replies with "unsubscribe" or opts out, they are instantly added here.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
