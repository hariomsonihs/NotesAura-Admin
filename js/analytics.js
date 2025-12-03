import { db } from './firebase-config.js';
import { initAuthGuard } from './auth-guard.js';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Initialize Charts
let userRegistrationChart, enrollmentChart, popularCoursesChart, categoryChart;

// Load Today's Stats
async function loadTodayStats() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        // New Users Today
        const usersQuery = query(
            collection(db, 'users'),
            where('createdAt', '>=', todayTimestamp)
        );
        const usersSnapshot = await getDocs(usersQuery);
        document.getElementById('newUsersToday').textContent = usersSnapshot.size;

        // Enrollments Today
        const enrollmentsQuery = query(
            collection(db, 'enrollments'),
            where('enrollmentDate', '>=', todayTimestamp)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        document.getElementById('enrollmentsToday').textContent = enrollmentsSnapshot.size;

        // Course Completions Today (mock data for now)
        document.getElementById('completionsToday').textContent = Math.floor(Math.random() * 20);

        // Active Users (users who logged in last 24 hours)
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayTimestamp = Timestamp.fromDate(yesterday);
        const activeUsersQuery = query(
            collection(db, 'users'),
            where('lastLoginAt', '>=', yesterdayTimestamp)
        );
        const activeUsersSnapshot = await getDocs(activeUsersQuery);
        document.getElementById('activeUsers').textContent = activeUsersSnapshot.size;

    } catch (error) {
        console.error('Error loading today stats:', error);
    }
}

// Create User Registration Chart
async function createUserRegistrationChart() {
    try {
        const ctx = document.getElementById('userRegistrationChart').getContext('2d');
        
        // Get last 7 days data
        const last7Days = [];
        const userCounts = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const dayQuery = query(
                collection(db, 'users'),
                where('createdAt', '>=', Timestamp.fromDate(date)),
                where('createdAt', '<', Timestamp.fromDate(nextDate))
            );
            
            const daySnapshot = await getDocs(dayQuery);
            
            last7Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            userCounts.push(daySnapshot.size);
        }

        userRegistrationChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'New Users',
                    data: userCounts,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating user registration chart:', error);
    }
}

// Create Enrollment Chart
async function createEnrollmentChart() {
    try {
        const ctx = document.getElementById('enrollmentChart').getContext('2d');
        
        // Get last 7 days enrollment data
        const last7Days = [];
        const enrollmentCounts = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const dayQuery = query(
                collection(db, 'enrollments'),
                where('enrollmentDate', '>=', Timestamp.fromDate(date)),
                where('enrollmentDate', '<', Timestamp.fromDate(nextDate))
            );
            
            const daySnapshot = await getDocs(dayQuery);
            
            last7Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            enrollmentCounts.push(daySnapshot.size);
        }

        enrollmentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Enrollments',
                    data: enrollmentCounts,
                    backgroundColor: '#28a745',
                    borderColor: '#28a745',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating enrollment chart:', error);
    }
}

// Create Popular Courses Chart
async function createPopularCoursesChart() {
    try {
        const ctx = document.getElementById('popularCoursesChart').getContext('2d');
        
        // Get enrollment counts per course
        const enrollmentsSnapshot = await getDocs(collection(db, 'enrollments'));
        const courseCounts = {};
        
        enrollmentsSnapshot.forEach(doc => {
            const enrollment = doc.data();
            const courseName = enrollment.courseName || 'Unknown Course';
            courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;
        });
        
        // Sort and get top 5
        const sortedCourses = Object.entries(courseCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        const courseNames = sortedCourses.map(([name]) => name.length > 20 ? name.substring(0, 20) + '...' : name);
        const counts = sortedCourses.map(([,count]) => count);

        popularCoursesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: courseNames,
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        '#007bff',
                        '#28a745',
                        '#ffc107',
                        '#dc3545',
                        '#6f42c1'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating popular courses chart:', error);
    }
}

// Create Category Distribution Chart
async function createCategoryChart() {
    try {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        // Get courses by category
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const categoryCounts = {};
        
        coursesSnapshot.forEach(doc => {
            const course = doc.data();
            const category = course.category || 'Other';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        
        const categories = Object.keys(categoryCounts);
        const counts = Object.values(categoryCounts);

        categoryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        '#007bff',
                        '#28a745',
                        '#ffc107',
                        '#dc3545',
                        '#6f42c1',
                        '#17a2b8'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating category chart:', error);
    }
}

// Load Recent Activity
async function loadRecentActivity() {
    try {
        const container = document.getElementById('recentActivity');
        const activities = [];
        
        // Get recent enrollments
        const enrollmentsQuery = query(
            collection(db, 'enrollments'),
            orderBy('enrollmentDate', 'desc'),
            limit(10)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        
        enrollmentsSnapshot.forEach(doc => {
            const enrollment = doc.data();
            activities.push({
                type: 'enrollment',
                message: `New enrollment in ${enrollment.courseName || 'Unknown Course'}`,
                time: enrollment.enrollmentDate?.toDate() || new Date(),
                icon: 'fas fa-graduation-cap',
                color: 'text-success'
            });
        });
        
        // Get recent users
        const usersQuery = query(
            collection(db, 'users'),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            activities.push({
                type: 'user',
                message: `New user registered: ${user.name || user.email}`,
                time: user.createdAt?.toDate() || new Date(),
                icon: 'fas fa-user-plus',
                color: 'text-primary'
            });
        });
        
        // Sort by time and display
        activities.sort((a, b) => b.time - a.time);
        
        container.innerHTML = '';
        activities.slice(0, 10).forEach(activity => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex align-items-center';
            item.innerHTML = `
                <i class="${activity.icon} ${activity.color} me-3"></i>
                <div class="flex-grow-1">
                    <div>${activity.message}</div>
                    <small class="text-muted">${activity.time.toLocaleString()}</small>
                </div>
            `;
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        document.getElementById('recentActivity').innerHTML = '<p class="text-muted">No recent activity</p>';
    }
}

// Initialize Auth Guard
initAuthGuard();

// Initialize Analytics Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    await loadTodayStats();
    await createUserRegistrationChart();
    await createEnrollmentChart();
    await createPopularCoursesChart();
    await createCategoryChart();
    await loadRecentActivity();
});