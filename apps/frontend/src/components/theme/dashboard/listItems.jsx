import * as React from "react";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { NavLink } from "react-router-dom";

export const MainListItems = () => (
  <React.Fragment>
    <ListItemButton component={NavLink} to="/admin/dashboard">
      <ListItemIcon>
        <DashboardIcon />
      </ListItemIcon>
      <ListItemText primary="Dashboard" />
    </ListItemButton>

    <ListItemButton component={NavLink} to="/admin/vpcs">
      <ListItemIcon>
        <CloudQueueIcon />
      </ListItemIcon>
      <ListItemText primary="Laboratorios" />
    </ListItemButton>

    <ListItemButton component={NavLink} to="/admin/plans">
      <ListItemIcon>
        <AssignmentIcon />
      </ListItemIcon>
      <ListItemText primary="Ejecuciones" />
    </ListItemButton>
  </React.Fragment>
);

export const SecondaryListItems = () => (
  <React.Fragment>
    <ListSubheader component="div" inset>
      Configuración
    </ListSubheader>
  </React.Fragment>
);
