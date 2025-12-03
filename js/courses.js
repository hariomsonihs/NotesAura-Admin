import { db } from './firebase-config.js';
import { initAuthGuard } from './auth-guard.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';



let allCourses = [];
let editingCourseId = null;
let exerciseCount = 0;

// Load Categories for Dropdown
async function loadCategoryDropdown() {
    try {
        const snapshot = await getDocs(collection(db, 'categories'));
        const select = document.getElementById('courseCategory');
        select.innerHTML = '<option value="">Select Category</option>';
        
        snapshot.forEach(doc => {
            const category = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
        
        // Add change listener to update order info
        select.addEventListener('change', updateOrderInfo);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load Courses
async function loadCourses() {
    try {
        const snapshot = await getDocs(collection(db, 'courses'));
        allCourses = [];
        snapshot.forEach(doc => {
            allCourses.push({ id: doc.id, ...doc.data() });
        });
        displayCourses(allCourses);
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// Display Courses
function displayCourses(courses) {
    const grid = document.getElementById('coursesGrid');
    grid.innerHTML = '';
    
    if (courses.length === 0) {
        grid.innerHTML = '<div class="col-12"><p class="text-muted text-center">No courses found</p></div>';
        return;
    }
    
    // Sort courses by global order, then by title
    courses.sort((a, b) => {
        const globalOrderA = a.globalOrder || 0;
        const globalOrderB = b.globalOrder || 0;
        if (globalOrderA !== globalOrderB) {
            return globalOrderA - globalOrderB;
        }
        return a.title.localeCompare(b.title);
    });
    
    courses.forEach(course => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.innerHTML = `
            <div class="course-card">
                ${course.imageUrl ? `<img src="${course.imageUrl}" alt="${course.title}">` : ''}
                <h5>${course.title}</h5>
                <p>${course.description || ''}</p>
                <div class="mb-2">
                    <span class="course-badge badge-category">${course.category}</span>
                    <span class="course-badge badge-level">${course.difficulty || 'Beginner'}</span>
                    ${course.featured ? `<span class="course-badge" style="background:#ffd700;color:#000">⭐ Featured</span>` : ''}
                    ${course.rating ? `<span class="course-badge" style="background:#fff3cd;color:#856404">⭐ ${course.rating}</span>` : ''}
                    <span class="course-badge" style="background:#e9ecef;color:#495057">Global: ${course.globalOrder || course.order || 0}</span>
                    <span class="course-badge" style="background:#f8f9fa;color:#495057">Category: ${course.categoryOrder || course.order || 0}</span>
                </div>
                <small class="text-muted">⏱️ ${course.duration || 0}h | 💰 ${course.price === 0 ? 'Free' : '₹' + course.price} | 📖 ${course.exercises?.length || 0} exercises</small>
                <div class="course-actions">
                    ${(course.globalOrder === 0 && course.categoryOrder === 0) ? 
                        `<button class="btn btn-sm btn-warning" onclick="quickFixOrder('${course.id}')">
                            <i class="fas fa-magic"></i> Fix Order
                        </button>` : ''}
                    <button class="btn btn-sm btn-info" onclick="viewCourseRatings('${course.id}')">
                        <i class="fas fa-star"></i> Ratings
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="editCourse('${course.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCourse('${course.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

// Add Exercise Field
window.addExerciseField = function() {
    exerciseCount++;
    const container = document.getElementById('exercisesList');
    const div = document.createElement('div');
    div.className = 'card mb-2 p-3';
    div.id = `exercise-${exerciseCount}`;
    div.innerHTML = `
        <div class="d-flex justify-content-between mb-2">
            <strong>Exercise ${exerciseCount}</strong>
            <button type="button" class="btn btn-sm btn-danger" onclick="removeExercise(${exerciseCount})">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <input type="text" class="form-control form-control-sm mb-2" placeholder="Exercise ID (e.g., e1)" data-field="id">
        <input type="text" class="form-control form-control-sm mb-2" placeholder="Title" data-field="title">
        <input type="text" class="form-control form-control-sm mb-2" placeholder="Description" data-field="description">
        <input type="url" class="form-control form-control-sm mb-2" placeholder="Content URL" data-field="contentPath">
        <input type="text" class="form-control form-control-sm" placeholder="Course ID" data-field="courseId">
    `;
    container.appendChild(div);
}

// Remove Exercise
window.removeExercise = function(id) {
    document.getElementById(`exercise-${id}`).remove();
}

// Open Add Course Modal
window.openAddCourse = function() {
    editingCourseId = null;
    exerciseCount = 0;
    document.getElementById('modalTitle').textContent = 'Add Course';
    document.getElementById('courseForm').reset();
    document.getElementById('exercisesList').innerHTML = '';
    
    // Auto-fill with next available orders
    setTimeout(() => {
        autoFillOrders();
    }, 100);
}

// Quick fix for zero orders
window.quickFixOrder = function(courseId) {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;
    
    const globalOrder = allCourses.length;
    const categoryOrder = allCourses.filter(c => c.category === course.category).length;
    
    const updateData = {
        globalOrder: globalOrder,
        categoryOrder: categoryOrder
    };
    
    updateDoc(doc(db, 'courses', courseId), updateData)
        .then(() => {
            console.log(`Fixed orders for ${course.title}`);
            loadCourses();
        })
        .catch(error => console.error('Error fixing order:', error));
}

// Edit Course
window.editCourse = function(courseId) {
    editingCourseId = courseId;
    const course = allCourses.find(c => c.id === courseId);
    
    document.getElementById('modalTitle').textContent = 'Edit Course';
    document.getElementById('courseTitle').value = course.title;
    document.getElementById('courseDescription').value = course.description || '';
    document.getElementById('courseCategory').value = course.category || '';
    document.getElementById('courseDifficulty').value = course.difficulty || 'Beginner';
    document.getElementById('courseDuration').value = course.duration || 5;
    document.getElementById('coursePrice').value = course.price || 0;
    document.getElementById('courseRating').value = course.rating || 5;
    document.getElementById('courseImage').value = course.imageUrl || '';
    document.getElementById('courseFeatured').checked = course.featured || false;
    document.getElementById('featuredOrder').value = course.featuredOrder || 0;
    document.getElementById('globalOrder').value = course.globalOrder || course.order || 0;
    document.getElementById('categoryOrder').value = course.categoryOrder || course.order || 0;
    
    // Update order info after loading values
    setTimeout(() => {
        updateOrderInfo();
    }, 100);
    document.getElementById('courseLearning').value = course.learningObjectives ? course.learningObjectives.join('\n') : '';
    document.getElementById('courseAudience').value = course.targetAudience ? course.targetAudience.join('\n') : '';
    
    // Load exercises
    exerciseCount = 0;
    document.getElementById('exercisesList').innerHTML = '';
    if (course.exercises && course.exercises.length > 0) {
        course.exercises.forEach(ex => {
            exerciseCount++;
            const container = document.getElementById('exercisesList');
            const div = document.createElement('div');
            div.className = 'card mb-2 p-3';
            div.id = `exercise-${exerciseCount}`;
            div.innerHTML = `
                <div class="d-flex justify-content-between mb-2">
                    <strong>Exercise ${exerciseCount}</strong>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeExercise(${exerciseCount})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <input type="text" class="form-control form-control-sm mb-2" placeholder="Exercise ID" data-field="id" value="${ex.id || ''}">
                <input type="text" class="form-control form-control-sm mb-2" placeholder="Title" data-field="title" value="${ex.title || ''}">
                <input type="text" class="form-control form-control-sm mb-2" placeholder="Description" data-field="description" value="${ex.description || ''}">
                <input type="url" class="form-control form-control-sm mb-2" placeholder="Content URL" data-field="contentPath" value="${ex.contentPath || ''}">
                <input type="text" class="form-control form-control-sm" placeholder="Course ID" data-field="courseId" value="${ex.courseId || ''}">
            `;
            container.appendChild(div);
        });
    }
    
    new bootstrap.Modal(document.getElementById('courseModal')).show();
}

// Save Course
window.saveCourse = async function() {
    const learningText = document.getElementById('courseLearning').value;
    const audienceText = document.getElementById('courseAudience').value;
    
    // Collect exercises
    const exercises = [];
    const exerciseDivs = document.querySelectorAll('#exercisesList .card');
    exerciseDivs.forEach(div => {
        const exercise = {};
        div.querySelectorAll('input').forEach(input => {
            const field = input.getAttribute('data-field');
            const value = input.value.trim();
            if (value) exercise[field] = value;
        });
        if (Object.keys(exercise).length > 0) exercises.push(exercise);
    });
    
    const globalOrder = parseInt(document.getElementById('globalOrder').value) || 0;
    const categoryOrder = parseInt(document.getElementById('categoryOrder').value) || 0;
    
    const courseData = {
        title: document.getElementById('courseTitle').value,
        description: document.getElementById('courseDescription').value,
        category: document.getElementById('courseCategory').value,
        difficulty: document.getElementById('courseDifficulty').value,
        duration: parseInt(document.getElementById('courseDuration').value),
        price: parseInt(document.getElementById('coursePrice').value),
        rating: parseFloat(document.getElementById('courseRating').value),
        imageUrl: document.getElementById('courseImage').value,
        featured: document.getElementById('courseFeatured').checked,
        featuredOrder: parseInt(document.getElementById('featuredOrder').value) || 0,
        globalOrder: globalOrder,
        categoryOrder: categoryOrder,
        learningObjectives: learningText ? learningText.split('\n').filter(l => l.trim()) : [],
        targetAudience: audienceText ? audienceText.split('\n').filter(a => a.trim()) : [],
        exercises: exercises,
        updatedAt: serverTimestamp()
    };
    
    console.log('Saving course with orders:', {
        title: courseData.title,
        globalOrder: globalOrder,
        categoryOrder: categoryOrder,
        category: courseData.category
    });
    
    try {
        if (editingCourseId) {
            await updateDoc(doc(db, 'courses', editingCourseId), courseData);
        } else {
            courseData.createdAt = serverTimestamp();
            const docRef = await addDoc(collection(db, 'courses'), courseData);
            
            // Send notification for new course to all users
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const notificationPromises = [];
            
            console.log('Sending notification for course ID:', docRef.id);
            
            usersSnapshot.forEach(userDoc => {
                const notificationData = {
                    userId: userDoc.id,
                    title: 'New Course Added!',
                    message: `Check out the new course: ${courseData.title}`,
                    type: 'course',
                    targetId: docRef.id,
                    imageUrl: courseData.imageUrl || '',
                    timestamp: Date.now(),
                    isRead: false
                };
                
                console.log('Notification data:', notificationData);
                
                notificationPromises.push(
                    addDoc(collection(db, 'app_notifications'), notificationData)
                );
            });
            
            await Promise.all(notificationPromises);
            console.log(`Course notification sent to ${notificationPromises.length} users`);
        }
        
        bootstrap.Modal.getInstance(document.getElementById('courseModal')).hide();
        loadCourses();
    } catch (error) {
        console.error('Error saving course:', error);
        alert('Error saving course');
    }
}

// Delete Course
window.deleteCourse = async function(courseId) {
    if (!confirm('Are you sure you want to delete this course?')) return;
    
    try {
        await deleteDoc(doc(db, 'courses', courseId));
        loadCourses();
    } catch (error) {
        console.error('Error deleting course:', error);
        alert('Error deleting course');
    }
}

// Load Category Filter
async function loadCategoryFilter() {
    try {
        const snapshot = await getDocs(collection(db, 'categories'));
        const select = document.getElementById('categoryFilter');
        select.innerHTML = '<option value="">All Categories</option>';
        
        snapshot.forEach(doc => {
            const category = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading category filter:', error);
    }
}

// Search and Filter
document.getElementById('searchInput').addEventListener('input', filterCourses);
document.getElementById('categoryFilter').addEventListener('change', filterCourses);

function filterCourses() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    
    let filtered = allCourses.filter(course => {
        const matchSearch = course.title.toLowerCase().includes(search) || 
                          (course.description && course.description.toLowerCase().includes(search));
        const matchCategory = !category || course.category === category;
        
        return matchSearch && matchCategory;
    });
    
    displayCourses(filtered);
}

// Auto-fill Orders
window.autoFillOrders = async function() {
    const category = document.getElementById('courseCategory').value;
    if (!category) {
        alert('Please select a category first');
        return;
    }
    
    try {
        // Get highest global order + 1
        const maxGlobalOrder = Math.max(...allCourses.map(c => c.globalOrder || 0), -1);
        document.getElementById('globalOrder').value = maxGlobalOrder + 1;
        
        // Get highest category order + 1 for this category
        const categoryCoursesOrders = allCourses
            .filter(c => c.category === category)
            .map(c => c.categoryOrder || 0);
        const maxCategoryOrder = Math.max(...categoryCoursesOrders, -1);
        document.getElementById('categoryOrder').value = maxCategoryOrder + 1;
        
        // Update order info
        updateOrderInfo();
        
        console.log('Auto-filled orders:', {
            category: category,
            globalOrder: maxGlobalOrder + 1,
            categoryOrder: maxCategoryOrder + 1
        });
        
    } catch (error) {
        console.error('Error auto-filling orders:', error);
    }
}

// Migrate existing courses to new ordering system
window.migrateOrderingSystem = async function() {
    if (!confirm('This will assign sequential order numbers to all courses. Continue?')) return;
    
    try {
        const snapshot = await getDocs(collection(db, 'courses'));
        const courses = [];
        
        // Collect all courses
        snapshot.forEach(doc => {
            courses.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by title for consistent ordering
        courses.sort((a, b) => a.title.localeCompare(b.title));
        
        // Group by category for category ordering
        const categoryGroups = {};
        courses.forEach(course => {
            if (!categoryGroups[course.category]) {
                categoryGroups[course.category] = [];
            }
            categoryGroups[course.category].push(course);
        });
        
        const updatePromises = [];
        let globalOrderCounter = 0;
        
        // Assign orders
        courses.forEach((course, index) => {
            const categoryOrder = categoryGroups[course.category].indexOf(course);
            
            const updateData = {
                globalOrder: globalOrderCounter++,
                categoryOrder: categoryOrder
            };
            
            console.log(`${course.title}: Global=${updateData.globalOrder}, Category=${updateData.categoryOrder}`);
            updatePromises.push(updateDoc(doc(db, 'courses', course.id), updateData));
        });
        
        await Promise.all(updatePromises);
        alert(`Updated ${updatePromises.length} courses with sequential ordering`);
        loadCourses();
    } catch (error) {
        console.error('Migration error:', error);
        alert('Migration failed: ' + error.message);
    }
}

// Update Order Info
window.updateOrderInfo = function() {
    const globalOrder = parseInt(document.getElementById('globalOrder').value) || 0;
    const categoryOrder = parseInt(document.getElementById('categoryOrder').value) || 0;
    const category = document.getElementById('courseCategory').value;
    
    // Check global order availability
    const globalOrderTaken = allCourses.find(c => c.globalOrder === globalOrder && c.id !== editingCourseId);
    const globalInfo = document.getElementById('globalOrderInfo');
    if (globalOrderTaken) {
        globalInfo.innerHTML = `<small class="text-danger">⚠️ Used by: ${globalOrderTaken.title}</small>`;
    } else {
        globalInfo.innerHTML = `<small class="text-success">✅ Available</small>`;
    }
    
    // Check category order availability
    if (category) {
        const categoryOrderTaken = allCourses.find(c => 
            c.categoryOrder === categoryOrder && 
            c.category === category && 
            c.id !== editingCourseId
        );
        const categoryInfo = document.getElementById('categoryOrderInfo');
        if (categoryOrderTaken) {
            categoryInfo.innerHTML = `<small class="text-danger">⚠️ Used by: ${categoryOrderTaken.title}</small>`;
        } else {
            categoryInfo.innerHTML = `<small class="text-success">✅ Available</small>`;
        }
    }
}

// Show Order Summary
window.showOrderSummary = function() {
    const category = document.getElementById('courseCategory').value;
    
    let summary = '<div class="row">';
    
    // Global orders
    const globalOrders = allCourses.map(c => ({ order: c.globalOrder, title: c.title })).sort((a, b) => a.order - b.order);
    summary += '<div class="col-md-6"><h6>🌐 Global Orders:</h6><ul class="list-unstyled" style="max-height:200px;overflow-y:auto;">';
    globalOrders.forEach(item => {
        summary += `<li><span class="badge bg-primary">${item.order}</span> ${item.title}</li>`;
    });
    summary += '</ul></div>';
    
    // Category orders
    if (category) {
        const categoryOrders = allCourses
            .filter(c => c.category === category)
            .map(c => ({ order: c.categoryOrder, title: c.title }))
            .sort((a, b) => a.order - b.order);
        summary += `<div class="col-md-6"><h6>📋 ${category} Orders:</h6><ul class="list-unstyled" style="max-height:200px;overflow-y:auto;">`;
        categoryOrders.forEach(item => {
            summary += `<li><span class="badge bg-secondary">${item.order}</span> ${item.title}</li>`;
        });
        summary += '</ul></div>';
    } else {
        summary += '<div class="col-md-6"><p class="text-muted">Select a category to see category orders</p></div>';
    }
    
    summary += '</div>';
    
    // Show in alert
    const alertDiv = document.createElement('div');
    alertDiv.innerHTML = `
        <div class="modal fade" id="orderSummaryModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">📊 Order Summary</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">${summary}</div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(alertDiv);
    new bootstrap.Modal(document.getElementById('orderSummaryModal')).show();
}

// Initialize Auth Guard
initAuthGuard();

// View Course Ratings
window.viewCourseRatings = async function(courseId) {
    try {
        const course = allCourses.find(c => c.id === courseId);
        const ratingsSnapshot = await getDocs(collection(db, 'course_ratings'));
        
        let courseRatings = [];
        ratingsSnapshot.forEach(doc => {
            const rating = doc.data();
            if (rating.courseId === courseId) {
                courseRatings.push(rating);
            }
        });
        
        // Sort by timestamp (newest first)
        courseRatings.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        let ratingsHtml = '<p class="text-muted">No ratings yet</p>';
        
        if (courseRatings.length > 0) {
            const avgRating = (courseRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / courseRatings.length).toFixed(1);
            
            ratingsHtml = `
                <div class="mb-3">
                    <h6>Average Rating: <span class="badge bg-warning">${'⭐'.repeat(Math.round(avgRating))} ${avgRating}/5</span></h6>
                    <small class="text-muted">Based on ${courseRatings.length} rating(s)</small>
                </div>
                <div style="max-height: 400px; overflow-y: auto;">
            `;
            
            courseRatings.forEach(rating => {
                const ratingDate = rating.timestamp ? new Date(rating.timestamp).toLocaleDateString() : 'N/A';
                const stars = '⭐'.repeat(rating.rating || 0);
                
                ratingsHtml += `
                    <div class="card mb-2">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <strong>${rating.userName || 'Anonymous'}</strong>
                                <span class="badge bg-primary">${stars} ${rating.rating}/5</span>
                            </div>
                            ${rating.comment ? `<p class="mb-1">${rating.comment}</p>` : ''}
                            <small class="text-muted">Rated on: ${ratingDate}</small>
                        </div>
                    </div>
                `;
            });
            
            ratingsHtml += '</div>';
        }
        
        // Show in modal
        const modalHtml = `
            <div class="modal fade" id="ratingsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">⭐ Ratings for ${course ? course.title : 'Course'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">${ratingsHtml}</div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('ratingsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('ratingsModal')).show();
        
    } catch (error) {
        console.error('Error loading ratings:', error);
        alert('Error loading ratings');
    }
}

// Initialize
loadCourses();
loadCategoryDropdown();
loadCategoryFilter();
