"use client";

import { useMemo, useState } from "react";
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, type NodeProps } from "@xyflow/react";
import { useAgentStore } from "@/store/agentStore";
import { Play } from "lucide-react";
import { useCalculatorAgent } from "@/hooks/useCalculatorAgent";
import { useToast } from "@/components/ui/toast";
import type { AgentToolCall } from "@/types/agent";

function WorkflowNode({ data }: NodeProps) {
  const nodeData = data as { label?: string; value?: string; kind?: string };
  return (
    <div className="agent-workflow-node">
      <Handle type="target" position={Position.Left} />
      <div className="agent-workflow-kind">{nodeData.kind}</div>
      <div className="agent-workflow-label">{nodeData.label}</div>
      {nodeData.value && <div className="agent-workflow-value">{nodeData.value}</div>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { workflow: WorkflowNode };

export default function WorkflowCanvas() {
  const toast = useToast();
  const { executeTool } = useCalculatorAgent();
  const workflow = useAgentStore((state) => state.workflow);
  const [running, setRunning] = useState(false);
  const nodes = useMemo(() => (workflow?.nodes ?? []).map((node, index) => ({
    id: node.id,
    type: "workflow",
    position: { x: 36 + (index % 3) * 220, y: 42 + Math.floor(index / 3) * 140 },
    data: { label: node.label, value: node.value, kind: node.type },
  })), [workflow]);
  const edges = useMemo(() => (workflow?.edges ?? []).map((edge) => ({ ...edge, animated: true })), [workflow]);

  const runWorkflow = async () => {
    if (!workflow || running) return;
    setRunning(true);
    const incoming = new Map(workflow.nodes.map((node) => [node.id, 0]));
    workflow.edges.forEach((edge) => incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1));
    const queue = workflow.nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0);
    const ordered: typeof workflow.nodes = [];
    while (queue.length) {
      const node = queue.shift()!;
      ordered.push(node);
      workflow.edges.filter((edge) => edge.source === node.id).forEach((edge) => {
        const next = (incoming.get(edge.target) ?? 1) - 1;
        incoming.set(edge.target, next);
        if (next === 0) { const target = workflow.nodes.find((item) => item.id === edge.target); if (target) queue.push(target); }
      });
    }
    if (ordered.length !== workflow.nodes.length) {
      toast({ title: "Workflow cannot run", description: "The smart-node graph contains a cycle.", variant: "error" });
      setRunning(false);
      return;
    }
    try {
      let executed = 0;
      for (const node of ordered) {
        let call: AgentToolCall | null = null;
        if (node.type === "calculator" && node.value) call = { id: node.id, name: "evaluate_expression", args: { expression: node.value } };
        if (node.type === "graph" && node.value) call = { id: node.id, name: "add_graph_equation", args: { expression: node.value } };
        if (["matrix", "vector", "statistics"].includes(node.type)) call = { id: node.id, name: "set_calculator_mode", args: { mode: node.type === "statistics" ? "STATISTICS" : node.type.toUpperCase() } };
        if (node.type === "python") throw new Error("Python nodes require an individual approval from the Chat tab before execution.");
        if (call) { await executeTool(call); executed++; }
      }
      toast({ title: "Workflow completed", description: `${executed} calculator action${executed === 1 ? "" : "s"} executed.`, variant: "success" });
    } catch (error) {
      toast({ title: "Workflow stopped", description: error instanceof Error ? error.message : "A node could not be executed.", variant: "warning" });
    } finally { setRunning(false); }
  };

  if (!workflow) return <div className="agent-empty">Ask the assistant to create a smart-node workflow.</div>;
  return (
    <div className="h-full min-h-0">
      <div className="agent-workflow-title"><span>{workflow.title}</span><button type="button" onClick={() => void runWorkflow()} disabled={running}><Play size={12} fill="currentColor" />{running ? "RUNNING" : "RUN"}</button></div>
      <div className="h-[calc(100%-38px)]">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.3} maxZoom={1.5} nodesDraggable>
          <Background gap={18} size={1} />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
