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
      <ListItemButton
        variant="whiteStyle"
        component={NavLink}
        to="/admin/dashboard"
        end
        sx={(theme) => ({
          "&.active": {
            backgroundColor:
              theme.palette.mode === "light"
                ? "rgba(0,0,0,0.04)"
                : "rgba(255,255,255,0.06)",
            borderLeft: `4px solid ${theme.palette.primary.main}`,
            "& .MuiListItemIcon-root": {
              color: theme.palette.primary.main,
            },
          },
        })}
      >
        <ListItemIcon variant="whiteStyle">
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="Dashboard" />
      </ListItemButton>
      <ListItemButton
        variant="whiteStyle"
        component={NavLink}
        to="/admin/vpcs"
        sx={(theme) => ({
          "&.active": {
            backgroundColor:
              theme.palette.mode === "light"
                ? "rgba(0,0,0,0.04)"
                : "rgba(255,255,255,0.06)",
            borderLeft: `4px solid ${theme.palette.primary.main}`,
            "& .MuiListItemIcon-root": {
              color: theme.palette.primary.main,
            },
          },
        })}
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
        sx={(theme) => ({
          "&.active": {
            backgroundColor:
              theme.palette.mode === "light"
                ? "rgba(0,0,0,0.04)"
                : "rgba(255,255,255,0.06)",
            borderLeft: `4px solid ${theme.palette.primary.main}`,
            "& .MuiListItemIcon-root": {
              color: theme.palette.primary.main,
            },
          },
        })}
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
          backgroundColor: "transparent",
          color: theme.palette.text.secondary,
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          opacity: 0.7,
          mt: 3,
          mb: 1.5,
          px: 2,
        })}
      >
        Settings
      </ListSubheader>
      {role === USER_ROL_SUPER_ADMIN && (
        <ListItemButton
          variant="whiteStyle"
          component={NavLink}
          to="/admin/settings/amilist"
          sx={(theme) => ({
            "&.active": {
              backgroundColor:
                theme.palette.mode === "light"
                  ? "rgba(0,0,0,0.04)"
                  : "rgba(255,255,255,0.06)",
              borderLeft: `4px solid ${theme.palette.primary.main}`,
              "& .MuiListItemIcon-root": {
                color: theme.palette.primary.main,
              },
            },
          })}
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
            sx={(theme) => ({
              "&.active": {
                backgroundColor:
                  theme.palette.mode === "light"
                    ? "rgba(0,0,0,0.04)"
                    : "rgba(255,255,255,0.06)",
                borderLeft: `4px solid ${theme.palette.primary.main}`,
                "& .MuiListItemIcon-root": {
                  color: theme.palette.primary.main,
                },
              },
            })}
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
          sx={(theme) => ({
            "&.active": {
              backgroundColor:
                theme.palette.mode === "light"
                  ? "rgba(0,0,0,0.04)"
                  : "rgba(255,255,255,0.06)",
              borderLeft: `4px solid ${theme.palette.primary.main}`,
              "& .MuiListItemIcon-root": {
                color: theme.palette.primary.main,
              },
            },
          })}
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