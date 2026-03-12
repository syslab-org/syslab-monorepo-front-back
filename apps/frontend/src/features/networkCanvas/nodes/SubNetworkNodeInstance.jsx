import { memo } from 'react';
import { Handle, NodeResizer, Position, useStore } from "@xyflow/react";
import NodeChrome from './NodeChrome';
import '../styles/packet-tracer.css';
import {
  heightDefaultSubNetworkNode,
  widthDefaultSubNetworkNode,
} from '@/features/networkCanvas/utils/constants';

function SubNetworkNodeInstance({ data = {}, isConnectable, parentId }) {
  const title = data.subnetName || data.title || 'SubNetwork';
  const cidr = data.cidrBlock || 'CIDR n/a';
  const az = data.availabilityZone || 'AZ n/a';
  const subnetKind = String(data.subnetType || 'public').toLowerCase();
  const routeTable = String(data.route_table || 'main').toUpperCase();
  const autoPublicIp = !!data.map_public_ip_on_launch;
  const parentNode = useStore((state) => (
    parentId ? state.nodeInternals?.get(parentId) ?? null : null
  ));
  const parentData = parentNode?.data || {};
  const hasInternetGateway = Boolean(
    parentData.internetGateway ?? parentData.internet_gateway,
  );
  const hasNatGateway = Boolean(
    parentData.enableNatGateway ??
    parentData.nat_gateway?.enabled,
  );
  const status = cidr === 'CIDR n/a' || az === 'AZ n/a' ? 'warn' : 'up';
  const eyebrow = subnetKind === 'private' ? 'private segment' : 'public segment';
  const laneLabel = subnetKind === 'public'
    ? (hasInternetGateway ? 'Public ingress enabled' : 'Public segment without IGW')
    : (hasNatGateway ? 'Private egress via NAT' : 'Internal-only subnet');

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <NodeResizer minWidth={widthDefaultSubNetworkNode} minHeight={heightDefaultSubNetworkNode} />

      <div className="pt-fill">
        <NodeChrome
          type="subnet"
          className={`pt-node--subnet-${subnetKind}`}
          bodyClassName="pt-node__body--subnet"
          eyebrow={eyebrow}
          title={title}
          subtitle={`${cidr} • ${az}`}
          status={status}
          rightArea={<span className={`pt-badge pt-badge--tone pt-badge--${subnetKind}`}>{subnetKind.toUpperCase()}</span>}
        >
          <div className={`pt-subnet-shell pt-subnet-shell--${subnetKind}`}>
            <div className="pt-badges">
              <span className="pt-badge">RT {routeTable}</span>
              <span className="pt-badge">ACL default</span>
              <span className="pt-badge">IP Auto {autoPublicIp ? 'ON' : 'OFF'}</span>
            </div>
            <div className="pt-subnet-flow">
              <span className="pt-subnet-flow__rail" />
              <span className="pt-subnet-flow__rail" />
              <span className="pt-subnet-flow__text">{laneLabel}</span>
            </div>
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
