/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import React, { useState } from 'react'

const RouteTableForm = ({
    open,
    onClose,
    onSave,
    connectedSubnets=[]
}) => {

    const [routes, setRoutes] = useState([
        {
            subnetId: "subnet-1",
            subnetCidr: "192.168.1.0/26",
            routerIp: "192.168.1.1",
            destinationCidrBlock: "0.0.0.0/0",
            target: "igw-123"
        },
        {
            subnetId: "subnet-2",
            subnetCidr: "192.168.1.64/26",
            routerIp: "192.168.1.65",
            destinationCidrBlock: "192.168.1.128/26",
            target: "router"
        },
        {
            subnetId: "subnet-3",
            subnetCidr: "192.168.1.128/26",
            routerIp: "192.168.1.129",
            destinationCidrBlock: "0.0.0.0/0",
            target: "nat-456"
        }
    ])

    const addRoute = () => {
        setRoutes([
            ...routes,
            {
                subnetId: "",
                routerIp: "",
                destinationCidrBlock: "",
                target: ""
            }
        ])
    };

    const handleSave = () => {
        onSave(routes)
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle > Configurar Tabla de Enrutamiento </DialogTitle>
            <DialogContent>
                {routes.map((route,index)=>(
                    <Stack key={index} direction="row" spacing={1}>
                        <TextField
                        select 
                        label="Subred"
                        value={route.subnetId}
                        onChange={(e)=>{
                            const newRoutes = [...routes];
                            newRoutes[index].subnetId = e.target.value;
                            setRoutes(newRoutes)
                        }}
                        >
                            {connectedSubnets.map((subnet)=>(
                                <MenuItem key={subnet.subnetId} value={subnet.subnetId}>
                                    {subnet.cidrBlock}
                                </MenuItem>
                            ))}

                        </TextField>
                        <TextField
                            label="IP de Interfaz del Router"
                            value={route.routerIp}
                            onChange={(e) => {
                                const newRoutes = [...routes];
                                newRoutes[index].routerIp = e.target.value;
                                setRoutes(newRoutes);
                            }}
                        />
                        <TextField
                            label="Destino CIDR"
                            value={route.destinationCidrBlock}
                            onChange={(e) => {
                                const newRoutes = [...routes];
                                newRoutes[index].destinationCidrBlock = e.target.value;
                                setRoutes(newRoutes);
                            }}
                        />
                        <TextField
                            select
                            label="Target"
                            value={route.target}
                            onChange={(e) => {
                                const newRoutes = [...routes];
                                newRoutes[index].target = e.target.value;
                                setRoutes(newRoutes);
                            }}
                        >
                            <MenuItem value="igw-123">Internet Gateway</MenuItem>
                            <MenuItem value="nat-456">NAT Gateway</MenuItem>
                            <MenuItem value="router">Otra Subred</MenuItem>
                        </TextField>
                    </Stack>
                ))}
            </DialogContent>
            <DialogActions>
                <Button onClick={addRoute}>Agregar Ruta</Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    Guardar Tabla de Enrutamiento
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default RouteTableForm