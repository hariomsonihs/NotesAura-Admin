import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.endsWith('index.html')) {
        window.location.href = 'dashboard.html';
    } else if (!user && !window.location.pathname.endsWith('index.html')) {
        window.location.href = 'index.html';
    }
});

// Login Form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMsg');
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'dashboard.html';
        } catch (error) {
            errorMsg.textContent = 'Invalid email or password';
            errorMsg.style.display = 'block';
        }
    });
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await signOut(auth);
        window.location.href = 'index.html';
    });
}

// Display user email
onAuthStateChanged(auth, (user) => {
    const userEmail = document.getElementById('userEmail');
    if (user && userEmail) {
        userEmail.textContent = user.email;
    }
});
