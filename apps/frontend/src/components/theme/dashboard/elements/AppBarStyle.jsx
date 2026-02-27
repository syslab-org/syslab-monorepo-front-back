import { styled } from '@mui/material/styles'
import MuiAppBar from '@mui/material/AppBar';


export const AppBarStyle = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    backgroundColor:
        theme.palette.mode === "light"
            ? "rgba(255,255,255,0.85)"
            : "rgba(15,23,42,0.85)",

    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",

    color: theme.palette.text.primary,

    borderBottom: `1px solid ${theme.palette.divider}`,

    boxShadow:
        theme.palette.mode === "light"
            ? "0 4px 12px rgba(0,0,0,0.04)"
            : "0 8px 24px rgba(0,0,0,0.55)",


    ...(open && {
        marginLeft: 260,
        width: `calc(100% - 260px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));
