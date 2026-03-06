import { useState } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import {
    TITLE_ROUTER,
    TITLE_SUBNETWORK,
    TYPE_ROUTER_NODE,
    TYPE_SERVER_NODE,
    TYPE_SUBNETWORK_NODE,
    TYPE_VPC_NODE
} from '@/features/networkCanvas/utils/constants';

// Íconos MUI (puedes cambiar por lucide si prefieres)
import CloudIcon from '@mui/icons-material/Cloud';
import LanIcon from '@mui/icons-material/Lan';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import RouterIcon from '@mui/icons-material/Router';

const ITEMS = [
    {
        category: "Networking",
        items: [
            {
                key: 'vpc',
                type: TYPE_VPC_NODE,
                label: 'VPC',
                description: 'Contenedor lógico que define el espacio de red principal (equivalente a AWS VPC).',
                icon: <CloudIcon />
            },
            {
                key: 'subnetwork',
                type: TYPE_SUBNETWORK_NODE,
                label: TITLE_SUBNETWORK,
                description: 'Segmento CIDR dentro de una VPC donde viven las instancias.',
                icon: <LanIcon />
            },
        ]
    },
    {
        category: "Compute",
        items: [
            {
                key: 'instance',
                type: TYPE_SERVER_NODE,
                label: 'Instance',
                description: 'Máquina virtual dentro de una Subnet.',
                icon: <DesktopWindowsIcon />
            },
        ]
    },
    {
        category: "Routing",
        items: [
            {
                key: 'router',
                type: TYPE_ROUTER_NODE,
                label: TITLE_ROUTER,
                description: 'Dispositivo lógico que permite comunicación entre redes.',
                icon: <RouterIcon />
            },
        ]
    }
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
        <Box
            className="pt-sidebar"
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                px: 2,
                py: 2,
                gap: 2,
                background: (theme) =>
                    theme.palette.mode === "light"
                        ? "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)"
                        : "#111827",
                color: (theme) =>
                    theme.palette.mode === "light" ? "#1e293b" : "#e5e7eb",
            }}
        >
            <Box>
                <Typography
                    variant="overline"
                    sx={{
                        fontWeight: 700,
                        letterSpacing: 1,
                        color: (theme) =>
                            theme.palette.mode === "light" ? "#334155" : "#94a3b8",
                    }}
                >
                    TOOL PALETTE
                </Typography>
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: 12,
                        color: (theme) =>
                            theme.palette.mode === "light" ? "#64748b" : "#9ca3af",
                    }}
                >
                    Arrastra componentes al lienzo
                </Typography>
            </Box>

            {ITEMS.map((group) => (
                <Box key={group.category} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, opacity: 0.6, px: 1 }}
                    >
                        {group.category}
                    </Typography>

                    {group.items.map(({ key, type, label, icon, description }) => (
                        <Tooltip key={key} title={description} placement="right" arrow>
                            <Box
                                data-key={key}
                                draggable
                                onDragStart={(e) => onDragStart(e, type, key)}
                                onDragEnd={onDragEnd}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    px: 1.5,
                                    py: 1,
                                    borderRadius: 1,
                                    cursor: "grab",
                                    transition: "all 0.15s ease",
                                    backgroundColor: dragging === key
                                        ? (theme) =>
                                            theme.palette.mode === "light"
                                                ? "rgba(59,130,246,0.12)"
                                                : "rgba(59,130,246,0.25)"
                                        : "transparent",
                                    "&:hover": {
                                        backgroundColor: (theme) =>
                                            theme.palette.mode === "light"
                                                ? "rgba(0,0,0,0.04)"
                                                : "rgba(255,255,255,0.06)",
                                        transform: "translateX(2px)",
                                    },
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    {icon}
                                </Box>
                                <Typography variant="body2" sx={{ fontSize: 13 }}>
                                    {label}
                                </Typography>
                            </Box>
                        </Tooltip>
                    ))}
                </Box>
            ))}
        </Box>
    );
};

export default SidebarFlow;
