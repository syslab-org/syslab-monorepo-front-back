// #apps/frontend/src/components/theme/dashboard/listItems.jsx
import { Hub, Storage } from "@mui/icons-material";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import BarChartIcon from "@mui/icons-material/BarChart";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LayersIcon from "@mui/icons-material/Layers";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";

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
} from "@/shared/constants";
import { useAuth } from '@/app/providers/AuthContext';

const activeItemStyle = (theme) => ({
  position: "relative",
  overflow: "hidden",

  background:
    theme.palette.mode === "light"
      ? "linear-gradient(90deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.05) 100%)"
      : "linear-gradient(90deg, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.10) 100%)",

  boxShadow: `inset 0 0 0 1px ${theme.palette.mode === "light"
    ? "rgba(59,130,246,0.16)"
    : "rgba(59,130,246,0.20)"
    }`,

  borderRadius: 12,

  "& .MuiListItemIcon-root": {
    color: theme.palette.primary.main,
  },
  "& .MuiListItemText-primary": {
    fontWeight: 700,
  },
});


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
          borderRadius: 12,
          margin: "2px 8px",
          transition: "all .15s ease",
          "&:hover": {
            backgroundColor:
              theme.palette.mode === "light"
                ? "rgba(0,0,0,0.035)"
                : "rgba(255,255,255,0.06)",
          },
          "&.active": activeItemStyle(theme),
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
        to="/admin/labs"
        sx={(theme) => ({
          borderRadius: 12,
          margin: "2px 8px",
          transition: "all .15s ease",
          "&:hover": {
            backgroundColor:
              theme.palette.mode === "light"
                ? "rgba(0,0,0,0.035)"
                : "rgba(255,255,255,0.06)",
          },
          "&.active": activeItemStyle(theme),
        })}
      >
        <ListItemIcon variant="whiteStyle">
          <Hub />
        </ListItemIcon>
        <ListItemText primary="Laboratorios" />
      </ListItemButton>
      <ListItemButton
        variant="whiteStyle"
        component={NavLink}
        to="/admin/plans"
        sx={(theme) => ({
          borderRadius: 12,
          margin: "2px 8px",
          transition: "all .15s ease",
          "&:hover": {
            backgroundColor:
              theme.palette.mode === "light"
                ? "rgba(0,0,0,0.035)"
                : "rgba(255,255,255,0.06)",
          },
          "&.active": activeItemStyle(theme),
        })}
      >
        <ListItemIcon variant="whiteStyle">
          <PlayCircleOutlineIcon />
        </ListItemIcon>
        <ListItemText
          primary="Ejecuciones"
          secondary="Infraestructura"
          secondaryTypographyProps={{ noWrap: true }}
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
        Configuración
      </ListSubheader>
      {(role === USER_ROL_SUPER_ADMIN || role === USER_ROL_TEACHER) && (
        <ListItemButton
          variant="whiteStyle"
          component={NavLink}
          to="/admin/settings/amis"
          sx={(theme) => ({
            borderRadius: 12,
            margin: "2px 8px",
            transition: "all .15s ease",
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "light"
                  ? "rgba(0,0,0,0.035)"
                  : "rgba(255,255,255,0.06)",
            },
            "&.active": activeItemStyle(theme),
          })}
        >
          <ListItemIcon variant="whiteStyle">
            <Storage />
          </ListItemIcon>
          <ListItemText primary="AMIs" />
        </ListItemButton>
      )}
      {(role === USER_ROL_SUPER_ADMIN || role === USER_ROL_TEACHER || role === USER_ROL_STUDENT) && (
        <ListItemButton
          variant="whiteStyle"
          component={NavLink}
          to="/admin/settings/key-pairs"
          sx={(theme) => ({
            borderRadius: 12,
            margin: "2px 8px",
            transition: "all .15s ease",
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "light"
                  ? "rgba(0,0,0,0.035)"
                  : "rgba(255,255,255,0.06)",
            },
            "&.active": activeItemStyle(theme),
          })}
        >
          <ListItemIcon variant="whiteStyle">
            <VpnKeyOutlinedIcon />
          </ListItemIcon>
          <ListItemText primary="Key Pairs" />
        </ListItemButton>
      )}
      {(role === USER_ROL_SUPER_ADMIN ||
        role === USER_ROL_TEACHER) && (
          <ListItemButton
            variant="whiteStyle"
            component={NavLink}
            to="/admin/settings/usersmanagement"
            sx={(theme) => ({
              borderRadius: 12,
              margin: "2px 8px",
              transition: "all .15s ease",
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "light"
                    ? "rgba(0,0,0,0.035)"
                    : "rgba(255,255,255,0.06)",
              },
              "&.active": activeItemStyle(theme),
            })}
          >
            <ListItemIcon variant="whiteStyle">
              <ManageAccountsIcon />
            </ListItemIcon>
            <ListItemText primary="User Management" />
          </ListItemButton>
        )}
      {(role === USER_ROL_SUPER_ADMIN ||
        role === USER_ROL_TEACHER) && (
          <ListItemButton
            variant="whiteStyle"
            component={NavLink}
            to="/admin/settings/courses"
            sx={(theme) => ({
              borderRadius: 12,
              margin: "2px 8px",
              transition: "all .15s ease",
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "light"
                    ? "rgba(0,0,0,0.035)"
                    : "rgba(255,255,255,0.06)",
              },
              "&.active": activeItemStyle(theme),
            })}
          >
            <ListItemIcon variant="whiteStyle">
              <SchoolOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Gestión de Cursos" />
          </ListItemButton>
        )}

      {role === USER_ROL_STUDENT && (
        <ListItemButton
          variant="whiteStyle"
          component={NavLink}
          to="/admin/settings/cloud-connections"
          sx={(theme) => ({
            borderRadius: 12,
            margin: "2px 8px",
            transition: "all .15s ease",
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "light"
                  ? "rgba(0,0,0,0.035)"
                  : "rgba(255,255,255,0.06)",
            },
            "&.active": activeItemStyle(theme),
          })}
        >
          <ListItemIcon variant="whiteStyle">
            <CloudOutlinedIcon />
          </ListItemIcon>
          <ListItemText primary="Cloud Connections" />
        </ListItemButton>
      )}
      {(role === USER_ROL_SUPER_ADMIN || role === USER_ROL_TEACHER) && (
        <ListItemButton
          variant="whiteStyle"
          component={NavLink}
          to="/admin/settings/cloud-connections"
          sx={(theme) => ({
            borderRadius: 12,
            margin: "2px 8px",
            transition: "all .15s ease",
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "light"
                  ? "rgba(0,0,0,0.035)"
                  : "rgba(255,255,255,0.06)",
            },
            "&.active": activeItemStyle(theme),
          })}
        >
          <ListItemIcon variant="whiteStyle">
            <CloudOutlinedIcon />
          </ListItemIcon>
          <ListItemText primary="Cloud Connections" />
        </ListItemButton>
      )}
      {role === USER_ROL_STUDENT && (
        <ListItemButton
          variant="whiteStyle"
          component={NavLink}
          to="/admin/settings/general"
          sx={(theme) => ({
            borderRadius: 12,
            margin: "2px 8px",
            transition: "all .15s ease",
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "light"
                  ? "rgba(0,0,0,0.035)"
                  : "rgba(255,255,255,0.06)",
            },
            "&.active": activeItemStyle(theme),
          })}
        >
          <ListItemIcon variant="whiteStyle">
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="General Settings" />
        </ListItemButton>
      )}
    </React.Fragment>
  );
};
