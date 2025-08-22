// src/components/flow/node-types/VPCNodeInstance.jsx
import { memo } from 'react';
import { Handle, Position, NodeResizer } from "@xyflow/react";
import NodeChrome from './NodeChrome';
import '../styles/packet-tracer.css';

// eslint-disable-next-line react/prop-types
function VPCNodeInstance({ data = {}, isConnectable }) {
    const name = data.vpcName || data.title || 'VPC';
    const cidr = (data.cidrBlock && data.prefixLength) ? `${data.cidrBlock}/${data.prefixLength}` : 'CIDR n/a';
    const region = data.region || 'region n/a';

    return (
        // Wrapper: el tamaño real del nodo lo controla React Flow; este DIV ocupa ese tamaño.
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Resizer (minimos sugeridos). El borde aparece al seleccionar el nodo. */}
            <NodeResizer minWidth={520} minHeight={220} />

            {/* Chrome estilo Packet Tracer. pt-fill hace que ocupe 100% del wrapper */}
            <div className="pt-fill">
                <NodeChrome
                    type="vpc"
                    title={name}
                    subtitle={`${cidr} • ${region}`}
                    status="up"
                    // No pases pt-size--vpc si quieres tamaño totalmente libre; con NodeResizer ya basta.
                    rightArea={<span className="pt-badge">AWS</span>}
                >
                    <div className="pt-badges">
                        <span className="pt-badge">IGW {data?.internetGateway ? 'ON' : 'OFF'}</span>
                        <span className="pt-badge">NAT {data?.enableNatGateway ? 'ON' : 'OFF'}</span>
                    </div>
                </NodeChrome>
            </div>

            {/* Puertos superior e inferior (útil para VPC ↔ Router y Subnet ↔ VPC) */}
            <Handle type="source" position={Position.Top} className="pt-handle" isConnectable={isConnectable} />
            {/* <Handle type="target" position={Position.Bottom} className="pt-handle" isConnectable={isConnectable} /> */}
        </div>
    );
}

export default memo(VPCNodeInstance);
