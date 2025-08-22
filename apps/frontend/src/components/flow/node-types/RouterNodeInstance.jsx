// src/components/flow/node-types/RouterNodeInstance.jsx
/* eslint-disable react/prop-types */
import { memo } from 'react';
import { Handle, Position } from "@xyflow/react";
import '../styles/packet-tracer.css';
import RouterIcon from '@mui/icons-material/Router';

const RouterNodeInstance = ({ data = {}, isConnectable, selected }) => {
  const name = data.identifier || 'Router';
  // up (verde) si IGW; warn (naranja) si NAT; down no usado por ahora
  const state = data.internetGateway ? 'up' : (data.natGateway ? 'warn' : 'up');

  return (
    <div style={{ width: 120, height: 130, display: 'grid', placeItems: 'center' }}>
      <div
        className="pt-device"
        // Centramos icono y dejamos espacio para LED/handles
        style={{
          borderRadius: 56,
          width: 96,
          height: 96,
          background: '#1a365d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: selected
            ? '0 0 0 3px rgba(59,130,246,0.45), 0 10px 18px rgba(0,0,0,0.28)'
            : '0 6px 16px rgba(0,0,0,0.22)'
        }}
      >
        {/* LED de estado (clases existentes controlan color) */}
        <div
          className={`pt-device__led ${state === 'down' ? 'pt-device__led--down' :
              state === 'warn' ? 'pt-device__led--warn' : ''
            }`}
        />

        {/* Ícono centrado */}
        <div className="pt-device__icon" style={{ fontSize: 36, color: '#fff', lineHeight: 0 }}>
          <RouterIcon fontSize="inherit" />
        </div>

        {/* Handles (sin cambios funcionales) */}
        <Handle type="source" position={Position.Top} className="pt-handle-tri pt-handle-tri--on" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Bottom} className="pt-handle-tri pt-handle-tri--on" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Left} className="pt-handle-tri pt-handle-tri--on" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Right} className="pt-handle-tri pt-handle-tri--on" isConnectable={isConnectable} />
      </div>

      {/* Etiquetas */}
      <div className="pt-device__label" style={{ marginTop: 8 }}>{name}</div>
      {data.region ? (
        <div className="pt-device__sublabel" style={{ marginTop: 2 }}>{data.region}</div>
      ) : null}
    </div>
  );
};

export default memo(RouterNodeInstance);
