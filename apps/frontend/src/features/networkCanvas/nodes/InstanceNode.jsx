// src/components/flow/node-types/InstanceNode.jsx
/* eslint-disable react/prop-types */
import { memo } from 'react';
import '../styles/packet-tracer.css';
import { getIconByInstanceType } from '@/features/networkCanvas/utils/iconHelper';
import { TYPE_COMPUTER_NODE, TYPE_PRINTER_NODE, TYPE_SERVER_NODE } from '../utils/constants';

const abbreviateAmi = (value) => {
  if (!value || value === 'AMI n/a') return null;
  return value.length > 14 ? `${value.slice(0, 11)}...` : value;
};

const InstanceNode = ({ data = {}, type }) => {
  const name = data.name || data.title || 'Instance';
  const ip = data.ipAddress || 'IP n/a';
  const ami = data.ami || 'AMI n/a';
  const itype = data.instanceType || 'type n/a';

  let kind = 'pc';
  if (type === TYPE_SERVER_NODE) kind = 'server';
  if (type === TYPE_PRINTER_NODE) kind = 'printer';
  const eyebrow = kind === 'server'
    ? 'service compute'
    : kind === 'printer'
      ? 'peripheral endpoint'
      : 'client compute';
  const accessLabel = data?.sshAccess ? 'Remote access enabled' : 'Remote access closed';

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div className={`pt-node pt-node--inst ${kind} pt-instance-card pt-instance-card--${kind}`}>
        <div className="pt-instance-card__top">
          <div className="pt-instance-card__accent" />
          <div className="pt-instance-card__meta">
            <div className="pt-instance-card__eyebrow">{eyebrow}</div>
            <div className="pt-instance-card__title" title={name}>{name}</div>
            <div className="pt-instance-card__subtitle">{ip}</div>
          </div>
          <div className="pt-instance-card__icon">
            {getIconByInstanceType?.(type)}
          </div>
        </div>

        <div className="pt-instance-card__statusbar">
          <div className="pt-led">
            <span className="pt-led__dot" />
            <span className="pt-led__label">Online</span>
          </div>
          {abbreviateAmi(ami)
            ? <span className="pt-badge pt-badge--ami" title={ami}>{abbreviateAmi(ami)}</span>
            : null}
        </div>

        <div className="pt-instance-card__chips">
          <span className="pt-badge">{kind.toUpperCase()}</span>
          <span className="pt-badge">{itype}</span>
          <span className="pt-badge">SSH {data?.sshAccess ? 'On' : 'Off'}</span>
        </div>

        <div className="pt-instance-card__caption">{accessLabel}</div>
      </div>
    </div>
  );
};
export default memo(InstanceNode);
