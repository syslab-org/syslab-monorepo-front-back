import { memo } from 'react';
import { Handle, Position, NodeResizer } from "@xyflow/react";
import NodeChrome from './NodeChrome';
import '../styles/packet-tracer.css';

function SubNetworkNodeInstance({ data = {}, isConnectable }) {
  const title = data.subnetName || data.title || 'SubNetwork';
  const cidr = data.cidrBlock || 'CIDR n/a';
  const az = data.availabilityZone || 'AZ n/a';
  const rt = (data.route_table || 'private').toUpperCase();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <NodeResizer minWidth={320} minHeight={120} />

      <div className="pt-fill">
        <NodeChrome
          type="subnet"
          title={title}
          subtitle={`${cidr} • ${az}`}
          status={rt === 'PUBLIC' ? 'up' : 'warn'}
          rightArea={<span className="pt-badge">{rt}</span>}
        >
          <div className="pt-badges">
            <span className="pt-badge">ACL: default</span>
            <span className="pt-badge">DHCP: auto</span>
          </div>
        </NodeChrome>
      </div>

      {/* Conexiones típicas: Subnet ↔ VPC (arriba) e Instancias ↔ Subnet (laterales) */}
      {/* <Handle type="source" position={Position.Top} className="pt-handle" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Top} className="pt-handle" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Left} className="pt-handle" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} className="pt-handle" isConnectable={isConnectable} /> */}
    </div>
  );
}
export default memo(SubNetworkNodeInstance);
