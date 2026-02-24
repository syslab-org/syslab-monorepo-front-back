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

const settings = [
  { label: "Profile", url: "/admin/settings/profile" },
  { label: "Dashboard", url: "/admin/dashboard" },
];

function MainLayout() {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorElUser, setAnchorElUser] = useState(null);

  const { user, logout } = useAuth();

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

          <Typography
            component={Link}
            to="/admin/dashboard"
            variant="h6"
            color="inherit"
            noWrap
            sx={{ textDecoration: "none", flexGrow: 1 }}
          >
            SysLab
          </Typography>

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
          sx={{
            position: "absolute",
            bottom: 0,
            width: "100%",
            borderRadius: 0,
          }}
          startIcon={<LogoutIcon />}
          onClick={logout}
        >
          Logout
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
            maxWidth: "var(--Content-maxWidth)",
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
