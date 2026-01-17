import { db } from './firebase-config.js';
import { initAuthGuard } from './auth-guard.js';
import { collection, getDocs, addDoc, query, where, orderBy, limit, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

initAuthGuard();

let revenueChart, topCoursesChart, paymentMethodsChart;

// Load Revenue Stats
async function loadRevenueStats() {
    try {
        let totalRevenue = 0;
        let todayRevenue = 0;
        let totalSales = 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check users collection for enrolled courses (real payment data)
        const usersSnapshot = await getDocs(collection(db, 'users'));
        
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            
            try {
                const enrolledCoursesSnapshot = await getDocs(collection(db, 'users', userId, 'enrolled_courses'));
                
                enrolledCoursesSnapshot.forEach(enrollmentDoc => {
                    const enrollment = enrollmentDoc.data();
                    const amount = parseFloat(enrollment.amountPaid || enrollment.amount || 0);
                    
                    if (amount > 0) {
                        totalRevenue += amount;
                        totalSales++;
                        
                        const paymentDate = enrollment.enrollmentDate?.toDate() || new Date();
                        if (paymentDate >= today) {
                            todayRevenue += amount;
                        }
                    }
                });
            } catch (e) {
                // Skip if user doesn't have enrolled_courses
            }
        }
        
        // Also check main enrollments collection
        try {
            const enrollmentsSnapshot = await getDocs(collection(db, 'enrollments'));
            enrollmentsSnapshot.forEach(doc => {
                const enrollment = doc.data();
                const amount = parseFloat(enrollment.amountPaid || enrollment.amount || 0);
                
                if (amount > 0) {
                    totalRevenue += amount;
                    totalSales++;
                    
                    const paymentDate = enrollment.enrollmentDate?.toDate() || new Date();
                    if (paymentDate >= today) {
                        todayRevenue += amount;
                    }
                }
            });
        } catch (e) {
            console.log('Enrollments collection not accessible');
        }
        
        // Premium Users
        try {
            const premiumUsersQuery = query(collection(db, 'users'), where('premium', '==', true));
            const premiumSnapshot = await getDocs(premiumUsersQuery);
            document.getElementById('premiumUsers').textContent = premiumSnapshot.size;
        } catch (e) {
            document.getElementById('premiumUsers').textContent = '0';
        }
        
        document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString()}`;
        document.getElementById('todayRevenue').textContent = `₹${todayRevenue.toLocaleString()}`;
        document.getElementById('totalSales').textContent = totalSales.toLocaleString();
        
        console.log(`Revenue Stats: Total: ₹${totalRevenue}, Today: ₹${todayRevenue}, Sales: ${totalSales}`);
        
    } catch (error) {
        console.error('Error loading revenue stats:', error);
    }
}

// Create Revenue Chart
async function createRevenueChart() {
    try {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        
        // Simple mock data for now - replace with actual data processing
        const last30Days = [];
        const revenueData = [];
        
        // Generate last 30 days labels and sample data
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last30Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            revenueData.push(Math.floor(Math.random() * 5000)); // Sample data
        }

        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last30Days,
                datasets: [{
                    label: 'Revenue (₹)',
                    data: revenueData,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
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
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating revenue chart:', error);
    }
}

// Create Top Courses Chart
async function createTopCoursesChart() {
    try {
        const ctx = document.getElementById('topCoursesChart').getContext('2d');
        const collections = ['payments', 'enrollments', 'user_payments'];
        const courseRevenue = {};
        
        for (const collectionName of collections) {
            try {
                const snapshot = await getDocs(collection(db, collectionName));
                snapshot.forEach(doc => {
                    const payment = doc.data();
                    const status = payment.status || payment.paymentStatus;
                    const courseName = payment.courseName || payment.courseTitle || payment.title;
                    
                    if ((status === 'SUCCESS' || status === 'COMPLETED' || payment.amount > 0) && courseName) {
                        const amount = parseFloat(payment.amount || payment.amountPaid || payment.price || 0);
                        if (amount > 0) {
                            courseRevenue[courseName] = (courseRevenue[courseName] || 0) + amount;
                        }
                    }
                });
            } catch (e) {
                console.log(`Collection ${collectionName} not accessible for chart`);
            }
        }
        
        const sortedCourses = Object.entries(courseRevenue)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        if (sortedCourses.length === 0) {
            // Show empty chart message
            ctx.fillText('No course revenue data found', 50, 50);
            return;
        }
        
        const courseNames = sortedCourses.map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name);
        const revenues = sortedCourses.map(([,revenue]) => revenue);

        topCoursesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: courseNames,
                datasets: [{
                    data: revenues,
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
        console.error('Error creating top courses chart:', error);
    }
}

// Create Payment Methods Chart
async function createPaymentMethodsChart() {
    try {
        const ctx = document.getElementById('paymentMethodsChart').getContext('2d');
        
        // Sample data for payment methods
        const methods = ['Razorpay', 'UPI', 'Card', 'Net Banking', 'Wallet'];
        const counts = [45, 32, 28, 15, 8];

        paymentMethodsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: methods,
                datasets: [{
                    label: 'Transactions',
                    data: counts,
                    backgroundColor: '#007bff',
                    borderColor: '#007bff',
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
        console.error('Error creating payment methods chart:', error);
    }
}

// Load Recent Payments
async function loadRecentPayments() {
    try {
        const tbody = document.getElementById('paymentsTable');
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading payments...</td></tr>';
        
        // Check users collection for enrolled courses (where payments are stored)
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let allPayments = [];
        
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            
            try {
                // Check user's enrolled courses
                const enrolledCoursesSnapshot = await getDocs(collection(db, 'users', userId, 'enrolled_courses'));
                
                enrolledCoursesSnapshot.forEach(enrollmentDoc => {
                    const enrollment = enrollmentDoc.data();
                    
                    // If enrollment has payment info
                    if (enrollment.paymentStatus || enrollment.amountPaid || enrollment.amount) {
                        allPayments.push({
                            id: enrollmentDoc.id,
                            collection: `users/${userId}/enrolled_courses`,
                            userId: userId,
                            userName: userData.name || userData.displayName || 'Unknown',
                            userEmail: userData.email || '',
                            courseName: enrollment.courseName || enrollment.courseTitle || 'Unknown Course',
                            amount: enrollment.amountPaid || enrollment.amount || 0,
                            paymentMethod: enrollment.paymentMethod || 'Unknown',
                            status: enrollment.paymentStatus || 'COMPLETED',
                            date: enrollment.enrollmentDate || enrollment.createdAt,
                            ...enrollment
                        });
                    }
                });
            } catch (e) {
                console.log(`Could not access enrolled_courses for user ${userId}`);
            }
        }
        
        // Also check main enrollments collection
        try {
            const enrollmentsSnapshot = await getDocs(collection(db, 'enrollments'));
            enrollmentsSnapshot.forEach(doc => {
                const enrollment = doc.data();
                if (enrollment.paymentStatus || enrollment.amountPaid || enrollment.amount) {
                    allPayments.push({
                        id: doc.id,
                        collection: 'enrollments',
                        userName: enrollment.userName || 'Unknown',
                        userEmail: enrollment.userEmail || '',
                        courseName: enrollment.courseName || 'Unknown Course',
                        amount: enrollment.amountPaid || enrollment.amount || 0,
                        paymentMethod: enrollment.paymentMethod || 'Unknown',
                        status: enrollment.paymentStatus || 'COMPLETED',
                        date: enrollment.enrollmentDate || enrollment.createdAt,
                        ...enrollment
                    });
                }
            });
        } catch (e) {
            console.log('Enrollments collection not accessible');
        }
        
        if (allPayments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No payment data found in users/enrolled_courses or enrollments</td></tr>';
            return;
        }
        
        // Sort by date
        allPayments.sort((a, b) => {
            const dateA = a.date?.toDate?.() || new Date(0);
            const dateB = b.date?.toDate?.() || new Date(0);
            return dateB - dateA;
        });
        
        tbody.innerHTML = '';
        allPayments.slice(0, 20).forEach(payment => {
            const row = document.createElement('tr');
            const amount = parseFloat(payment.amount) || 0;
            const date = payment.date?.toDate?.()?.toLocaleDateString() || 'N/A';
            const statusBadge = getStatusBadge(payment.status);
            
            row.innerHTML = `
                <td>
                    <code>${payment.id}</code>
                    <br><small class="text-muted">${payment.collection}</small>
                </td>
                <td>
                    <div>
                        <div class="fw-bold">${payment.userName}</div>
                        <small class="text-muted">${payment.userEmail}</small>
                    </div>
                </td>
                <td>${payment.courseName}</td>
                <td class="fw-bold text-success">₹${amount.toLocaleString()}</td>
                <td>
                    <span class="badge bg-info">${payment.paymentMethod}</span>
                </td>
                <td>${statusBadge}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewPayment('${payment.id}', '${payment.collection}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        console.log(`Found ${allPayments.length} payments from user enrollments`);
        
    } catch (error) {
        console.error('Error loading payments:', error);
        const tbody = document.getElementById('paymentsTable');
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error: ' + error.message + '</td></tr>';
    }
}

// Get Status Badge
function getStatusBadge(status) {
    switch (status) {
        case 'SUCCESS':
        case 'COMPLETED':
            return '<span class="badge bg-success">Success</span>';
        case 'PENDING':
            return '<span class="badge bg-warning">Pending</span>';
        case 'FAILED':
            return '<span class="badge bg-danger">Failed</span>';
        default:
            return '<span class="badge bg-secondary">Unknown</span>';
    }
}

// Load Courses for Dropdown
async function loadCourses() {
    try {
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const courseSelect = document.getElementById('courseSelect');
        
        courseSelect.innerHTML = '<option value="">Select Course</option>';
        coursesSnapshot.forEach(doc => {
            const course = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = course.title;
            option.dataset.price = course.price || 0;
            courseSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// Add Manual Payment
async function addManualPayment(formData) {
    try {
        const paymentData = {
            userEmail: formData.get('userEmail'),
            courseId: formData.get('courseId'),
            courseName: document.getElementById('courseSelect').selectedOptions[0].textContent,
            amount: parseFloat(formData.get('amount')),
            paymentMethod: formData.get('paymentMethod'),
            paymentId: formData.get('transactionId'),
            status: 'SUCCESS',
            createdAt: Timestamp.now(),
            type: 'MANUAL'
        };

        await addDoc(collection(db, 'payments'), paymentData);
        
        alert('Payment added successfully!');
        document.getElementById('addPaymentForm').reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById('addPaymentModal'));
        modal.hide();
        
        loadRecentPayments();
        loadRevenueStats();
    } catch (error) {
        console.error('Error adding payment:', error);
        alert('Error adding payment. Please try again.');
    }
}

// Export to CSV
function exportToCSV() {
    // This would export payment data to CSV
    alert('CSV export functionality would be implemented here');
}

// Event Listeners
document.getElementById('courseSelect').addEventListener('change', function() {
    const selectedOption = this.selectedOptions[0];
    if (selectedOption.dataset.price) {
        document.getElementById('amount').value = selectedOption.dataset.price;
    }
});

document.getElementById('addPaymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('courseId', document.getElementById('courseSelect').value);
    await addManualPayment(formData);
});

document.getElementById('refreshPayments').addEventListener('click', loadRecentPayments);
document.getElementById('exportBtn').addEventListener('click', exportToCSV);

// Global function for viewing payment details
window.viewPayment = function(paymentId, collectionName = 'payments') {
    // Show detailed payment info
    db.collection(collectionName).doc(paymentId).get().then(doc => {
        if (doc.exists()) {
            const payment = doc.data();
            const details = JSON.stringify(payment, null, 2);
            alert(`Payment Details from ${collectionName}:\n\n${details}`);
        } else {
            alert('Payment not found');
        }
    }).catch(error => {
        console.error('Error fetching payment:', error);
        alert('Error fetching payment details');
    });
};

// Debug function to check all collections
window.debugCollections = async function() {
    console.log('=== FIREBASE COLLECTIONS DEBUG ===');
    
    // Check users collection
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        console.log(`users: ${usersSnapshot.size} documents`);
        
        if (usersSnapshot.size > 0) {
            const firstUser = usersSnapshot.docs[0];
            console.log(`Sample user:`, firstUser.data());
            
            // Check enrolled_courses subcollection
            try {
                const enrolledSnapshot = await getDocs(collection(db, 'users', firstUser.id, 'enrolled_courses'));
                console.log(`users/${firstUser.id}/enrolled_courses: ${enrolledSnapshot.size} documents`);
                
                if (enrolledSnapshot.size > 0) {
                    console.log(`Sample enrolled course:`, enrolledSnapshot.docs[0].data());
                }
            } catch (e) {
                console.log('No enrolled_courses subcollection found');
            }
        }
    } catch (e) {
        console.log('Users collection not accessible');
    }
    
    // Check other collections
    const otherCollections = ['enrollments', 'payments', 'courses'];
    for (const collectionName of otherCollections) {
        try {
            const snapshot = await getDocs(collection(db, collectionName));
            console.log(`${collectionName}: ${snapshot.size} documents`);
            
            if (snapshot.size > 0) {
                console.log(`Sample ${collectionName}:`, snapshot.docs[0].data());
            }
        } catch (e) {
            console.log(`${collectionName}: Not accessible`);
        }
    }
    
    console.log('=== END DEBUG ===');
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Payment Tracking Dashboard Loading...');
    
    // Add debug button
    const debugBtn = document.createElement('button');
    debugBtn.textContent = 'Debug Collections';
    debugBtn.className = 'btn btn-sm btn-warning';
    debugBtn.onclick = () => window.debugCollections();
    document.querySelector('.topbar').appendChild(debugBtn);
    
    await loadRevenueStats();
    await createRevenueChart();
    await createTopCoursesChart();
    await createPaymentMethodsChart();
    await loadRecentPayments();
    await loadCourses();
    
    console.log('Payment Tracking Dashboard Loaded');
});