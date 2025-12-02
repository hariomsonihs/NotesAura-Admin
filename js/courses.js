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
                </div>
                <small class="text-muted">⏱️ ${course.duration || 0}h | 💰 ${course.price === 0 ? 'Free' : '₹' + course.price} | 📖 ${course.exercises?.length || 0} exercises</small>
                <div class="course-actions">
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
        learningObjectives: learningText ? learningText.split('\n').filter(l => l.trim()) : [],
        targetAudience: audienceText ? audienceText.split('\n').filter(a => a.trim()) : [],
        exercises: exercises,
        updatedAt: serverTimestamp()
    };
    
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

// Initialize Auth Guard
initAuthGuard();

// Initialize
loadCourses();
loadCategoryDropdown();
loadCategoryFilter();
