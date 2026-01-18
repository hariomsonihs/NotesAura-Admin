import { db } from './firebase-config.js';
import { collection, getDocs, updateDoc, deleteDoc, doc, setDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentCategoryId = null;
let editingId = null;

// Load Categories
window.loadCategories = async function() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '<div class="col-12"><p class="text-center">Loading...</p></div>';
    
    try {
        const snapshot = await getDocs(collection(db, 'quiz_categories'));
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
        
        categories.forEach(category => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="quiz-card" style="border-left: 4px solid ${category.color || '#2196F3'}">
                    <h5>${category.name}</h5>
                    <p class="text-muted">Order: ${category.order}</p>
                    <div class="course-actions">
                        <button class="btn btn-sm btn-info" onclick="viewSubcategories('${category.id}', '${category.name}')">
                            <i class="fas fa-list"></i> Subcategories
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
    const categoryDoc = await getDocs(collection(db, 'quiz_categories'));
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
            await updateDoc(doc(db, 'quiz_categories', editingId), categoryData);
        } else {
            const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
            categoryData.id = id;
            await setDoc(doc(db, 'quiz_categories', id), categoryData);
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
    if (!confirm('Delete this category and all its subcategories?')) return;
    
    try {
        await deleteDoc(doc(db, 'quiz_categories', categoryId));
        loadCategories();
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category');
    }
}

// View Subcategories
window.viewSubcategories = async function(categoryId, categoryName) {
    currentCategoryId = categoryId;
    
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = `
        <div class="col-12 mb-3">
            <button class="btn btn-secondary" onclick="loadCategories()">
                <i class="fas fa-arrow-left me-2"></i>Back to Categories
            </button>
            <button class="btn btn-primary ms-2" onclick="openAddSubcategory('${categoryId}')">
                <i class="fas fa-plus me-2"></i>Add Subcategory
            </button>
            <h5 class="mt-3">${categoryName} - Quiz Subcategories</h5>
        </div>
    `;
    
    try {
        const q = query(collection(db, 'quiz_subcategories'), where('categoryId', '==', categoryId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML += '<div class="col-12"><p class="text-muted">No subcategories found</p></div>';
            return;
        }
        
        const subcategories = [];
        snapshot.forEach(doc => {
            subcategories.push({ id: doc.id, ...doc.data() });
        });
        
        subcategories.sort((a, b) => a.order - b.order);
        
        subcategories.forEach(subcategory => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="quiz-card">
                    <h5>${subcategory.name}</h5>
                    <p class="text-muted">Order: ${subcategory.order}</p>
                    ${subcategory.webUrl ? `<p class="text-muted small"><a href="${subcategory.webUrl}" target="_blank">View Quiz</a></p>` : ''}
                    <div class="course-actions">
                        <button class="btn btn-sm btn-info" onclick="viewQuizSets('${subcategory.id}', '${subcategory.name}')">
                            <i class="fas fa-list"></i> Quiz Sets
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="editSubcategory('${categoryId}', '${subcategory.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSubcategory('${categoryId}', '${subcategory.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });
    } catch (error) {
        console.error('Error loading subcategories:', error);
        grid.innerHTML += `<div class="col-12"><p class="text-danger">Error: ${error.message}</p></div>`;
    }
}

// Open Add Subcategory
window.openAddSubcategory = function(categoryId) {
    editingId = null;
    currentCategoryId = categoryId;
    document.getElementById('subcategoryModalTitle').textContent = 'Add Subcategory';
    document.getElementById('subcategoryForm').reset();
    document.getElementById('subcategoryCategoryId').value = categoryId;
    
    new bootstrap.Modal(document.getElementById('subcategoryModal')).show();
}

// Edit Subcategory
window.editSubcategory = async function(categoryId, subcategoryId) {
    editingId = subcategoryId;
    currentCategoryId = categoryId;
    
    const subcategoryDoc = await getDocs(collection(db, 'quiz_subcategories'));
    const subcategory = subcategoryDoc.docs.find(d => d.id === subcategoryId).data();
    
    document.getElementById('subcategoryModalTitle').textContent = 'Edit Subcategory';
    document.getElementById('subcategoryCategoryId').value = categoryId;
    document.getElementById('subcategoryId').value = subcategoryId;
    document.getElementById('subcategoryName').value = subcategory.name;
    document.getElementById('subcategoryWebUrl').value = subcategory.webUrl || '';
    document.getElementById('subcategoryOrder').value = subcategory.order;
    
    new bootstrap.Modal(document.getElementById('subcategoryModal')).show();
}

// Save Subcategory
window.saveSubcategory = async function() {
    const categoryId = document.getElementById('subcategoryCategoryId').value;
    const name = document.getElementById('subcategoryName').value;
    const webUrl = document.getElementById('subcategoryWebUrl').value;
    const order = parseInt(document.getElementById('subcategoryOrder').value);
    
    const subcategoryData = {
        name: name,
        webUrl: webUrl,
        order: order,
        categoryId: categoryId
    };
    
    try {
        if (editingId) {
            await updateDoc(doc(db, 'quiz_subcategories', editingId), subcategoryData);
        } else {
            const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
            subcategoryData.id = id;
            await setDoc(doc(db, 'quiz_subcategories', id), subcategoryData);
        }
        
        bootstrap.Modal.getInstance(document.getElementById('subcategoryModal')).hide();
        viewSubcategories(categoryId, '');
    } catch (error) {
        console.error('Error saving subcategory:', error);
        alert('Error saving subcategory');
    }
}

// Delete Subcategory
window.deleteSubcategory = async function(categoryId, subcategoryId) {
    if (!confirm('Delete this subcategory?')) return;
    
    try {
        await deleteDoc(doc(db, 'quiz_subcategories', subcategoryId));
        viewSubcategories(categoryId, '');
    } catch (error) {
        console.error('Error deleting subcategory:', error);
        alert('Error deleting subcategory');
    }
}

// View Quiz Sets
window.viewQuizSets = async function(subcategoryId, subcategoryName) {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = `
        <div class="col-12 mb-3">
            <button class="btn btn-secondary" onclick="viewSubcategories('${currentCategoryId}', '')">
                <i class="fas fa-arrow-left me-2"></i>Back to Subcategories
            </button>
            <button class="btn btn-primary ms-2" onclick="openAddQuizSet('${subcategoryId}')">
                <i class="fas fa-plus me-2"></i>Add Quiz Set
            </button>
            <h5 class="mt-3">${subcategoryName} - Quiz Sets</h5>
        </div>
    `;
    
    try {
        const q = query(collection(db, 'quiz_sets'), where('subcategoryId', '==', subcategoryId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML += '<div class="col-12"><p class="text-muted">No quiz sets found</p></div>';
            return;
        }
        
        const quizSets = [];
        snapshot.forEach(doc => {
            quizSets.push({ id: doc.id, ...doc.data() });
        });
        
        quizSets.sort((a, b) => a.order - b.order);
        
        quizSets.forEach(quizSet => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="quiz-card">
                    <h5>📝 ${quizSet.name}</h5>
                    <p class="text-muted">Order: ${quizSet.order}</p>
                    ${quizSet.jsonUrl ? `<p class="text-muted small"><a href="${quizSet.jsonUrl}" target="_blank">View JSON</a></p>` : ''}
                    <div class="course-actions">
                        <button class="btn btn-sm btn-warning" onclick="editQuizSet('${subcategoryId}', '${quizSet.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteQuizSet('${subcategoryId}', '${quizSet.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });
    } catch (error) {
        console.error('Error loading quiz sets:', error);
        grid.innerHTML += `<div class="col-12"><p class="text-danger">Error: ${error.message}</p></div>`;
    }
}

// Open Add Quiz Set
window.openAddQuizSet = function(subcategoryId) {
    editingId = null;
    document.getElementById('quizSetModalTitle').textContent = 'Add Quiz Set';
    document.getElementById('quizSetForm').reset();
    document.getElementById('quizSetSubcategoryId').value = subcategoryId;
    
    new bootstrap.Modal(document.getElementById('quizSetModal')).show();
}

// Edit Quiz Set
window.editQuizSet = async function(subcategoryId, quizSetId) {
    editingId = quizSetId;
    
    const quizSetDoc = await getDocs(collection(db, 'quiz_sets'));
    const quizSet = quizSetDoc.docs.find(d => d.id === quizSetId).data();
    
    document.getElementById('quizSetModalTitle').textContent = 'Edit Quiz Set';
    document.getElementById('quizSetSubcategoryId').value = subcategoryId;
    document.getElementById('quizSetId').value = quizSetId;
    document.getElementById('quizSetName').value = quizSet.name;
    document.getElementById('quizSetJsonUrl').value = quizSet.jsonUrl || '';
    document.getElementById('quizSetOrder').value = quizSet.order;
    
    new bootstrap.Modal(document.getElementById('quizSetModal')).show();
}

// Save Quiz Set
window.saveQuizSet = async function() {
    const subcategoryId = document.getElementById('quizSetSubcategoryId').value;
    const name = document.getElementById('quizSetName').value;
    let jsonUrl = document.getElementById('quizSetJsonUrl').value;
    const order = parseInt(document.getElementById('quizSetOrder').value);
    
    // Auto-convert GitHub URL to raw URL
    if (jsonUrl.includes('github.com') && jsonUrl.includes('/blob/')) {
        jsonUrl = jsonUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    
    const quizSetData = {
        name: name,
        jsonUrl: jsonUrl,
        order: order,
        subcategoryId: subcategoryId
    };
    
    try {
        if (editingId) {
            await updateDoc(doc(db, 'quiz_sets', editingId), quizSetData);
        } else {
            const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
            quizSetData.id = id;
            await setDoc(doc(db, 'quiz_sets', id), quizSetData);
        }
        
        bootstrap.Modal.getInstance(document.getElementById('quizSetModal')).hide();
        viewQuizSets(subcategoryId, '');
    } catch (error) {
        console.error('Error saving quiz set:', error);
        alert('Error saving quiz set');
    }
}

// Delete Quiz Set
window.deleteQuizSet = async function(subcategoryId, quizSetId) {
    if (!confirm('Delete this quiz set?')) return;
    
    try {
        await deleteDoc(doc(db, 'quiz_sets', quizSetId));
        viewQuizSets(subcategoryId, '');
    } catch (error) {
        console.error('Error deleting quiz set:', error);
        alert('Error deleting quiz set');
    }
}

// Initialize
window.loadCategories();
