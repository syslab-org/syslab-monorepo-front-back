/* eslint-disable react/prop-types */
import React from 'react';

export default function NodeChrome({
  type,                // 'vpc' | 'subnet' | 'inst' | 'router'
  title,
  subtitle,
  eyebrow,
  status = 'up',       // 'up' | 'warn' | 'down'
  rightArea = null,    // botones/acciones
  children,
  sizeClass,           // 'pt-size--vpc' | 'pt-size--subnet' | ...
  className = '',
  bodyClassName = ''
}) {
  const statusLabel = status === 'up' ? 'Online' : status === 'warn' ? 'Degraded' : 'Down';
  const ledClass = status === 'down' ? 'pt-led pt-led--down'
    : status === 'warn' ? 'pt-led pt-led--warn'
    : 'pt-led';

  return (
    <div className={`pt-node pt-node--${type} ${className} ${sizeClass || ''}`.trim()}>
      <div className="pt-node__header">
        <div className="pt-node__stripe" />
        <div className="pt-node__meta">
          {eyebrow ? <div className="pt-node__eyebrow">{eyebrow}</div> : null}
          <div className="pt-node__title">{title}</div>
          {subtitle && <div className="pt-node__subtitle">{subtitle}</div>}
        </div>
        <div className="pt-toolbelt">
          <div className={ledClass}>
            <span className="pt-led__dot" />
            <span className="pt-led__label">{statusLabel}</span>
          </div>
          {rightArea ? <div className="pt-node__actions">{rightArea}</div> : null}
        </div>
      </div>
      <div className={`pt-node__body ${bodyClassName}`.trim()}>
        {children}
      </div>
    </div>
  );
}
