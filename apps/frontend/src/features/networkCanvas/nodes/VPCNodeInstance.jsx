// src/components/flow/node-types/VPCNodeInstance.jsx
import { Handle, NodeResizer, Position } from "@xyflow/react";
import { memo } from 'react';
import '../styles/packet-tracer.css';
import NodeChrome from './NodeChrome';
import {
  heightDefaultVPCNode,
  widthDefaultVPCNode,
} from '@/features/networkCanvas/utils/constants';

function VPCNodeInstance({ data = {}, isConnectable }) {
  // nombre: prioriza vpcName, si no usa name, luego title
  const name =
    data.vpcName ||
    data.name ||
    data.title ||
    'VPC';

  // región
  const region = data.region || 'region n/a';

  // CIDR: acepta camelCase y snake_case
  const cidrBase = data.cidrBlock || data.cidr_block;
  const cidrPref = data.prefixLength ?? data.prefix_length;
  const cidr = (cidrBase && (cidrPref || cidrPref === 0))
    ? `${cidrBase}/${cidrPref}`
    : 'CIDR n/a';

  // Flags IGW / NAT (acepta ambos formatos)
  const igwOn = !!(data.internetGateway ?? data.internet_gateway);
  const natEnabled =
    !!(data.enableNatGateway ??
      (data.nat_gateway && data.nat_gateway.enabled));
  const edgeLabel = igwOn ? 'Internet edge available' : 'Private-only boundary';
  const egressLabel = natEnabled ? 'Managed egress path' : 'No NAT egress';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <NodeResizer minWidth={widthDefaultVPCNode} minHeight={heightDefaultVPCNode} />

      <div className="pt-fill">
        <NodeChrome
          type="vpc"
          className="pt-node--vpc-shell"
          bodyClassName="pt-node__body--vpc"
          eyebrow="network fabric"
          title={name}
          subtitle={`${cidr} • ${region}`}
          status="up"
          rightArea={<span className="pt-badge">AWS</span>}
        >
          <div className="pt-vpc-surface">
            <div className="pt-badges pt-badges--services">
              <span className={`pt-badge ${igwOn ? 'pt-badge--up' : 'pt-badge--muted'}`}>IGW {igwOn ? 'ON' : 'OFF'}</span>
              <span className={`pt-badge ${natEnabled ? 'pt-badge--up' : 'pt-badge--muted'}`}>NAT {natEnabled ? 'ON' : 'OFF'}</span>
              <span className="pt-badge pt-badge--ghost">Perimeter control</span>
            </div>
            <div className="pt-vpc-core">
              <div className="pt-vpc-signal">
                <span className="pt-vpc-signal__pulse" />
                <span className="pt-vpc-signal__text">{edgeLabel}</span>
              </div>
              <div className="pt-vpc-signal">
                <span className="pt-vpc-signal__pulse pt-vpc-signal__pulse--soft" />
                <span className="pt-vpc-signal__text">{egressLabel}</span>
              </div>
            </div>
          </div>
        </NodeChrome>
      </div>

      <Handle type="source" position={Position.Top} className="pt-handle" isConnectable={isConnectable} />
    </div>
  );
}

export default memo(VPCNodeInstance);
