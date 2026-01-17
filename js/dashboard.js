import { db } from './firebase-config.js';
import { initAuthGuard } from './auth-guard.js';
import { collection, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Load Dashboard Stats
async function loadStats() {
    try {
        // Total Courses
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        document.getElementById('totalCourses').textContent = coursesSnapshot.size;
        
        // Total Users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        document.getElementById('totalUsers').textContent = usersSnapshot.size;
        
        // Total Practice
        const practiceSnapshot = await getDocs(collection(db, 'practice_lists'));
        document.getElementById('totalPractice').textContent = practiceSnapshot.size;
        
        // Total Quiz
        const quizSnapshot = await getDocs(collection(db, 'quiz_categories'));
        document.getElementById('totalQuiz').textContent = quizSnapshot.size;
        
        // Total Notifications
        const notificationsSnapshot = await getDocs(collection(db, 'admin_notifications'));
        document.getElementById('totalNotifications').textContent = notificationsSnapshot.size;
        
        // Total E-books
        const ebooksSnapshot = await getDocs(collection(db, 'ebooks'));
        document.getElementById('totalEbooks').textContent = ebooksSnapshot.size;
        
        // Total Interview Questions
        const interviewSnapshot = await getDocs(collection(db, 'interview_questions'));
        document.getElementById('totalInterviews').textContent = interviewSnapshot.size;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load Recent Courses
async function loadRecentCourses() {
    try {
        const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        const container = document.getElementById('recentCourses');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="text-muted">No courses yet</p>';
            return;
        }
        
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const course = doc.data();
            const item = document.createElement('div');
            item.className = 'list-group-item';
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${course.title}</h6>
                        <small class="text-muted">${course.category}</small>
                    </div>
                    <span class="badge ${course.isActive ? 'bg-success' : 'bg-secondary'}">
                        ${course.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading recent courses:', error);
    }
}

// Load Recent Users
async function loadRecentUsers() {
    try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        const container = document.getElementById('recentUsers');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="text-muted">No users yet</p>';
            return;
        }
        
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const item = document.createElement('div');
            item.className = 'list-group-item';
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${user.name || 'Unknown'}</h6>
                        <small class="text-muted">${user.email}</small>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading recent users:', error);
    }
}

// Initialize Auth Guard
initAuthGuard();

// Initialize Dashboard
loadStats();
loadRecentCourses();
loadRecentUsers();
