import { db } from './firebase-config.js';
import { collection, getDocs, updateDoc, deleteDoc, doc, setDoc, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let editingId = null;
let exerciseCount = 0;

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

// Load Categories
async function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '<div class="col-12"><p class="text-center">Loading...</p></div>';
    
    try {
        const snapshot = await getDocs(collection(db, 'categories'));
        grid.innerHTML = '';
        
        if (snapshot.empty) {
            grid.innerHTML = '<div class="col-12"><p class="text-muted text-center">No categories found</p></div>';
            return;
        }
        
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        categories.sort((a, b) => a.order - b.order);
        
        // Load course counts for each category
        for (const category of categories) {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="course-card">
                    <h5>${category.name}</h5>
                    <p class="text-muted">ID: <code>${category.id}</code></p>
                    <p class="text-muted">Order: ${category.order || 0}</p>
                    <p class="text-muted" id="count-${category.id}"><span class="spinner-border spinner-border-sm"></span> Loading...</p>
                    <div class="course-actions">
                        <button class="btn btn-sm btn-info" onclick="viewCourses('${category.id}', '${category.name}')">
                            <i class="fas fa-book"></i> Courses
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="editCategory('${category.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCategory('${category.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(col);
            
            // Load course count async
            try {
                const q = query(collection(db, 'courses'), where('category', '==', category.id));
                const coursesSnapshot = await getDocs(q);
                console.log(`Category ${category.id} (${category.name}): ${coursesSnapshot.size} courses`);
                const countEl = document.getElementById(`count-${category.id}`);
                if (countEl) {
                    countEl.innerHTML = `<strong>${coursesSnapshot.size}</strong> courses`;
                }
            } catch (e) {
                console.error(`Error loading courses for ${category.id}:`, e);
                const countEl = document.getElementById(`count-${category.id}`);
                if (countEl) countEl.innerHTML = '0 courses';
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        grid.innerHTML = `<div class="col-12"><p class="text-danger">Error: ${error.message}</p></div>`;
    }
}

// Open Add Category
window.openAddCategory = function() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Add Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').disabled = false;
}

// Edit Category
window.editCategory = async function(categoryId) {
    editingId = categoryId;
    const categoryDoc = await getDocs(collection(db, 'categories'));
    const category = categoryDoc.docs.find(d => d.id === categoryId).data();
    
    document.getElementById('modalTitle').textContent = 'Edit Category';
    document.getElementById('categoryId').value = categoryId;
    document.getElementById('categoryId').disabled = true;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryOrder').value = category.order || 0;
    
    new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

// Save Category
window.saveCategory = async function() {
    const id = document.getElementById('categoryId').value.trim().toLowerCase().replace(/\s+/g, '_');
    const name = document.getElementById('categoryName').value.trim();
    const order = parseInt(document.getElementById('categoryOrder').value) || 0;
    
    if (!id || !name) {
        alert('Please fill in all fields');
        return;
    }
    
    const categoryData = {
        name: name,
        order: order
    };
    
    try {
        if (editingId) {
            await updateDoc(doc(db, 'categories', editingId), categoryData);
        } else {
            await setDoc(doc(db, 'categories', id), categoryData);
        }
        
        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
        document.getElementById('categoryId').disabled = false;
        loadCategories();
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Error saving category: ' + error.message);
    }
}

// Delete Category
window.deleteCategory = async function(categoryId) {
    if (!confirm('Delete this category? Courses with this category will still exist.')) return;
    
    try {
        await deleteDoc(doc(db, 'categories', categoryId));
        loadCategories();
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category');
    }
}

// View Courses
window.viewCourses = async function(categoryId, categoryName) {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = `
        <div class="col-12 mb-3">
            <button class="btn btn-secondary" onclick="location.reload()">
                <i class="fas fa-arrow-left me-2"></i>Back to Categories
            </button>
            <a href="courses.html" class="btn btn-primary ms-2">
                <i class="fas fa-plus me-2"></i>Add Course
            </a>
            <h5 class="mt-3">${categoryName} - Courses</h5>
        </div>
    `;
    
    try {
        const q = query(collection(db, 'courses'), where('category', '==', categoryId));
        console.log('Loading courses for category:', categoryId);
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML += '<div class="col-12"><p class="text-muted">No courses in this category</p></div>';
            return;
        }
        
        snapshot.forEach(doc => {
            const course = doc.data();
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="course-card">
                    ${course.imageUrl ? `<img src="${course.imageUrl}" alt="${course.title}" style="width:100%;height:150px;object-fit:cover;border-radius:8px;margin-bottom:10px;">` : ''}
                    <h5>${course.title}</h5>
                    <p class="text-muted small">${course.description || ''}</p>
                    <div class="mb-2">
                        <span class="course-badge badge-level">${course.difficulty || 'Beginner'}</span>
                        ${course.rating ? `<span class="course-badge" style="background:#fff3cd;color:#856404">⭐ ${course.rating}</span>` : ''}
                    </div>
                    <small class="text-muted">⏱️ ${course.duration || 0}h | 💰 ${course.price === 0 ? 'Free' : '₹' + course.price} | 📖 ${course.exercises?.length || 0} exercises</small>
                    <div class="course-actions mt-2">
                        <button class="btn btn-sm btn-warning" onclick="editCourse('${doc.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCourse('${doc.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });
    } catch (error) {
        console.error('Error loading courses:', error);
        grid.innerHTML += `<div class="col-12"><p class="text-danger">Error: ${error.message}</p></div>`;
    }
}

// Load Category Dropdown
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

// Edit Course
window.editCourse = async function(courseId) {
    try {
        const courseDoc = await getDocs(collection(db, 'courses'));
        const course = courseDoc.docs.find(d => d.id === courseId).data();
        
        document.getElementById('courseId').value = courseId;
        document.getElementById('courseTitle').value = course.title;
        document.getElementById('courseDescription').value = course.description || '';
        document.getElementById('courseCategory').value = course.category || '';
        document.getElementById('courseDifficulty').value = course.difficulty || 'Beginner';
        document.getElementById('courseDuration').value = course.duration || 5;
        document.getElementById('coursePrice').value = course.price || 0;
        document.getElementById('courseRating').value = course.rating || 5;
        document.getElementById('courseImage').value = course.imageUrl || '';
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
        
        await loadCategoryDropdown();
        document.getElementById('courseCategory').value = course.category || '';
        
        new bootstrap.Modal(document.getElementById('courseModal')).show();
    } catch (error) {
        console.error('Error loading course:', error);
        alert('Error loading course');
    }
}

// Save Course
window.saveCourse = async function() {
    const courseId = document.getElementById('courseId').value;
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
        learningObjectives: learningText ? learningText.split('\n').filter(l => l.trim()) : [],
        targetAudience: audienceText ? audienceText.split('\n').filter(a => a.trim()) : [],
        exercises: exercises,
        updatedAt: serverTimestamp()
    };
    
    try {
        await updateDoc(doc(db, 'courses', courseId), courseData);
        bootstrap.Modal.getInstance(document.getElementById('courseModal')).hide();
        alert('Course updated successfully!');
        // Reload current view
        const currentCategory = document.querySelector('.content-area h5')?.textContent.split(' - ')[0];
        if (currentCategory) {
            location.reload();
        }
    } catch (error) {
        console.error('Error saving course:', error);
        alert('Error saving course');
    }
}

// Delete Course
window.deleteCourse = async function(courseId) {
    if (!confirm('Delete this course?')) return;
    
    try {
        await deleteDoc(doc(db, 'courses', courseId));
        alert('Course deleted successfully!');
        location.reload();
    } catch (error) {
        console.error('Error deleting course:', error);
        alert('Error deleting course');
    }
}

// Initialize
loadCategories();
