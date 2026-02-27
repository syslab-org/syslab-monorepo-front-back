// apps/frontend/src/components/layout/MainLayout.jsx
import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import {
  Avatar,
  Badge,
  Box,
  Button,
  CssBaseline,
  Divider,
  IconButton,
  List,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import MailOutline from "@mui/icons-material/MailOutline";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import LogoutIcon from "@mui/icons-material/Logout";

import "../../App.css";
import { AppBarStyle } from "../../components/theme/dashboard/elements/AppBarStyle.jsx";
import { DrawerStyle } from "../../components/theme/dashboard/elements/DrawerStyle.jsx";
import {
  MainListItems,
  SecondaryListItems,
} from "../../components/theme/dashboard/listItems.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";

export const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <Box
      sx={(theme) => ({
        mb: 4,
        pb: 2.5,
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", sm: "center" },
        gap: 3,
      })}
    >
      {/* Left side */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ letterSpacing: "-0.5px" }}
        >
          {title}
        </Typography>

        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 720 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Right side (actions) */}
      {actions && (
        <Box
          sx={{
            display: "flex",
            gap: 1.25,
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "center",
            justifyContent: { xs: "flex-start", sm: "flex-end" },
            minWidth: { sm: "fit-content" },
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  );
};

const settings = [
  { label: "Profile", url: "/admin/settings/profile" },
  { label: "Dashboard", url: "/admin/dashboard" },
];

function MainLayout() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorElUser, setAnchorElUser] = useState(null);

  const auth = useAuth();
  const user = auth?.user;
  const logout = auth?.logout || (() => { });

  const toggleDrawer = () => {
    setDrawerOpen((prev) => !prev);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* ================== APP BAR ================== */}
      <AppBarStyle position="absolute" open={drawerOpen}>
        <Toolbar sx={{ pr: "24px" }}>
          {!drawerOpen && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={toggleDrawer}
              sx={{ marginRight: "36px" }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
            <Typography
              component={Link}
              to="/admin/dashboard"
              variant="h6"
              color="inherit"
              sx={{ textDecoration: "none", fontWeight: 700 }}
            >
              Architecta
            </Typography>

            <Typography
              variant="caption"
              sx={{ opacity: 0.7, letterSpacing: 0.5 }}
            >
              {/* Multi-Cloud Orchestrator */}
              Cloud Orchestrator
            </Typography>
          </Box>

          <Box sx={{ display: { md: "flex" } }}>
            <IconButton size="large" color="inherit">
              <Badge badgeContent={4} color="error">
                <MailOutline />
              </Badge>
            </IconButton>

            <IconButton size="large" color="inherit">
              <Badge badgeContent={17} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <Tooltip title="Cuenta">
              <IconButton
                size="large"
                edge="end"
                color="inherit"
                onClick={handleOpenUserMenu}
              >
                <Avatar
                  alt={user?.displayName || "User"}
                  src={user?.photoURL || "https://i.pravatar.cc/100"}
                />
              </IconButton>
            </Tooltip>

            <Menu
              sx={{ mt: "45px" }}
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              {settings.map((setting) => (
                <MenuItem
                  component={Link}
                  to={setting.url}
                  key={setting.label}
                  onClick={handleCloseUserMenu}
                >
                  {setting.label}
                </MenuItem>
              ))}

              <MenuItem
                onClick={() => {
                  handleCloseUserMenu();
                  logout();
                }}
              >
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBarStyle>

      {/* ================== DRAWER ================== */}
      <DrawerStyle variant="permanent" open={drawerOpen}>
        <Toolbar>
          <IconButton onClick={toggleDrawer}>
            <ChevronLeftIcon />
          </IconButton>
        </Toolbar>

        <Divider />

        <List component="nav">
          <MainListItems />
          <Divider sx={{ my: 1 }} />
          <SecondaryListItems />
        </List>

        {/* Fixed logout button at bottom */}
        <Button
          sx={(theme) => ({
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            borderRadius: 2,
            fontWeight: 600,
            textTransform: "none",
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor:
              theme.palette.mode === "light"
                ? theme.palette.grey[50]
                : "rgba(255,255,255,0.04)",
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "light"
                  ? theme.palette.grey[100]
                  : "rgba(255,255,255,0.08)",
            },
          })}
          startIcon={<LogoutIcon />}
          onClick={logout}
        >
          Cerrar sesión
        </Button>
      </DrawerStyle>

      {/* ================== MAIN CONTENT ================== */}
      <Box
        component="main"
        sx={{
          backgroundColor: (theme) => theme.palette.background.default,
          flexGrow: 1,
          height: "100vh",
          overflow: "auto",
        }}
      >
        <Toolbar />

        <Box
          sx={{
            maxWidth: 1200,
            mx: "auto",
            px: 3,
            py: 4,
            margin: "var(--Content-margin)",
            padding: "var(--Content-padding)",
            width: "var(--Content-width)",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default MainLayout;
