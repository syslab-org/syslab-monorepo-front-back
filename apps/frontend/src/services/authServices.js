import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { useEffect } from "react";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { DB_FIRESTORE_USERS, STATUS_USER_ACTIVE, STATUS_USER_PENDING } from "../constants";
import { useState } from "react";

const googleProvider = new GoogleAuthProvider();

export const loginWithEmail = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password)
}

export const loginWithGoogle = () => {
    return signInWithPopup(auth, googleProvider)
}



export const useUserRegistration = (userId) => {
    const [user, setUser] = useState(null);
    const [isLinkValid, setIsLinkValid] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("")
    const [isCheckingLink, setIsCheckingLink] = useState(true);


    useEffect(() => {

        const fetchUser = async () => {
            setIsCheckingLink(true);  
            try {
                const userRef = doc(db, DB_FIRESTORE_USERS, userId)
                const userSnap = await getDoc(userRef)
                // console.log("isLinkValid2: ",isLinkValid);
                
                if (userSnap.exists()) {
                    const userData = userSnap.data()
                    const now = Date.now()
                    const expirationTimestamp = userData.createdAt.toMillis() + userData.expirationTime

                    if (userData.status === STATUS_USER_PENDING && now < expirationTimestamp) {
                        setUser(userData)
                        setIsLinkValid(true)
                    } else {
                        setError('El enlace ha caducado o no es valido')
                        

                    }
                } else {
                    setError('No se encontró el usuario')
                    
                }


            } catch (error) {
                setError('Error al conectar con firestore')
            }finally {
                setIsCheckingLink(false);  
            }
        }

        fetchUser()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    const registerWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, new GoogleAuthProvider())
            await updateDoc(doc(db, DB_FIRESTORE_USERS, userId), {
                status: STATUS_USER_ACTIVE,
                authUid: result.user.uid
            })

            alert("Registro completo con Google.")
            setSuccessMessage("Sign up Google successfully")

        } catch (error) {
            setError("Error al iniciar sesión con Google")
        }
    }

    const fetchUserByEmail = async (email) => {

        try {
            const userCollectionRef = collection(db, DB_FIRESTORE_USERS)
            const q = query(userCollectionRef, where('email', '==', email))

            const querySnapshot = await getDocs(q)

            return querySnapshot;

        } catch (error) {
            setError("Error al validar el email del usuario.");
            // console.log(error);


        }

    }

    const registerWithEmailPassword = async (email, password) => {
        
        try {

            const userByEmail = await fetchUserByEmail(email);
            
            if (!userByEmail.empty) {
               
                const userData = userByEmail.docs[0]

                if (userData.id === userId) {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
                    await updateDoc(doc(db, DB_FIRESTORE_USERS, userId), {
                        status: STATUS_USER_ACTIVE,
                        authUid: userCredential.user.uid
                    })
                    setSuccessMessage("Sign up successfully")
                    return true
                } else {
                    setError("Ha ocurrido un error, contacte con el administrador");
                    return false;
                }



            } else {
                
                setError("El email no es válido o no coincide con el usuario.");
                return false;
            }

        } catch (error) {
            setError("Error to register: ", error)
        }
    }

    return {
        user,
        isLinkValid,
        error,
        successMessage,
        setError,
        registerWithGoogle,
        registerWithEmailPassword,
        isCheckingLink,
    }

}