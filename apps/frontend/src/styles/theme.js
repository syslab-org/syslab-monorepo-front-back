import { createTheme } from "@mui/material";

export const darkTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#121212',
        },
        secondary: {
            main: '#2461C2'
        },
        background: {
            default: '#ffffff'
        }
    },
    shape: {
        borderRadius: 0,
    },
    components: {
        MuiToolbar: {
            styleOverrides: {
                root: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    px: '0 8px',
                    backgroundColor: '#233044'
                }
            }
        },
        MuiList: {
            styleOverrides: {
                root: {
                    backgroundColor: '#233044'
                }
            }
        },
        MuiAppBar: {
            defaultProps: {
                square: false,
            },
            styleOverrides: {
                root: {
                    backgroundColor: '#233044',
                    color: '#ffffff',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#233044',
                    color: '#ffffff',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: '#ffffff',
                    borderRadius: 0,

                }
            },
            variants:[
                {
                    props:{variant:'lightPaper'},
                    style:{
                        backgroundColor:'#ffffff',
                        boxShadow:'rgba(0, 0, 0, 0.04) 0px 5px 22px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px'
                    }
                }
            ]
        },
        MuiListItemButton:{
            variants:[
                {
                    props:{variant:'whiteStyle'},
                    style:{
                        color:'#ffffff',
                        borderRadius:'8px'
                    }
                }
            ]
        },
        MuiListItemIcon:{
            variants:[
                {
                    props:{variant:'whiteStyle'},
                    style:{
                        color:'#ffffff'
                    }
                }
            ]
        }
    }
})

export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#ff4081',
        },
        background: {
            default: '#fafafa',
        },
    },

    shape: {
        borderRadius: 0,
    },
    

})
