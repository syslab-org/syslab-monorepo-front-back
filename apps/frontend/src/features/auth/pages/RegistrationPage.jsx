import { yupResolver } from "@hookform/resolvers/yup";
import { LockClockOutlined } from "@mui/icons-material";
import { Alert, Avatar, Box, Button, CssBaseline, Grid, Link, Paper, Snackbar, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { useUserRegistration } from '@/features/auth/services/authService';
import { useRegistrationUserFormValidation } from '@/features/auth/hooks/useRegistrationUserFormValidation';
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/shared/ui/i18n/LanguageSwitcher";

const RegistrationPage = () => {
    const { t } = useTranslation()
    const { userId } = useParams();
    const { successMessage, isCheckingLink, isLinkValid, setError, error, registerWithEmailPassword } = useUserRegistration(userId);
    const validationSchema = useRegistrationUserFormValidation();
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: yupResolver(validationSchema),
        defaultValues: { email: '', password: '' }
    });

    const [openSnackbar, setOpenSnackbar] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isCheckingLink && (error || !isLinkValid)) {
            setOpenSnackbar(true);
        } else {
            setOpenSnackbar(false);
        }
    }, [isCheckingLink, error, isLinkValid]);

    const handleSnackbarClose = () => {
        if (isLinkValid) {
            setError('');
            setOpenSnackbar(false);
        }
    };

    const handleSignUpWithEmailAndPassword = async (data) => {
        try {
            const isRegistered = await registerWithEmailPassword(data.email, data.password);
            if (isRegistered) {
                navigate('/login');
            }
        } catch (error) {
            setError(error);
        }
    };

    return (
        <Grid container component="main" sx={{ height: "100vh" }}>
            <CssBaseline />
            {openSnackbar && (
                <Snackbar
                    anchorOrigin={{ vertical: "top", horizontal: "center" }}
                    open={!isCheckingLink && openSnackbar}
                    autoHideDuration={!isLinkValid ? null : 6000}
                    onClose={handleSnackbarClose}
                >
                    <Alert onClose={handleSnackbarClose} severity="error" variant="filled" sx={{ width: "100%" }}>
                        {successMessage || error}
                    </Alert>
                </Snackbar>
            )}

            <Grid
                item
                xs={false}
                sm={4}
                md={7}
                sx={{
                    backgroundImage: "url(https://random.imagecdn.app/1050/600)",
                    backgroundColor: (t) => (t.palette.mode === "light" ? t.palette.grey[50] : t.palette.grey[900]),
                    backgroundSize: "cover",
                    backgroundPosition: "left",
                }}
            />

            <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
                <Box sx={{ my: 8, mx: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-end", mb: 2 }}>
                        <LanguageSwitcher />
                    </Box>
                    <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
                        <LockClockOutlined />
                    </Avatar>
                    <Typography component="h1" variant="h5">{t('auth.register.title')}</Typography>
                    {isLinkValid && !isCheckingLink && (
                        <Box component="form" noValidate sx={{ mt: 1 }} onSubmit={handleSubmit(handleSignUpWithEmailAndPassword)}>
                            <TextField
                                label={t('auth.login.emailLabel')}
                                {...register('email')}
                                placeholder={t('auth.register.emailPlaceholder')}
                                error={!!errors.email}
                                helperText={errors.email?.message}
                                margin="normal"
                                fullWidth
                                autoFocus
                            />
                            <TextField
                                label={t('auth.login.passwordLabel')}
                                {...register('password')}
                                placeholder={t('auth.register.passwordPlaceholder')}
                                error={!!errors.password}
                                helperText={errors.password?.message}
                                margin="normal"
                                fullWidth
                                type="password"
                            />
                            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                                {t('auth.register.submit')}
                            </Button>
                                <Grid container>
                                    <Grid item>
                                    <Link component={RouterLink} to="/login" variant="body2">
                                        {t('auth.register.signIn')}
                                    </Link>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                    {!isLinkValid && !isCheckingLink && (
                        <Typography color="error" variant="h6">
                            {t('auth.register.expiredLink')}
                        </Typography>
                    )}
                </Box>
            </Grid>
        </Grid>
    );
};

export default RegistrationPage;
