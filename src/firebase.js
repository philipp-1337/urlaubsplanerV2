// src/firebase.js
import { initializeApp } from "firebase/app";
import { 
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc, // Import getDoc here
  setDoc,
  deleteDoc,
  query,
  where,
  addDoc, // Import addDoc from firebase/firestore
  writeBatch // Import writeBatch from firebase/firestore
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
const auth = getAuth(app);

export { 
  db, 
  auth,
  collection,
  doc,
  getDocs,
  getDoc, // Export getDoc here
  setDoc,
  deleteDoc,
  addDoc, // Export addDoc
  query,
  where,
  writeBatch // Export writeBatch
};