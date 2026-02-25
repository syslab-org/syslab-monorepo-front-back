import { styled } from '@mui/material/styles'
import { DRAWERWITH } from '../../../../constants'
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
            backgroundColor:
                theme.palette.mode === "light"
                    ? theme.palette.background.paper
                    : theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRight: `1px solid ${theme.palette.divider}`,

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
