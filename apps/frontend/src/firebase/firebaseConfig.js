// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDSfElmWzT9wekgHsjSKnOchWaIubTRqpE",
    authDomain: "syslab-vite.firebaseapp.com",
    databaseURL: "https://syslab-vite-default-rtdb.firebaseio.com",
    projectId: "syslab-vite",
    storageBucket: "syslab-vite.appspot.com",
    messagingSenderId: "806645569498",
    appId: "1:806645569498:web:e69ef9e193ca426dc092e3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()
const db = getFirestore();
const storage = getStorage(app)

export { auth, googleProvider, db, storage }

