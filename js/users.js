import { db } from './firebase-config.js';
import { initAuthGuard } from './auth-guard.js';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let allUsers = [];
let editingUserId = null;
let addingCourseUserId = null;
let allCourses = [];

// Load Users
async function loadUsers() {
    try {
        const snapshot = await getDocs(collection(db, 'users'));
        allUsers = [];
        snapshot.forEach(doc => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Display Users
function displayUsers(users) {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No users found</td></tr>';
        return;
    }
    
    users.forEach(async user => {
        const tr = document.createElement('tr');
        const joinedDate = user.joinDate ? new Date(user.joinDate.seconds * 1000).toLocaleDateString() : 'N/A';
        
        tr.innerHTML = `
            <td>
                <strong>${user.name || 'Unknown'}</strong>
                ${user.admin === 'yes' ? '<span class="badge bg-danger ms-1">Admin</span>' : ''}
            </td>
            <td>${user.email}</td>
            <td>${user.phone || 'N/A'}</td>
            <td>${user.premium ? '<span class="badge bg-warning">Premium</span>' : '<span class="badge bg-secondary">Free</span>'}</td>
            <td id="count-${user.uid}"><span class="spinner-border spinner-border-sm"></span></td>
            <td>${user.totalProgress || 0}%</td>
            <td>${joinedDate}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewUser('${user.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="editUser('${user.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
        
        // Load count async
        try {
            const enrolledSnapshot = await getDocs(collection(db, 'users', user.uid, 'enrolledCourses'));
            const countCell = document.getElementById(`count-${user.uid}`);
            if (countCell) {
                countCell.innerHTML = `<strong>${enrolledSnapshot.size}</strong> courses`;
            }
        } catch (e) {
            const countCell = document.getElementById(`count-${user.uid}`);
            if (countCell) {
                countCell.innerHTML = '0 courses';
            }
        }
    });
}

// View User Details
window.viewUser = async function(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const user = userDoc.data();
        
        const joinedDate = user.joinDate ? new Date(user.joinDate.seconds * 1000).toLocaleString() : 'N/A';
        
        // Load enrolledCourses subcollection
        let coursesHtml = '<p class="text-muted">No courses enrolled</p>';
        try {
            const enrolledCoursesSnapshot = await getDocs(collection(db, 'users', userId, 'enrolledCourses'));
            
            if (!enrolledCoursesSnapshot.empty) {
                coursesHtml = '<div class="list-group">';
                enrolledCoursesSnapshot.forEach(doc => {
                    const course = doc.data();
                    const enrollDate = course.enrollmentDate?.seconds ? new Date(course.enrollmentDate.seconds * 1000).toLocaleDateString() : 'N/A';
                    const lastAccessed = course.lastAccessed?.seconds ? new Date(course.lastAccessed.seconds * 1000).toLocaleDateString() : 'N/A';
                    const completedCount = Array.isArray(course.completedExercises) ? course.completedExercises.length : 0;
                    coursesHtml += `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <strong>${course.courseName || doc.id}</strong>
                                    <span class="badge bg-primary ms-2">${course.progressPercentage || 0}%</span>
                                    <br>
                                    <small class="text-muted">Category: ${course.category || 'N/A'}</small><br>
                                    <small class="text-muted">Completed: ${completedCount} exercises</small><br>
                                    <small class="text-muted">Enrolled: ${enrollDate}</small><br>
                                    <small class="text-muted">Last accessed: ${lastAccessed}</small><br>
                                    <small class="text-muted">Payment: ${course.paymentStatus || 'N/A'} (₹${course.amountPaid || 0})</small>
                                </div>
                                <button class="btn btn-sm btn-danger" onclick="removeCourse('${userId}', '${doc.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
                coursesHtml += '</div>';
            }
        } catch (error) {
            console.error('Error loading enrolledCourses:', error);
        }
        
        // Load bookmarked courses
        let bookmarksHtml = '<p class="text-muted">No favourite courses</p>';
        try {
            const bookmarksDoc = await getDoc(doc(db, 'user_bookmarks', user.uid || userId));
            
            if (bookmarksDoc.exists()) {
                const bookmarkData = bookmarksDoc.data();
                const bookmarkedCourses = bookmarkData.bookmarkedCourses || [];
                
                if (bookmarkedCourses.length > 0) {
                    // Load course details for bookmarked courses
                    const coursesSnapshot = await getDocs(collection(db, 'courses'));
                    const coursesMap = {};
                    coursesSnapshot.forEach(doc => {
                        coursesMap[doc.id] = doc.data();
                    });
                    
                    bookmarksHtml = '<div class="list-group">';
                    bookmarkedCourses.forEach(courseId => {
                        const course = coursesMap[courseId];
                        if (course) {
                            bookmarksHtml += `
                                <div class="list-group-item">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <strong>❤️ ${course.title}</strong>
                                            <br>
                                            <small class="text-muted">Category: ${course.category || 'N/A'}</small><br>
                                            <small class="text-muted">Price: ${course.price > 0 ? '₹' + course.price : 'Free'}</small>
                                        </div>
                                        <span class="badge bg-warning">Favourite</span>
                                    </div>
                                </div>
                            `;
                        }
                    });
                    bookmarksHtml += '</div>';
                }
            }
        } catch (error) {
            console.error('Error loading bookmarks:', error);
        }
        
        // Load user ratings
        let ratingsHtml = '<p class="text-muted">No ratings given</p>';
        try {
            const ratingsSnapshot = await getDocs(query(collection(db, 'course_ratings'), where('userId', '==', user.uid || userId)));
            
            if (!ratingsSnapshot.empty) {
                // Load course details for ratings
                const coursesSnapshot = await getDocs(collection(db, 'courses'));
                const coursesMap = {};
                coursesSnapshot.forEach(doc => {
                    coursesMap[doc.id] = doc.data();
                });
                
                ratingsHtml = '<div class="list-group">';
                ratingsSnapshot.forEach(doc => {
                    const rating = doc.data();
                    const course = coursesMap[rating.courseId];
                    const ratingDate = rating.timestamp ? new Date(rating.timestamp).toLocaleDateString() : 'N/A';
                    const stars = '⭐'.repeat(rating.rating || 0);
                    
                    ratingsHtml += `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <strong>${course ? course.title : 'Unknown Course'}</strong>
                                    <span class="ms-2">${stars} (${rating.rating}/5)</span>
                                    <br>
                                    ${rating.comment ? `<small class="text-muted">"${rating.comment}"</small><br>` : ''}
                                    <small class="text-muted">Rated on: ${ratingDate}</small>
                                </div>
                            </div>
                        </div>
                    `;
                });
                ratingsHtml += '</div>';
            }
        } catch (error) {
            console.error('Error loading ratings:', error);
        }
        
        // Load payments subcollection
        let paymentsHtml = '<p class="text-muted">No payments</p>';
        try {
            const paymentsSnapshot = await getDocs(collection(db, 'users', userId, 'payments'));
            
            if (!paymentsSnapshot.empty) {
                paymentsHtml = '<div class="list-group">';
                paymentsSnapshot.forEach(doc => {
                    const payment = doc.data();
                    const paymentDate = payment.paymentDate?.seconds ? new Date(payment.paymentDate.seconds * 1000).toLocaleString() : 'N/A';
                    const statusBadge = payment.status === 'SUCCESS' ? 'bg-success' : payment.status === 'PENDING' ? 'bg-warning' : 'bg-danger';
                    paymentsHtml += `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between">
                                <strong>${payment.courseTitle || 'N/A'}</strong>
                                <span class="badge ${statusBadge}">${payment.status}</span>
                            </div>
                            <small class="text-muted">Amount: ₹${payment.amount || 0}</small><br>
                            <small class="text-muted">Transaction ID: ${payment.transactionId || doc.id}</small><br>
                            <small class="text-muted">Date: ${paymentDate}</small>
                        </div>
                    `;
                });
                paymentsHtml += '</div>';
            }
        } catch (error) {
            console.error('Error loading payments:', error);
        }
        
        // Load quiz progress
        let quizProgressHtml = '<p class="text-muted">No quizzes completed</p>';
        let quizCount = 0;
        try {
            const quizProgressSnapshot = await getDocs(query(collection(db, 'quiz_progress'), where('userId', '==', user.uid || userId)));
            
            if (!quizProgressSnapshot.empty) {
                quizCount = quizProgressSnapshot.size;
                quizProgressHtml = '<div class="list-group">';
                quizProgressSnapshot.forEach(doc => {
                    const progress = doc.data();
                    const completedDate = progress.completedAt?.seconds ? new Date(progress.completedAt.seconds * 1000).toLocaleDateString() : 
                                         progress.completedAt ? new Date(progress.completedAt).toLocaleDateString() : 'N/A';
                    const percentage = progress.percentage || 0;
                    const badgeColor = percentage >= 90 ? 'bg-success' : percentage >= 75 ? 'bg-primary' : percentage >= 60 ? 'bg-info' : 'bg-warning';
                    
                    quizProgressHtml += `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <strong>${progress.quizSetName || 'Unknown Quiz'}</strong>
                                    <span class="badge ${badgeColor} ms-2">${percentage}%</span>
                                    <br>
                                    <small class="text-muted">Category: ${progress.categoryName || 'N/A'} • ${progress.subcategoryName || 'N/A'}</small><br>
                                    <small class="text-muted">Score: ${progress.correctAnswers || 0}/${progress.totalQuestions || 0}</small><br>
                                    <small class="text-muted">Completed: ${completedDate}</small>
                                </div>
                                <button class="btn btn-sm btn-danger" onclick="resetQuizProgress('${userId}', '${doc.id}', '${progress.quizSetName}')" title="Reset Quiz">
                                    <i class="fas fa-redo"></i> Reset
                                </button>
                            </div>
                        </div>
                    `;
                });
                quizProgressHtml += '</div>';
            }
        } catch (error) {
            console.error('Error loading quiz progress:', error);
        }
        
        const details = document.getElementById('userDetails');
        details.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6>Personal Info</h6>
                    <p><strong>Name:</strong> ${user.name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                    <p><strong>UID:</strong> ${user.uid || userId}</p>
                </div>
                <div class="col-md-6">
                    <h6>Account Info</h6>
                    <p><strong>Admin:</strong> ${user.admin === 'yes' ? '<span class="badge bg-danger">Yes</span>' : 'No'}</p>
                    <p><strong>Premium:</strong> ${user.premium ? '<span class="badge bg-warning">Yes</span>' : 'No'}</p>
                    <p><strong>Total Progress:</strong> ${user.totalProgress || 0}%</p>
                    <p><strong>Quizzes Completed:</strong> ${quizCount}</p>
                    <p><strong>Joined:</strong> ${joinedDate}</p>
                </div>
            </div>
            <hr>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">Enrolled Courses</h6>
                <button class="btn btn-sm btn-success" onclick="showAddCourseModal('${userId}')">
                    <i class="fas fa-plus me-1"></i>Add Course
                </button>
            </div>
            ${coursesHtml}
            <hr class="mt-3">
            <h6>❤️ Favourite Courses</h6>
            ${bookmarksHtml}
            <hr class="mt-3">
            <h6>⭐ Course Ratings</h6>
            ${ratingsHtml}
            <hr class="mt-3">
            <h6>📊 Quiz Progress</h6>
            ${quizProgressHtml}
            <hr class="mt-3">
            <h6>Payment History</h6>
            ${paymentsHtml}
        `;
        
        new bootstrap.Modal(document.getElementById('userModal')).show();
    } catch (error) {
        console.error('Error loading user details:', error);
    }
}

// Edit User
window.editUser = async function(userId) {
    editingUserId = userId;
    const user = allUsers.find(u => u.id === userId);
    
    document.getElementById('editUserName').value = user.name || '';
    document.getElementById('editUserPhone').value = user.phone || '';
    document.getElementById('editUserAdmin').value = user.admin || 'no';
    document.getElementById('editUserPremium').checked = user.premium || false;
    
    new bootstrap.Modal(document.getElementById('editUserModal')).show();
}

// Save User
window.saveUser = async function() {
    try {
        await updateDoc(doc(db, 'users', editingUserId), {
            name: document.getElementById('editUserName').value,
            phone: document.getElementById('editUserPhone').value,
            admin: document.getElementById('editUserAdmin').value,
            premium: document.getElementById('editUserPremium').checked
        });
        
        bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
        loadUsers();
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Error updating user');
    }
}

// Delete User
window.deleteUser = async function(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        await deleteDoc(doc(db, 'users', userId));
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user');
    }
}

// Remove Course from User
window.removeCourse = async function(userId, courseId) {
    if (!confirm('Remove this course from user?')) return;
    
    try {
        await deleteDoc(doc(db, 'users', userId, 'enrolledCourses', courseId));
        alert('Course removed successfully');
        viewUser(userId);
    } catch (error) {
        console.error('Error removing course:', error);
        alert('Error removing course');
    }
}

// Search Users
document.getElementById('searchInput').addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    const filtered = allUsers.filter(user => 
        (user.name && user.name.toLowerCase().includes(search)) ||
        user.email.toLowerCase().includes(search)
    );
    displayUsers(filtered);
});

// Show Add Course Modal
window.showAddCourseModal = async function(userId) {
    addingCourseUserId = userId;
    await loadAvailableCourses();
    new bootstrap.Modal(document.getElementById('addCourseModal')).show();
}

// Load Available Courses
async function loadAvailableCourses() {
    try {
        const snapshot = await getDocs(collection(db, 'courses'));
        allCourses = [];
        snapshot.forEach(doc => {
            allCourses.push({ id: doc.id, ...doc.data() });
        });
        displayCourses(allCourses);
    } catch (error) {
        console.error('Error loading courses:', error);
        document.getElementById('coursesList').innerHTML = '<p class="text-danger">Error loading courses</p>';
    }
}

// Display Courses
function displayCourses(courses) {
    const coursesList = document.getElementById('coursesList');
    
    if (courses.length === 0) {
        coursesList.innerHTML = '<p class="text-muted">No courses found</p>';
        return;
    }
    
    let html = '<div class="list-group">';
    courses.forEach(course => {
        const price = course.price || 0;
        const category = course.category || 'General';
        html += `
            <div class="list-group-item list-group-item-action" onclick="addCourseToUser('${course.id}', '${course.title}', '${category}', ${price})">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${course.title}</h6>
                        <p class="mb-1 text-muted">${course.description || 'No description'}</p>
                        <small class="text-muted">Category: ${category}</small>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-primary">${price > 0 ? '₹' + price : 'Free'}</span>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    coursesList.innerHTML = html;
}

// Add Course to User
window.addCourseToUser = async function(courseId, courseName, category, price) {
    try {
        const enrollmentData = {
            courseId: courseId,
            courseName: courseName,
            category: category,
            enrollmentDate: new Date(),
            progressPercentage: 0,
            paymentStatus: price > 0 ? 'ADMIN_ADDED' : 'FREE',
            amountPaid: 0,
            completedExercises: []
        };
        
        await setDoc(doc(db, 'users', addingCourseUserId, 'enrolledCourses', courseId), enrollmentData);
        
        bootstrap.Modal.getInstance(document.getElementById('addCourseModal')).hide();
        alert('Course added successfully!');
        viewUser(addingCourseUserId);
    } catch (error) {
        console.error('Error adding course:', error);
        alert('Error adding course');
    }
}

// Search Courses
document.getElementById('courseSearchInput').addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    const filtered = allCourses.filter(course => 
        (course.title && course.title.toLowerCase().includes(search)) ||
        (course.category && course.category.toLowerCase().includes(search))
    );
    displayCourses(filtered);
});

// Reset Quiz Progress
window.resetQuizProgress = async function(userId, progressDocId, quizName) {
    if (!confirm(`Are you sure you want to reset "${quizName}" for this user?\n\nThis will allow them to retake the quiz.`)) return;
    
    try {
        await deleteDoc(doc(db, 'quiz_progress', progressDocId));
        alert('Quiz progress reset successfully!');
        viewUser(userId);
    } catch (error) {
        console.error('Error resetting quiz progress:', error);
        alert('Error resetting quiz progress: ' + error.message);
    }
}

// Initialize Auth Guard
initAuthGuard();

// Initialize
loadUsers();
