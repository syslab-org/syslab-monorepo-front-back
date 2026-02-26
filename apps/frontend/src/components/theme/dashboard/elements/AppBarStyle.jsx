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
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.palette.mode === "light"
        ? "0 1px 2px rgba(0,0,0,0.04)"
        : "0 2px 8px rgba(0,0,0,0.6)",


    ...(open && {
        marginLeft: 260,
        width: `calc(100% - 260px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));
