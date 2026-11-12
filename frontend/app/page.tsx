"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  BarChart3,
  CreditCard,
  Send,
  Star,
  Settings,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Mail,
  Phone,
  X,
  Eye,
  MoreVertical,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Zap,
  Loader2
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
  phone?: string | null;
  email: string | null;
  email_status: string;
  email_score: number;
  outreach_status: string;
  enrichment_data: string | null;
  candidates: Candidate[];
  predicted_plan: string;
  plan_price_monthly: number;
  plan_price_annual: number;
  deal_status: string;
  deal_notes: string | null;
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

interface PlanBreakdown {
  count: number;
  mrr: number;
  price: number;
}

interface Stats {
  total_leads: number;
  verified_leads: number;
  total_drafts: number;
  approved_drafts: number;
  sent_emails: number;
  need_to_send_count: number;
  sent_count: number;
  in_discussion_count: number;
  won_count: number;
  said_no_count: number;
  active_leads_count: number;
  estimated_mrr_inr: number;
  estimated_arr_inr: number;
  lost_mrr_inr: number;
  lost_arr_inr: number;
  won_mrr_inr: number;
  plans?: {
    agency: PlanBreakdown;
    pro: PlanBreakdown;
    starter: PlanBreakdown;
    enterprise: PlanBreakdown;
  };
}

const HMW_PLANS: Record<string, { name: string; monthly: number; annual: number; desc: string; color: string }> = {
  agency: {
    name: "Agency Tier",
    monthly: 4999,
    annual: 59988,
    desc: "10 targets, unlimited scans, white-label client PDF reports, compliance mapping",
    color: "#aeca63",
  },
  pro: {
    name: "Pro Tier",
    monthly: 2999,
    annual: 35988,
    desc: "3 targets, 10 scans/mo, GitHub SAST/DAST PR gates, API fuzzing",
    color: "#c084fc",
  },
  starter: {
    name: "Starter Tier",
    monthly: 1999,
    annual: 23988,
    desc: "1 target, 3 scans/mo, unblurred 12+ page report, Claude/Cursor AI fix prompts",
    color: "#464a60",
  },
  enterprise: {
    name: "Agency Enterprise",
    monthly: 9999,
    annual: 119988,
    desc: "Unlimited targets & scans, multi-client rollup, dedicated slack channel",
    color: "#e879f9",
  },
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    total_leads: 1000,
    verified_leads: 978,
    total_drafts: 1000,
    approved_drafts: 12,
    sent_emails: 0,
    need_to_send_count: 1000,
    sent_count: 0,
    in_discussion_count: 0,
    won_count: 0,
    said_no_count: 0,
    active_leads_count: 1000,
    estimated_mrr_inr: 3768000,
    estimated_arr_inr: 45216000,
    lost_mrr_inr: 0,
    lost_arr_inr: 0,
    won_mrr_inr: 0,
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [activeNav, setActiveNav] = useState<string>("overview");
  const [activeTab, setActiveTab] = useState<"leads" | "drafts">("leads");
  const [timeRange, setTimeRange] = useState<"7d" | "1m" | "3m">("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [draftFilter, setDraftFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Pagination for Leads Table & Drafts
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Research & Multi-Stage Sequence Modal
  const [pitchModalLead, setPitchModalLead] = useState<Lead | null>(null);
  const [pitchModalDossier, setPitchModalDossier] = useState<any>(null);
  const [pitchModalEmail, setPitchModalEmail] = useState<{
    subject: string;
    body_text: string;
    recipient: string;
    draft_id?: number;
    status?: string;
  } | null>(null);
  const [pitchModalSequence, setPitchModalSequence] = useState<any>(null);
  const [activeSequenceTab, setActiveSequenceTab] = useState<
    "initial_cold" | "demo_walkthrough" | "followup_day3" | "breakup_day7" | "rejection"
  >("initial_cold");
  const [pitchLoading, setPitchLoading] = useState(false);

  // Sovereign Enrichment State (100% Free / ₹0 SaaS)
  const [enrichingId, setEnrichingId] = useState<number | null>(null);
  const [waterfallEnrichingId, setWaterfallEnrichingId] = useState<number | null>(null);
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [testerDomain, setTesterDomain] = useState("");
  const [testerCompany, setTesterCompany] = useState("");
  const [testerContact, setTesterContact] = useState("");
  const [testerLoading, setTesterLoading] = useState(false);
  const [testerResult, setTesterResult] = useState<any>(null);

  // 4 C-Suite Cards active role tab in Sovereign Extractor
  const [activeCSuiteRole, setActiveCSuiteRole] = useState<string>("founder");

  // Autonomous Sourcing & Stage 2 Lead Generator State (100% Sovereign / ₹0 SaaS)
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [genNiche, setGenNiche] = useState("D2C Brands");
  const [genCompanyType, setGenCompanyType] = useState("All");
  const [genGeography, setGenGeography] = useState("Bengaluru");
  const [genHeadcount, setGenHeadcount] = useState("11-50");
  const [genTargetRoles, setGenTargetRoles] = useState<string[]>([
    "Founder",
    "Co-Founder",
    "CEO",
    "CTO",
    "COO"
  ]);
  const [genCount, setGenCount] = useState(10);
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [generatorResult, setGeneratorResult] = useState<any>(null);
  const [batchEnrichLoading, setBatchEnrichLoading] = useState(false);
  const [batchEnrichResult, setBatchEnrichResult] = useState<any>(null);
  const [revealedNumbers, setRevealedNumbers] = useState<{ [key: string]: boolean }>({});

  const toggleRoleSelection = (role: string) => {
    setGenTargetRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  };

  const toggleRevealNumber = (key: string) => {
    setRevealedNumbers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "drafts") {
        setActiveTab("drafts");
        setActiveNav("drafts");
      }
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, stageFilter, draftFilter, pageSize, activeTab]);

  const loadData = async () => {
    try {
      const [sRes, lRes, dRes] = await Promise.all([
        fetch(`${API_BASE}/workspaces/1/stats`),
        fetch(`${API_BASE}/leads?workspace_id=1&limit=1000`),
        fetch(`${API_BASE}/drafts?workspace_id=1&limit=1000`),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (lRes.ok) setLeads(await lRes.json());
      if (dRes.ok) setDrafts(await dRes.json());
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    }
  };

  const copyToClipboard = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const leadMap = useMemo(() => {
    const map = new Map<number, Lead>();
    leads.forEach((l) => map.set(l.id, l));
    return map;
  }, [leads]);

  const handleUpdateDealStatus = async (
    leadId: number,
    dealStatus: string,
    predictedPlan?: string,
    notes?: string
  ) => {
    try {
      const payload: any = { deal_status: dealStatus };
      if (predictedPlan) payload.predicted_plan = predictedPlan;
      if (notes !== undefined) payload.deal_notes = notes;

      const res = await fetch(`${API_BASE}/leads/${leadId}/deal-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      // Instantly update lead in local state
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                deal_status: data.deal_status,
                predicted_plan: data.predicted_plan,
                plan_price_monthly: data.plan_price_monthly,
                plan_price_annual: data.plan_price_annual,
              }
            : l
        )
      );

      if (pitchModalLead && pitchModalLead.id === leadId) {
        setPitchModalLead({
          ...pitchModalLead,
          deal_status: data.deal_status,
          predicted_plan: data.predicted_plan,
          plan_price_monthly: data.plan_price_monthly,
          plan_price_annual: data.plan_price_annual,
        });
      }

      if (dealStatus === "said_no") {
        setActionMessage(
          `❌ Marked ${data.company_name} as 'Agency Said No'. Estimated MRR adjusted by -₹${(
            data.plan_price_monthly || 4999
          ).toLocaleString()}/mo (-₹${(data.plan_price_annual || 59988).toLocaleString()}/yr).`
        );
      } else if (dealStatus === "won") {
        setActionMessage(
          `🏆 Closed Deal! ${data.company_name} secured on ${data.predicted_plan?.toUpperCase()} (+₹${(
            data.plan_price_monthly || 4999
          ).toLocaleString()}/mo).`
        );
      } else {
        setActionMessage(
          `Updated ${data.company_name} to: ${dealStatus.replace("_", " ")} (${data.predicted_plan?.toUpperCase()} Plan)`
        );
      }

      // Reload fresh workspace-wide pipeline stats
      const sRes = await fetch(`${API_BASE}/workspaces/1/stats`);
      if (sRes.ok) setStats(await sRes.json());
    } catch (e) {
      setActionMessage(`Failed to update status: ${e}`);
    }
  };

  const currentLeadIndex = useMemo(() => {
    if (!pitchModalLead) return -1;
    return leads.findIndex((l) => l.id === pitchModalLead.id);
  }, [leads, pitchModalLead]);

  const handlePrevLead = () => {
    if (currentLeadIndex > 0) {
      handleOpenPitchModal(leads[currentLeadIndex - 1]);
    }
  };

  const handleNextLead = () => {
    if (currentLeadIndex >= 0 && currentLeadIndex < leads.length - 1) {
      handleOpenPitchModal(leads[currentLeadIndex + 1]);
    }
  };

  const copyForZoho = (subject: string, bodyText: string, recipient: string, idKey: string) => {
    const fullPayload = `To: ${recipient}\nSubject: ${subject}\n\n${bodyText}`;
    copyToClipboard(fullPayload, idKey);
  };

  const handleOpenPitchModal = async (lead: Lead) => {
    setPitchModalLead(lead);
    setPitchLoading(true);
    if (lead.deal_status === "sent" || lead.deal_status === "in_conversation") {
      setActiveSequenceTab("demo_walkthrough");
    } else if (lead.deal_status === "said_no") {
      setActiveSequenceTab("rejection");
    } else {
      setActiveSequenceTab("initial_cold");
    }
    try {
      const res = await fetch(`${API_BASE}/leads/${lead.id}/research-and-pitch`, {
        method: "POST",
      });
      const data = await res.json();
      setPitchModalDossier(data.dossier);
      setPitchModalEmail(data.pitch_email);
      if (data.sequence) {
        setPitchModalSequence(data.sequence);
      }
      loadData();
    } catch (e) {
      setActionMessage(`Error generating pitch: ${e}`);
    } finally {
      setPitchLoading(false);
    }
  };

  const handleMarkSentFromZoho = async () => {
    if (!pitchModalLead) return;
    await handleUpdateDealStatus(pitchModalLead.id, "sent", pitchModalLead.predicted_plan);
    setPitchModalLead((prev) => (prev ? { ...prev, deal_status: "sent" } : null));
    setActiveSequenceTab("demo_walkthrough");
    setActionMessage(
      `Marked Lead #${pitchModalLead.id} (${pitchModalLead.company_name}) as Sent from Zoho! Follow-up emails ready below.`
    );
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
      loadData();
    } catch (e) {
      setActionMessage(`Failed to update email: ${e}`);
    }
  };

  const handleSovereignEnrich = async (leadId: number) => {
    setEnrichingId(leadId);
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/sovereign-enrich`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.phone) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, phone: data.phone } : l))
        );
        if (pitchModalLead && pitchModalLead.id === leadId) {
          setPitchModalLead((prev) => (prev ? { ...prev, phone: data.phone } : null));
        }
        setActionMessage(
          `⚡ Sovereign Engine extracted & verified ${data.phone} for ${data.full_name || "Lead"} with ₹0 SaaS Dependency!`
        );
      } else {
        setActionMessage(
          `⚡ Sovereign Engine scanned domain & open registries for Lead #${leadId}: No direct public phone listed.`
        );
      }
      loadData();
    } catch (err) {
      console.error(err);
      setActionMessage("Failed to execute sovereign enrichment. Check connection.");
    } finally {
      setEnrichingId(null);
    }
  };

  const handleWaterfallEnrich = async (leadId: number) => {
    setWaterfallEnrichingId(leadId);
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/waterfall-enrich`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.verified && data.email) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  email: data.email,
                  email_status: "verified",
                  phone: data.phone || l.phone,
                }
              : l
          )
        );
        if (pitchModalLead && pitchModalLead.id === leadId) {
          setPitchModalLead((prev) =>
            prev
              ? {
                  ...prev,
                  email: data.email,
                  email_status: "verified",
                  phone: data.phone || prev.phone,
                }
              : null
          );
        }
        setActionMessage(
          `✓ Waterfall Verified: ${data.email} for ${data.full_name} (${data.source || "Multi-Vendor Cascade"})`
        );
      } else {
        setActionMessage(
          `⚠️ Waterfall Complete for Lead #${leadId}: ${data.message || "No verified active mailbox found across 6 providers. Zero bluff data enforced."}`
        );
      }
      loadData();
    } catch (err) {
      console.error(err);
      setActionMessage("Waterfall enrichment request failed. Check connection.");
    } finally {
      setWaterfallEnrichingId(null);
    }
  };

  const handleRunTester = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testerDomain.trim() && !testerCompany.trim()) return;
    setTesterLoading(true);
    setTesterResult(null);
    try {
      const res = await fetch(`${API_BASE}/leads/sovereign-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: testerDomain.trim(),
          company_name: testerCompany.trim(),
          contact_name: testerContact.trim(),
        }),
      });
      const data = await res.json();
      setTesterResult(data.enrichment || data);
    } catch (err) {
      console.error(err);
      setTesterResult({ error: "Failed to connect to Sovereign Enrichment Engine" });
    } finally {
      setTesterLoading(false);
    }
  };

  const handleRunLeadGenerator = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGeneratorLoading(true);
    setGeneratorResult(null);
    try {
      const res = await fetch(`${API_BASE}/leads/generate-autonomous`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: genNiche.trim(),
          company_type: genCompanyType,
          geography: genGeography,
          headcount: genHeadcount,
          target_roles: genTargetRoles,
          count: Number(genCount),
          workspace_id: 1,
        }),
      });
      const data = await res.json();
      setGeneratorResult(data);
      if (data.ingested_count > 0) {
        setActionMessage(`✓ Stage 2 Research Engine: Ingested ${data.ingested_count} net-new verified leads!`);
        await loadData();
      }
    } catch (err) {
      console.error(err);
      setGeneratorResult({ error: "Failed to connect to Stage 2 Autonomous Lead Generator" });
    } finally {
      setGeneratorLoading(false);
    }
  };

  const handleBatchEnrichPhones = async () => {
    setBatchEnrichLoading(true);
    setBatchEnrichResult(null);
    try {
      const res = await fetch(`${API_BASE}/discovery/batch-enrich-phones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 15 }),
      });
      const data = await res.json();
      setBatchEnrichResult(data);
      if (data.enriched_count > 0) {
        setActionMessage(`Enriched ${data.enriched_count} existing leads with verified phones!`);
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBatchEnrichLoading(false);
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
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, status: data.draft_status } : d))
      );
      if (pitchModalEmail && pitchModalEmail.draft_id === draftId) {
        setPitchModalEmail({ ...pitchModalEmail, status: data.draft_status });
      }
      loadData();
    } catch (e) {
      setActionMessage(`Approval failed: ${e}`);
    }
  };

  const handleSendDraft = async (draftId: number) => {
    try {
      setActionMessage(`Initiating outbound dispatch for Draft #${draftId}...`);
      const res = await fetch(`${API_BASE}/drafts/${draftId}/send`, { method: "POST" });
      const data = await res.json();
      if (data.status === "dry_run") {
        setActionMessage(`[Safe Dry Run] ${data.message}`);
      } else if (data.status === "success") {
        setActionMessage(`Dispatched successfully to ${data.recipient || "prospect"}!`);
      } else {
        setActionMessage(`Dispatch notice: ${data.message || JSON.stringify(data)}`);
      }
      loadData();
    } catch (e) {
      setActionMessage(`Send failed: ${e}`);
    }
  };

  // Filter Leads by Search and Deal Stage
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (stageFilter === "need_to_send" && l.deal_status !== "need_to_send" && l.deal_status !== "new" && l.deal_status) return false;
      if (stageFilter === "sent" && l.deal_status !== "sent") return false;
      if (stageFilter === "in_discussion" && l.deal_status !== "in_discussion") return false;
      if (stageFilter === "won" && l.deal_status !== "won") return false;
      if (stageFilter === "said_no" && l.deal_status !== "said_no") return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.full_name?.toLowerCase().includes(q) ||
        l.company_name?.toLowerCase().includes(q) ||
        l.job_title?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.company_domain?.toLowerCase().includes(q) ||
        l.predicted_plan?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q)
      );
    });
  }, [leads, stageFilter, searchQuery]);

  // Filter Drafts by Search and Status
  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      if (draftFilter === "approved" && d.status !== "approved") return false;
      if (draftFilter === "draft" && d.status !== "draft") return false;
      if (draftFilter === "step0" && d.step !== 0) return false;

      const lead = leadMap.get(d.lead_id);
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        d.subject?.toLowerCase().includes(q) ||
        d.body_text?.toLowerCase().includes(q) ||
        lead?.full_name?.toLowerCase().includes(q) ||
        lead?.company_name?.toLowerCase().includes(q) ||
        lead?.email?.toLowerCase().includes(q)
      );
    });
  }, [drafts, draftFilter, searchQuery, leadMap]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      (activeTab === "leads" ? filteredLeads.length : filteredDrafts.length) / pageSize
    )
  );
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + pageSize);
  const paginatedDrafts = filteredDrafts.slice(startIndex, startIndex + pageSize);

  // Formatted Currency Helpers
  const formatLakhs = (amount: number) => `₹${(amount / 100000).toFixed(2)}L`;
  const formatCrores = (amount: number) => `₹${(amount / 10000000).toFixed(2)} Cr`;

  return (
    <div className="flex min-h-screen bg-[#111216] text-[#e2e4ea] font-sans selection:bg-[#a078b7] selection:text-white">
      {/* ========================================================= */}
      {/* LEFT SIDEBAR (AIVI GTM Theme)                             */}
      {/* ========================================================= */}
      <aside className="w-64 bg-[#14151a] border-r border-[#1f212a] flex flex-col justify-between p-5 select-none shrink-0">
        <div className="space-y-6">
          {/* AIVI GTM Brand Header */}
          <div className="flex items-center justify-between pt-1 px-1">
            <div className="flex items-center space-x-3">
              {/* Sleek AiVi GTM Emblem */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-lime-400 p-0.5 shadow-[0_0_14px_rgba(168,85,247,0.45)]">
                <div className="w-full h-full bg-[#14151a] rounded-[6px] flex items-center justify-center font-black text-xs text-white">
                  Ai
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-white leading-tight">
                  AIVI <span className="text-[#aeca63]">GTM</span>
                </span>
                <span className="text-[10px] text-[#707486] font-mono tracking-wider uppercase">
                  HackMyWebsite OS
                </span>
              </div>
            </div>

            {/* Collapse Icon `<>` */}
            <button className="w-6 h-6 rounded-md bg-[#1c1d25] border border-[#2b2d39] flex items-center justify-center text-[#7e8294] hover:text-white hover:border-[#3d4052] transition">
              <span className="text-[11px] font-mono tracking-tighter">&lt;&gt;</span>
            </button>
          </div>

          {/* Clean Focused GTM Navigation Menu */}
          <nav className="space-y-1 text-[13px] font-normal text-[#8e92a4]">
            {/* Pipeline Overview */}
            <button
              onClick={() => {
                setActiveNav("overview");
                setActiveTab("leads");
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all relative ${
                activeNav === "overview" && activeTab === "leads"
                  ? "bg-[#1d1f28] text-white font-medium"
                  : "hover:text-[#d1d4de] hover:bg-[#191b22]"
              }`}
            >
              {activeNav === "overview" && activeTab === "leads" && (
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#a078b7] rounded-full shadow-[0_0_12px_#c084fc]" />
              )}
              <BarChart3 className="w-4 h-4 text-[#aeca63]" />
              <span>Pipeline Overview</span>
            </button>

            {/* Leads & Intelligence */}
            <button
              onClick={() => {
                setActiveNav("leads");
                setActiveTab("leads");
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${
                activeNav === "leads"
                  ? "bg-[#1d1f28] text-white font-medium"
                  : "hover:text-[#d1d4de] hover:bg-[#191b22]"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Leads & Intelligence</span>
            </button>

            {/* Email Drafts (6-Block Pitches) */}
            <button
              onClick={() => {
                setActiveNav("drafts");
                setActiveTab("drafts");
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                activeNav === "drafts" || activeTab === "drafts"
                  ? "bg-[#1d1f28] text-white font-medium shadow-sm"
                  : "hover:text-[#d1d4de] hover:bg-[#191b22]"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-[#c084fc]" />
                <span>Email Drafts</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#c084fc]/10 text-[#c084fc] border border-[#c084fc]/30">
                1,000
              </span>
            </button>

            {/* Pricing Tiers & Retainers */}
            <button
              onClick={() => {
                setActiveNav("pricing");
                setActiveTab("leads");
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${
                activeNav === "pricing"
                  ? "bg-[#1d1f28] text-white font-medium"
                  : "hover:text-[#d1d4de] hover:bg-[#191b22]"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Pricing Tiers & Plans</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setActiveNav("settings")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${
                activeNav === "settings"
                  ? "bg-[#1d1f28] text-white font-medium"
                  : "hover:text-[#d1d4de] hover:bg-[#191b22]"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings & SMTP</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom: Minimal AIVI Engine Status */}
        <div className="pt-3">
          <div className="bg-[#191b22] border border-[#232532] rounded-2xl p-4 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">AIVI Engine</span>
              <span className="inline-flex items-center space-x-1 text-[10px] text-[#aeca63] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#aeca63] animate-pulse" />
                <span>₹0 Overhead</span>
              </span>
            </div>
            <p className="text-[11px] text-[#8e92a4] leading-relaxed">
              Autonomous multi-channel GTM OS for HackMyWebsite agencies.
            </p>
            <a
              href="https://hackmywebsite.io"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs text-[#d1d4de] hover:text-white bg-[#222430] hover:bg-[#2b2d3d] px-3.5 py-1.5 rounded-full border border-[#2f3244] transition"
            >
              <span>hackmywebsite.io</span>
              <ExternalLink className="w-3 h-3 text-[#7e8294]" />
            </a>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN VIEW                                                 */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#111216]">
        {/* Top Bar: AIVI GTM Header + Rishikesh Raj Profile */}
        <header className="px-8 py-5 flex items-center justify-between border-b border-[#1b1d25]">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">AIVI GTM</h1>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#aeca63]/10 text-[#aeca63] border border-[#aeca63]/30">
              HackMyWebsite Engine
            </span>
          </div>

          {/* User Profile Pill: Rishikesh Raj */}
          <div className="flex items-center space-x-3 bg-[#191a22] border border-[#242634] px-4 py-2 rounded-full shadow-sm hover:border-[#35394d] transition cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#9333ea] to-[#4f46e5] flex items-center justify-center text-xs font-bold text-white shadow-[0_0_8px_rgba(168,85,247,0.35)]">
              RR
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-tight">Rishikesh Raj</span>
              <span className="text-[10px] text-[#8e92a4] leading-none">COO • AIVI Intelligence</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#7e8294] ml-1" />
          </div>
        </header>

        {/* Global Action Banner / Revenue Toast */}
        {actionMessage && (
          <div className="bg-[#1b1d27] border-b border-[#a078b7]/40 px-8 py-2.5 flex items-center justify-between text-xs text-[#d8c5e8]">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-[#c084fc] animate-pulse" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-[#8e92a4] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* ========================================================= */}
          {/* ROW 1: 4 DYNAMIC PIPELINE METRIC CARDS                    */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Leads Generated */}
            <div
              onClick={() => {
                setActiveTab("leads");
                setActiveNav("leads");
                setStageFilter("all");
              }}
              className="bg-[#1a1b22] border border-[#242634] hover:border-[#383b4e] rounded-2xl p-5 shadow-sm space-y-2.5 cursor-pointer transition"
              title="Click to view all leads"
            >
              <span className="text-xs text-[#8e92a4] font-normal block">Leads Generated</span>
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl font-semibold tracking-tight text-white">
                  {stats.total_leads.toLocaleString()}
                </span>
                <span className="inline-flex items-center text-[11px] font-semibold text-[#aeca63] bg-[#1a2c1f] px-2 py-0.5 rounded-full border border-[#aeca63]/30">
                  +100% Sourced
                </span>
              </div>
              <span className="text-[10px] text-[#707486] block font-mono">
                {stats.active_leads_count} Active • {stats.said_no_count} Passed
              </span>
            </div>

            {/* Card 2: Need to Send (Outbox Queue) */}
            <div
              onClick={() => {
                setActiveTab("drafts");
                setActiveNav("drafts");
              }}
              className="bg-[#1a1b22] border border-[#242634] hover:border-[#c084fc]/50 rounded-2xl p-5 shadow-sm space-y-2.5 cursor-pointer transition group"
              title="Click to open Drafted Cold Emails queue"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8e92a4] font-normal block">Need to Send Emails</span>
                <span className="text-[10px] text-[#c084fc] group-hover:underline flex items-center space-x-0.5 font-medium">
                  <span>View Queue</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl font-semibold tracking-tight text-white">
                  {stats.need_to_send_count.toLocaleString()}
                </span>
                <span className="inline-flex items-center text-[11px] font-semibold text-[#c084fc] bg-[#251d2e] px-2 py-0.5 rounded-full border border-[#c084fc]/30">
                  Outbox Queue
                </span>
              </div>
              <span className="text-[10px] text-[#707486] block font-mono">
                {stats.sent_count} Sent • {stats.in_discussion_count} In Conversation
              </span>
            </div>

            {/* Card 3: Estimated Revenue (Dynamic Pipeline Potential) */}
            <div
              onClick={() => {
                setActiveTab("leads");
                setStageFilter("all");
              }}
              className="bg-[#1a1b22] border border-[#242634] hover:border-[#aeca63]/50 rounded-2xl p-5 shadow-sm space-y-2.5 relative overflow-hidden group cursor-pointer transition"
              title="Click to view revenue pipeline"
            >
              <span className="text-xs text-[#8e92a4] font-normal block">Estimated Pipeline MRR</span>
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl font-semibold tracking-tight text-[#aeca63]">
                  {formatLakhs(stats.estimated_mrr_inr)}
                  <span className="text-xs font-normal text-slate-400">/mo</span>
                </span>
                <span className="inline-flex items-center text-[11px] font-semibold text-[#aeca63] bg-[#1a2c1f] px-2 py-0.5 rounded-full border border-[#aeca63]/30">
                  {formatCrores(stats.estimated_arr_inr)} ARR
                </span>
              </div>
              <span className="text-[10px] text-[#707486] block font-mono">
                hackmywebsite.io Tiers (Drops if Agency says No)
              </span>
            </div>

            {/* Card 4: Lost Revenue / Agencies Said No */}
            <div
              onClick={() => {
                setActiveTab("leads");
                setStageFilter("said_no");
              }}
              className="bg-[#1a1b22] border border-[#242634] hover:border-[#f87171]/50 rounded-2xl p-5 shadow-sm space-y-2.5 cursor-pointer transition"
              title="Click to filter passed agencies"
            >
              <span className="text-xs text-[#8e92a4] font-normal block">Agencies Said No (Lost)</span>
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl font-semibold tracking-tight text-white">
                  {stats.said_no_count > 0 ? `-${formatLakhs(stats.lost_mrr_inr)}` : "₹0"}
                  <span className="text-xs font-normal text-slate-400">/mo</span>
                </span>
                <span
                  className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    stats.said_no_count > 0
                      ? "text-[#f87171] bg-[#2d1b22] border-[#f87171]/30"
                      : "text-[#aeca63] bg-[#1a2c1f] border-[#aeca63]/30"
                  }`}
                >
                  {stats.said_no_count} Passed
                </span>
              </div>
              <span className="text-[10px] text-[#707486] block font-mono">
                {stats.lost_arr_inr > 0 ? `-${formatLakhs(stats.lost_arr_inr)} Lost ARR` : "0% Churn / Full Pipeline Intact"}
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ROW 2: BAR CHART (Revenue Velocity) & DONUT (Plans)        */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT: Glowing Purple Bar Chart (7 cols) */}
            <div className="lg:col-span-8 bg-[#1a1b22] border border-[#242634] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between pb-6">
                <div className="flex items-center space-x-3">
                  <h3 className="text-base font-semibold text-white tracking-tight">Revenue Growth Potential</h3>
                  <span className="text-[11px] font-semibold text-[#aeca63] bg-[#1a2c1f] px-2 py-0.5 rounded-full border border-[#aeca63]/30">
                    {formatLakhs(stats.estimated_mrr_inr)} Active MRR
                  </span>
                </div>

                {/* Time Range Pills `7d | 1m | 3m` */}
                <div className="flex items-center bg-[#13141a] p-1 rounded-xl border border-[#242634] text-xs">
                  <button
                    onClick={() => setTimeRange("7d")}
                    className={`px-3 py-1 rounded-lg transition font-medium ${
                      timeRange === "7d" ? "bg-[#252736] text-white shadow" : "text-[#7e8294] hover:text-[#d1d4de]"
                    }`}
                  >
                    7d
                  </button>
                  <button
                    onClick={() => setTimeRange("1m")}
                    className={`px-3 py-1 rounded-lg transition font-medium ${
                      timeRange === "1m" ? "bg-[#252736] text-white shadow" : "text-[#7e8294] hover:text-[#d1d4de]"
                    }`}
                  >
                    1m
                  </button>
                  <button
                    onClick={() => setTimeRange("3m")}
                    className={`px-3 py-1 rounded-lg transition font-medium ${
                      timeRange === "3m" ? "bg-[#252736] text-white shadow" : "text-[#7e8294] hover:text-[#d1d4de]"
                    }`}
                  >
                    3m
                  </button>
                </div>
              </div>

              {/* Glowing Purple Bar Chart Canvas */}
              <div className="pt-2">
                <div className="flex items-end justify-between h-56 px-4 pb-2 border-b border-[#242634]">
                  {/* Y-Axis Guidelines: 50L, 40L, 30L, 20L, 10L */}
                  <div className="flex flex-col justify-between h-full text-[11px] text-[#707486] pr-4 select-none">
                    <span>50L</span>
                    <span>40L</span>
                    <span>30L</span>
                    <span>20L</span>
                    <span>10L</span>
                  </div>

                  {/* Mon */}
                  <div className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className="w-3 rounded-full bg-gradient-to-t from-[#362244] to-[#6b4284] h-[35%]" />
                    <span className="text-xs text-[#8e92a4] mt-3">Mon</span>
                  </div>

                  {/* Tue */}
                  <div className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className="w-3 rounded-full bg-gradient-to-t from-[#362244] to-[#7b4c97] h-[52%]" />
                    <span className="text-xs text-[#8e92a4] mt-3">Tue</span>
                  </div>

                  {/* Wed */}
                  <div className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className="w-3 rounded-full bg-gradient-to-t from-[#362244] to-[#8c57ab] h-[68%]" />
                    <span className="text-xs text-[#8e92a4] mt-3">Wed</span>
                  </div>

                  {/* Thu */}
                  <div className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className="w-3 rounded-full bg-gradient-to-t from-[#362244] to-[#6b4284] h-[42%]" />
                    <span className="text-xs text-[#8e92a4] mt-3">Thu</span>
                  </div>

                  {/* Fri: The Glowing Capsule Bar with Tooltip */}
                  <div className="flex-1 flex flex-col items-center justify-end h-full relative">
                    <div className="absolute -top-6 left-1/2 translate-x-3 bg-[#111216] border border-[#3b3e52] rounded-xl px-3 py-1.5 shadow-2xl z-20 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f472b6] shadow-[0_0_8px_#f472b6]" />
                        <span>{formatLakhs(stats.estimated_mrr_inr)} / mo</span>
                      </div>
                      <span className="text-[10px] text-[#8e92a4] block mt-0.5">
                        {formatCrores(stats.estimated_arr_inr)} Annual Pipeline
                      </span>
                    </div>

                    <div
                      className="w-4 rounded-full bg-gradient-to-t from-[#703b9b] via-[#a078b7] to-[#e49be4] shadow-[0_0_28px_rgba(200,140,240,0.65),0_0_60px_rgba(160,120,183,0.35)] transition-all duration-500"
                      style={{
                        height: `${Math.max(20, Math.min(95, (stats.estimated_mrr_inr / 5000000) * 100))}%`,
                      }}
                    />
                    <span className="text-xs font-semibold text-white mt-3">Fri</span>
                  </div>

                  {/* Sat */}
                  <div className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className="w-3 rounded-full bg-[#2b2137] h-[8%]" />
                    <span className="text-xs text-[#8e92a4] mt-3">Sat</span>
                  </div>

                  {/* Sun */}
                  <div className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className="w-3 rounded-full bg-[#2b2137] h-[8%]" />
                    <span className="text-xs text-[#8e92a4] mt-3">Sun</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Glowing Donut Chart (Pricing Tiers Breakdown) */}
            <div className="lg:col-span-4 bg-[#1a1b22] border border-[#242634] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Plan Breakdown</h3>
                  <span className="text-[10px] text-[#707486]">hackmywebsite.io pricing</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#7e8294] hover:text-white cursor-pointer" />
              </div>

              {/* Glowing Segmented Donut with Floating Labels */}
              <div className="relative flex items-center justify-center py-5">
                <div className="absolute left-2 top-4 text-left">
                  <span className="text-xs font-bold text-[#c084fc] block">Pro Tier</span>
                  <span className="text-[10px] text-[#8e92a4]">₹2,999/mo</span>
                </div>

                <div className="absolute left-2 bottom-4 text-left">
                  <span className="text-xs font-bold text-[#8e92a4] block">Starter</span>
                  <span className="text-[10px] text-[#707486]">₹1,999/mo</span>
                </div>

                <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="32" fill="transparent" stroke="#1d1e28" strokeWidth="18" />

                  <circle
                    cx="50"
                    cy="50"
                    r="32"
                    fill="transparent"
                    stroke="#c084fc"
                    strokeWidth="18"
                    strokeDasharray="201"
                    strokeDashoffset="160"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="32"
                    fill="transparent"
                    stroke="#35394d"
                    strokeWidth="18"
                    strokeDasharray="201"
                    strokeDashoffset="110"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="32"
                    fill="transparent"
                    stroke="#e879f9"
                    strokeWidth="18"
                    strokeDasharray="201"
                    strokeDashoffset="90"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="32"
                    fill="transparent"
                    stroke="#aeca63"
                    strokeWidth="18"
                    strokeDasharray="201"
                    strokeDashoffset="0"
                    className="filter drop-shadow-[0_0_12px_rgba(174,202,99,0.5)]"
                  />

                  <circle cx="50" cy="50" r="21" fill="#1a1b22" />
                </svg>

                <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#121318]/90 border border-[#2b2e3e] px-3 py-1.5 rounded-xl text-center shadow-xl">
                  <span className="text-xs font-bold text-[#aeca63] block">Agency Tier</span>
                  <span className="text-[10px] text-white">₹4,999 / mo</span>
                </div>
              </div>

              {/* Legend with Plans and Monthly Rates */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] border-t border-[#242634]">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#aeca63] shadow-[0_0_6px_#aeca63]" />
                  <span className="text-[#d1d4de]">Agency: ₹4,999</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c084fc]" />
                  <span className="text-[#d1d4de]">Pro: ₹2,999</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#525770]" />
                  <span className="text-[#d1d4de]">Starter: ₹1,999</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e879f9]" />
                  <span className="text-[#d1d4de]">Enterprise: ₹9,999</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ROW 3: COCKPIT VIEW TOGGLE: LEADS vs DRAFTED COLD EMAILS   */}
          {/* ========================================================= */}
          <div className="bg-[#1a1b22] border border-[#242634] rounded-2xl shadow-sm overflow-hidden">
            {/* Header: Tab Switcher & Export Controls */}
            <div className="p-6 border-b border-[#242634] flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Prominent Tab Switcher */}
              <div className="flex items-center space-x-2 bg-[#13141a] p-1.5 rounded-2xl border border-[#272938]">
                <button
                  onClick={() => setActiveTab("leads")}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === "leads"
                      ? "bg-[#252736] text-white shadow-md"
                      : "text-[#8e92a4] hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-[#aeca63]" />
                  <span>Leads & Pricing Pipeline ({leads.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("drafts")}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === "drafts"
                      ? "bg-[#252736] text-white shadow-md"
                      : "text-[#8e92a4] hover:text-white"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-[#c084fc]" />
                  <span>Drafted Cold Emails ({drafts.length})</span>
                </button>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#7e8294] absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    placeholder={activeTab === "leads" ? "Search leads, companies..." : "Search drafted pitches..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#13141a] border border-[#272938] rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#7e8294] focus:outline-none focus:border-[#a078b7] w-52 transition"
                  />
                </div>

                {/* Sub-Filters: Deal Stages for Leads vs Status for Drafts */}
                {activeTab === "leads" ? (
                  <div className="flex items-center bg-[#13141a] p-1 rounded-full border border-[#272938] text-xs">
                    <button
                      onClick={() => setStageFilter("all")}
                      className={`px-3 py-1 rounded-full transition ${
                        stageFilter === "all" ? "bg-[#252736] text-white font-medium" : "text-[#7e8294] hover:text-[#d1d4de]"
                      }`}
                    >
                      All ({leads.length})
                    </button>
                    <button
                      onClick={() => setStageFilter("need_to_send")}
                      className={`px-3 py-1 rounded-full transition ${
                        stageFilter === "need_to_send" ? "bg-[#252736] text-white font-medium" : "text-[#7e8294] hover:text-[#d1d4de]"
                      }`}
                    >
                      Need to Send ({stats.need_to_send_count})
                    </button>
                    <button
                      onClick={() => setStageFilter("won")}
                      className={`px-3 py-1 rounded-full transition ${
                        stageFilter === "won" ? "bg-[#1a2c1f] text-[#aeca63] font-medium" : "text-[#7e8294] hover:text-[#aeca63]"
                      }`}
                    >
                      Won ({stats.won_count})
                    </button>
                    <button
                      onClick={() => setStageFilter("said_no")}
                      className={`px-3 py-1 rounded-full transition ${
                        stageFilter === "said_no" ? "bg-[#2d1b22] text-[#f87171] font-medium" : "text-[#7e8294] hover:text-[#f87171]"
                      }`}
                    >
                      Said No ({stats.said_no_count})
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center bg-[#13141a] p-1 rounded-full border border-[#272938] text-xs">
                    <button
                      onClick={() => setDraftFilter("all")}
                      className={`px-3 py-1 rounded-full transition ${
                        draftFilter === "all" ? "bg-[#252736] text-white font-medium" : "text-[#7e8294] hover:text-[#d1d4de]"
                      }`}
                    >
                      All ({drafts.length})
                    </button>
                    <button
                      onClick={() => setDraftFilter("draft")}
                      className={`px-3 py-1 rounded-full transition ${
                        draftFilter === "draft" ? "bg-[#252736] text-white font-medium" : "text-[#7e8294] hover:text-[#d1d4de]"
                      }`}
                    >
                      Pending Review ({drafts.filter((d) => d.status === "draft").length})
                    </button>
                    <button
                      onClick={() => setDraftFilter("approved")}
                      className={`px-3 py-1 rounded-full transition ${
                        draftFilter === "approved" ? "bg-[#1a2c1f] text-[#aeca63] font-medium" : "text-[#7e8294] hover:text-[#aeca63]"
                      }`}
                    >
                      Approved ({drafts.filter((d) => d.status === "approved").length})
                    </button>
                  </div>
                )}

                {/* Multi-Sheet Excel Export */}
                <a
                  href={`${API_BASE}/leads/export/excel`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#1a2c1f] hover:bg-[#223929] border border-[#aeca63]/30 text-xs font-medium text-[#aeca63] transition shadow-sm"
                  title="Export 2-Sheet Excel: Sheet 1 (Leads) + Sheet 2 (Pitches)"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Excel</span>
                </a>

                {/* CSV Export */}
                <a
                  href={`${API_BASE}/leads/export/csv`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#1e202a] hover:bg-[#282a38] border border-[#272938] text-xs text-[#8e92a4] hover:text-white transition"
                >
                  <FileText className="w-3 h-3" />
                  <span>CSV</span>
                </a>

                {/* Sovereign Lead & Contact Extractor Tester */}
                <button
                  onClick={() => {
                    setIsTesterOpen(true);
                    setTesterResult(null);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#1b2230] hover:bg-[#232d40] border border-[#3e4f6d] text-xs font-semibold text-[#7fb2ff] transition shadow-sm cursor-pointer"
                  title="Test Sovereign Phone & WhatsApp Extractor on any domain with 4 C-Suite Role Cards (₹0 SaaS cost)"
                >
                  <Zap className="w-3 h-3 text-[#7fb2ff]" />
                  <span>Sovereign Extractor (4 C-Suite Cards)</span>
                </button>

                {/* Autonomous Sovereign Lead Generator (Zero Apollo / Zero Clay) */}
                <button
                  onClick={() => {
                    setIsGeneratorOpen(true);
                    setGeneratorResult(null);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#2a1c42] to-[#43236e] hover:from-[#352356] hover:to-[#532b89] border border-[#7e57c2] text-xs font-bold text-[#e9d5ff] transition shadow-md cursor-pointer"
                  title="Stage 2 Lead Operations: Autonomous Research Engine with Full Filter Matrix"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#c4b5fd]" />
                  <span>⚡ Generate New List (Stage 2 Research)</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: LEADS & PRICING TABLE */}
            {activeTab === "leads" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#14151b] border-b border-[#242634] text-[#8e92a4] text-[11px] font-medium">
                    <tr>
                      <th className="py-3 px-4 w-14 text-center">S.No</th>
                      <th className="py-3 px-4">Contact & Company</th>
                      <th className="py-3 px-4">Work Email (Visible)</th>
                      <th className="py-3 px-4">Predicted Plan</th>
                      <th className="py-3 px-4">Est. Revenue</th>
                      <th className="py-3 px-4">Pipeline Status</th>
                      <th className="py-3 px-4 text-center">Quick Decision</th>
                      <th className="py-3 px-4 text-right">Pitch Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#20222e]">
                    {paginatedLeads.map((lead, idx) => {
                      const isSaidNo = lead.deal_status === "said_no";
                      const isWon = lead.deal_status === "won";

                      return (
                        <tr
                          key={lead.id}
                          className={`transition-colors group ${
                            isSaidNo
                              ? "bg-[#181419]/60 opacity-60 hover:opacity-100"
                              : isWon
                              ? "bg-[#141d18]/40 hover:bg-[#141d18]/70"
                              : "hover:bg-white/[0.015]"
                          }`}
                        >
                          {/* S.No */}
                          <td className="py-3.5 px-4 text-center font-mono text-[#707486]">
                            {startIndex + idx + 1}
                          </td>

                          {/* Contact & Company */}
                          <td className="py-3.5 px-4">
                            <div className={`font-medium ${isSaidNo ? "line-through text-[#8e92a4]" : "text-white"}`}>
                              {lead.full_name}
                            </div>
                            <div className="text-[#8e92a4] text-[11px] line-clamp-1">
                              {lead.job_title || "Executive"} • <span className="text-[#d1d4de]">{lead.company_name}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="text-[#707486] text-[10px] font-mono">{lead.company_domain}</span>
                              {lead.linkedin_url && (
                                <a
                                  href={lead.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#a078b7] hover:underline text-[10px] inline-flex items-center space-x-0.5"
                                >
                                  <span>LinkedIn</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Work Email with Zero Bluff Policy */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {lead.email && (lead.email_status === "valid" || lead.email_status === "verified") ? (
                                <div className="flex items-center space-x-1.5">
                                  <span
                                    className={`font-mono text-xs px-2 py-0.5 rounded-md border ${
                                      isSaidNo
                                        ? "text-[#8e92a4] bg-[#14151a] border-[#2b2d39]"
                                        : "text-[#aeca63] bg-[#121318] border-[#aeca63]/30"
                                    }`}
                                  >
                                    {lead.email}
                                  </span>
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1a2c1f] text-[#aeca63] border border-[#aeca63]/30 font-semibold shrink-0">
                                    ✓ Verified
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(lead.email!, `lead-${lead.id}`)}
                                    className="p-1 rounded hover:bg-[#252837] text-[#7e8294] hover:text-white transition cursor-pointer"
                                    title="Copy Verified Email"
                                  >
                                    {copiedId === `lead-${lead.id}` ? (
                                      <Check className="w-3 h-3 text-[#aeca63]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-md border text-[#8e92a4] bg-[#14151a] border-[#2b2d39] italic">
                                    No Verified Email
                                  </span>
                                  <button
                                    onClick={() => handleWaterfallEnrich(lead.id)}
                                    disabled={waterfallEnrichingId === lead.id}
                                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#1b2230] hover:bg-[#232d40] border border-[#3e4f6d] text-[10px] font-semibold text-[#7fb2ff] transition cursor-pointer"
                                    title="Run Sovereign Waterfall Enrichment (100% Free • Zero Clay Credits • ₹0 SaaS)"
                                  >
                                    {waterfallEnrichingId === lead.id ? (
                                      <>
                                        <Loader2 className="w-2.5 h-2.5 animate-spin text-[#7fb2ff]" />
                                        <span>Waterfall...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Zap className="w-2.5 h-2.5 text-[#7fb2ff]" />
                                        <span>Waterfall</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}

                              {lead.phone ? (
                                <div className="flex items-center space-x-1.5 mt-1 bg-[#141d18] border border-[#aeca63]/25 px-2 py-0.5 rounded-md w-fit">
                                  <Phone className="w-2.5 h-2.5 text-[#aeca63]" />
                                  <a
                                    href={`tel:${lead.phone}`}
                                    className="font-mono text-[11px] font-semibold text-[#aeca63] hover:underline"
                                  >
                                    {lead.phone}
                                  </a>
                                  <button
                                    onClick={() => copyToClipboard(lead.phone!, `phone-${lead.id}`)}
                                    className="p-0.5 text-[#7e8294] hover:text-white transition"
                                    title="Copy Phone Number"
                                  >
                                    {copiedId === `phone-${lead.id}` ? (
                                      <Check className="w-2.5 h-2.5 text-[#aeca63]" />
                                    ) : (
                                      <Copy className="w-2.5 h-2.5" />
                                    )}
                                  </button>
                                  <a
                                    href={`https://wa.me/91${lead.phone.replace(/\D/g, "").slice(-10)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[9px] font-mono px-1 py-0.2 bg-[#25D366]/15 hover:bg-[#25D366]/30 text-[#25D366] rounded border border-[#25D366]/30 transition"
                                    title="Open Direct WhatsApp Chat"
                                  >
                                    WA
                                  </a>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleSovereignEnrich(lead.id)}
                                  disabled={enrichingId === lead.id}
                                  className="mt-1 flex items-center space-x-1 px-1.5 py-0.5 rounded bg-[#181a24] hover:bg-[#222533] border border-[#2e3146] text-[10px] text-[#a4a9c2] hover:text-white transition cursor-pointer"
                                  title="Extract direct mobile and WhatsApp via Sovereign Engine (₹0 SaaS cost)"
                                >
                                  {enrichingId === lead.id ? (
                                    <>
                                      <Loader2 className="w-2.5 h-2.5 animate-spin text-[#aeca63]" />
                                      <span>Enriching...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-2.5 h-2.5 text-[#aeca63]" />
                                      <span>Enrich (₹0)</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Predicted Plan Selector (hackmywebsite.io) */}
                          <td className="py-3.5 px-4">
                            <select
                              value={lead.predicted_plan || "agency"}
                              onChange={(e) =>
                                handleUpdateDealStatus(lead.id, lead.deal_status || "need_to_send", e.target.value)
                              }
                              className="bg-[#14151b] border border-[#272938] hover:border-[#3b3e52] text-xs rounded-lg px-2 py-1 text-slate-200 focus:outline-none font-medium transition cursor-pointer"
                            >
                              <option value="agency">Agency (₹4,999/mo)</option>
                              <option value="pro">Pro Tier (₹2,999/mo)</option>
                              <option value="starter">Starter (₹1,999/mo)</option>
                              <option value="enterprise">Enterprise (₹9,999/mo)</option>
                            </select>
                          </td>

                          {/* Est. Revenue (Decreases to ₹0 if Said No) */}
                          <td className="py-3.5 px-4">
                            {isSaidNo ? (
                              <div className="text-[11px] text-[#f87171] line-through font-mono">
                                ₹{(lead.plan_price_monthly || 4999).toLocaleString()}/mo
                                <span className="block text-[10px] text-[#f87171]/70 no-underline font-sans">
                                  (Lost - Agency Said No)
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-xs font-semibold text-white font-mono">
                                  ₹{(lead.plan_price_monthly || 4999).toLocaleString()}
                                  <span className="text-[10px] text-[#8e92a4] font-normal">/mo</span>
                                </span>
                                <span className="block text-[10px] text-[#aeca63] font-mono">
                                  ₹{(lead.plan_price_annual || 59988).toLocaleString()}/yr
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Pipeline Status Dropdown */}
                          <td className="py-3.5 px-4">
                            <select
                              value={lead.deal_status || "need_to_send"}
                              onChange={(e) => handleUpdateDealStatus(lead.id, e.target.value, lead.predicted_plan)}
                              className={`text-xs font-medium rounded-full px-3 py-1 border focus:outline-none cursor-pointer transition ${
                                isSaidNo
                                  ? "bg-[#2d1b22] text-[#f87171] border-[#f87171]/40"
                                  : isWon
                                  ? "bg-[#1a2c1f] text-[#aeca63] border-[#aeca63]/40"
                                  : lead.deal_status === "in_discussion"
                                  ? "bg-[#251d2e] text-[#c084fc] border-[#c084fc]/40"
                                  : lead.deal_status === "sent"
                                  ? "bg-[#192230] text-[#38bdf8] border-[#38bdf8]/40"
                                  : "bg-[#1e202a] text-[#d1d4de] border-[#2b2d39]"
                              }`}
                            >
                              <option value="need_to_send">Need to Send</option>
                              <option value="sent">Email Sent</option>
                              <option value="in_discussion">In Discussion</option>
                              <option value="won">Closed Won 🏆</option>
                              <option value="said_no">Agency Said No ❌</option>
                            </select>
                          </td>

                          {/* Quick Decision Buttons (Instant Said No / Won) */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {isSaidNo ? (
                                <button
                                  onClick={() => handleUpdateDealStatus(lead.id, "need_to_send", lead.predicted_plan)}
                                  className="px-2 py-0.5 rounded-md bg-[#252837] hover:bg-[#32364a] text-[10px] text-[#d1d4de] border border-[#3b3f55] transition"
                                  title="Reopen / Undo Said No"
                                >
                                  Undo
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleUpdateDealStatus(lead.id, "said_no", lead.predicted_plan)}
                                    className="p-1 rounded-lg bg-[#24171d] hover:bg-[#3d1a24] text-[#f87171] border border-[#f87171]/25 transition"
                                    title="Mark as Agency Said No (Decreases Est. Revenue)"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateDealStatus(lead.id, "won", lead.predicted_plan)}
                                    className="p-1 rounded-lg bg-[#16251b] hover:bg-[#203a29] text-[#aeca63] border border-[#aeca63]/25 transition"
                                    title="Mark as Closed Won"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Review Pitch & Zoho Sequence Action */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenPitchModal(lead)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#282236] to-[#362447] hover:from-[#362447] hover:to-[#452b5c] text-[#e0c4f8] text-xs font-semibold border border-[#a078b7]/40 transition shadow-sm hover:border-[#c084fc]/70"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#aeca63]" />
                              <span>Review & Zoho Send</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#707486] text-xs">
                          No leads match the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT 2: DRAFTED COLD EMAILS SECTION */}
            {activeTab === "drafts" && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {paginatedDrafts.map((draft, idx) => {
                    const lead = leadMap.get(draft.lead_id);
                    const isApproved = draft.status === "approved";
                    const isSent = draft.status === "sent";

                    return (
                      <div
                        key={draft.id}
                        className="bg-[#14151b] border border-[#242634] hover:border-[#383b4d] rounded-2xl p-5 space-y-4 transition shadow-sm"
                      >
                        {/* Draft Card Top Row: Prospect, Company, Work Email & Badges */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#20222e] pb-3.5">
                          <div className="flex items-start space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-[#251d2e] border border-[#c084fc]/30 flex items-center justify-center text-[#c084fc] font-bold text-xs shrink-0">
                              #{startIndex + idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-bold text-white">
                                  {lead?.full_name || `Lead #${draft.lead_id}`}
                                </h4>
                                <span className="text-xs text-[#8e92a4]">• {lead?.job_title || "Executive"}</span>
                                <span className="text-xs font-semibold text-[#aeca63]">@{lead?.company_name}</span>
                              </div>
                              <div className="flex items-center space-x-3 mt-1 text-xs">
                                <span className="font-mono text-[#707486] text-[11px]">{lead?.company_domain}</span>
                                {lead?.email && (
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-mono text-xs text-[#aeca63] bg-[#121318] px-2 py-0.5 rounded border border-[#aeca63]/25">
                                      {lead.email}
                                    </span>
                                    <button
                                      onClick={() => copyToClipboard(lead.email!, `draft-email-${draft.id}`)}
                                      className="p-1 rounded text-[#7e8294] hover:text-white"
                                      title="Copy Email"
                                    >
                                      {copiedId === `draft-email-${draft.id}` ? (
                                        <Check className="w-3 h-3 text-[#aeca63]" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                )}

                                {lead?.phone && (
                                  <div className="flex items-center space-x-1.5">
                                    <Phone className="w-2.5 h-2.5 text-[#aeca63]" />
                                    <span className="font-mono text-xs text-[#aeca63] bg-[#141d18] px-2 py-0.5 rounded border border-[#aeca63]/30">
                                      {lead.phone}
                                    </span>
                                    <button
                                      onClick={() => copyToClipboard(lead.phone!, `draft-phone-${draft.id}`)}
                                      className="p-1 rounded text-[#7e8294] hover:text-white"
                                      title="Copy Phone"
                                    >
                                      {copiedId === `draft-phone-${draft.id}` ? (
                                        <Check className="w-3 h-3 text-[#aeca63]" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Step Badge */}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e202a] text-[#8e92a4] border border-[#272938]">
                              {draft.step === 0 ? "Initial Pitch (Day 0)" : `Follow-up (Day ${draft.step * 3})`}
                            </span>

                            {/* Status Badge */}
                            <span
                              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                isApproved
                                  ? "bg-[#1a2c1f] text-[#aeca63] border-[#aeca63]/40"
                                  : isSent
                                  ? "bg-[#192230] text-[#38bdf8] border-[#38bdf8]/40"
                                  : "bg-[#2d2218] text-[#f59e0b] border-[#f59e0b]/40"
                              }`}
                            >
                              {isApproved ? "Approved for Send" : isSent ? "Dispatched" : "Review Required"}
                            </span>
                          </div>
                        </div>

                        {/* Subject Line Block */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-[#8e92a4]">
                            <span className="font-semibold text-white">Subject Line</span>
                            <button
                              onClick={() => copyToClipboard(draft.subject, `sub-${draft.id}`)}
                              className="text-[11px] text-[#c084fc] hover:underline flex items-center space-x-1"
                            >
                              {copiedId === `sub-${draft.id}` ? (
                                <span className="text-[#aeca63]">Copied!</span>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Subject</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="bg-[#1a1b22] border border-[#242634] px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-100 font-sans">
                            {draft.subject}
                          </div>
                        </div>

                        {/* Email Body Block (Full 6-Block Content) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-[#8e92a4]">
                            <span>Personalized 6-Block Pitch</span>
                            <button
                              onClick={() => copyToClipboard(draft.body_text, `body-${draft.id}`)}
                              className="text-[11px] text-[#a078b7] hover:underline flex items-center space-x-1"
                            >
                              {copiedId === `body-${draft.id}` ? (
                                <span className="text-[#aeca63]">Copied Body!</span>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Body</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="bg-[#1a1b22] border border-[#242634] p-4 rounded-xl text-xs text-[#d1d4de] font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                            {draft.body_text}
                          </div>
                        </div>

                        {/* Rationale & Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#20222e]">
                          <span className="text-[10px] text-[#707486] italic line-clamp-1">
                            🎯 Strategy: {draft.hook_rationale}
                          </span>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {/* Copy for Zoho Mail (Subject + Body) */}
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  `To: ${lead?.email || ""}\nSubject: ${draft.subject}\n\n${draft.body_text}`,
                                  `zoho-${draft.id}`
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-[#251d2e] hover:bg-[#342442] text-xs font-semibold text-[#c084fc] border border-[#c084fc]/35 transition flex items-center space-x-1.5"
                            >
                              {copiedId === `zoho-${draft.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-[#aeca63]" />
                                  <span className="text-[#aeca63]">Copied for Zoho!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy for Zoho Mail</span>
                                </>
                              )}
                            </button>

                            {/* Open in Mail Client */}
                            {lead?.email && (
                              <a
                                href={`mailto:${lead.email}?subject=${encodeURIComponent(
                                  draft.subject
                                )}&body=${encodeURIComponent(draft.body_text)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-[#1e202a] hover:bg-[#282a38] text-xs font-medium text-[#d1d4de] border border-[#2b2d39] transition flex items-center space-x-1.5"
                              >
                                <Mail className="w-3 h-3 text-[#a078b7]" />
                                <span>Open Mail</span>
                              </a>
                            )}

                            {/* Okay, Send (Mark Sent from Zoho) */}
                            {lead && lead.deal_status !== "sent" ? (
                              <button
                                onClick={() => handleUpdateDealStatus(lead.id, "sent", lead.predicted_plan)}
                                className="px-3 py-1.5 rounded-lg bg-[#16251b] hover:bg-[#203a29] text-xs font-bold text-[#aeca63] border border-[#aeca63]/40 transition flex items-center space-x-1 shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#aeca63]" />
                                <span>Okay, Send</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-mono text-[#38bdf8] bg-[#121c27] px-2.5 py-1 rounded-lg border border-[#38bdf8]/30 flex items-center space-x-1">
                                <Check className="w-3 h-3 text-[#38bdf8]" />
                                <span>Sent from Zoho</span>
                              </span>
                            )}

                            {/* Review Full Sequence Modal */}
                            {lead && (
                              <button
                                onClick={() => handleOpenPitchModal(lead)}
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#2e213b] to-[#402a54] hover:from-[#3a274c] hover:to-[#4e3366] text-xs font-semibold text-[#e9d5ff] border border-purple-400/40 transition flex items-center space-x-1 shadow-sm"
                              >
                                <Sparkles className="w-3 h-3 text-[#aeca63]" />
                                <span>Review Sequence Deck</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredDrafts.length === 0 && (
                    <div className="py-16 text-center text-[#707486] text-xs">
                      No email drafts match your search filter.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-[#14151b] border-t border-[#242634] text-xs">
              <div className="flex items-center space-x-3 text-[#8e92a4]">
                <span>
                  Showing{" "}
                  <strong className="text-white">
                    {(activeTab === "leads" ? filteredLeads.length : filteredDrafts.length) === 0
                      ? 0
                      : startIndex + 1}
                  </strong>{" "}
                  to{" "}
                  <strong className="text-white">
                    {Math.min(
                      startIndex + pageSize,
                      activeTab === "leads" ? filteredLeads.length : filteredDrafts.length
                    )}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-white">
                    {activeTab === "leads" ? filteredLeads.length : filteredDrafts.length}
                  </strong>{" "}
                  {activeTab === "leads" ? "leads" : "email drafts"}
                </span>

                <div className="flex items-center space-x-1.5 ml-4">
                  <span>Page Size:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-[#1c1d25] border border-[#2b2d39] rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                  >
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                    <option value={200}>200 / page</option>
                    <option value={500}>500 / page</option>
                    <option value={1000}>1,000 (All)</option>
                  </select>
                </div>
              </div>

              {/* Page Number Buttons with Glowing Violet Accent */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1d25] border border-[#2b2d39] text-[#8e92a4] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#252837] hover:text-white transition"
                >
                  &laquo; First
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1d25] border border-[#2b2d39] text-[#8e92a4] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#252837] hover:text-white transition"
                >
                  &lsaquo; Prev
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .map((p, pIdx, arr) => (
                      <React.Fragment key={p}>
                        {pIdx > 0 && arr[pIdx - 1] !== p - 1 && (
                          <span className="text-[#555869] px-1">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                            currentPage === p
                              ? "bg-[#a078b7] text-white shadow-[0_0_12px_#c084fc]"
                              : "bg-[#1c1d25] border border-[#2b2d39] text-[#8e92a4] hover:text-white hover:bg-[#252837]"
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1d25] border border-[#2b2d39] text-[#8e92a4] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#252837] hover:text-white transition"
                >
                  Next &rsaquo;
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1d25] border border-[#2b2d39] text-[#8e92a4] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#252837] hover:text-white transition"
                >
                  Last &raquo;
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ========================================================= */}
      {/* MODAL: PROSPECT RESEARCH & MULTI-STAGE OUTREACH COCKPIT    */}
      {/* ========================================================= */}
      {pitchModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#171821] border border-[#2b2e3e] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header with Sequential Navigation */}
            <div className="px-6 py-4 border-b border-[#242634] flex items-center justify-between bg-[#121318]/90">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#282236] border border-[#a078b7]/40 flex items-center justify-center text-white shadow-lg shrink-0">
                  <Sparkles className="w-5 h-5 text-[#aeca63]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>{pitchModalLead.full_name}</span>
                    <span className="text-xs font-normal text-[#8e92a4]">• {pitchModalLead.job_title}</span>
                  </h2>
                  <div className="text-xs text-[#8e92a4] flex items-center space-x-2 mt-0.5">
                    <span className="font-semibold text-[#d1d4de]">{pitchModalLead.company_name}</span>
                    <span>({pitchModalLead.company_domain})</span>
                    {pitchModalLead.linkedin_url && (
                      <a
                        href={pitchModalLead.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#a078b7] hover:underline flex items-center space-x-0.5"
                      >
                        <span>LinkedIn</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Center Navigation: Previous & Next Prospect Controls */}
              <div className="flex items-center space-x-2 bg-[#121318] p-1.5 rounded-2xl border border-[#272938]">
                <button
                  onClick={handlePrevLead}
                  disabled={currentLeadIndex <= 0}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold text-[#8e92a4] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1f212c] transition flex items-center space-x-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <span className="text-xs font-mono font-bold text-[#e2e4ea] px-2.5 py-0.5 bg-[#1e202a] rounded-lg border border-[#2c2f3e]">
                  {currentLeadIndex >= 0 ? `#${currentLeadIndex + 1} / ${leads.length}` : "Prospect"}
                </span>

                <button
                  onClick={handleNextLead}
                  disabled={currentLeadIndex < 0 || currentLeadIndex >= leads.length - 1}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold text-[#8e92a4] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1f212c] transition flex items-center space-x-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setPitchModalLead(null)}
                className="w-8 h-8 rounded-xl bg-[#20222e] hover:bg-[#2b2d3d] flex items-center justify-center text-[#8e92a4] hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {pitchLoading ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-9 h-9 border-2 border-[#a078b7] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-[#8e92a4]">Generating personalized multi-stage strategy & email sequence...</p>
                </div>
              ) : (
                <>
                  {/* Pricing Plan & Deal Pipeline Bar */}
                  <div className="bg-[#121318] border border-[#242634] rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-xs font-mono uppercase text-[#aeca63] font-semibold tracking-wider flex items-center space-x-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>HackMyWebsite Pricing & Pipeline Status</span>
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            handleUpdateDealStatus(pitchModalLead.id, "said_no", pitchModalLead.predicted_plan)
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                            pitchModalLead.deal_status === "said_no"
                              ? "bg-[#2d1b22] text-[#f87171] border-[#f87171]/50 font-semibold"
                              : "bg-[#1f1922] hover:bg-[#2d1b22] text-[#f87171] border-[#f87171]/30"
                          }`}
                        >
                          Agency Said No (-₹{(pitchModalLead.plan_price_monthly || 4999).toLocaleString()})
                        </button>

                        <button
                          onClick={() =>
                            handleUpdateDealStatus(pitchModalLead.id, "won", pitchModalLead.predicted_plan)
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                            pitchModalLead.deal_status === "won"
                              ? "bg-[#1a2c1f] text-[#aeca63] border-[#aeca63]/60"
                              : "bg-[#142319] hover:bg-[#1a2c1f] text-[#aeca63] border-[#aeca63]/30"
                          }`}
                        >
                          Mark Won 🏆
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* Predicted Purchase Tier */}
                      <div className="bg-[#1a1b22] p-3 rounded-xl border border-[#242634]">
                        <span className="text-[#707486] block text-[10px]">Predicted Purchase Tier</span>
                        <div className="flex items-center justify-between mt-1">
                          <select
                            value={pitchModalLead.predicted_plan || "agency"}
                            onChange={(e) =>
                              handleUpdateDealStatus(
                                pitchModalLead.id,
                                pitchModalLead.deal_status || "need_to_send",
                                e.target.value
                              )
                            }
                            className="bg-[#121318] border border-[#2b2d39] text-xs font-semibold text-white rounded-lg px-2 py-1 focus:outline-none w-full"
                          >
                            <option value="agency">Agency Tier (₹4,999/mo)</option>
                            <option value="pro">Pro Tier (₹2,999/mo)</option>
                            <option value="starter">Starter Tier (₹1,999/mo)</option>
                            <option value="enterprise">Enterprise (₹9,999/mo)</option>
                          </select>
                        </div>
                      </div>

                      {/* Pipeline Stage */}
                      <div className="bg-[#1a1b22] p-3 rounded-xl border border-[#242634]">
                        <span className="text-[#707486] block text-[10px]">Current Pipeline Stage</span>
                        <div className="flex items-center justify-between mt-1">
                          <select
                            value={pitchModalLead.deal_status || "need_to_send"}
                            onChange={(e) =>
                              handleUpdateDealStatus(
                                pitchModalLead.id,
                                e.target.value,
                                pitchModalLead.predicted_plan
                              )
                            }
                            className="bg-[#121318] border border-[#2b2d39] text-xs font-semibold text-white rounded-lg px-2 py-1 focus:outline-none w-full"
                          >
                            <option value="need_to_send">Need to Send</option>
                            <option value="sent">Email Sent from Zoho</option>
                            <option value="in_discussion">In Discussion</option>
                            <option value="won">Closed Won 🏆</option>
                            <option value="said_no">Agency Said No ❌</option>
                          </select>
                        </div>
                      </div>

                      {/* Current Pipeline Value */}
                      <div className="bg-[#1a1b22] p-3 rounded-xl border border-[#242634]">
                        <span className="text-[#707486] block text-[10px]">Current Pipeline Value</span>
                        <span className="text-sm font-semibold text-[#aeca63] mt-1 block font-mono">
                          {pitchModalLead.deal_status === "said_no" ? (
                            <span className="text-[#f87171] line-through">₹0 / mo (Lost)</span>
                          ) : (
                            `₹${(pitchModalLead.plan_price_monthly || 4999).toLocaleString()} / mo`
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Research Dossier (Compact) */}
                  {pitchModalDossier && (
                    <div className="bg-[#121318] border border-[#242634] rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-[#a078b7] font-semibold tracking-wider flex items-center space-x-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Prospect Intelligence & Research</span>
                        </span>
                        <span className="text-[10px] bg-[#251d2e] text-[#c084fc] px-2.5 py-0.5 rounded-full border border-[#c084fc]/30 font-medium">
                          {pitchModalDossier.category}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#1a1b22] p-2.5 rounded-xl border border-[#242634]">
                          <span className="text-[#707486] block text-[10px]">Business & Delivery Model</span>
                          <span className="font-medium text-[#d1d4de] mt-0.5 block">{pitchModalDossier.business_model}</span>
                        </div>
                        <div className="bg-[#1a1b22] p-2.5 rounded-xl border border-[#242634]">
                          <span className="text-[#707486] block text-[10px]">Monetization Wedge</span>
                          <span className="font-medium text-[#aeca63] mt-0.5 block">{pitchModalDossier.pitch_angle}</span>
                        </div>
                      </div>

                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#8e92a4] pt-1">
                        {pitchModalDossier.findings.map((f: string, i: number) => (
                          <li key={i} className="flex items-start space-x-2 bg-[#171821] p-2 rounded-lg border border-[#222432]">
                            <span className="text-[#a078b7] mt-0.5">•</span>
                            <span className="line-clamp-2">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* MULTI-STAGE EMAIL SEQUENCE WORKFLOW DECK */}
                  <div className="bg-[#121318] border border-[#242634] rounded-2xl p-4 space-y-4">
                    {/* Sequence Navigation Tabs */}
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#20222e] pb-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Tab 1: Initial Cold Pitch */}
                        <button
                          onClick={() => setActiveSequenceTab("initial_cold")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                            activeSequenceTab === "initial_cold"
                              ? "bg-[#252839] text-white border border-[#484d6b] shadow-sm"
                              : "text-[#8e92a4] hover:text-[#d1d4de] hover:bg-[#1a1b22]"
                          }`}
                        >
                          <span>1. Cold Initial Pitch</span>
                          {pitchModalLead.deal_status === "sent" ? (
                            <span className="text-[10px] bg-[#1a2c1f] text-[#aeca63] px-1.5 py-0.2 rounded-full border border-[#aeca63]/30">
                              ✓ Sent
                            </span>
                          ) : (
                            <span className="text-[10px] bg-[#221f2d] text-[#c084fc] px-1.5 py-0.2 rounded-full border border-[#c084fc]/30">
                              Day 0
                            </span>
                          )}
                        </button>

                        {/* Tab 2: If He Says YES (Demo Walkthrough) */}
                        <button
                          onClick={() => setActiveSequenceTab("demo_walkthrough")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                            activeSequenceTab === "demo_walkthrough"
                              ? "bg-[#2d223c] text-white border border-[#a078b7]/60 shadow-[0_0_12px_rgba(160,120,183,0.3)]"
                              : "text-[#8e92a4] hover:text-[#c084fc] hover:bg-[#1a1b22]"
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-[#c084fc]" />
                          <span>2. If He Says YES (Demo)</span>
                        </button>

                        {/* Tab 3: If No Reply (Day 3 Follow-up) */}
                        <button
                          onClick={() => setActiveSequenceTab("followup_day3")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                            activeSequenceTab === "followup_day3"
                              ? "bg-[#2d271e] text-white border border-amber-500/50 shadow-sm"
                              : "text-[#8e92a4] hover:text-amber-400 hover:bg-[#1a1b22]"
                          }`}
                        >
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>3. If No Reply (Day 3)</span>
                        </button>

                        {/* Tab 4: Breakup (Day 7) */}
                        <button
                          onClick={() => setActiveSequenceTab("breakup_day7")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                            activeSequenceTab === "breakup_day7"
                              ? "bg-[#22232d] text-white border border-slate-500/50 shadow-sm"
                              : "text-[#8e92a4] hover:text-[#d1d4de] hover:bg-[#1a1b22]"
                          }`}
                        >
                          <span>4. Day 7 Breakup</span>
                        </button>

                        {/* Tab 5: Rejection / Agency Said No */}
                        <button
                          onClick={() => setActiveSequenceTab("rejection")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                            activeSequenceTab === "rejection"
                              ? "bg-[#2d1b22] text-[#f87171] border border-[#f87171]/50 shadow-sm"
                              : "text-[#8e92a4] hover:text-[#f87171] hover:bg-[#1a1b22]"
                          }`}
                        >
                          <XCircle className="w-3 h-3 text-[#f87171]" />
                          <span>5. If Says NO</span>
                        </button>
                      </div>

                      {/* Active Stage Indicator */}
                      <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#1b1c24] text-[#aeca63] border border-[#aeca63]/30">
                        {activeSequenceTab === "initial_cold" && "Initial Cold Pitch (Day 0)"}
                        {activeSequenceTab === "demo_walkthrough" && "Branch A: Walkthrough & 15-Min Live Scan Demo"}
                        {activeSequenceTab === "followup_day3" && "Branch B: He Didn't Hear You (Bump Follow-up)"}
                        {activeSequenceTab === "breakup_day7" && "Branch C: Closing Loop Gracefully"}
                        {activeSequenceTab === "rejection" && "Branch D: Polite Acknowledgment & MRR Adjustment"}
                      </span>
                    </div>

                    {/* STAGE CONTEXT BANNER */}
                    {activeSequenceTab === "initial_cold" && (
                      <div className="bg-[#181a24] border border-[#2c2f42] rounded-xl p-3 flex items-center justify-between text-xs text-[#d1d4de]">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-[#c084fc] shrink-0" />
                          <span>
                            {pitchModalLead.deal_status === "sent" ? (
                              <strong className="text-[#aeca63]">
                                ✓ Initial pitch marked as Sent from Zoho Mail. If prospect replies or stays silent, use the follow-up tabs above.
                              </strong>
                            ) : (
                              <span>
                                Review the cold pitch below, copy to Zoho Mail, and dispatch. Click <strong>&quot;Okay, Send&quot;</strong> once dispatched to immediately access follow-ups.
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {activeSequenceTab === "demo_walkthrough" && (
                      <div className="bg-[#241c2e] border border-[#c084fc]/40 rounded-xl p-3 flex items-center justify-between text-xs text-[#e9d5ff]">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-[#c084fc] shrink-0" />
                          <span>
                            <strong>When {pitchModalLead.first_name || "prospect"} replies YES / interested:</strong> Copy and send this 15-minute product walkthrough & live scan booking email to close the agency plan!
                          </span>
                        </div>
                      </div>
                    )}

                    {activeSequenceTab === "followup_day3" && (
                      <div className="bg-[#2a2217] border border-amber-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-amber-200">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            <strong>If no reply after 3 days (&quot;He didn&apos;t hear you&quot;):</strong> Send this bump follow-up highlighting manual pentest bottlenecks ($3,000+ vs 90s) and offering a free baseline scan.
                          </span>
                        </div>
                      </div>
                    )}

                    {activeSequenceTab === "breakup_day7" && (
                      <div className="bg-[#1a1b22] border border-[#2b2d39] rounded-xl p-3 flex items-center justify-between text-xs text-[#8e92a4]">
                        <div className="flex items-center space-x-2">
                          <Layers className="w-4 h-4 text-[#707486] shrink-0" />
                          <span>
                            <strong>If still no reply after 7 days:</strong> Close the loop gracefully without cluttering their inbox, leaving hackmywebsite.io open for future builds.
                          </span>
                        </div>
                      </div>
                    )}

                    {activeSequenceTab === "rejection" && (
                      <div className="bg-[#2d1b22] border border-[#f87171]/40 rounded-xl p-3 flex items-center justify-between text-xs text-[#fca5a5]">
                        <div className="flex items-center space-x-2">
                          <XCircle className="w-4 h-4 text-[#f87171] shrink-0" />
                          <span>
                            <strong>When agency says NO:</strong> Mark them as &quot;Agency Said No&quot; to decrement pipeline MRR, and send this polite acknowledgment.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* EMAIL DRAFT CONTAINER BASED ON ACTIVE SEQUENCE TAB */}
                    {(() => {
                      const currentEmail =
                        activeSequenceTab === "initial_cold"
                          ? {
                              subject: pitchModalSequence?.initial_cold?.subject || pitchModalEmail?.subject || "",
                              body_text: pitchModalSequence?.initial_cold?.body_text || pitchModalEmail?.body_text || "",
                              recipient: pitchModalLead.email || "",
                            }
                          : activeSequenceTab === "demo_walkthrough"
                          ? {
                              subject: pitchModalSequence?.demo_walkthrough?.subject || `Re: HackMyWebsite demo walkthrough for ${pitchModalLead.company_name}`,
                              body_text: pitchModalSequence?.demo_walkthrough?.body_text || "",
                              recipient: pitchModalLead.email || "",
                            }
                          : activeSequenceTab === "followup_day3"
                          ? {
                              subject: pitchModalSequence?.followup_day3?.subject || `Re: ${pitchModalLead.company_name} security scans`,
                              body_text: pitchModalSequence?.followup_day3?.body_text || "",
                              recipient: pitchModalLead.email || "",
                            }
                          : activeSequenceTab === "breakup_day7"
                          ? {
                              subject: pitchModalSequence?.breakup_day7?.subject || `Closing the loop: ${pitchModalLead.company_name}`,
                              body_text: pitchModalSequence?.breakup_day7?.body_text || "",
                              recipient: pitchModalLead.email || "",
                            }
                          : {
                              subject: pitchModalSequence?.rejection?.subject || `Re: ${pitchModalLead.company_name}`,
                              body_text: pitchModalSequence?.rejection?.body_text || "",
                              recipient: pitchModalLead.email || "",
                            };

                      return (
                        <div className="space-y-3.5">
                          {/* Recipient & Contact Field with Zero Bluff Policy */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#1a1b22] p-2.5 rounded-xl border border-[#242634]">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <span className="text-[#707486] font-medium">To:</span>
                                {pitchModalLead.email && (pitchModalLead.email_status === "valid" || pitchModalLead.email_status === "verified") ? (
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-mono font-semibold text-[#aeca63]">{pitchModalLead.email}</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1a2c1f] text-[#aeca63] border border-[#aeca63]/30 font-semibold">
                                      ✓ Verified Active
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono text-xs text-[#8e92a4] italic">No verified email</span>
                                    <button
                                      onClick={() => handleWaterfallEnrich(pitchModalLead.id)}
                                      disabled={waterfallEnrichingId === pitchModalLead.id}
                                      className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#1b2230] hover:bg-[#232d40] border border-[#3e4f6d] text-[10px] font-semibold text-[#7fb2ff] transition cursor-pointer"
                                    >
                                      {waterfallEnrichingId === pitchModalLead.id ? (
                                        <>
                                          <Loader2 className="w-2.5 h-2.5 animate-spin text-[#7fb2ff]" />
                                          <span>Waterfall...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Zap className="w-2.5 h-2.5 text-[#7fb2ff]" />
                                          <span>Run Waterfall</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {pitchModalLead.phone ? (
                                <div className="flex items-center space-x-1.5 bg-[#141d18] border border-[#aeca63]/30 px-2.5 py-1 rounded-lg">
                                  <Phone className="w-3 h-3 text-[#aeca63]" />
                                  <a
                                    href={`tel:${pitchModalLead.phone}`}
                                    className="font-mono text-xs font-bold text-[#aeca63] hover:underline"
                                  >
                                    {pitchModalLead.phone}
                                  </a>
                                  <button
                                    onClick={() => copyToClipboard(pitchModalLead.phone!, "modal-phone")}
                                    className="p-0.5 text-[#7e8294] hover:text-white"
                                    title="Copy Phone Number"
                                  >
                                    {copiedId === "modal-phone" ? (
                                      <Check className="w-3 h-3 text-[#aeca63]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                  <a
                                    href={`https://wa.me/91${pitchModalLead.phone.replace(/\D/g, "").slice(-10)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-1 text-[10px] font-mono px-1.5 py-0.5 bg-[#25D366]/20 hover:bg-[#25D366]/35 text-[#25D366] rounded border border-[#25D366]/30 transition"
                                    title="Open WhatsApp Chat"
                                  >
                                    WhatsApp
                                  </a>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleSovereignEnrich(pitchModalLead.id)}
                                  disabled={enrichingId === pitchModalLead.id}
                                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#181a24] hover:bg-[#222533] border border-[#2e3146] text-xs text-[#a4a9c2] hover:text-white transition cursor-pointer"
                                  title="Extract phone & WhatsApp via Sovereign Engine (₹0 SaaS cost)"
                                >
                                  {enrichingId === pitchModalLead.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin text-[#aeca63]" />
                                      <span>Enriching...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-3 h-3 text-[#aeca63]" />
                                      <span>Enrich Phone (₹0)</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Subject Line */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-[#8e92a4]">
                              <span className="font-medium">Subject Line</span>
                              <button
                                onClick={() => copyToClipboard(currentEmail.subject, `sub-${activeSequenceTab}`)}
                                className="text-[#c084fc] hover:underline flex items-center space-x-1"
                              >
                                {copiedId === `sub-${activeSequenceTab}` ? (
                                  <span className="text-[#aeca63] font-semibold">Copied Subject!</span>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Subject</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="bg-[#1a1b22] border border-[#242634] px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white">
                              {currentEmail.subject}
                            </div>
                          </div>

                          {/* Email Body */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-[#8e92a4]">
                              <span className="font-medium">
                                Email Body ({activeSequenceTab === "initial_cold" ? "6-Block B2B Architecture • Zero AI Buzzwords" : "Calibrated Response"})
                              </span>
                              <button
                                onClick={() => copyToClipboard(currentEmail.body_text, `body-${activeSequenceTab}`)}
                                className="text-[#a078b7] hover:underline flex items-center space-x-1"
                              >
                                {copiedId === `body-${activeSequenceTab}` ? (
                                  <span className="text-[#aeca63] font-semibold">Copied Body!</span>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Body</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="bg-[#1a1b22] border border-[#242634] p-4 rounded-xl text-xs text-[#d1d4de] font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                              {currentEmail.body_text}
                            </div>
                          </div>

                          {/* ACTION BUTTONS BAR FOR CURRENT STEP */}
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#20222e]">
                            <div className="flex items-center space-x-2">
                              {/* One-click Copy for Zoho Mail (Subject + Body) */}
                              <button
                                onClick={() =>
                                  copyForZoho(
                                    currentEmail.subject,
                                    currentEmail.body_text,
                                    pitchModalLead.email || "",
                                    `zoho-full-${activeSequenceTab}`
                                  )
                                }
                                className="px-4 py-2 rounded-xl bg-[#282236] hover:bg-[#372b4c] text-[#e0c4f8] text-xs font-semibold border border-[#a078b7]/50 flex items-center space-x-1.5 transition shadow-sm"
                              >
                                {copiedId === `zoho-full-${activeSequenceTab}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-[#aeca63]" />
                                    <span className="text-[#aeca63] font-bold">Copied for Zoho Mail!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy for Zoho Mail</span>
                                  </>
                                )}
                              </button>

                              {/* Open in Zoho / Mail App */}
                              <a
                                href={`mailto:${pitchModalLead.email}?subject=${encodeURIComponent(
                                  currentEmail.subject
                                )}&body=${encodeURIComponent(currentEmail.body_text)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-2 rounded-xl bg-[#1e202a] hover:bg-[#282a38] text-[#d1d4de] text-xs font-medium border border-[#2b2d39] flex items-center space-x-1.5 transition"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Open Mail App</span>
                              </a>
                            </div>

                            {/* PRIMARY WORKFLOW ACTIONS */}
                            <div className="flex items-center space-x-2">
                              {/* ON INITIAL COLD: THE "OKAY, SEND" BUTTON */}
                              {activeSequenceTab === "initial_cold" && (
                                <>
                                  {pitchModalLead.deal_status !== "sent" ? (
                                    <button
                                      onClick={handleMarkSentFromZoho}
                                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-white text-xs font-bold shadow-lg shadow-emerald-500/20 border border-emerald-400/50 flex items-center space-x-2 transition transform active:scale-95"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-white" />
                                      <span>Okay, Send (Mark Sent from Zoho)</span>
                                    </button>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs font-mono font-semibold text-[#aeca63] bg-[#1a2c1f] px-3 py-1.5 rounded-xl border border-[#aeca63]/40 flex items-center space-x-1.5">
                                        <Check className="w-3.5 h-3.5 text-[#aeca63]" />
                                        <span>Marked Sent from Zoho</span>
                                      </span>
                                      <button
                                        onClick={() => setActiveSequenceTab("demo_walkthrough")}
                                        className="px-3 py-1.5 rounded-xl bg-[#282236] hover:bg-[#342b47] text-[#e0c4f8] text-xs font-semibold border border-[#a078b7]/40 flex items-center space-x-1"
                                      >
                                        <span>View Demo Email</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* ON DEMO WALKTHROUGH: MARK WON */}
                              {activeSequenceTab === "demo_walkthrough" && (
                                <button
                                  onClick={() => handleUpdateDealStatus(pitchModalLead.id, "won", pitchModalLead.predicted_plan)}
                                  className="px-4 py-2 rounded-xl bg-[#1a2c1f] hover:bg-[#233f2b] text-[#aeca63] text-xs font-bold border border-[#aeca63]/40 flex items-center space-x-1.5 transition"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-[#aeca63]" />
                                  <span>Mark Deal as Won (₹{(pitchModalLead.plan_price_monthly || 4999).toLocaleString()}/mo)</span>
                                </button>
                              )}

                              {/* ON REJECTION: INSTANT AGENCY SAID NO */}
                              {activeSequenceTab === "rejection" && (
                                <button
                                  onClick={() => handleUpdateDealStatus(pitchModalLead.id, "said_no", pitchModalLead.predicted_plan)}
                                  className="px-4 py-2 rounded-xl bg-[#2d1b22] hover:bg-[#3d1a24] text-[#f87171] text-xs font-bold border border-[#f87171]/40 flex items-center space-x-1.5 transition"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-[#f87171]" />
                                  <span>Confirm Agency Said No (Lost MRR)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Modal Sticky Bottom Navigation Bar */}
            <div className="px-6 py-3.5 border-t border-[#242634] bg-[#121318] flex items-center justify-between">
              <button
                onClick={handlePrevLead}
                disabled={currentLeadIndex <= 0}
                className="px-4 py-2 rounded-xl bg-[#1c1d25] hover:bg-[#252837] text-xs font-semibold text-[#8e92a4] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-[#2b2d39] flex items-center space-x-1.5 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>‹ Previous Prospect</span>
              </button>

              <div className="text-center">
                <span className="text-xs text-[#8e92a4]">
                  Reviewing Prospect{" "}
                  <strong className="text-white font-mono">
                    #{currentLeadIndex >= 0 ? currentLeadIndex + 1 : 1}
                  </strong>{" "}
                  of <strong className="text-white font-mono">{leads.length}</strong>
                </span>
              </div>

              <button
                onClick={handleNextLead}
                disabled={currentLeadIndex < 0 || currentLeadIndex >= leads.length - 1}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#282236] to-[#3b2b52] hover:from-[#342b47] hover:to-[#493466] text-xs font-bold text-[#e0c4f8] disabled:opacity-30 disabled:cursor-not-allowed border border-[#a078b7]/40 flex items-center space-x-1.5 transition shadow-sm"
              >
                <span>Next Prospect ›</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOVEREIGN LEAD & PHONE INTELLIGENCE TESTER MODAL (100% FREE / ₹0 SAAS) */}
      {isTesterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121318] border border-[#272938] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#242634] flex items-center justify-between bg-[#151720]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#1b2535] border border-[#2b3a52] text-[#7fb2ff]">
                  <Zap className="w-5 h-5 text-[#7fb2ff]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Sovereign Contact & Phone Extractor</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1a2c1f] text-[#aeca63] border border-[#aeca63]/30">
                      ₹0 SaaS • Zero Vendor Lock-in
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#8e92a4]">
                    Extract verified WhatsApp & direct founder numbers without Apollo, Clay, or Hunter.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTesterOpen(false)}
                className="p-1.5 rounded-lg text-[#7e8294] hover:text-white hover:bg-[#252837] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Quick Preset Pills */}
              <div>
                <span className="text-[11px] font-medium text-[#707486] uppercase tracking-wider block mb-2">
                  Quick Presets to Test:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setTesterDomain("braincranx.com");
                      setTesterCompany("Braincranx");
                      setTesterContact("Jyotiee Pardessi");
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[#181a24] hover:bg-[#242738] border border-[#2e3146] text-[#a4a9c2] hover:text-white transition"
                  >
                    ⚡ Braincranx (Founder WhatsApp)
                  </button>
                  <button
                    onClick={() => {
                      setTesterDomain("softerectorllp.com");
                      setTesterCompany("Soft Erector LLP");
                      setTesterContact("Soniya D.");
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[#181a24] hover:bg-[#242738] border border-[#2e3146] text-[#a4a9c2] hover:text-white transition"
                  >
                    ⚡ Soft Erector (Variant Fallback)
                  </button>
                  <button
                    onClick={() => {
                      setTesterDomain("clarigoinfotech.com");
                      setTesterCompany("Clarigo Infotech Private Limited");
                      setTesterContact("Prachi Patidar");
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[#181a24] hover:bg-[#242738] border border-[#2e3146] text-[#a4a9c2] hover:text-white transition"
                  >
                    ⚡ Clarigo Infotech (/contact)
                  </button>
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleRunTester} className="space-y-3.5 bg-[#161822] p-4 rounded-xl border border-[#272938]">
                <div>
                  <label className="text-xs font-medium text-[#d1d4de] block mb-1">
                    Company Domain <span className="text-[#aeca63]">*</span>
                  </label>
                  <input
                    type="text"
                    value={testerDomain}
                    onChange={(e) => setTesterDomain(e.target.value)}
                    placeholder="e.g. braincranx.com or https://company.com"
                    className="w-full bg-[#101116] border border-[#2c2f42] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-[#5d6074] focus:outline-none focus:border-[#7fb2ff]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#d1d4de] block mb-1">
                      Company Legal Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={testerCompany}
                      onChange={(e) => setTesterCompany(e.target.value)}
                      placeholder="e.g. Braincranx Studio"
                      className="w-full bg-[#101116] border border-[#2c2f42] rounded-lg px-3 py-2 text-xs text-white placeholder-[#5d6074] focus:outline-none focus:border-[#7fb2ff]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#d1d4de] block mb-1">
                      Target Contact Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={testerContact}
                      onChange={(e) => setTesterContact(e.target.value)}
                      placeholder="e.g. Jyotiee Pardessi"
                      className="w-full bg-[#101116] border border-[#2c2f42] rounded-lg px-3 py-2 text-xs text-white placeholder-[#5d6074] focus:outline-none focus:border-[#7fb2ff]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={testerLoading || !testerDomain.trim()}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#1c2c3d] to-[#25405e] hover:from-[#23384e] hover:to-[#2e4f75] text-xs font-bold text-[#9ec5ff] border border-[#486b96]/40 flex items-center justify-center space-x-2 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
                >
                  {testerLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#7fb2ff]" />
                      <span>Scanning Web Assets, Schemas & Statutory Registries...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-[#7fb2ff]" />
                      <span>Extract & Verify Contact Details (₹0)</span>
                    </>
                  )}
                </button>
              </form>

              {/* Extraction Results */}
              {testerResult && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* 1. COMPANY PROFILE & 2-3 LINE BRIEF */}
                  {testerResult.company_brief && (
                    <div className="bg-[#161824] border border-[#2b2e44] rounded-xl p-4 space-y-2 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-[#7fb2ff]" />
                          <h4 className="text-xs font-bold text-white tracking-wide">
                            {testerResult.company_name || testerResult.domain}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#202538] text-[#9ec5ff] border border-[#38486b]">
                            {testerResult.domain}
                          </span>
                        </div>
                        {testerResult.industry && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#1f2638] text-[#7fb2ff] border border-[#3c4e73]/40">
                            {testerResult.industry}
                          </span>
                        )}
                      </div>

                      {/* 2-3 Line Brief */}
                      <p className="text-xs text-[#d1d4de] leading-relaxed">
                        {testerResult.company_brief}
                      </p>

                      {/* Tech Stack & Office Location */}
                      <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#25283c]">
                        {testerResult.tech_stack && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-[#707486] font-medium">Tech Stack:</span>
                            {testerResult.tech_stack.split(", ").map((t: string, i: number) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[#10111a] border border-[#26293c] text-[#a4a9c2] font-mono">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {testerResult.office_address && (
                          <span className="text-[11px] text-[#8e92a4]">
                            📍 {testerResult.office_address}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. DYNAMIC C-SUITE & LEADERSHIP DOSSIER (ZERO BLUFF DATA) */}
                  {(() => {
                    const cCards = testerResult.c_suite_cards || {};
                    const realRoles: any[] = [];

                    // 1. Founder
                    const fData = cCards.founder || testerResult.decision_makers?.find((d: any) => /founder|ceo/i.test(d.title || d.role_type || ""));
                    if (fData && fData.name) {
                      realRoles.push({
                        key: "founder",
                        label: "Founder & CEO",
                        icon: "👑",
                        data: fData,
                        fallbackTitle: "Founder & Chief Executive"
                      });
                    }

                    // 2. Co-Founder
                    const cfData = cCards.co_founder || testerResult.decision_makers?.find((d: any) => /co-founder|director/i.test(d.title || d.role_type || ""));
                    if (cfData && cfData.name && !realRoles.some(r => r.data.name === cfData.name)) {
                      realRoles.push({
                        key: "co_founder",
                        label: "Co-Founder",
                        icon: "🤝",
                        data: cfData,
                        fallbackTitle: "Co-Founder & Director"
                      });
                    }

                    // 3. CTO
                    const ctoData = cCards.cto || testerResult.decision_makers?.find((d: any) => /cto|technical/i.test(d.title || d.role_type || ""));
                    if (ctoData && ctoData.name && !realRoles.some(r => r.data.name === ctoData.name)) {
                      realRoles.push({
                        key: "cto",
                        label: "Chief Technology Officer",
                        icon: "⚙️",
                        data: ctoData,
                        fallbackTitle: "Chief Technology Officer (CTO)"
                      });
                    }

                    // 4. COO
                    const cooData = cCards.coo || testerResult.decision_makers?.find((d: any) => /coo|operations/i.test(d.title || d.role_type || ""));
                    if (cooData && cooData.name && !realRoles.some(r => r.data.name === cooData.name)) {
                      realRoles.push({
                        key: "coo",
                        label: "COO / Operations",
                        icon: "👔",
                        data: cooData,
                        fallbackTitle: "Chief Operating Officer (COO)"
                      });
                    }

                    // Fallback to any remaining decision_makers if realRoles is empty
                    if (realRoles.length === 0 && testerResult.decision_makers && testerResult.decision_makers.length > 0) {
                      testerResult.decision_makers.forEach((dm: any, i: number) => {
                        realRoles.push({
                          key: `dm-${i}`,
                          label: dm.role_type || dm.title || "Executive",
                          icon: i === 0 ? "👑" : "👔",
                          data: dm,
                          fallbackTitle: dm.title || "Executive"
                        });
                      });
                    }

                    const currentActiveKey = realRoles.some(r => r.key === activeCSuiteRole) ? activeCSuiteRole : realRoles[0]?.key;
                    const activeRoleObj = realRoles.find(r => r.key === currentActiveKey) || realRoles[0];
                    const activeExecutive = activeRoleObj?.data;
                    const isRevealed = activeRoleObj ? (revealedNumbers[`csuite-${activeRoleObj.key}`] || false) : false;
                    const activePhone = activeExecutive?.phone || null;
                    const hasDirectPhone = Boolean(activePhone && activePhone.trim() !== "");

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#c4b5fd] flex items-center space-x-1.5">
                            <Users className="w-3.5 h-3.5 text-[#c4b5fd]" />
                            <span>
                              Verified Leadership Dossier ({realRoles.length} {realRoles.length === 1 ? "Verified Leader • Solo Founder" : "Verified C-Suite Leaders"})
                            </span>
                          </span>
                          <span className="text-[10px] text-[#a4a9c2]">
                            {realRoles.length === 1 ? "Solo Founder Entity (Zero bluff data)" : "Select role card to inspect verified credentials"}
                          </span>
                        </div>

                        {/* Real Cards Selector Grid */}
                        <div className={`grid gap-2 ${realRoles.length === 1 ? "grid-cols-1" : realRoles.length === 2 ? "grid-cols-2" : realRoles.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                          {realRoles.map((r) => {
                            const isSelected = currentActiveKey === r.key;
                            return (
                              <button
                                key={r.key}
                                type="button"
                                onClick={() => setActiveCSuiteRole(r.key)}
                                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                  isSelected
                                    ? "bg-gradient-to-b from-[#241a3a] to-[#1c1630] border-[#a78bfa] shadow-lg shadow-[#7c3aed]/15 ring-1 ring-[#a78bfa]"
                                    : "bg-[#14151e] border-[#26283d] hover:bg-[#1a1b28] hover:border-[#3a3e5c] text-[#8e92a4]"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-2">
                                  <span className="text-lg">{r.icon}</span>
                                  {isSelected ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#a78bfa] text-[#120e24]">
                                      SELECTED
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono text-[#62667d]">
                                      {r.data?.email_status ? "Active MX" : "Verified"}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9398b5] mb-0.5">
                                    {r.label}
                                  </div>
                                  <div className="text-xs font-bold text-white truncate">
                                    {r.data.name}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Active Selected Executive Expanded Details Card */}
                        {activeExecutive ? (
                          <div className="bg-[#151724] border border-[#3b3457] rounded-xl p-4 space-y-3 shadow-md animate-in fade-in duration-150">
                            {/* Card Header */}
                            <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-[#25283c]">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">{activeRoleObj.icon}</span>
                                  <h4 className="text-sm font-bold text-white">
                                    {activeExecutive.name}
                                  </h4>
                                </div>
                                <span className="text-xs text-[#a4a9c2] font-medium block mt-0.5">
                                  {activeExecutive.title || activeRoleObj.fallbackTitle}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#251e3a] text-[#c4b5fd] border border-[#5d468e]/40">
                                  {activeExecutive.role_type || activeRoleObj.label}
                                </span>
                                {activeExecutive.linkedin_url && (
                                  <a
                                    href={activeExecutive.linkedin_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 rounded bg-[#0A66C2]/20 hover:bg-[#0A66C2]/30 text-[#7fb2ff] border border-[#0A66C2]/40 text-[10px] font-medium flex items-center space-x-1 transition"
                                  >
                                    <span>LinkedIn</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Active Work Email ID */}
                            <div className="bg-[#0f1017] p-3 rounded-lg border border-[#242738] flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-1.5 text-[10px] text-[#707486] mb-0.5">
                                  <Mail className="w-3 h-3 text-[#7fb2ff]" />
                                  <span className="font-semibold text-[#8e92a4]">Active Work Email ID:</span>
                                </div>
                                <div className="font-mono text-xs text-[#7fb2ff] font-bold truncate">
                                  {activeExecutive.email || `contact@${testerResult.domain}`}
                                </div>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16201a] text-[#aeca63] border border-[#aeca63]/30">
                                  {activeExecutive.email_status || "Active MX"}
                                </span>
                                {activeExecutive.email && (
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(activeExecutive.email, `exec-email-${activeRoleObj.key}`)}
                                    className="px-2 py-1 rounded bg-[#1b2030] hover:bg-[#252c42] border border-[#3e4f6d] text-[11px] font-semibold text-white flex items-center space-x-1 transition cursor-pointer"
                                    title="Copy Work Email"
                                  >
                                    {copiedId === `exec-email-${activeRoleObj.key}` ? (
                                      <>
                                        <Check className="w-3 h-3 text-[#aeca63]" />
                                        <span className="text-[#aeca63]">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-[#7fb2ff]" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Direct Phone / Private Status Block */}
                            {hasDirectPhone ? (
                              <div className="bg-[#0f1017] p-3 rounded-lg border border-[#242738] space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center space-x-2">
                                    <Phone className="w-3.5 h-3.5 text-[#aeca63]" />
                                    <span className="text-[10px] text-[#8e92a4] font-semibold">
                                      Direct Mobile Line:
                                    </span>
                                    <span className="font-mono text-xs font-bold text-white">
                                      {isRevealed
                                        ? activePhone
                                        : `${(activePhone || "").slice(0, 8)} •••••`}
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-1.5">
                                    {!isRevealed ? (
                                      <button
                                        type="button"
                                        onClick={() => toggleRevealNumber(`csuite-${activeRoleObj.key}`)}
                                        className="px-2.5 py-1 rounded bg-[#1c2333] hover:bg-[#253046] border border-[#3e4f6d] text-[11px] font-semibold text-[#7fb2ff] flex items-center space-x-1 transition cursor-pointer"
                                      >
                                        <Eye className="w-3 h-3 text-[#7fb2ff]" />
                                        <span>Show Number</span>
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => copyToClipboard(activePhone!, `exec-phone-${activeRoleObj.key}`)}
                                          className="px-2 py-1 rounded bg-[#1b2030] hover:bg-[#252c42] border border-[#3e4f6d] text-[11px] font-semibold text-white flex items-center space-x-1 transition cursor-pointer"
                                          title="Copy Phone"
                                        >
                                          {copiedId === `exec-phone-${activeRoleObj.key}` ? (
                                            <Check className="w-3 h-3 text-[#aeca63]" />
                                          ) : (
                                            <Copy className="w-3 h-3 text-[#7fb2ff]" />
                                          )}
                                        </button>
                                        {activeExecutive.whatsapp_link && (
                                          <a
                                            href={activeExecutive.whatsapp_link}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-2.5 py-1 rounded bg-[#25D366] hover:bg-[#22c35e] text-black font-bold text-[10px] flex items-center space-x-1 transition shadow-sm"
                                            title="Chat on WhatsApp"
                                          >
                                            <span>WhatsApp</span>
                                            <ExternalLink className="w-2.5 h-2.5" />
                                          </a>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="text-[10px] text-[#aeca63] flex items-center space-x-1">
                                  <span>✓ Direct Mobile Line Verified via Live Contact Asset</span>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-[#0f1017] p-3 rounded-lg border border-[#242738] space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Phone className="w-3.5 h-3.5 text-[#707486]" />
                                    <span className="text-[10px] text-[#8e92a4] font-semibold">
                                      Direct Mobile Line:
                                    </span>
                                    <span className="font-mono text-xs text-[#707486] italic">
                                      Private / Confidential
                                    </span>
                                  </div>
                                  <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-[#1f192b] text-[#c4b5fd] border border-[#5d468e]/40">
                                    Office Switchboard Routed
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#8e92a4] bg-[#14151e] px-2.5 py-1.5 rounded border border-[#26283d] flex items-start space-x-1.5">
                                  <AlertCircle className="w-3 h-3 text-[#a4a9c2] shrink-0 mt-0.5" />
                                  <span>
                                    Personal mobile withheld for executive privacy. Reachable via <strong>Primary Organization Line</strong> below.
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-[#151724] border border-[#2b2e42] rounded-xl p-4 text-center text-xs text-[#8e92a4]">
                            No executive data found for this role.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 3. PRIMARY ORGANIZATION CONTACT BOX */}
                  {testerResult.primary_phone ? (
                    <div className="bg-[#131b17] border border-[#aeca63]/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#aeca63] flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#aeca63]" />
                          <span>Primary Organization Line Verified</span>
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          testerResult.phone_type === "company_switchboard"
                            ? "bg-[#291f11] text-[#fbbf24] border-[#f59e0b]/40"
                            : "bg-[#1a2c1f] text-[#aeca63] border-[#aeca63]/30"
                        }`}>
                          {testerResult.phone_type === "company_switchboard"
                            ? "🏢 Company Switchboard (Desk Hotline)"
                            : `${testerResult.confidence_score}% Confidence • ${testerResult.phone_type}`}
                        </span>
                      </div>

                      {/* Phone & WhatsApp Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1410] p-3 rounded-lg border border-[#aeca63]/20">
                        <div className="flex items-center space-x-3">
                          <Phone className="w-4 h-4 text-[#aeca63]" />
                          <span className="font-mono text-base font-bold text-white tracking-wide">
                            {testerResult.primary_phone}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => copyToClipboard(testerResult.primary_phone, "tester-phone")}
                            className="px-2.5 py-1 rounded bg-[#17231c] hover:bg-[#203127] border border-[#aeca63]/30 text-xs font-mono text-[#aeca63] flex items-center space-x-1 transition cursor-pointer"
                          >
                            {copiedId === "tester-phone" ? (
                              <>
                                <Check className="w-3 h-3 text-[#aeca63]" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <a
                            href={`https://wa.me/91${testerResult.primary_phone.replace(/\D/g, "").slice(-10)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded bg-[#25D366] hover:bg-[#22c35e] text-black font-bold text-xs flex items-center space-x-1.5 transition shadow-sm"
                          >
                            <span>Chat on WhatsApp</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Disclaimer banner for switchboard */}
                      {testerResult.phone_type === "company_switchboard" && (
                        <div className="text-[11px] text-[#fbbf24] bg-[#1a140d] p-2 rounded border border-[#f59e0b]/20 flex items-center space-x-1.5">
                          <span>🏢</span>
                          <span>{testerResult.phone_label || "Official Company Switchboard / Support Hotline (Support line, not Abhishek Mishra's or executive personal cell)"}</span>
                        </div>
                      )}

                      {/* Source & All Numbers Found */}
                      <div className="text-xs text-[#8e92a4] space-y-1 pt-1">
                        <div>
                          <strong className="text-[#d1d4de]">Source:</strong> {testerResult.source}
                        </div>
                        {testerResult.all_phones && testerResult.all_phones.length > 1 && (
                          <div className="pt-1">
                            <strong className="text-[#d1d4de] block mb-1">All Numbers Found ({testerResult.all_phones.length}):</strong>
                            <div className="flex flex-wrap gap-1.5">
                              {testerResult.all_phones.map((p: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#16201a] border border-[#aeca63]/20 text-[#aeca63]"
                                >
                                  {p.formatted || p} ({p.source || "web"})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Findings Audit Trail */}
                      {testerResult.findings && testerResult.findings.length > 0 && (
                        <div className="pt-2 border-t border-[#aeca63]/15">
                          <span className="text-[10px] font-medium text-[#707486] uppercase tracking-wider block mb-1.5">
                            Inspection Audit Trail:
                          </span>
                          <div className="space-y-1">
                            {testerResult.findings.map((f: string, i: number) => (
                              <div key={i} className="text-[11px] font-mono text-[#8e92a4] flex items-center space-x-1.5">
                                <span className="text-[#aeca63]">✓</span>
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#1b1915] border border-[#f59e0b]/30 rounded-xl p-4 text-xs text-[#d1d4de] space-y-2">
                      <div className="flex items-center space-x-2 text-[#f59e0b] font-semibold">
                        <AlertCircle className="w-4 h-4 text-[#f59e0b]" />
                        <span>No Direct Mobile Found on Public Assets</span>
                      </div>
                      <p className="text-[#8e92a4]">
                        The sovereign engine scanned the homepage, /contact, /about, /privacy-policy, structured Schema.org JSON-LD, RDAP WHOIS, and open Indian corporate records, but this entity has not published a direct public contact number.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#242634] bg-[#121318] flex items-center justify-between">
              <span className="text-[11px] text-[#707486]">
                100% sovereign Python & Next.js engine • Zero credits billed • Zero API costs
              </span>
              <button
                onClick={() => setIsTesterOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#1f212c] hover:bg-[#282a38] text-xs font-semibold text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2 SOVEREIGN LEAD OPERATIONS: AUTONOMOUS RESEARCH ENGINE (100% FREE / ZERO CSV LOCK-IN) */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121318] border border-[#272938] rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#242634] flex items-center justify-between bg-[#151720]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#201a33] border border-[#5d468e] text-[#c4b5fd]">
                  <Sparkles className="w-5 h-5 text-[#c4b5fd]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Stage 2 Lead Operations: Autonomous Research Engine</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2a1c42] text-[#c4b5fd] border border-[#5d468e]/40">
                      ₹0 SaaS • Zero Preset CSVs • Live Dorking
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#8e92a4]">
                    Discovers net-new companies, extracts verified C-Suite leaders, validates mailboxes via DNS MX, and generates bespoke cold pitches.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="p-1.5 rounded-lg text-[#7e8294] hover:text-white hover:bg-[#252837] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Collision-Free Deduplication Banner */}
              <div className="p-3.5 rounded-xl bg-[#171622] border border-[#372f52] flex items-start space-x-3">
                <CheckCircle2 className="w-4 h-4 text-[#aeca63] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-white">Stage 2 Live Research Protocol Active</span>
                  <p className="text-[#8e92a4] text-[11px] leading-relaxed">
                    Zero reliance on pre-uploaded CSVs. The engine crawls search engines live, discards directories and aggregators, verifies MX records on Port 25, and deduplicates against all existing records in <code className="text-[#c4b5fd]">gtm.db</code>.
                  </p>
                </div>
              </div>

              {/* STAGE 2 FILTER MATRIX FORM */}
              <form onSubmit={handleRunLeadGenerator} className="space-y-4 bg-[#161822] p-5 rounded-xl border border-[#272938]">
                {/* 1. Niche & Quick Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#d1d4de]">
                      Target Niche / Industry Keywords <span className="text-[#c4b5fd]">*</span>
                    </label>
                    <span className="text-[10px] text-[#8e92a4]">Click preset or type custom query</span>
                  </div>
                  <input
                    type="text"
                    value={genNiche}
                    onChange={(e) => setGenNiche(e.target.value)}
                    placeholder="e.g. D2C Brands, B2B SaaS, Cybersecurity, EdTech..."
                    className="w-full bg-[#101116] border border-[#2c2f42] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#c4b5fd]"
                    required
                  />
                  {/* Preset Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-[#707486]">Presets:</span>
                    {[
                      "D2C Brands",
                      "B2B SaaS",
                      "Cybersecurity & DevSecOps",
                      "AI & GenAI Startups",
                      "Higher Ed / Campus Tech",
                      "Web & App Development"
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setGenNiche(preset)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                          genNiche === preset
                            ? "bg-[#251e3a] text-[#c4b5fd] border-[#5d468e]"
                            : "bg-[#101118] text-[#8e92a4] border-[#222535] hover:text-white"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Grid Filters: Company Type, Geography, Headcount, Batch Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 pt-1">
                  {/* Company Type */}
                  <div>
                    <label className="text-xs font-medium text-[#d1d4de] block mb-1">
                      Company Type
                    </label>
                    <select
                      value={genCompanyType}
                      onChange={(e) => setGenCompanyType(e.target.value)}
                      className="w-full bg-[#101116] border border-[#2c2f42] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c4b5fd]"
                    >
                      <option value="All">All Types</option>
                      <option value="D2C">D2C Brands (Direct-to-Consumer)</option>
                      <option value="SaaS">B2B SaaS (Software as a Service)</option>
                      <option value="B2C">B2C Ecommerce</option>
                      <option value="Agency">Agencies & Studios</option>
                      <option value="Enterprise">Enterprise / Corporate</option>
                    </select>
                  </div>

                  {/* Geography */}
                  <div>
                    <label className="text-xs font-medium text-[#d1d4de] block mb-1">
                      Target Geography
                    </label>
                    <select
                      value={genGeography}
                      onChange={(e) => setGenGeography(e.target.value)}
                      className="w-full bg-[#101116] border border-[#2c2f42] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c4b5fd]"
                    >
                      <option value="Bengaluru">Bengaluru (Tech Corridor)</option>
                      <option value="Delhi-NCR">Delhi-NCR (Noida, Gurgaon)</option>
                      <option value="Mumbai">Mumbai (Financial Capital)</option>
                      <option value="Pune">Pune (Engineering & SaaS)</option>
                      <option value="Hyderabad">Hyderabad (Cyberabad)</option>
                      <option value="Chennai">Chennai (SaaS Hub)</option>
                      <option value="All India">All India (Pan-India Scan)</option>
                      <option value="Global">Global / International</option>
                    </select>
                  </div>

                  {/* Employee Headcount */}
                  <div>
                    <label className="text-xs font-medium text-[#d1d4de] block mb-1">
                      Employee Headcount
                    </label>
                    <select
                      value={genHeadcount}
                      onChange={(e) => setGenHeadcount(e.target.value)}
                      className="w-full bg-[#101116] border border-[#2c2f42] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c4b5fd]"
                    >
                      <option value="1-10">1-10 (Early / Bootstrapped)</option>
                      <option value="11-50">11-50 (Growth / Seed-Series A)</option>
                      <option value="51-200">51-200 (Scale-up / Mid-Market)</option>
                      <option value="201-1000">201-1,000 (Established Corp)</option>
                      <option value="1000+">1,000+ (Planetary Enterprise)</option>
                    </select>
                  </div>

                  {/* Batch Size */}
                  <div>
                    <label className="text-xs font-medium text-[#d1d4de] block mb-1">
                      Lead Count
                    </label>
                    <select
                      value={genCount}
                      onChange={(e) => setGenCount(Number(e.target.value))}
                      className="w-full bg-[#101116] border border-[#2c2f42] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c4b5fd]"
                    >
                      <option value={3}>3 leads (Instant Sprint)</option>
                      <option value={5}>5 leads (Quick Test)</option>
                      <option value={10}>10 leads (Standard Batch)</option>
                      <option value={25}>25 leads (Deep Territory)</option>
                      <option value={50}>50 leads (Volume Expansion)</option>
                    </select>
                  </div>
                </div>

                {/* 3. Target Roles Checkboxes */}
                <div>
                  <label className="text-xs font-medium text-[#d1d4de] block mb-1.5">
                    Target Decision-Maker Roles (Multi-Select)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "Founder", label: "👑 Founder" },
                      { key: "Co-Founder", label: "🤝 Co-Founder" },
                      { key: "CEO", label: "💼 CEO" },
                      { key: "CTO", label: "⚙️ CTO" },
                      { key: "COO", label: "👔 COO" },
                      { key: "CMO", label: "📣 CMO" },
                      { key: "CISO", label: "🛡️ CISO" },
                      { key: "CRO", label: "📈 CRO" }
                    ].map((role) => {
                      const isChecked = genTargetRoles.includes(role.key);
                      return (
                        <button
                          key={role.key}
                          type="button"
                          onClick={() => toggleRoleSelection(role.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center space-x-1.5 ${
                            isChecked
                              ? "bg-[#251e3a] border-[#a78bfa] text-white ring-1 ring-[#a78bfa]"
                              : "bg-[#101118] border-[#25283c] text-[#707486] hover:text-[#d1d4de]"
                          }`}
                        >
                          <span>{role.label}</span>
                          {isChecked && <Check className="w-3 h-3 text-[#a78bfa]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={generatorLoading || batchEnrichLoading}
                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-[#2c1d4d] via-[#472579] to-[#602d99] hover:from-[#35235c] hover:via-[#522b8c] hover:to-[#6d34ad] text-xs font-bold text-[#e9d5ff] border border-[#7e57c2]/60 flex items-center justify-center space-x-2 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg cursor-pointer w-full"
                  >
                    {generatorLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#c4b5fd]" />
                        <span>Sovereign Research Engine active: Sourcing & validating net-new accounts...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#c4b5fd]" />
                        <span>⚡ Run Stage 2 Autonomous Research ({genCount} Leads • ₹0)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchEnrichPhones}
                    disabled={generatorLoading || batchEnrichLoading}
                    className="py-3 px-4 rounded-lg bg-[#17231c] hover:bg-[#203127] text-xs font-semibold text-[#aeca63] border border-[#aeca63]/30 flex items-center justify-center space-x-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto"
                    title="Crawl existing leads in gtm.db that are missing contact numbers"
                  >
                    {batchEnrichLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#aeca63]" />
                        <span>Enriching...</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-3.5 h-3.5 text-[#aeca63]" />
                        <span>Batch Enrich WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Batch Enrich Feedback */}
              {batchEnrichResult && (
                <div className="p-3.5 rounded-xl bg-[#141d17] border border-[#aeca63]/30 text-xs text-[#aeca63] space-y-1 animate-in fade-in">
                  <div className="flex items-center space-x-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-[#aeca63]" />
                    <span>Batch Phone Enrichment Complete</span>
                  </div>
                  <p className="text-[11px] text-[#8e92a4]">
                    Evaluated {batchEnrichResult.leads_evaluated} existing records. Enriched {batchEnrichResult.enriched_count} leads with direct contact numbers in SQLite database.
                  </p>
                </div>
              )}

              {/* Ingestion Results Display */}
              {generatorResult && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {generatorResult.ingested_count > 0 ? (
                    <div className="bg-[#15141e] border border-[#5d468e]/40 rounded-xl p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#c4b5fd] flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#aeca63]" />
                          <span>Successfully Ingested {generatorResult.ingested_count} Researched Leads</span>
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#201a33] text-[#c4b5fd] border border-[#5d468e]/30">
                            Niche: {generatorResult.niche} • Geo: {generatorResult.geography}
                          </span>
                        </div>
                      </div>

                      {/* Discovered Leads Mini-Table */}
                      <div className="overflow-x-auto rounded-lg border border-[#272938]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#0f1015] text-[#8e92a4] text-[10px] font-medium border-b border-[#242634]">
                            <tr>
                              <th className="py-2 px-3">Company & Domain</th>
                              <th className="py-2 px-3">Researched C-Suite Leader</th>
                              <th className="py-2 px-3">Active Work Email</th>
                              <th className="py-2 px-3">Phone / Switchboard</th>
                              <th className="py-2 px-3">Detected Tech Stack</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#20222e]">
                            {generatorResult.ingested_leads.map((l: any, i: number) => (
                              <tr key={l.id || i} className="hover:bg-[#1a1926] transition">
                                <td className="py-2 px-3">
                                  <div className="font-semibold text-white">{l.company_name}</div>
                                  <div className="font-mono text-[10px] text-[#707486]">{l.domain}</div>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="text-white font-medium">{l.contact_name || l.contact}</div>
                                  <div className="text-[10px] text-[#8e92a4]">{l.job_title}</div>
                                </td>
                                <td className="py-2 px-3">
                                  {l.email ? (
                                    <div className="flex items-center space-x-1 font-mono text-[11px] text-[#7fb2ff]">
                                      <span>{l.email}</span>
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#16201a] text-[#aeca63] border border-[#aeca63]/30">
                                        MX Valid
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-[#707486] italic">Unverified (Zero bluff)</span>
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  {l.phone ? (
                                    <div className="flex items-center space-x-1.5">
                                      <span className="font-mono text-[11px] text-[#aeca63]">{l.phone}</span>
                                      {l.whatsapp_link && (
                                        <a
                                          href={l.whatsapp_link}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[#25D366] hover:text-[#22c35e]"
                                          title="Open WhatsApp"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[#5d6074] italic text-[10px]">Office Web Anchor</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-[11px] text-[#d1d4de]">
                                  {l.tech_stack || "Custom Stack"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#1b1915] border border-[#f59e0b]/30 rounded-xl p-4 text-xs text-[#d1d4de] space-y-1.5">
                      <div className="flex items-center space-x-2 text-[#f59e0b] font-semibold">
                        <AlertCircle className="w-4 h-4 text-[#f59e0b]" />
                        <span>Sourcing Completed: Zero Collisions Found</span>
                      </div>
                      <p className="text-[#8e92a4]">
                        {generatorResult.message || "All discovered accounts in this segment already exist in your local database. Try selecting another city or altering the target niche keyword."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#242634] bg-[#121318] flex items-center justify-between">
              <span className="text-[11px] text-[#707486]">
                Stage 2 Sovereign Lead Operations • Autonomous Research Engine • Zero third-party API dependencies
              </span>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#1f212c] hover:bg-[#282a38] text-xs font-semibold text-white transition cursor-pointer"
              >
                Close Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
