import { db } from './firebase-config.js';
import { collection, getDocs, updateDoc, deleteDoc, doc, setDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentCategoryId = null;
let editingId = null;

// Send notification function
async function sendNotification(title, message, type, targetId, imageUrl) {
    try {
        const notificationData = {
            title: title,
            message: message,
            type: type,
            targetId: targetId,
            imageUrl: imageUrl || '',
            timestamp: new Date(),
            isRead: false
        };
        
        await setDoc(doc(db, 'notifications', Date.now().toString()), notificationData);
        console.log('Notification sent successfully');
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

// Load Categories
window.loadCategories = async function() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '<div class="col-12"><p class="text-center">Loading...</p></div>';
    
    try {
        const snapshot = await getDocs(collection(db, 'interview_categories'));
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
                <div class="interview-card" style="border-left: 4px solid ${category.color || '#2196F3'}">
                    <h5>${category.name}</h5>
                    <p class="text-muted">${category.description || ''}</p>
                    <p class="text-muted">Order: ${category.order}</p>
                    <div class="course-actions">
                        <button class="btn btn-sm btn-info" onclick="viewQuestions('${category.id}', '${category.name}')">
                            <i class="fas fa-question"></i> Questions
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
    const categoryDoc = await getDocs(collection(db, 'interview_categories'));
    const category = categoryDoc.docs.find(d => d.id === categoryId).data();
    
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryId').value = categoryId;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryColor').value = category.color;
    document.getElementById('categoryOrder').value = category.order;
    
    new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

// Save Category
window.saveCategory = async function() {
    const name = document.getElementById('categoryName').value;
    const description = document.getElementById('categoryDescription').value;
    const color = document.getElementById('categoryColor').value;
    const order = parseInt(document.getElementById('categoryOrder').value);
    
    const categoryData = {
        name: name,
        description: description,
        color: color,
        order: order
    };
    
    try {
        if (editingId) {
            await updateDoc(doc(db, 'interview_categories', editingId), categoryData);
        } else {
            const id = name.toLowerCase().replace(/\s+/g, '_');
            categoryData.id = id;
            await setDoc(doc(db, 'interview_categories', id), categoryData);
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
    if (!confirm('Delete this category and all its questions?')) return;
    
    try {
        await deleteDoc(doc(db, 'interview_categories', categoryId));
        loadCategories();
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category');
    }
}

// View Questions
window.viewQuestions = async function(categoryId, categoryName) {
    currentCategoryId = categoryId;
    
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = `
        <div class="col-12 mb-3">
            <button class="btn btn-secondary" onclick="loadCategories()">
                <i class="fas fa-arrow-left me-2"></i>Back to Categories
            </button>
            <button class="btn btn-primary ms-2" onclick="openAddQuestion('${categoryId}')">
                <i class="fas fa-plus me-2"></i>Add Question
            </button>
            <h5 class="mt-3">${categoryName} - Interview Questions</h5>
        </div>
    `;
    
    try {
        const q = query(collection(db, 'interview_questions'), where('categoryId', '==', categoryId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML += '<div class="col-12"><p class="text-muted">No questions found</p></div>';
            return;
        }
        
        const questions = [];
        snapshot.forEach(doc => {
            questions.push({ id: doc.id, ...doc.data() });
        });
        
        questions.sort((a, b) => a.order - b.order);
        
        questions.forEach(question => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="interview-card">
                    <h6>${question.title}</h6>
                    <p class="text-muted small">${question.description || ''}</p>
                    <p class="text-muted small">Order: ${question.order}</p>
                    ${question.webLink ? `<p class="text-muted small"><a href="${question.webLink}" target="_blank">View Questions</a></p>` : ''}
                    <div class="course-actions">
                        <button class="btn btn-sm btn-warning" onclick="editQuestion('${categoryId}', '${question.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteQuestion('${categoryId}', '${question.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });
    } catch (error) {
        console.error('Error loading questions:', error);
        grid.innerHTML += `<div class="col-12"><p class="text-danger">Error: ${error.message}</p></div>`;
    }
}

// Open Add Question
window.openAddQuestion = function(categoryId) {
    editingId = null;
    currentCategoryId = categoryId;
    document.getElementById('questionModalTitle').textContent = 'Add Question';
    document.getElementById('questionForm').reset();
    document.getElementById('questionCategoryId').value = categoryId;
    
    new bootstrap.Modal(document.getElementById('questionModal')).show();
}

// Edit Question
window.editQuestion = async function(categoryId, questionId) {
    editingId = questionId;
    currentCategoryId = categoryId;
    
    const questionDoc = await getDocs(collection(db, 'interview_questions'));
    const question = questionDoc.docs.find(d => d.id === questionId).data();
    
    document.getElementById('questionModalTitle').textContent = 'Edit Question';
    document.getElementById('questionCategoryId').value = categoryId;
    document.getElementById('questionId').value = questionId;
    document.getElementById('questionTitle').value = question.title;
    document.getElementById('questionDescription').value = question.description || '';
    document.getElementById('questionWebLink').value = question.webLink || '';
    document.getElementById('questionOrder').value = question.order;
    
    new bootstrap.Modal(document.getElementById('questionModal')).show();
}

// Save Question
window.saveQuestion = async function() {
    const categoryId = document.getElementById('questionCategoryId').value;
    const title = document.getElementById('questionTitle').value;
    const description = document.getElementById('questionDescription').value;
    const webLink = document.getElementById('questionWebLink').value;
    const order = parseInt(document.getElementById('questionOrder').value);
    
    const questionData = {
        title: title,
        description: description,
        webLink: webLink,
        order: order,
        categoryId: categoryId
    };
    
    try {
        if (editingId) {
            await updateDoc(doc(db, 'interview_questions', editingId), questionData);
        } else {
            const id = Date.now().toString();
            questionData.id = id;
            await setDoc(doc(db, 'interview_questions', id), questionData);
            
            // Send notification for new question
            await sendNotification(
                'New Interview Question!',
                `New question added: ${title}`,
                'interview',
                categoryId,
                ''
            );
        }
        
        bootstrap.Modal.getInstance(document.getElementById('questionModal')).hide();
        viewQuestions(categoryId, '');
    } catch (error) {
        console.error('Error saving question:', error);
        alert('Error saving question');
    }
}

// Delete Question
window.deleteQuestion = async function(categoryId, questionId) {
    if (!confirm('Delete this question?')) return;
    
    try {
        await deleteDoc(doc(db, 'interview_questions', questionId));
        viewQuestions(categoryId, '');
    } catch (error) {
        console.error('Error deleting question:', error);
        alert('Error deleting question');
    }
}

// Initialize
window.loadCategories();
