import { useState } from 'react';
import { Box } from '@mui/material';
import {
    TITLE_COMPUTER, TITLE_PRINT, TITLE_ROUTER, TITLE_SERVER, TITLE_SUBNETWORK,
    TYPE_COMPUTER_NODE, TYPE_PRINTER_NODE, TYPE_ROUTER_NODE, TYPE_SERVER_NODE,
    TYPE_SUBNETWORK_NODE, TYPE_VPC_NODE
} from './utils/constants';
import './styles/sidebar-pt.css';

// Íconos MUI (puedes cambiar por lucide si prefieres)
import CloudIcon from '@mui/icons-material/Cloud';
import LanIcon from '@mui/icons-material/Lan';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import PrintIcon from '@mui/icons-material/Print';
import DnsIcon from '@mui/icons-material/Dns';
import RouterIcon from '@mui/icons-material/Router';

const ITEMS = [
    { key: 'vpc', type: TYPE_VPC_NODE, label: 'VPC', icon: <CloudIcon /> },
    { key: 'subnetwork', type: TYPE_SUBNETWORK_NODE, label: TITLE_SUBNETWORK, icon: <LanIcon /> },
    { key: 'computer', type: TYPE_COMPUTER_NODE, label: TITLE_COMPUTER, icon: <DesktopWindowsIcon /> },
    { key: 'printer', type: TYPE_PRINTER_NODE, label: TITLE_PRINT, icon: <PrintIcon /> },
    { key: 'server', type: TYPE_SERVER_NODE, label: TITLE_SERVER, icon: <DnsIcon /> },
    { key: 'router', type: TYPE_ROUTER_NODE, label: TITLE_ROUTER, icon: <RouterIcon /> },
];

const SidebarFlow = () => {
    const [dragging, setDragging] = useState(null);

    const onDragStart = (event, nodeType, key) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('text/plain', nodeType);
        event.dataTransfer.effectAllowed = 'move';
        setDragging(key);
    };
    const onDragEnd = () => setDragging(null);

    return (
        <Box className="pt-sidebar">
            <div className="pt-sidebar__header">End Devices</div>

            <div className="pt-sidebar__list">
                {ITEMS.map(({ key, type, label, icon }) => (
                    <div
                        key={key}
                        data-key={key}                              // 👈 necesario para color del dot
                        className={`pt-sidebar__item ${dragging === key ? 'pt-sidebar__item--active' : ''}`}
                        draggable
                        onDragStart={(e) => onDragStart(e, type, key)}
                        onDragEnd={onDragEnd}
                        title={label}
                        role="button"
                        tabIndex={0}
                    >
                        <span className="pt-sidebar__icon">{icon}</span>
                        <span className="pt-sidebar__label">{label}</span>
                    </div>
                ))}
            </div>

        </Box>
    );
};

export default SidebarFlow;
