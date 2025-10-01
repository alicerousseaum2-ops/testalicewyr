// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCjT7BLZj9Je_XP4NrVTzm_zwvDnTC7qAE",
  authDomain: "wyr1-f474f.firebaseapp.com",
  projectId: "wyr1-f474f",
  storageBucket: "wyr1-f474f.firebasestorage.app",
  messagingSenderId: "861797909797",
  appId: "1:861797909797:web:60c87b9265c2abdb1086cc",
  measurementId: "G-3CQK5Z60L1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
