import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDHDqfz2agThtMuEaCDknrfewRJfEtZy7k",
  authDomain: "miassured.firebaseapp.com",
  projectId: "miassured",
  storageBucket: "miassured.firebasestorage.app",
  messagingSenderId: "374527019317",
  appId: "1:374527019317:web:ba71be5f155aa1614a247c",
  measurementId: "G-1HDH8KBSSR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Enable persistent auth state
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Auth persistence error:", error);
  });

export { auth, analytics }; 