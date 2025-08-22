import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserRegistration } from "../../../services/authServices";
import { Alert, Avatar, Box, Button, CssBaseline, Grid, Link, Paper, Snackbar, TextField, Typography } from "@mui/material";
import { LockClockOutlined } from "@mui/icons-material";
import GoogleIcon from "@mui/icons-material/Google";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRegistrationUserFormValidation } from "../../../utils/hooks/useRegistrationUserFormValidation";
import { auth } from "../../../firebase/firebaseConfig";

const RegistrationPage = () => {
    const { userId } = useParams();
    const { successMessage, isCheckingLink, isLinkValid, setError, error, registerWithGoogle, registerWithEmailPassword } = useUserRegistration(userId);
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
                await auth.signOut();
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
                    <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
                        <LockClockOutlined />
                    </Avatar>
                    <Typography>Sign Up</Typography>
                    {isLinkValid && !isCheckingLink && (
                        <Box component="form" noValidate sx={{ mt: 1 }} onSubmit={handleSubmit(handleSignUpWithEmailAndPassword)}>
                            <TextField
                                label="Email Address"
                                {...register('email')}
                                placeholder="Set Email"
                                error={!!errors.email}
                                helperText={errors.email?.message}
                                margin="normal"
                                fullWidth
                                autoFocus
                            />
                            <TextField
                                label="Password"
                                {...register('password')}
                                placeholder="Set Password"
                                error={!!errors.password}
                                helperText={errors.password?.message}
                                margin="normal"
                                fullWidth
                                type="password"
                            />
                            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                                Sign Up
                            </Button>
                            <Button
                                startIcon={<GoogleIcon />}
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                                onClick={registerWithGoogle}
                            >
                                Sign Up With Google
                            </Button>
                            <Grid container>
                                <Grid item>
                                    <Link href="/login" variant="body2">
                                        {"Sign In"}
                                    </Link>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                    {!isLinkValid && !isCheckingLink && (
                        <Typography color="error" variant="h6">
                            El enlace ha caducado
                        </Typography>
                    )}
                </Box>
            </Grid>
        </Grid>
    );
};

export default RegistrationPage;
