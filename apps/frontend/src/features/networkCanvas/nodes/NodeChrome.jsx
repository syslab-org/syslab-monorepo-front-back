/* eslint-disable react/prop-types */
import React from 'react';

export default function NodeChrome({
  type,                // 'vpc' | 'subnet' | 'inst' | 'router'
  title,
  subtitle,
  status = 'up',       // 'up' | 'warn' | 'down'
  rightArea = null,    // botones/acciones
  children,
  sizeClass            // 'pt-size--vpc' | 'pt-size--subnet' | ...
}) {
  const ledClass = status === 'down' ? 'pt-led pt-led--down'
    : status === 'warn' ? 'pt-led pt-led--warn'
    : 'pt-led';

  return (
    <div className={`pt-node pt-node--${type} ${sizeClass || ''}`}>
      <div className="pt-node__header">
        <div className="pt-node__stripe" />
        <div>
          <div className="pt-node__title">{title}</div>
          {subtitle && <div className="pt-node__subtitle">{subtitle}</div>}
        </div>
        <div className="pt-toolbelt">
          <div className={ledClass}>
            <span className="pt-led__dot" />
            <span>{status === 'up' ? 'Online' : status === 'warn' ? 'Degraded' : 'Down'}</span>
          </div>
          {rightArea}
        </div>
      </div>
      <div className="pt-node__body">
        {children}
      </div>
    </div>
  );
}
