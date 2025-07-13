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
  writeBatch, // Import writeBatch from firebase/firestore
  updateDoc // Import updateDoc from firebase/firestore
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// IMPORTANT: Replace with your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDrDGw4w49MFlmiY6qtxHMaVDUaKSWhH4",
  authDomain: "rosa-kanu.firebaseapp.com",
  projectId: "rosa-kanu",
  storageBucket: "rosa-kanu.firebasestorage.app",
  messagingSenderId: "447800886787",
  appId: "1:447800886787:web:130b88b260f1b70ebbb036"
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
  writeBatch, // Export writeBatch
  updateDoc // Export updateDoc
};