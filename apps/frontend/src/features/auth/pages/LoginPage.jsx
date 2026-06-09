import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithEmail, loginWithGoogle } from '@/features/auth/services/authService'
import { useAuth } from '@/app/providers/AuthContext'
import { Avatar, Box, Button, Checkbox, CssBaseline, FormControlLabel, Grid, Link, Paper, TextField, Typography } from '@mui/material'
import { LockClockOutlined } from '@mui/icons-material'
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/shared/ui/i18n/LanguageSwitcher';

const LoginPage = () => {
    const { t } = useTranslation()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const navigate = useNavigate()
    const { completeLogin } = useAuth()
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

    const handleLogin = async (e) => {
        e.preventDefault()
        try {
            const authPayload = await loginWithEmail(email, password)
            await completeLogin(authPayload)
            navigate('/')
        } catch (error) {
            setError(error?.message || t('auth.login.defaultError'))
        }
    }

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const authPayload = await loginWithGoogle(credentialResponse.credential, googleClientId)
            await completeLogin(authPayload)
            navigate('/')
        } catch (error) {
            setError(error?.message || t('auth.login.googleError'))
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
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <LanguageSwitcher />
                    </Box>
                    <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                        <LockClockOutlined />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        {t('auth.login.title')}
                    </Typography>
                    <Box component="form" noValidate onSubmit={handleLogin} sx={{ mt: 1 }}>
                        {error && (
                            <Typography color="error" variant="body2">
                                {error}
                            </Typography>
                        )}
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label={t('auth.login.emailLabel')}
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
                            label={t('auth.login.passwordLabel')}
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                        />

                        <FormControlLabel
                            control={<Checkbox value="remember" color="primary" />}
                            label={t('auth.login.rememberMe')}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                        >
                            {t('auth.login.submit')}
                        </Button>
                        {googleClientId && (
                            <Box sx={{ mt: 1, mb: 2 }}>
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError(t('auth.login.googleError'))}
                                    useOneTap={false}
                                />
                            </Box>
                        )}

                        <Grid container>
                            <Grid item xs>
                                <Link href="#" variant="body2">
                                    {t('auth.login.forgotPassword')}
                                </Link>
                            </Grid>
                            <Grid item>
                                <Link href="#" variant="body2">
                                    {t('auth.login.signUpPrompt')}
                                </Link>
                            </Grid>
                        </Grid>
                    </Box>

                </Box>

            </Grid>
        </Grid>
        // <div>


        //     <h1>{t('auth.login.submit')}</h1>
        //     <form onSubmit={handleLogin}>
        //         <div>
        //             <label htmlFor="">Email:</label>
        //             <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        //         </div>
        //         <div>
        //             <label htmlFor="">{t('auth.login.passwordLabel')}:</label>
        //             <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        //         </div>
        //         <button type="submit">{t('auth.login.submit')}</button>
        //     </form>
        //     <button onClick={handleGoogleLogin}>Login with Google</button>

        // </div>
    )
}

export default LoginPage
