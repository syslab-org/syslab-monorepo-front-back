import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Tooltip, Typography } from '@mui/material';
import {
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

const SidebarFlow = () => {
    const { t } = useTranslation();
    const [dragging, setDragging] = useState(null);

    const items = [
        {
            category: t('canvas.sidebar.categories.networking'),
            items: [
                {
                    key: 'vpc',
                    type: TYPE_VPC_NODE,
                    label: t('canvas.sidebar.items.vpc.label'),
                    description: t('canvas.sidebar.items.vpc.description'),
                    icon: <CloudIcon />
                },
                {
                    key: 'subnetwork',
                    type: TYPE_SUBNETWORK_NODE,
                    label: t('canvas.sidebar.items.subnetwork.label'),
                    description: t('canvas.sidebar.items.subnetwork.description'),
                    icon: <LanIcon />
                },
            ]
        },
        {
            category: t('canvas.sidebar.categories.compute'),
            items: [
                {
                    key: 'instance',
                    type: TYPE_SERVER_NODE,
                    label: t('canvas.sidebar.items.instance.label'),
                    description: t('canvas.sidebar.items.instance.description'),
                    icon: <DesktopWindowsIcon />
                },
            ]
        },
        {
            category: t('canvas.sidebar.categories.routing'),
            items: [
                {
                    key: 'router',
                    type: TYPE_ROUTER_NODE,
                    label: t('canvas.sidebar.items.router.label'),
                    description: t('canvas.sidebar.items.router.description'),
                    icon: <RouterIcon />
                },
            ]
        }
    ];

    const onDragStart = (event, nodeType, key) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('text/plain', nodeType);
        event.dataTransfer.effectAllowed = 'copy';
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
                        ? "linear-gradient(180deg, #ffffff 0%, #f7fafc 100%)"
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
                    {t('canvas.sidebar.title')}
                </Typography>
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: 12,
                        color: (theme) =>
                            theme.palette.mode === "light" ? "#64748b" : "#9ca3af",
                    }}
                >
                    {t('canvas.sidebar.subtitle')}
                </Typography>
            </Box>

            {items.map((group) => (
                <Box
                    key={group.category}
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        p: 1,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        background: (theme) =>
                            theme.palette.mode === "light"
                                ? "rgba(255,255,255,0.72)"
                                : "rgba(15,23,42,0.5)",
                        boxShadow: (theme) =>
                            theme.palette.mode === "light"
                                ? "0 8px 24px rgba(15,23,42,0.05)"
                                : "0 10px 28px rgba(0,0,0,0.28)",
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, opacity: 0.65, px: 1, letterSpacing: 0.4 }}
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
                                    py: 1.1,
                                    borderRadius: 1.5,
                                    cursor: "grab",
                                    transition: "all 0.15s ease",
                                    border: "1px solid",
                                    borderColor: dragging === key
                                        ? "primary.main"
                                        : "divider",
                                    background: dragging === key
                                        ? (theme) =>
                                            theme.palette.mode === "light"
                                                ? "linear-gradient(180deg, rgba(59,130,246,0.16) 0%, rgba(59,130,246,0.08) 100%)"
                                                : "linear-gradient(180deg, rgba(59,130,246,0.28) 0%, rgba(59,130,246,0.18) 100%)"
                                        : (theme) =>
                                            theme.palette.mode === "light"
                                                ? "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.96) 100%)"
                                                : "linear-gradient(180deg, rgba(17,24,39,0.88) 0%, rgba(15,23,42,0.88) 100%)",
                                    boxShadow: dragging === key
                                        ? "0 10px 24px rgba(59,130,246,0.16)"
                                        : "0 2px 10px rgba(15,23,42,0.04)",
                                    "&:hover": {
                                        borderColor: "primary.main",
                                        transform: "translateX(3px)",
                                        boxShadow: "0 10px 24px rgba(59,130,246,0.12)",
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
