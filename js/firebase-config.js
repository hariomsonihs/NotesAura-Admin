import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

const firebaseConfig = {
    apiKey: "AIzaSyAT2rsSb2BkWjDW4hzCUn68_1WWSJg0Kks",
    authDomain: "notesaura-programming-guide.firebaseapp.com",
    projectId: "notesaura-programming-guide",
    storageBucket: "notesaura-programming-guide.firebasestorage.app",
    messagingSenderId: "311926717488",
    appId: "1:311926717488:web:08ab85935cdc3b1cfe41f5",
    measurementId: "G-GNDR3Y84JD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
