import { useCallback, type DragEvent, useState, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Connection,
  type Edge,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowStore, type NodeData } from './stores/workflow';
import {
  nodeTypes,
  legacyNodeDefinitions as nodeDefinitions,
  nodeCategories,
  type NodeType,
  getNodeIOSpec,
  type NodeTypeName,
} from './components/nodes';
import { NodePalette } from './components/panels/NodePalette';
import { Toolbar } from './components/panels/Toolbar';
import { ExecutionHistory } from './components/panels/ExecutionHistory';
import { PresetLauncher } from './components/panels/PresetLauncher';
import { ToastContainer, toast } from './components/ui/Toast';
import { findNonOverlappingPosition } from './lib/nodeLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NodeContextMenu } from './components/NodeContextMenu';
import { executeSingleNode } from './lib/executor';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoSave } from './hooks/useAutoSave';
import { useWorkflowFromUrl } from './hooks/useWorkflowFromUrl';

let nodeIdCounter = 0;
const generateNodeId = () => `node_${++nodeIdCounter}`;

interface FlowEditorProps {
  isMiniMapVisible: boolean;
}

function FlowEditor({ isMiniMapVisible }: FlowEditorProps) {
  const workflowStore = useWorkflowStore();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    clearNodeOutput,
    setNodeStatus,
    setNodeError,
    nodeStatus,
  } = workflowStore;

  const reactFlow = useReactFlow();
  const { screenToFlowPosition, fitView } = reactFlow;

  // Clipboard state for copy/paste
  const clipboardRef = useRef<{ nodes: Node<NodeData>[]; edges: Edge[] }>({
    nodes: [],
    edges: [],
  });

  const handleCopy = useCallback(
    (selectedNodes: Node<NodeData>[]) => {
      if (selectedNodes.length === 0) return;

      // Find edges where both source and target are in the selected set
      const selectedIds = new Set(selectedNodes.map((n) => n.id));
      const copiedEdges = edges.filter(
        (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
      );

      clipboardRef.current = {
        nodes: selectedNodes,
        edges: copiedEdges,
      };
    },
    [edges]
  );

  const handlePaste = useCallback(() => {
    const { nodes: copiedNodes, edges: copiedEdges } = clipboardRef.current;
    if (copiedNodes.length === 0) return;

    // Create ID mapping for old -> new
    const idMap = new Map<string, string>();
    const newNodes: Node<NodeData>[] = [];

    // Calculate offset - use the first node's position as reference
    const firstNode = copiedNodes[0];
    const offsetX = 50;
    const offsetY = 50;

    // Find a non-overlapping position for the first node
    const firstNewPosition = findNonOverlappingPosition(
      {
        x: firstNode.position.x + offsetX,
        y: firstNode.position.y + offsetY,
      },
      nodes
    );

    // Calculate the offset from original to new position for the first node
    const actualOffsetX = firstNewPosition.x - firstNode.position.x;
    const actualOffsetY = firstNewPosition.y - firstNode.position.y;

    // Create new nodes with new IDs, maintaining relative positions
    for (const node of copiedNodes) {
      const newId = generateNodeId();
      idMap.set(node.id, newId);

      const newNode: Node<NodeData> = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + actualOffsetX,
          y: node.position.y + actualOffsetY,
        },
        data: structuredClone(node.data),
        selected: false,
      };

      // Clear any output/status data
      clearNodeOutput(newId);
      setNodeStatus(newId, 'idle');
      setNodeError(newId, null);

      newNodes.push(newNode);
    }

    // Add all new nodes
    for (const newNode of newNodes) {
      addNode(newNode);
    }

    // Create new edges with updated IDs
    const newEdges: Edge[] = [];
    for (const edge of copiedEdges) {
      const newSource = idMap.get(edge.source);
      const newTarget = idMap.get(edge.target);
      if (newSource && newTarget) {
        newEdges.push({
          ...edge,
          id: `edge_${Date.now()}_${Math.random()}`,
          source: newSource,
          target: newTarget,
        });
      }
    }

    // Add new edges
    for (const edge of newEdges) {
      onConnect({
        ...edge,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
      });
    }

    toast.info(`Pasted ${newNodes.length} node${newNodes.length > 1 ? 's' : ''}`);
  }, [nodes, addNode, clearNodeOutput, setNodeStatus, setNodeError, onConnect]);

  useKeyboardShortcuts(workflowStore, reactFlow, handleCopy, handlePaste);

  const [menu, setMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setMenu({
        id: node.id,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [setMenu]
  );

  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

  const handleRerun = useCallback(async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const store = useWorkflowStore.getState();
    const result = await executeSingleNode(node, nodes, edges, store);
    
    if (result.success) {
      toast.success(`Executed ${node.data.label}`);
    } else {
      toast.error(`Failed to execute ${node.data.label}: ${result.error}`);
    }
  }, [nodes, edges, toast]);

  const handleDuplicate = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const newNode: Node<NodeData> = {
      ...node,
      id: generateNodeId(),
      position: { x: node.position.x + 30, y: node.position.y + 30 },
      data: JSON.parse(JSON.stringify(node.data)),
      selected: false,
    };
    addNode(newNode);
    toast.info(`Duplicated ${node.data.label}`);
  }, [nodes, addNode, toast]);

  const handleDelete = useCallback((nodeId: string) => {
    onNodesChange([{ id: nodeId, type: 'remove' }]);
    toast.info('Deleted node');
  }, [onNodesChange, toast]);

  const handleClearOutput = useCallback((nodeId: string) => {
    clearNodeOutput(nodeId);
    setNodeStatus(nodeId, 'idle');
    setNodeError(nodeId, null);
    toast.info('Cleared output');
  }, [clearNodeOutput, setNodeStatus, setNodeError, toast]);

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (!connection.source || !connection.target) return false;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return false;

      const sourceType = sourceNode.type as NodeTypeName;
      const targetType = targetNode.type as NodeTypeName;

      // Use the new IO spec system for validation
      const sourceIO = getNodeIOSpec(sourceType);
      const targetIO = getNodeIOSpec(targetType);

      if (!sourceIO || !targetIO) return true; // Allow if no specs defined

      // Check if target accepts the source's output type
      if (targetIO.inputs.length === 0) return false; // No inputs
      if (!sourceIO.output) return false; // No outputs

      return targetIO.inputs.includes(sourceIO.output);
    },
    [nodes]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (isValidConnection(connection)) {
        onConnect(connection);
      } else {
        toast.error('Invalid connection: incompatible types');
      }
    },
    [isValidConnection, onConnect, toast]
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!nodeType) return;

      const definition = nodeDefinitions.find((d) => d.type === nodeType);
      if (!definition) return;

      // Get drop position in flow coordinates
      const dropPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Find a non-overlapping position using smart layout
      const position = findNonOverlappingPosition(dropPosition, nodes);

      const newNode: Node<NodeData> = {
        id: generateNodeId(),
        type: nodeType,
        position,
        data: { ...definition.defaultData },
      };

      addNode(newNode);
      toast.info(`Added ${definition.label} node`);

      // Fit view after adding node with a small delay
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 50);
    },
    [addNode, screenToFlowPosition, nodes, fitView]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      isValidConnection={isValidConnection}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onNodeContextMenu={onNodeContextMenu}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        type: 'smoothstep',
        animated: true,
      }}
      connectionLineStyle={{ stroke: 'var(--accent)', strokeWidth: 2 }}
      snapToGrid
      snapGrid={[10, 10]}
    >
      <Background gap={20} size={1} color="var(--border-color)" />
      <Controls position="bottom-left" style={{ marginLeft: '240px' }} />
      {isMiniMapVisible && (
        <MiniMap
          position="bottom-right"
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            background: 'var(--bg-secondary)',
          }}
          nodeColor={(node) => {
            const type = node.type as NodeType;
            const def = nodeDefinitions.find((d) => d.type === type);
            if (def) {
              return nodeCategories[def.category]?.color ?? 'var(--bg-tertiary)';
            }
            return 'var(--bg-tertiary)';
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      )}
      {menu && (
        <NodeContextMenu
          x={menu.x}
          y={menu.y}
          nodeId={menu.id}
          onClose={() => setMenu(null)}
          onRerun={handleRerun}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onClearOutput={handleClearOutput}
          canRerun={nodeStatus[menu.id] === 'success' || nodeStatus[menu.id] === 'error'}
        />
      )}
    </ReactFlow>
  );
}

export default function App() {
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isMiniMapVisible, setIsMiniMapVisible] = useState(true);
  const [isPresetLauncherVisible, setIsPresetLauncherVisible] = useState(false);
  const workflowFromUrlStatus = useWorkflowFromUrl();
  const allowAutoSaveRecovery =
    workflowFromUrlStatus === 'none' || workflowFromUrlStatus === 'error';
  useAutoSave({ allowRecovery: allowAutoSaveRecovery });

  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <div className="h-screen w-screen">
          <FlowEditor isMiniMapVisible={isMiniMapVisible} />
          <NodePalette />
          <Toolbar
            onToggleHistory={() => setIsHistoryVisible(!isHistoryVisible)}
            isHistoryVisible={isHistoryVisible}
            onToggleMiniMap={() => setIsMiniMapVisible(!isMiniMapVisible)}
            isMiniMapVisible={isMiniMapVisible}
            onTogglePresetLauncher={() => setIsPresetLauncherVisible(!isPresetLauncherVisible)}
            isPresetLauncherVisible={isPresetLauncherVisible}
          />
          <PresetLauncher
            isVisible={isPresetLauncherVisible}
            onToggle={() => setIsPresetLauncherVisible(false)}
          />
          <ExecutionHistory
            isVisible={isHistoryVisible}
            onToggle={() => setIsHistoryVisible(false)}
          />
          <ToastContainer />
        </div>
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}
