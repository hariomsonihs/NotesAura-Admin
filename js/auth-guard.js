import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Check if user is authenticated and is admin
export function checkAuth() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // No user logged in, redirect to login
                window.location.href = 'index.html';
                reject('Not authenticated');
                return;
            }

            try {
                // Check if user is admin
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const userData = userDoc.data();
                
                if (!userData || userData.admin !== 'yes') {
                    // User is not admin, redirect to login
                    window.location.href = 'index.html';
                    reject('Not authorized');
                    return;
                }
                
                // User is authenticated and is admin
                resolve(user);
            } catch (error) {
                console.error('Error checking admin status:', error);
                window.location.href = 'index.html';
                reject('Error checking authorization');
            }
        });
    });
}

// Initialize auth guard for all admin pages
export function initAuthGuard() {
    // Skip auth check for login page
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        return;
    }
    
    checkAuth().catch(() => {
        // Auth check failed, user will be redirected
    });
}