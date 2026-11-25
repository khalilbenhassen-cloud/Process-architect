import React from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { BaseNode, CustomNodeData } from './BaseNode';

export const StartNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <BaseNode
      data={data as unknown as CustomNodeData}
      selected={selected}
      variant="start"
      hasTargetHandle={false}
      hasSourceHandle={true}
    />
  );
};

export const EndNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <BaseNode
      data={data as unknown as CustomNodeData}
      selected={selected}
      variant="end"
      hasTargetHandle={true}
      hasSourceHandle={false}
    />
  );
};

export const TaskNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <BaseNode
      data={data as unknown as CustomNodeData}
      selected={selected}
      variant="default"
      hasTargetHandle={true}
      hasSourceHandle={true}
    />
  );
};

export const DecisionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as CustomNodeData;
  return (
    <div className="relative">
      {/* Top source handle for upward 90° branches (e.g. INCOMPLET) */}
      <Handle
        type="source"
        id="top"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-white hover:!bg-amber-600 !-top-1.5 z-20"
      />
      <BaseNode
        data={nodeData}
        selected={selected}
        variant="decision"
        hasTargetHandle={true}
        hasSourceHandle={true}
      />
      {/* Bottom source handle for downward 90° branches (e.g. REJET / NON) */}
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-white hover:!bg-amber-600 !-bottom-1.5 z-20"
      />
    </div>
  );
};

export const DataNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <BaseNode
      data={data as unknown as CustomNodeData}
      selected={selected}
      variant="default"
      hasTargetHandle={true}
      hasSourceHandle={true}
    />
  );
};

export const SubprocessNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <BaseNode
      data={data as unknown as CustomNodeData}
      selected={selected}
      variant="default"
      hasTargetHandle={true}
      hasSourceHandle={true}
    />
  );
};

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  task: TaskNode,
  decision: DecisionNode,
  data: DataNode,
  subprocess: SubprocessNode,
};


