// src/components/flow/node-types/RouterNodeInstance.jsx
/* eslint-disable react/prop-types */
import { memo } from 'react';
import { Handle, Position } from "@xyflow/react";
import '../styles/packet-tracer.css';
import RouterIcon from '@mui/icons-material/Router';

const normalizeMode = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (
    raw === 'tgw' ||
    raw === 'transit' ||
    raw === 'transit_gateway' ||
    raw === 'transit-gateway'
  ) {
    return 'tgw';
  }
  return 'peering';
};

const RouterNodeInstance = ({ data = {}, isConnectable, selected }) => {
  const name = data.identifier || 'Router';
  const mode = normalizeMode(data.mode);
  const modeLabel = mode === 'tgw' ? 'Transit Gateway' : 'Peering';
  const modeShort = mode === 'tgw' ? 'TGW' : 'PEER';
  const modeHint =
    mode === 'tgw' ? 'Hub central en AWS' : 'Enlaces por pares';
  const hasRoutes =
    Array.isArray(data.routeTable) &&
    data.routeTable.some(r => r.destCidr);
  const state = hasRoutes ? "up" : "warn";

  return (
    <div className="pt-router">
      <div
        className={`pt-device pt-device--${mode} ${selected ? 'pt-device--selected' : ''}`}
      >
        {/* LED de estado (clases existentes controlan color) */}
        <div
          className={`pt-device__led ${state === 'down' ? 'pt-device__led--down' :
            state === 'warn' ? 'pt-device__led--warn' : ''
            }`}
        />
        <div
          className={`pt-router-mode pt-router-mode--${mode}`}
          title={`${modeLabel}: ${modeHint}`}
        >
          {modeShort}
        </div>

        {/* Ícono centrado */}
        <div className="pt-device__icon">
          <RouterIcon fontSize="inherit" />
        </div>

        {/* Handles (sin cambios funcionales) */}
        <Handle type="source" position={Position.Top} className="pt-handle-tri pt-handle-tri--on" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Bottom} className="pt-handle-tri pt-handle-tri--on" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Left} className="pt-handle-tri pt-handle-tri--on" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Right} className="pt-handle-tri pt-handle-tri--on" isConnectable={isConnectable} />
      </div>

      {/* Etiquetas */}
      <div className="pt-device__label">{name}</div>
      <div className={`pt-device__modehint pt-device__modehint--${mode}`}>
        {modeHint}
      </div>
      {data.region ? (
        <div className="pt-device__sublabel">{data.region}</div>
      ) : null}
    </div>
  );
};

export default memo(RouterNodeInstance);
