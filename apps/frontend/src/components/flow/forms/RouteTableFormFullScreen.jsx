import * as React from 'react';
import { useEffect, useState } from 'react';
import {
    AppBar, Toolbar, IconButton, Typography, Button,
    Dialog, Slide, Stack, TextField, MenuItem
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNetwork } from '../../../contexts/NetworkNodesContext';
import { isCidrInVpcRange } from '../utils/networkUtils';
import useCidrBlockVPCStore from '../store/cidrBlocksIp';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const RouteTableFormFullScreen = ({
    openModalRouteTable,
    handleOpenDialog,
    node,
    onSave
}) => {
    const { nodes, edges } = useNetwork();
    const [cidrBlockVPC] = useCidrBlockVPCStore(state => [state.cidrBlockVPC]);
    const [routeTable, setRouteTable] = useState([]);



    useEffect(() => {
        if (node?.data?.routeTable) {
            setRouteTable(node.data.routeTable);
        } else {
            setRouteTable([]);
        }
    }, [node]);

    if (!node) return null;

    const routerNode = node;

    const connectedEdges = edges.filter(
        edge => edge.source === routerNode.id || edge.target === routerNode.id
    );

    const connectedSubnets = connectedEdges.map(edge => {
        const subnetId = edge.source === routerNode.id ? edge.target : edge.source;
        const subnet = nodes.find(n => n.id === subnetId && n.type === "subnetwork");
        return subnet ? {
            id: subnet.id,
            name: subnet.data.label || `Subred ${subnet.id}`,
            cidrBlock: subnet.data.cidrBlock
        } : null;
    }).filter(Boolean);

    const addRoute = () => {
        setRouteTable(prev => [...prev, {
            subnetId: '',
            destinationCidrBlock: ''
        }]);
    };

    const updateRoute = (index, field, value) => {
        const updated = [...routeTable];
        updated[index][field] = value;
        setRouteTable(updated);
    };

    const removeRoute = (index) => {
        setRouteTable(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        // console.log("Rutas guardadas:", routeTable);

        onSave({ routeTable });
        handleOpenDialog();
    };

    const allSubnetCidrs = nodes
        .filter(n => n.type === "subnetwork")
        .map(n => n.data?.cidrBlock);

    const hasInvalidRoutes = routeTable.some(
        r => !allSubnetCidrs.includes(r.destinationCidrBlock)
    );


    return (
        <Dialog
            fullScreen
            open={openModalRouteTable}
            onClose={handleOpenDialog}
            TransitionComponent={Transition}
        >
            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={handleOpenDialog} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                        Tabla de Enrutamiento del Router
                    </Typography>
                    <Button autoFocus color="inherit" onClick={handleSave} disabled={hasInvalidRoutes}>
                        Guardar
                    </Button>
                </Toolbar>
            </AppBar>

            <Stack spacing={2} sx={{ p: 3 }}>
                {connectedSubnets.length === 0 ? (
                    <Typography variant="body1" color="text.secondary">
                        ⚠️ Este router no tiene subredes conectadas. Conecta subredes para poder definir rutas.
                    </Typography>
                ) : (
                    routeTable.map((route, index) => {
                        const isTouched = route.destinationCidrBlock.length > 0;
                        const isInvalid = !isCidrInVpcRange(cidrBlockVPC, route.destinationCidrBlock);



                        return (
                            <Stack key={index} direction="row" spacing={2} alignItems="center">
                                <TextField
                                    select
                                    label="Subred"
                                    value={route.subnetId}
                                    onChange={(e) => updateRoute(index, 'subnetId', e.target.value)}
                                    fullWidth
                                >
                                    {connectedSubnets.map(subnet => (
                                        <MenuItem key={subnet.id} value={subnet.id}>
                                            {subnet.name} - {subnet.cidrBlock}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                {/* 🔹 Validación visual mejorada */}
                                <TextField
                                    label="Destino CIDR"
                                    value={route.destinationCidrBlock}
                                    onChange={(e) => updateRoute(index, 'destinationCidrBlock', e.target.value)}
                                    placeholder="Ej: 192.168.1.0/24"
                                    error={isTouched && !allSubnetCidrs.includes(route.destinationCidrBlock)}
                                    helperText={
                                        isTouched && !allSubnetCidrs.includes(route.destinationCidrBlock)
                                            ? "⚠️ El destino no coincide con ninguna subred válida"
                                            : ""
                                    }
                                    fullWidth
                                />


                                <Button color="error" onClick={() => removeRoute(index)}>
                                    Eliminar
                                </Button>
                            </Stack>
                        );
                    })
                )}

                {connectedSubnets.length > 0 && (
                    <Button
                        variant="contained"
                        onClick={addRoute}
                        sx={{ width: "fit-content", alignSelf: "flex-start" }}
                    >
                        Agregar Ruta
                    </Button>
                )}
            </Stack>
        </Dialog>
    );
};

export default RouteTableFormFullScreen;
