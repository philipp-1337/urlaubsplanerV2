// src/firebase.js
import { initializeApp } from "firebase/app";
import { 
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where
} from "firebase/firestore";
// import { getAuth } from "firebase/auth"; // Uncomment if you add Firebase Authentication

// IMPORTANT: Replace with your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvgQF66omtiPE7dyw0xrFbWivWjubHsqg",
  authDomain: "projekt-paddelboot.firebaseapp.com",
  projectId: "projekt-paddelboot",
  storageBucket: "projekt-paddelboot.firebasestorage.app",
  messagingSenderId: "327036232467",
  appId: "1:327036232467:web:285335291f3379b4d0b0e6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// const auth = getAuth(app); // Uncomment if you add Firebase Authentication

export { 
  db, 
  // auth, // Export auth if you use it
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where
};