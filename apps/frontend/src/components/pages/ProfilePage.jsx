import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { useContext, useEffect, useState } from 'react';
import { LoadingFlowContext } from '../../contexts/LoadingFlowContext';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { auth, db, storage } from '../../firebase/firebaseConfig';
import { DB_FIRESTORE_USERS } from '../../constants';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { Avatar, Button, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import { updateEmail, updateProfile } from 'firebase/auth';

const schema = yup.object({
    name: yup.string().required('Name is required'),
    email: yup.string().email('Must be a valid email').required('Email is required'),
}).required();

const ProfilePage = () => {
    const { user } = useAuth();
    const { setLoadingFlow } = useContext(LoadingFlowContext);
    const [userData, setUserData] = useState(null);
    const [profileImage, setProfileImage] = useState('');
    const [imageFile, setImageFile] = useState(null);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            name: '',
            email: '',
        },
    });

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (user?.uid) {
                setLoadingFlow(true);
                try {
                    const usersCollectionRef = collection(db, DB_FIRESTORE_USERS);
                    const q = query(usersCollectionRef, where('authUid', '==', user.uid));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const userDoc = querySnapshot.docs[0];
                        const data = userDoc.data();
                        setUserData(data);

                        // Prioridad de la imagen: `photoURL` de Auth, luego `profileImage` de Firestore
                        setProfileImage(user.photoURL || data.profileImage || '');

                        // Establecer valores en el formulario
                        setValue('name', user.displayName || data.name || '');
                        setValue('email', user.email || data.email || '');
                    } else {
                        console.warn('User not found in Firestore with the provided authUid');
                    }
                } catch (error) {
                    console.error('Error fetching user profile: ', error);
                } finally {
                    setLoadingFlow(false);
                }
            }
        };

        fetchUserProfile();
    }, [user, setLoadingFlow, setValue]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadProfileImage = async () => {
        if (!imageFile || !user?.uid) return null;

        const storageRef = ref(storage, `profileImages/${user.uid}`);
        const uploadTask = uploadBytesResumable(storageRef, imageFile);

        return new Promise((resolve, reject) => {
            uploadTask.on(
                'state_changed',
                null,
                (error) => reject(error),
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                }
            );
        });
    };

    const onSubmit = async (data) => {
        if (user?.uid) {
            setLoadingFlow(true);
            try {
                let profileImageUrl = userData?.profileImage;

                if (imageFile) {
                    profileImageUrl = await uploadProfileImage();
                }

                const displayName = data.name || user.displayName || 'Unnamed';
                const photoURL = profileImageUrl || user.photoURL || '';

                // Actualizar `displayName` y `photoURL` en Auth
                await updateProfile(auth.currentUser, {
                    displayName,
                    photoURL,
                });

                // Actualizar el `email` en Auth si ha cambiado
                if (data.email && data.email !== user.email) {
                    await updateEmail(auth.currentUser, data.email);
                }

                // Actualizar la información adicional en Firestore
                if (userData?.id) {
                    const userRef = doc(db, 'users', userData.id);
                    await updateDoc(userRef, {
                        profileImage: photoURL,
                    });
                } else {
                    console.warn('UserData or User ID is undefined. Cannot update Firestore.');
                }

                alert('Profile updated successfully!');
                setUserData({ ...userData, profileImage: profileImageUrl });
            } catch (error) {
                console.error('Error updating profile: ', error);
                alert('Failed to update profile.');
            } finally {
                setLoadingFlow(false);
            }
        }
    };

    // Si los datos del usuario aún no están cargados, mostrar un mensaje de carga
    if (!userData) {
        return <Typography>Cargando datos del perfil...</Typography>;
    }

    return (
        <Paper sx={{ p: 4, maxWidth: 600, margin: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                Profile
            </Typography>
            <Stack direction="column" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Avatar
                    src={profileImage || 'https://i.pravatar.cc/100'}
                    alt="Profile"
                    sx={{ width: 120, height: 120 }}
                />
                <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="profile-image-upload"
                    onChange={handleImageChange}
                />
                <label htmlFor="profile-image-upload">
                    <IconButton color="primary" component="span">
                        <PhotoCamera />
                    </IconButton>
                </label>
            </Stack>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2}>
                    <TextField
                        label="Name"
                        value={watch('name') || ''}
                        onChange={(e) => setValue('name', e.target.value)}
                        error={!!errors.name}
                        placeholder="Set Name"
                        helperText={errors.name?.message}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="Email"
                        value={watch('email') || ''}
                        onChange={(e) => setValue('email', e.target.value)}
                        error={!!errors.email}
                        helperText={errors.email?.message}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="Role"
                        value={userData?.role || 'N/A'}
                        disabled
                        fullWidth
                    />
                    <Button type="submit" variant="contained" color="primary">
                        Update Profile
                    </Button>
                </Stack>
            </form>
        </Paper>
    );
};

export default ProfilePage;
