import { styled } from '@mui/material/styles'
import { DRAWERWITH } from '@/shared/constants'
import MuiDrawer from '@mui/material/Drawer';



export const DrawerStyle = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        '& .MuiDrawer-paper': {
            position: 'relative',
            whiteSpace: 'nowrap',
            width: 260,
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
            boxSizing: 'border-box',
            background:
                theme.palette.mode === "light"
                    ? "linear-gradient(180deg, #ffffff 0%, #f4f7fb 100%)"
                    : "linear-gradient(180deg, #0f172a 0%, #111827 100%)",

            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            color: theme.palette.text.primary,
            borderRight:
                theme.palette.mode === "light"
                    ? "1px solid rgba(0,0,0,0.04)"
                    : "1px solid rgba(255,255,255,0.06)",
            paddingTop: theme.spacing(1),

            ...(!open && {
                overflowX: 'hidden',
                transition: theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                }),
                width: 72,
                [theme.breakpoints.up('sm')]: {
                    width: 72,
                },
            }),
        },
    }),
);
