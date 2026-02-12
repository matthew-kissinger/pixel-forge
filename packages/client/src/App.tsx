import { useCallback, type DragEvent, useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Command } from 'lucide-react';
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
import { MobileNav, type MobilePanel } from './components/panels/MobileNav';
import { KeyboardShortcutsHelp } from './components/panels/KeyboardShortcutsHelp';
import { ToastContainer, toast } from './components/ui/Toast';
import { RecoveryBanner } from './components/ui/RecoveryBanner';
import { useMediaQuery } from './hooks/useMediaQuery';
import { findNonOverlappingPosition } from './lib/nodeLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NodeContextMenu } from './components/NodeContextMenu';
import { executeSingleNode } from './lib/executor';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoSave } from './hooks/useAutoSave';
import { useWorkflowFromUrl } from './hooks/useWorkflowFromUrl';
import { templates, templateToFlow } from './lib/templates';

const CommandPalette = lazy(() =>
  import('./components/panels/CommandPalette').then((m) => ({ default: m.CommandPalette }))
);

let nodeIdCounter = 0;
const generateNodeId = () => `node_${++nodeIdCounter}`;

interface FlowEditorProps {
  isMiniMapVisible: boolean;
  controlsMarginLeft?: number;
}

function FlowEditor({ isMiniMapVisible, controlsMarginLeft = 240 }: FlowEditorProps) {
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
    demoMode,
    setNodes,
  } = workflowStore;

  const reactFlow = useReactFlow();
  const { screenToFlowPosition, fitView } = reactFlow;

  // Auto-load demo template if empty and in demo mode
  useEffect(() => {
    if (demoMode && nodes.length === 0) {
      const demoTemplate = templates.find(t => t.id === 'demo-pipeline');
      if (demoTemplate) {
        const { nodes: templateNodes, edges: templateEdges } = templateToFlow(demoTemplate);
        setNodes(templateNodes);
        
        // Use a small delay for edges to ensure nodes are registered
        setTimeout(() => {
          templateEdges.forEach(edge => onConnect({
            ...edge,
            sourceHandle: edge.sourceHandle ?? null,
            targetHandle: edge.targetHandle ?? null,
          }));
          reactFlow.fitView({ padding: 0.2 });
        }, 100);
        
        toast.success('Loaded demo pipeline');
      }
    }
  }, [demoMode, nodes.length, setNodes, onConnect, reactFlow]);

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
  }, [nodes, edges]);

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
  }, [nodes, addNode]);

  const handleDelete = useCallback((nodeId: string) => {
    onNodesChange([{ id: nodeId, type: 'remove' }]);
    toast.info('Deleted node');
  }, [onNodesChange]);

  const handleClearOutput = useCallback((nodeId: string) => {
    clearNodeOutput(nodeId);
    setNodeStatus(nodeId, 'idle');
    setNodeError(nodeId, null);
    toast.info('Cleared output');
  }, [clearNodeOutput, setNodeStatus, setNodeError]);

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
    [isValidConnection, onConnect]
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
      <Controls position="bottom-left" style={{ marginLeft: `${controlsMarginLeft}px` }} />
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
  const [mobileActivePanel, setMobileActivePanel] = useState<MobilePanel>('none');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const isMd = useMediaQuery('(min-width: 768px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const isNarrow = useMediaQuery('(max-width: 768px)');
  const isCoarse = useMediaQuery('(pointer: coarse)');
  const showCommandPaletteFAB = isNarrow || isCoarse;
  const workflowFromUrlStatus = useWorkflowFromUrl();
  const allowAutoSaveRecovery =
    workflowFromUrlStatus === 'none' || workflowFromUrlStatus === 'error';
  const { pendingRecovery, confirmRecovery, discardRecovery } = useAutoSave({
    allowRecovery: allowAutoSaveRecovery,
  });

  // Theme system
  const theme = useWorkflowStore((state) => state.theme);

  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  // Escape key handler to close active mobile panel overlay
  useEffect(() => {
    if (isMd || mobileActivePanel === 'none') return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileActivePanel('none');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMd, mobileActivePanel]);

  // Global Escape handler for desktop panels
  useEffect(() => {
    if (!isMd) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPresetLauncherVisible) {
          setIsPresetLauncherVisible(false);
        } else if (isHistoryVisible) {
          setIsHistoryVisible(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMd, isPresetLauncherVisible, isHistoryVisible]);

  // "?" key handler for shortcuts help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setShortcutsHelpOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Command palette keyboard shortcut (Cmd/Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Controls margin: 0 on mobile, 208 on tablet (w-48 + left-4), 240 on desktop (w-56 + left-4)
  const controlsMarginLeft = isMd ? (isLg ? 240 : 208) : 0;

  const handleMobilePanelToggle = (panel: MobilePanel) => {
    setMobileActivePanel((prev) => (prev === panel ? 'none' : panel));
  };

  // Mobile: panels hidden by default, shown as overlay when toggled
  // Tablet: NodePalette narrow, toolbar top
  // Desktop: current layout
  const showNodePalette = isMd || mobileActivePanel === 'palette';
  const showToolbar = isMd || mobileActivePanel === 'menu';
  const showPresetLauncher =
    (isMd && isPresetLauncherVisible) || (!isMd && mobileActivePanel === 'generate');
  const showExecutionHistory =
    (isMd && isHistoryVisible) || (!isMd && mobileActivePanel === 'history');

  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <div className="h-screen w-screen pb-16 md:pb-0">
          {pendingRecovery && (
            <RecoveryBanner
              onRecover={confirmRecovery}
              onDiscard={discardRecovery}
            />
          )}
          <FlowEditor
            isMiniMapVisible={isMiniMapVisible}
            controlsMarginLeft={controlsMarginLeft}
          />
          {showNodePalette && (
            <NodePalette
              isMobileOverlay={!isMd && mobileActivePanel === 'palette'}
              onMobileClose={() => setMobileActivePanel('none')}
            />
          )}
          {showToolbar && (
            <Toolbar
              onToggleHistory={() => setIsHistoryVisible(!isHistoryVisible)}
              isHistoryVisible={isHistoryVisible}
              onToggleMiniMap={() => setIsMiniMapVisible(!isMiniMapVisible)}
              isMiniMapVisible={isMiniMapVisible}
              onTogglePresetLauncher={() => setIsPresetLauncherVisible(!isPresetLauncherVisible)}
              isPresetLauncherVisible={isPresetLauncherVisible}
              isMobileOverlay={!isMd && mobileActivePanel === 'menu'}
              onMobileClose={() => setMobileActivePanel('none')}
            />
          )}
          <PresetLauncher
            isVisible={showPresetLauncher}
            onToggle={() =>
              isMd ? setIsPresetLauncherVisible(false) : setMobileActivePanel('none')
            }
            isMobileOverlay={!isMd && mobileActivePanel === 'generate'}
          />
          <ExecutionHistory
            isVisible={showExecutionHistory}
            onToggle={() =>
              isMd ? setIsHistoryVisible(false) : setMobileActivePanel('none')
            }
            isMobileOverlay={!isMd && mobileActivePanel === 'history'}
          />
          <MobileNav activePanel={mobileActivePanel} onToggle={handleMobilePanelToggle} />
          {showCommandPaletteFAB && (
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="fixed bottom-6 right-6 z-50 flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-transform hover:bg-[var(--accent-hover)] hover:scale-105 active:scale-95"
              style={{ minWidth: 56, minHeight: 56 }}
              aria-label="Open command palette"
            >
              <Command className="h-6 w-6" />
            </button>
          )}
          <Suspense fallback={null}>
            <CommandPalette
              isOpen={commandPaletteOpen}
              onClose={() => setCommandPaletteOpen(false)}
              showShortcuts={!showCommandPaletteFAB}
            />
          </Suspense>
          <KeyboardShortcutsHelp
            isOpen={shortcutsHelpOpen}
            onClose={() => setShortcutsHelpOpen(false)}
          />
          <ToastContainer />
        </div>
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}
