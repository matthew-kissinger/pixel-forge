import { useCallback, type DragEvent } from 'react';
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
  type NodeType,
  getNodeIOSpec,
  type NodeTypeName,
} from './components/nodes';
import { NodePalette } from './components/panels/NodePalette';
import { Toolbar } from './components/panels/Toolbar';
import { ToastContainer, toast } from './components/ui/Toast';
import { findNonOverlappingPosition } from './lib/nodeLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

let nodeIdCounter = 0;
const generateNodeId = () => `node_${++nodeIdCounter}`;

function FlowEditor() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
  } = useWorkflowStore();

  const { screenToFlowPosition, fitView } = useReactFlow();

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
      <MiniMap
        position="bottom-right"
        nodeColor={(node) => {
          const type = node.type as NodeType;
          const def = nodeDefinitions.find((d) => d.type === type);
          if (def) {
            switch (def.category) {
              case 'input':
                return '#22c55e';
              case 'generate':
                return '#6366f1';
              case 'process':
                return '#f59e0b';
              case 'output':
                return '#ef4444';
            }
          }
          return 'var(--bg-tertiary)';
        }}
        maskColor="rgba(0, 0, 0, 0.6)"
      />
    </ReactFlow>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <div className="h-screen w-screen">
          <FlowEditor />
          <NodePalette />
          <Toolbar />
          <ToastContainer />
        </div>
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}
