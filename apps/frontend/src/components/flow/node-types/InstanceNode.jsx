// src/components/flow/node-types/InstanceNode.jsx
/* eslint-disable react/prop-types */
import { memo } from 'react';
import NodeChrome from './NodeChrome';
import '../styles/packet-tracer.css';
import { getIconByInstanceType } from '../helper/iconHelper';
import { TYPE_COMPUTER_NODE, TYPE_PRINTER_NODE, TYPE_SERVER_NODE } from '../utils/constants';

const InstanceNode = ({ data = {}, type }) => {
  const name = data.name || data.title || 'Instance';
  const ip = data.ipAddress || 'IP n/a';
  const ami = data.ami || 'AMI n/a';
  const itype = data.instanceType || 'type n/a';

  let kind = 'pc';
  if (type === TYPE_SERVER_NODE) kind = 'server';
  if (type === TYPE_PRINTER_NODE) kind = 'printer';

  return (
    <div style={{ width:'100%', height:'100%' }}>
      <NodeChrome
        type={`inst ${kind}`}             // << añade la subclase
        title={name}
        subtitle={`${ip} • ${itype}`}
        status="up"
        rightArea={<span className="pt-badge">{ami}</span>}
      >
        <div className="pt-badges" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className="pt-badge">ENI-0</span>
          <span className="pt-badge">SSH {data?.sshAccess ? 'Yes' : 'No'}</span>
          <div style={{ marginLeft:'auto' }}>{getIconByInstanceType?.(type)}</div>
        </div>
      </NodeChrome>
    </div>
  );
};
export default memo(InstanceNode);
