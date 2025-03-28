// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyArXwksugU7NwrW8D_Pt63FftzG_gKrDnA",
  authDomain: "finsage-8fade.firebaseapp.com",
  projectId: "finsage-8fade",
  storageBucket: "finsage-8fade.firebasestorage.app",
  messagingSenderId: "1015585315673",
  appId: "1:1015585315673:web:b6f9126ed53046c8374a48",
  measurementId: "G-J8FE6BTHF9"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);