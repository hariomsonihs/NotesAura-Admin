import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentCategoryId = null;
let currentListId = null;
let editingId = null;

// Load Categories
window.loadCategories = async function() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '<div class="col-12"><p class="text-center">Loading...</p></div>';
    
    try {
        const snapshot = await getDocs(collection(db, 'practice_categories'));
        grid.innerHTML = '';
        
        console.log('Categories found:', snapshot.size);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div class="col-12"><p class="text-muted text-center">No categories found</p></div>';
            return;
        }
        
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        categories.sort((a, b) => a.order - b.order);
        
        categories.forEach(category => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="practice-card" style="border-left: 4px solid ${category.color || '#2196F3'}">
                    <h5>${category.name}</h5>
                    <p class="text-muted">Order: ${category.order}</p>
                    <div class="course-actions">
                        <button class="btn btn-sm btn-info" onclick="viewLists('${category.id}', '${category.name}')">
                            <i class="fas fa-list"></i> Lists
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
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        grid.innerHTML = `<div class="col-12"><p class="text-danger">Error: ${error.message}</p></div>`;
    }
}

// Open Add Category
window.openAddCategory = function() {
    editingId = null;
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryColor').value = '#2196F3';
}

// Edit Category
window.editCategory = async function(categoryId) {
    editingId = categoryId;
    const categoryDoc = await getDocs(collection(db, 'practice_categories'));
    const category = categoryDoc.docs.find(d => d.id === categoryId).data();
    
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryId').value = categoryId;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryColor').value = category.color;
    document.getElementById('categoryOrder').value = category.order;
    
    new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

// Save Category
window.saveCategory = async function() {
    const name = document.getElementById('categoryName').value;
    const color = document.getElementById('categoryColor').value;
    const order = parseInt(document.getElementById('categoryOrder').value);
    
    const categoryData = {
        name: name,
        color: color,
        order: order,
        iconUrl: ''
    };
    
    try {
        if (editingId) {
            await updateDoc(doc(db, 'practice_categories', editingId), categoryData);
        } else {
            const id = name.toLowerCase().replace(/\s+/g, '_') + '_practice';
            categoryData.id = id;
            await setDoc(doc(db, 'practice_categories', id), categoryData);
        }
        
        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
        loadCategories();
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Error saving category');
    }
}

// Delete Category
window.deleteCategory = async function(categoryId) {
    if (!confirm('Delete this category and all its lists?')) return;
    
    try {
        await deleteDoc(doc(db, 'practice_categories', categoryId));
        loadCategories();
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category');
    }
}

// View Lists
window.viewLists = async function(categoryId, categoryName) {
    currentCategoryId = categoryId;
    
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = `
        <div class="col-12 mb-3">
            <button class="btn btn-secondary" onclick="loadCategories()">
                <i class="fas fa-arrow-left me-2"></i>Back to Categories
            </button>
            <button class="btn btn-primary ms-2" onclick="openAddList('${categoryId}')">
                <i class="fas fa-plus me-2"></i>Add List
            </button>
            <h5 class="mt-3">${categoryName} - Practice Lists</h5>
        </div>
    `;
    
    try {
        // Lists are in separate collection with categoryId field
        const q = query(collection(db, 'practice_lists'), where('categoryId', '==', categoryId));
        const snapshot = await getDocs(q);
        
        console.log('Lists found for', categoryId, ':', snapshot.size);
        
        if (snapshot.empty) {
            grid.innerHTML += '<div class="col-12"><p class="text-muted">No lists found</p></div>';
            return;
        }
        
        const lists = [];
        snapshot.forEach(doc => {
            lists.push({ id: doc.id, ...doc.data() });
        });
        
        lists.sort((a, b) => a.order - b.order);
        
        lists.forEach(list => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="practice-card">
                    <h5>${list.name}</h5>
                    <p class="text-muted">${list.description || ''}</p>
                    <p class="text-muted">Order: ${list.order}</p>
                    <div class="course-actions">
                        <button class="btn btn-sm btn-info" onclick="viewExercises('${categoryId}', '${list.id}', '${list.name}')">
                            <i class="fas fa-dumbbell"></i> Exercises
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="editList('${categoryId}', '${list.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteList('${categoryId}', '${list.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(col);  
        });
    } catch (error) {
        console.error('Error loading lists:', error);
        grid.innerHTML += `<div class="col-12"><p class="text-danger">Error: ${error.message}</p></div>`;
    }
}

// Open Add List
window.openAddList = function(categoryId) {
    editingId = null;
    currentCategoryId = categoryId;
    document.getElementById('listModalTitle').textContent = 'Add Practice List';
    document.getElementById('listForm').reset();
    document.getElementById('listCategoryId').value = categoryId;
    
    new bootstrap.Modal(document.getElementById('listModal')).show();
}

// Edit List
window.editList = async function(categoryId, listId) {
    editingId = listId;
    currentCategoryId = categoryId;
    
    const listDoc = await getDocs(collection(db, 'practice_lists'));
    const list = listDoc.docs.find(d => d.id === listId).data();
    
    document.getElementById('listModalTitle').textContent = 'Edit Practice List';
    document.getElementById('listCategoryId').value = categoryId;
    document.getElementById('listId').value = listId;
    document.getElementById('listName').value = list.name;
    document.getElementById('listDescription').value = list.description || '';
    document.getElementById('listOrder').value = list.order;
    
    new bootstrap.Modal(document.getElementById('listModal')).show();
}

// Save List
window.saveList = async function() {
    const categoryId = document.getElementById('listCategoryId').value;
    const name = document.getElementById('listName').value;
    const description = document.getElementById('listDescription').value;
    const order = parseInt(document.getElementById('listOrder').value);
    
    const listData = {
        name: name,
        description: description,
        order: order,
        categoryId: categoryId
    };
    
    try {
        if (editingId) {
            await updateDoc(doc(db, 'practice_lists', editingId), listData);
        } else {
            const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
            listData.id = id;
            await setDoc(doc(db, 'practice_lists', id), listData);
        }
        
        bootstrap.Modal.getInstance(document.getElementById('listModal')).hide();
        viewLists(categoryId, '');
    } catch (error) {
        console.error('Error saving list:', error);
        alert('Error saving list');
    }
}

// Delete List
window.deleteList = async function(categoryId, listId) {
    if (!confirm('Delete this list and all its exercises?')) return;
    
    try {
        await deleteDoc(doc(db, 'practice_lists', listId));
        viewLists(categoryId, '');
    } catch (error) {
        console.error('Error deleting list:', error);
        alert('Error deleting list');
    }
}

// View Exercises
window.viewExercises = async function(categoryId, listId, listName) {
    currentCategoryId = categoryId;
    currentListId = listId;
    
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = `
        <div class="col-12 mb-3">
            <button class="btn btn-secondary" onclick="viewLists('${categoryId}', '')">
                <i class="fas fa-arrow-left me-2"></i>Back to Lists
            </button>
            <button class="btn btn-primary ms-2" onclick="openAddExercise('${listId}')">
                <i class="fas fa-plus me-2"></i>Add Exercise
            </button>
            <h5 class="mt-3">${listName} - Exercises</h5>
        </div>
    `;
    
    try {
        // Exercises are in separate collection with practiceListId field
        const q = query(collection(db, 'practice_exercises'), where('practiceListId', '==', listId));
        const snapshot = await getDocs(q);
        
        console.log('Exercises found for', listId, ':', snapshot.size);
        
        if (snapshot.empty) {
            grid.innerHTML += '<div class="col-12"><p class="text-muted">No exercises found</p></div>';
            return;
        }
        
        const exercises = [];
        snapshot.forEach(doc => {
            exercises.push({ id: doc.id, ...doc.data() });
        });
        
        exercises.sort((a, b) => a.order - b.order);
        
        exercises.forEach(exercise => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="practice-card">
                    <h6>${exercise.title}</h6>
                    <p class="text-muted small">${exercise.name}</p>
                    <p class="text-muted small">${exercise.description || ''}</p>
                    <p class="text-muted small">Order: ${exercise.order}</p>
                    <div class="course-actions">
                        <button class="btn btn-sm btn-warning" onclick="editExercise('${categoryId}', '${listId}', '${exercise.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteExercise('${categoryId}', '${listId}', '${exercise.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });
    } catch (error) {
        console.error('Error loading exercises:', error);
        grid.innerHTML += `<div class="col-12"><p class="text-danger">Error: ${error.message}</p></div>`;
    }
}

// Open Add Exercise
window.openAddExercise = function(listId) {
    editingId = null;
    currentListId = listId;
    document.getElementById('exerciseModalTitle').textContent = 'Add Exercise';
    document.getElementById('exerciseForm').reset();
    document.getElementById('exerciseListId').value = listId;
    
    new bootstrap.Modal(document.getElementById('exerciseModal')).show();
}

// Edit Exercise
window.editExercise = async function(categoryId, listId, exerciseId) {
    editingId = exerciseId;
    currentCategoryId = categoryId;
    currentListId = listId;
    
    const exerciseDoc = await getDocs(collection(db, 'practice_exercises'));
    const exercise = exerciseDoc.docs.find(d => d.id === exerciseId).data();
    
    document.getElementById('exerciseModalTitle').textContent = 'Edit Exercise';
    document.getElementById('exerciseListId').value = listId;
    document.getElementById('exerciseId').value = exerciseId;
    document.getElementById('exerciseTitle').value = exercise.title;
    document.getElementById('exerciseName').value = exercise.name;
    document.getElementById('exerciseDescription').value = exercise.description || '';
    document.getElementById('exerciseFileLink').value = exercise.fileLink || '';
    document.getElementById('exerciseWebLink').value = exercise.webLink || '';
    document.getElementById('exerciseOrder').value = exercise.order;
    
    new bootstrap.Modal(document.getElementById('exerciseModal')).show();
}

// Save Exercise
window.saveExercise = async function() {
    const listId = document.getElementById('exerciseListId').value;
    const title = document.getElementById('exerciseTitle').value;
    const name = document.getElementById('exerciseName').value;
    const description = document.getElementById('exerciseDescription').value;
    const fileLink = document.getElementById('exerciseFileLink').value;
    const webLink = document.getElementById('exerciseWebLink').value;
    const order = parseInt(document.getElementById('exerciseOrder').value);
    
    const exerciseData = {
        title: title,
        name: name,
        description: description,
        fileLink: fileLink,
        webLink: webLink,
        order: order,
        practiceListId: listId
    };
    
    try {
        if (editingId) {
            await updateDoc(doc(db, 'practice_exercises', editingId), exerciseData);
        } else {
            const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
            exerciseData.id = id;
            await setDoc(doc(db, 'practice_exercises', id), exerciseData);
        }
        
        bootstrap.Modal.getInstance(document.getElementById('exerciseModal')).hide();
        viewExercises(currentCategoryId, listId, '');
    } catch (error) {
        console.error('Error saving exercise:', error);
        alert('Error saving exercise');
    }
}

// Delete Exercise
window.deleteExercise = async function(categoryId, listId, exerciseId) {
    if (!confirm('Delete this exercise?')) return;
    
    try {
        await deleteDoc(doc(db, 'practice_exercises', exerciseId));
        viewExercises(categoryId, listId, '');
    } catch (error) {
        console.error('Error deleting exercise:', error);
        alert('Error deleting exercise');
    }
}

// Initialize
window.loadCategories();
