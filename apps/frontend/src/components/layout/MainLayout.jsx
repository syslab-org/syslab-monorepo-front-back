import { Badge, Box, CssBaseline, IconButton, Toolbar, Typography, Divider, List, Tooltip, Avatar, Menu, MenuItem } from '@mui/material';
import '../../App.css';
import { useState } from 'react';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { MainListItems, SecondaryListItems } from '../../components/theme/dashboard/listItems.jsx';
import { AppBarStyle } from '../../components/theme/dashboard/elements/AppBarStyle.jsx';
import { DrawerStyle } from '../../components/theme/dashboard/elements/DrawerStyle.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Button from '@mui/material/Button';
import { Outlet } from 'react-router-dom';
import { MailOutline } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const settings = [
    { label: 'Profile', url: '/admin/settings/profile' },
    { label: 'Dashboard', url: '/admin/dashboard' },
];

function MainLayout() {
    const [open, setOpen] = useState(true);
    const [anchorElUser, setAnchorElUser] = useState(null);
    const { user, logout } = useAuth();

    const toggleDrawer = () => {
        setOpen(!open);
    };




    const handleOpenUserMenu = (event) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    return (

        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBarStyle position="absolute" open={open}>
                <Toolbar
                    sx={{
                        pr: '24px', // keep right padding when drawer closed
                    }}
                >
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="open drawer"
                        onClick={toggleDrawer}
                        sx={{
                            marginRight: '36px',
                            ...(open && { display: 'none' }),
                        }}
                    >
                        <MenuIcon />
                    </IconButton>

                    <Typography
                        component="h1"
                        variant="h6"
                        color="inherit"
                        noWrap
                        sx={{ flexGrow: 1 }}
                    >
                        SysLab
                    </Typography>

                    <Box sx={{ flexGrow: 1 }} />
                    <Box sx={{ 
                        display: { md: 'flex' },
                        }}>
                        <IconButton size='large' aria-label='show 4 new mails' color='inherit'>
                            <Badge badgeContent={4} color='error'>
                                <MailOutline />
                            </Badge>
                        </IconButton>
                        <IconButton
                            size="large"
                            aria-label="show 17 new notifications"
                            color="inherit"
                        >
                            <Badge badgeContent={17} color="error">
                                <NotificationsIcon />
                            </Badge>
                        </IconButton>

                        <Tooltip title="Open settings">
                            <IconButton
                                size="large"
                                edge="end"
                                aria-haspopup="true"
                                color="inherit"
                                aria-label="account of current user"
                                onClick={handleOpenUserMenu}
                            >
                                <Avatar
                                    alt={user?.displayName || 'User Name'}
                                    src={user?.photoURL || 'https://i.pravatar.cc/100'}
                                />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            sx={{
                                mt: '45px',
                            }}
                            PaperProps={{
                                sx: {
                                    borderRadius: 0,
                                    backgroundColor: '#233044',
                                    color: '#ffffff',
                                    padding: '10px',
                                },
                            }}
                            id="menu-appbar"
                            anchorEl={anchorElUser}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right'
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right'
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
                                    <Typography sx={{ textAlign: 'center' }}>{setting.label}</Typography>
                                </MenuItem>
                            ))}
                            <MenuItem
                                key="logoutformavatar"
                                onClick={() => logout()}
                            >
                                <Typography sx={{ textAlign: 'center' }}>Logout</Typography>
                            </MenuItem>

                        </Menu>

                    </Box>
                </Toolbar>
            </AppBarStyle>
            <DrawerStyle variant="permanent" open={open} sx={{}}>
                <Toolbar
                    sx={{

                    }}
                >
                    <IconButton onClick={toggleDrawer}>
                        <ChevronLeftIcon />
                    </IconButton>
                </Toolbar>
                <Divider />
                <List component="nav" >
                    <MainListItems />
                    <Divider sx={{ my: 1 }} />
                    <SecondaryListItems />
                    <Divider sx={{ my: 1 }} />
                </List>
                <Button
                    sx={{
                        position: 'absolute',
                        bottom: '0',
                        width: '100%',
                        left: '0',
                        right: '0',
                        margin: 'auto',
                        backgroundColor: '#233044',
                        color: '#ffffff',
                        borderRadius: 0,
                    }}
                    startIcon={<LogoutIcon />}
                    onClick={() => {
                        logout();

                    }} >
                    Logout</Button>
            </DrawerStyle>
            <Box
                component="main"
                sx={{
                    backgroundColor: (theme) =>
                        theme.palette.background.default,
                    flexGrow: 1,
                    height: '100vh',
                    overflow: 'auto',

                }}
            >
                <Toolbar />

                <Box
                    sx={{
                        maxWidth: 'var(--Content-maxWidth)',
                        margin: 'var(--Content-margin)',
                        padding: 'var(--Content-padding)',
                        width: 'var(--Content-width)',

                    }}
                >
                    <Outlet />
                </Box>
            </Box>
        </Box>
    )
}

export default MainLayout;

