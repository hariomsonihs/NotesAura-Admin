import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Check if user is already logged in and is admin
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Check if user is admin
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.admin === 'yes') {
                    // User is admin, allow access
                    if (window.location.pathname.endsWith('index.html')) {
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    // User is not admin, logout and redirect to login
                    if (!window.location.pathname.endsWith('index.html')) {
                        await signOut(auth);
                        alert('Access denied. Admin privileges required.');
                        window.location.href = 'index.html';
                    }
                }
            } else {
                // User document doesn't exist, logout
                if (!window.location.pathname.endsWith('index.html')) {
                    await signOut(auth);
                    alert('Access denied. Admin privileges required.');
                    window.location.href = 'index.html';
                }
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            if (!window.location.pathname.endsWith('index.html')) {
                await signOut(auth);
                window.location.href = 'index.html';
            }
        }
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
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Check if user is admin
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.admin === 'yes') {
                    // User is admin, allow login
                    window.location.href = 'dashboard.html';
                } else {
                    // User is not admin, logout and show error
                    await signOut(auth);
                    errorMsg.textContent = 'Access denied. Admin privileges required.';
                    errorMsg.style.display = 'block';
                }
            } else {
                // User document doesn't exist, logout
                await signOut(auth);
                errorMsg.textContent = 'Access denied. Admin privileges required.';
                errorMsg.style.display = 'block';
            }
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
