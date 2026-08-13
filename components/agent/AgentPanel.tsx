"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Calculator, ChartNoAxesCombined, Code2, GitBranch, MessageSquare, Send, Sparkles, Trash2, X } from "lucide-react";
import { useAgentStore } from "@/store/agentStore";
import { useCasioStore } from "@/store/calculatorStore";
import { useCalculatorAgent } from "@/hooks/useCalculatorAgent";
import { useToast } from "@/components/ui/toast";
import { AppDialog, dialogButtonClass } from "@/components/ui/dialog";
import WorkflowCanvas from "@/components/agent/WorkflowCanvas";
import type { AgentToolCall, AgentTurnResponse } from "@/types/agent";

const APPROVAL_TOOLS = new Set(["create_python_file", "update_python_file", "run_python_file"]);

const QUICK_PROMPTS = {
  PYTHON: [
    { icon: Code2, label: "اشرح الكود", prompt: "اشرح الكود الموجود في ملف Python الحالي بشكل مختصر." },
    { icon: Sparkles, label: "حسّن الكود", prompt: "حسّن كود Python الحالي، واعرض التعديل للموافقة قبل تطبيقه." },
    { icon: Code2, label: "اكتب برنامجاً", prompt: "اكتب برنامج Python بسيطاً ومفيداً في ملف جديد، واعرضه للموافقة." },
    { icon: Calculator, label: "حل ببايثون", prompt: "استخدم Python للتحقق من آخر مسألة حسابية في الحاسبة." },
  ],
  GRAPH: [
    { icon: ChartNoAxesCombined, label: "ارسم دالة", prompt: "ارسم الدالة y=sin(x) في قسم Graph." },
    { icon: Sparkles, label: "حلّل الرسم", prompt: "حلّل المعادلات الموجودة حالياً في Graph واشرح سلوكها." },
    { icon: Calculator, label: "أوجد الجذور", prompt: "ساعدني في إيجاد جذور المعادلة النشطة في نافذة الرسم الحالية." },
    { icon: GitBranch, label: "أنشئ Workflow", prompt: "أنشئ Smart Nodes ترسم دالة ثم تتحقق من قيمها باستخدام Python." },
  ],
  MATRIX: [
    { icon: Calculator, label: "احسب المحدد", prompt: "اشرح لي طريقة حساب محدد المصفوفة الحالية." },
    { icon: Sparkles, label: "اشرح العمليات", prompt: "اشرح عمليات Matrix المتاحة ومتى أستخدم كل عملية." },
    { icon: Calculator, label: "احسب Rank", prompt: "ساعدني في حساب Rank لمصفوفة وأشرح النتيجة." },
    { icon: GitBranch, label: "Workflow مصفوفة", prompt: "أنشئ Smart Nodes لمعالجة مصفوفة ثم عرض النتيجة." },
  ],
  DEFAULT: [
    { icon: Calculator, label: "احسب تعبيراً", prompt: "احسب sqrt(16)+sin(30) واعرض الناتج على شاشة الحاسبة." },
    { icon: Sparkles, label: "اشرح الشاشة", prompt: "اشرح لي المحتوى الموجود حالياً في الحاسبة وما الذي يمكنني فعله بعد ذلك." },
    { icon: ChartNoAxesCombined, label: "ارسم معادلة", prompt: "افتح Graph وارسم y=x^2-4." },
    { icon: GitBranch, label: "أنشئ Workflow", prompt: "أنشئ Smart Nodes لمسألة حسابية ثم تحقق منها باستخدام Graph وPython." },
  ],
} as const;

function toolTitle(call: AgentToolCall): string {
  if (call.name === "create_python_file") return `Create ${String(call.args.filename ?? "Python file")}?`;
  if (call.name === "update_python_file") return `Replace ${String(call.args.filename ?? "Python file")}?`;
  if (call.name === "run_python_file") return `Run ${String(call.args.filename ?? "Python file")}?`;
  return `Allow ${call.name}?`;
}

export default function AgentPanel() {
  const toast = useToast();
  const { buildContext, executeTool } = useCalculatorAgent();
  const open = useAgentStore((state) => state.open);
  const view = useAgentStore((state) => state.view);
  const busy = useAgentStore((state) => state.busy);
  const messages = useAgentStore((state) => state.messages);
  const currentMode = useCasioStore((state) => state.currentMode);
  const setOpen = useAgentStore((state) => state.setOpen);
  const setView = useAgentStore((state) => state.setView);
  const setBusy = useAgentStore((state) => state.setBusy);
  const addMessage = useAgentStore((state) => state.addMessage);
  const clear = useAgentStore((state) => state.clear);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<AgentToolCall[]>([]);
  const [activeApproval, setActiveApproval] = useState<AgentToolCall | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const history = useMemo(() => messages.filter((message) => message.role !== "system").slice(-8), [messages]);
  const quickPrompts = currentMode === "PYTHON" ? QUICK_PROMPTS.PYTHON : currentMode === "GRAPH" ? QUICK_PROMPTS.GRAPH : currentMode === "MATRIX" ? QUICK_PROMPTS.MATRIX : QUICK_PROMPTS.DEFAULT;

  const runCalls = async (calls: AgentToolCall[]) => {
    const approval: AgentToolCall[] = [];
    const results: string[] = [];
    for (const call of calls.slice(0, 4)) {
      if (APPROVAL_TOOLS.has(call.name)) { approval.push(call); continue; }
      try { results.push(await executeTool(call)); }
      catch (error) { results.push(error instanceof Error ? error.message : `Could not execute ${call.name}.`); }
    }
    if (results.length) addMessage({ role: "assistant", content: `Completed:\n${results.join("\n")}`, toolNames: calls.map((call) => call.name) });
    if (approval.length) {
      setPending(approval.slice(1));
      setActiveApproval(approval[0]);
    }
  };

  const send = async (quickPrompt?: string) => {
    const message = (quickPrompt ?? input).trim();
    if (!message || busy) return;
    setInput("");
    addMessage({ role: "user", content: message });
    setBusy(true);
    try {
      const response = await fetch("/api/agent/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, context: buildContext() }),
      });
      const payload = await response.json() as AgentTurnResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The assistant request failed.");
      addMessage({ role: "assistant", content: payload.text || (payload.toolCalls.length ? "I prepared the requested calculator actions." : "No response was returned."), model: payload.model, toolNames: payload.toolCalls.map((call) => call.name) });
      await runCalls(payload.toolCalls);
    } catch (error) {
      const description = error instanceof Error ? error.message : "The assistant could not complete this request.";
      addMessage({ role: "assistant", content: description });
      toast({ title: "AI assistant unavailable", description, variant: "error", duration: 5200 });
    } finally { setBusy(false); }
  };

  const resolveApproval = async (approved: boolean) => {
    const call = activeApproval;
    setActiveApproval(null);
    if (call && approved) {
      try {
        const result = await executeTool(call);
        addMessage({ role: "assistant", content: result, toolNames: [call.name] });
        toast({ title: "AI action completed", description: result, variant: "success" });
      } catch (error) {
        toast({ title: "AI action failed", description: error instanceof Error ? error.message : "The action could not be completed.", variant: "error" });
      }
    }
    const [next, ...rest] = pending;
    setPending(rest);
    if (next) window.setTimeout(() => setActiveApproval(next), 120);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.aside initial={{ opacity: 0, x: 24, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.98 }} className="agent-panel" aria-label="Calculator AI assistant">
            <header className="agent-header">
              <div className="agent-brand"><Bot size={17} /><span>CALCULATOR AGENT</span></div>
              <div className="flex items-center gap-1">
                <button type="button" className="mode-icon-button" onClick={clear} title="Clear agent session"><Trash2 size={14} /></button>
                <button type="button" className="mode-icon-button" onClick={() => setOpen(false)} title="Close assistant"><X size={14} /></button>
              </div>
            </header>
            <div className="agent-tabs">
              <button type="button" onClick={() => setView("chat")} className={view === "chat" ? "active" : ""}><MessageSquare size={13} /> Chat</button>
              <button type="button" onClick={() => setView("workflow")} className={view === "workflow" ? "active" : ""}><GitBranch size={13} /> Smart nodes</button>
            </div>
            {view === "workflow" ? <div className="min-h-0 flex-1"><WorkflowCanvas /></div> : (
              <>
                <div className="agent-messages panel-scroll">
                  {messages.length === 0 && <div className="agent-empty"><Sparkles size={22} /><strong>مساعد الحاسبة جاهز</strong><span>يمكنه فهم القسم الحالي، الرسم، الحساب، وكتابة Python بعد موافقتك.</span></div>}
                  {messages.filter((message) => message.role !== "system").map((message) => (
                    <div key={message.id} className={`agent-message ${message.role}`}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      {message.model && <span>{message.model}</span>}
                    </div>
                  ))}
                  {busy && <div className="agent-thinking"><i /><i /><i /><span>Thinking with minimized context</span></div>}
                </div>
                <div className="agent-quick-section">
                  <div className="agent-quick-heading"><span>QUICK QUESTIONS</span><small>{currentMode.replace("_", "-")}</small></div>
                  <div className="agent-quick-grid">
                    {quickPrompts.map(({ icon: Icon, label, prompt }) => (
                      <button key={label} type="button" onClick={() => void send(prompt)} disabled={busy} title={prompt} dir="rtl">
                        <Icon size={13} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="agent-composer">
                  <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} rows={2} maxLength={10_000} placeholder="Ask the calculator agent..." />
                  <button type="button" onClick={() => void send()} disabled={!input.trim() || busy} aria-label="Send message"><Send size={16} /></button>
                </div>
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      <AppDialog open={Boolean(activeApproval)} onOpenChange={(next) => { if (!next) void resolveApproval(false); }} title={activeApproval ? toolTitle(activeApproval) : "Approve AI action"} description="The assistant cannot change or execute Python code until you approve this exact action." icon={<Bot size={17} />} footer={<><button type="button" onClick={() => void resolveApproval(false)} className={`${dialogButtonClass} border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]`}>Reject</button><button type="button" onClick={() => void resolveApproval(true)} className={`${dialogButtonClass} border-[#1f7a55] bg-[#087443] text-white hover:bg-[#09663c]`}>Approve action</button></>}>
        {activeApproval && <div className="agent-approval"><div><strong>Tool</strong><code>{activeApproval.name}</code></div>{Boolean(activeApproval.args.filename) && <div><strong>File</strong><code>{String(activeApproval.args.filename)}</code></div>}{Boolean(activeApproval.args.summary) && <p>{String(activeApproval.args.summary)}</p>}{Boolean(activeApproval.args.code) && <pre>{String(activeApproval.args.code).slice(0, 8000)}</pre>}</div>}
      </AppDialog>
    </>
  );
}
