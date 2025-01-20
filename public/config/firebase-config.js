import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyBr3CuAMcXz2OPveIVygpaW5GFQmO_9218",
  authDomain: "booking-system-fdbc1.firebaseapp.com",
  projectId: "booking-system-fdbc1",
  storageBucket: "booking-system-fdbc1.firebasestorage.app",
  messagingSenderId: "856434982116",
  appId: "1:856434982116:web:826b0c0e45615cb2e000f1",
  measurementId: "G-FRLGT31KYY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 