import { useContext } from 'react'
import { LoadingFlowContext } from '../../contexts/LoadingFlowContext'
import { Backdrop, CircularProgress } from '@mui/material';

const LoadingFlow = () => {

    const { loadingFlow } = useContext(LoadingFlowContext)
    
    if (!loadingFlow) return null

    return (

        <Backdrop open={loadingFlow} sx={{zIndex:(theme)=>theme.zIndex.drawer + 1}}>
            <CircularProgress color="inherit" />
        </Backdrop>
    )
}

export default LoadingFlow