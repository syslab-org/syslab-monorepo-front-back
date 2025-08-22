import { styled } from '@mui/material'
import { DRAWERWITH } from '../../../../constants'
import MuiAppBar from '@mui/material/AppBar';


export const AppBarStyle = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    backgroundColor: '#233044',
    color: '#ffffff',

    ...(open && {
        marginLeft: DRAWERWITH,
        width: `calc(100% - ${DRAWERWITH}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));
