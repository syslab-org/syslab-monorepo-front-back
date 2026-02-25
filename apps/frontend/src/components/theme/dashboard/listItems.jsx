// #apps/frontend/src/components/theme/dashboard/listItems.jsx
import { CloudQueue, ViewStreamOutlined } from "@mui/icons-material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BarChartIcon from "@mui/icons-material/BarChart";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LayersIcon from "@mui/icons-material/Layers";
import PeopleIcon from "@mui/icons-material/People";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";

import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";

import * as React from "react";

import { NavLink } from "react-router-dom";

import {
  USER_ROL_STUDENT,
  USER_ROL_SUPER_ADMIN,
  USER_ROL_TEACHER,
} from "../../../constants";
import { useAuth } from "../../../contexts/AuthContext.jsx";




export const MainListItems = () => {
  const { user } = useAuth();

  return (
    <React.Fragment>
      <ListItemButton variant="whiteStyle" component={NavLink} to="/admin/dashboard">
        <ListItemIcon variant="whiteStyle">
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="Dashboard" />
      </ListItemButton>
      <ListItemButton
        variant="whiteStyle"
        component={NavLink}
        to="/admin/vpcs"
      >
        <ListItemIcon variant="whiteStyle">
          <CloudQueue />
        </ListItemIcon>
        <ListItemText primary="Laboratorios" />
      </ListItemButton>
      <ListItemButton
        variant="whiteStyle"
        component={NavLink}
        to="/admin/plans"
      >
        <ListItemIcon variant="whiteStyle">
          <PeopleIcon />
        </ListItemIcon>
        <ListItemText
          primary="Ejecuciones de Infraestructura"
          primaryTypographyProps={{ noWrap: false }}
          sx={{ whiteSpace: "normal" }}
        />
      </ListItemButton>


    </React.Fragment>
  );
};

export const SecondaryListItems = () => {
  const { user } = useAuth();
  const role = user?.role;

  if (!user || !user.role) return null;
  return (
    <React.Fragment>
      <ListSubheader
        component="div"
        inset
        sx={(theme) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.secondary,
          borderTop: `1px solid ${theme.palette.divider}`,
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        Settings
      </ListSubheader>
      {role === USER_ROL_SUPER_ADMIN && (
        <ListItemButton
          variant="whiteStyle"
          component={NavLink}
          to="/admin/settings/amilist"
        >
          <ListItemIcon variant="whiteStyle">
            <ViewStreamOutlined />
          </ListItemIcon>
          <ListItemText primary="AMI List" />
        </ListItemButton>
      )}
      {(role === USER_ROL_SUPER_ADMIN ||
        role === USER_ROL_TEACHER) && (
          <ListItemButton
            variant="whiteStyle"
            component={NavLink}
            to="/admin/settings/usersmanagement"
          >
            <ListItemIcon variant="whiteStyle">
              <AssignmentIcon />
            </ListItemIcon>
            <ListItemText primary="User Management" />
          </ListItemButton>
        )}

      {role === USER_ROL_STUDENT && (
        <ListItemButton
          variant="whiteStyle"
          component={NavLink}
          to="/admin/settings/general"
        >
          <ListItemIcon variant="whiteStyle">
            <SettingsSuggestIcon />
          </ListItemIcon>
          <ListItemText primary="General Settings" />
        </ListItemButton>
      )}
    </React.Fragment>
  );
};