import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithEmail, loginWithGoogle } from '../../../services/authServices'
import { Avatar, Box, Button, Checkbox, CssBaseline, FormControlLabel, Grid, Link, Paper, TextField, Typography } from '@mui/material'
import { LockClockOutlined } from '@mui/icons-material'
import GoogleIcon from '@mui/icons-material/Google';




const LoginPage = () => {

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        try {
            await loginWithEmail(email, password)
            navigate('/')
        } catch (error) {
            // console.log('Error loggin in with email:', error);
        }
    }

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle()
            navigate('/')
        } catch (error) {
            // console.log('Error loggin in with Google')
        }
    }

    return (
        <Grid container component="main" sx={{ height: '100vh' }}>
            <CssBaseline />
            <Grid
                item
                xs={false}
                sm={4}
                md={7}
                sx={{
                    backgroundImage:
                        'url(https://random.imagecdn.app/1050/600)',
                    backgroundColor: (t) =>
                        t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
                    backgroundSize: 'cover',
                    backgroundPosition: 'left',
                }}
            />
            <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
                <Box
                    sx={{
                        my: 8,
                        mx: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                        <LockClockOutlined />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Sign In 
                    </Typography>
                    <Box component="form" noValidate onSubmit={handleLogin} sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email} onChange={(e) => setEmail(e.target.value)}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                        />

                        <FormControlLabel
                            control={<Checkbox value="remember" color="primary" />}
                            label="Remember me"
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                        >
                            Login
                        </Button>
                        <Button
                            startIcon={<GoogleIcon/>}
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            onClick={handleGoogleLogin}
                        >
                            Sign In With Google
                        </Button>
                     
                        <Grid container>
                            <Grid item xs>
                                <Link href="#" variant="body2">
                                    Forgot password?
                                </Link>
                            </Grid>
                            <Grid item>
                                <Link href="#" variant="body2">
                                    {"Don't have an account? Sign Up"}
                                </Link>
                            </Grid>
                        </Grid>
                    </Box>

                </Box>

            </Grid>
        </Grid>
        // <div>


        //     <h1>Login</h1>
        //     <form onSubmit={handleLogin}>
        //         <div>
        //             <label htmlFor="">Email:</label>
        //             <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        //         </div>
        //         <div>
        //             <label htmlFor="">Password:</label>
        //             <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        //         </div>
        //         <button type="submit">Login</button>
        //     </form>
        //     <button onClick={handleGoogleLogin}>Login with Google</button>

        // </div>
    )
}

export default LoginPage