import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState, createContext, useContext } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { DB_FIRESTORE_USERS } from "../constants";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

// eslint-disable-next-line react/prop-types
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            setLoading(true);
            if (authUser) {
                try {
                    const usersCollectionRef = collection(db, DB_FIRESTORE_USERS);
                    const q = query(usersCollectionRef, where('authUid', '==', authUser.uid));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const userDoc = querySnapshot.docs[0];
                        const userData = userDoc.data();

                        // Combina los datos de autenticación con los datos de Firestore
                        setUser({
                            uid: authUser.uid,
                            displayName: authUser.displayName,
                            email: authUser.email,
                            photoURL: authUser.photoURL,
                            ...userData, // Incluye datos adicionales, como el rol
                            userId: userDoc.id
                        });
                    } else {
                        console.warn('No se encontró el usuario en Firestore con authUid:', authUser.uid);
                        setUser(null);
                        navigate("/login"); // Redirige a login si no se encuentra el usuario
                    }

                } catch (error) {
                    console.error('Error al obtener los datos del usuario de Firestore:', error);
                } finally {
                    setLoading(false);
                }
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const logout = async () => {
        await signOut(auth);
        setUser(null); // Limpia el usuario al cerrar sesión
        navigate("/login"); // Redirige a login después de cerrar sesión
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom Hook para utilizar el contexto de autenticación
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    return useContext(AuthContext);
};
