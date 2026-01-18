import { db } from './firebase-config.js';
import { collection, getDocs, updateDoc, deleteDoc, doc, setDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentView = 'categories'; // categories, sets
let currentCategoryId = null;
let currentCategoryName = null;
let editingId = null;

// Load Categories
window.loadCategories = async function() {
    currentView = 'categories';
    updateUI();
    
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '<div class="col-12"><p class="text-center">Loading...</p></div>';
    
    try {
        const snapshot = await getDocs(collection(db, 'interview_categories'));
        grid.innerHTML = '';
        
        if (snapshot.empty) {
            grid.innerHTML = '<div class="col-12"><p class="text-muted text-center">No categories found. Click "Add Category" to create one.</p></div>';
            return;
        }
        
        const categories = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            categories.push({ id: docSnap.id, ...data });
        });
        
        // Count sets for each category
        for (let category of categories) {
            const setsQuery = query(collection(db, 'interview_sets'), where('categoryId', '==', category.id));
            const setsSnapshot = await getDocs(setsQuery);
            category.setsCount = setsSnapshot.size;
        }
        
        categories.forEach(category => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 mb-3';
            col.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">${category.icon || '💼'} ${category.name}</h5>
                        <p class="card-text text-muted">${category.description || ''}</p>
                        <p class="text-muted small"><strong>${category.setsCount || 0}</strong> Interview Sets</p>
                    </div>
                    <div class="card-footer bg-white">
                        <button class="btn btn-sm btn-info" onclick="viewSets('${category.id}', '${category.name}')">
                            <i class="fas fa-folder-open"></i> View Sets
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

// View Sets
window.viewSets = async function(categoryId, categoryName) {
    currentView = 'sets';
    currentCategoryId = categoryId;
    currentCategoryName = categoryName;
    updateUI();
    
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '<div class="col-12"><p class="text-center">Loading...</p></div>';
    
    try {
        const q = query(collection(db, 'interview_sets'), where('categoryId', '==', categoryId));
        const snapshot = await getDocs(q);
        
        grid.innerHTML = '';
        
        if (snapshot.empty) {
            grid.innerHTML = '<div class="col-12"><p class="text-muted text-center">No interview sets found. Click "Add Set" to create one.</p></div>';
            return;
        }
        
        // Sort sets by title in JavaScript
        const sets = [];
        snapshot.forEach(docSnap => {
            sets.push({ id: docSnap.id, ...docSnap.data() });
        });
        sets.sort((a, b) => a.title.localeCompare(b.title));
        
        sets.forEach(set => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 mb-3';
            col.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">${set.title}</h5>
                        <p class="card-text text-muted">${set.description || ''}</p>
                        <p class="text-muted small"><strong>${set.questionsCount || 0}</strong> Questions</p>
                        ${set.jsonUrl ? `<p class="text-muted small"><i class="fas fa-link"></i> JSON URL configured</p>` : ''}
                    </div>
                    <div class="card-footer bg-white">
                        <button class="btn btn-sm btn-warning" onclick="editSet('${set.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSet('${set.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });
    } catch (error) {
        console.error('Error loading sets:', error);
        grid.innerHTML = `<div class="col-12"><p class="text-danger">Error: ${error.message}</p></div>`;
    }
}

// Update UI based on current view
function updateUI() {
    const pageTitle = document.getElementById('pageTitle');
    const backBtn = document.getElementById('backBtn');
    const addBtn = document.getElementById('addBtn');
    
    if (currentView === 'categories') {
        pageTitle.textContent = 'Interview Questions Management';
        backBtn.style.display = 'none';
        addBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Add Category';
        addBtn.onclick = openAddCategory;
    } else if (currentView === 'sets') {
        pageTitle.textContent = currentCategoryName + ' - Interview Sets';
        backBtn.style.display = 'inline-block';
        addBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Add Set';
        addBtn.onclick = () => openAddSet(currentCategoryId);
    }
}

// Go Back
window.goBack = function() {
    if (currentView === 'sets') {
        loadCategories();
    }
}

// Open Add Category
window.openAddCategory = function() {
    editingId = null;
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('categoryForm').reset();
    new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

// Edit Category
window.editCategory = async function(categoryId) {
    editingId = categoryId;
    
    try {
        const docSnap = await getDocs(collection(db, 'interview_categories'));
        const category = docSnap.docs.find(d => d.id === categoryId).data();
        
        document.getElementById('categoryModalTitle').textContent = 'Edit Category';
        document.getElementById('categoryId').value = categoryId;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryDescription').value = category.description || '';
        document.getElementById('categoryIcon').value = category.icon || '';
        
        new bootstrap.Modal(document.getElementById('categoryModal')).show();
    } catch (error) {
        console.error('Error loading category:', error);
        alert('Error loading category');
    }
}

// Save Category
window.saveCategory = async function() {
    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('categoryDescription').value.trim();
    const icon = document.getElementById('categoryIcon').value.trim();
    
    if (!name) {
        alert('Please enter category name');
        return;
    }
    
    const categoryData = {
        name: name,
        description: description,
        icon: icon || '💼',
        setsCount: 0
    };
    
    try {
        if (editingId) {
            await updateDoc(doc(db, 'interview_categories', editingId), categoryData);
        } else {
            const id = Date.now().toString();
            await setDoc(doc(db, 'interview_categories', id), { ...categoryData, id: id });
        }
        
        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
        loadCategories();
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Error saving category: ' + error.message);
    }
}

// Delete Category
window.deleteCategory = async function(categoryId) {
    if (!confirm('Delete this category? All interview sets under this category will also be deleted.')) return;
    
    try {
        // Delete all sets in this category
        const setsQuery = query(collection(db, 'interview_sets'), where('categoryId', '==', categoryId));
        const setsSnapshot = await getDocs(setsQuery);
        
        const deletePromises = [];
        setsSnapshot.forEach(docSnap => {
            deletePromises.push(deleteDoc(doc(db, 'interview_sets', docSnap.id)));
        });
        
        await Promise.all(deletePromises);
        
        // Delete category
        await deleteDoc(doc(db, 'interview_categories', categoryId));
        
        loadCategories();
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category: ' + error.message);
    }
}

// Open Add Set
window.openAddSet = function(categoryId) {
    editingId = null;
    document.getElementById('setModalTitle').textContent = 'Add Interview Set';
    document.getElementById('setForm').reset();
    document.getElementById('setCategoryId').value = categoryId;
    new bootstrap.Modal(document.getElementById('setModal')).show();
}

// Edit Set
window.editSet = async function(setId) {
    editingId = setId;
    
    try {
        const docSnap = await getDocs(collection(db, 'interview_sets'));
        const set = docSnap.docs.find(d => d.id === setId).data();
        
        document.getElementById('setModalTitle').textContent = 'Edit Interview Set';
        document.getElementById('setId').value = setId;
        document.getElementById('setCategoryId').value = set.categoryId;
        document.getElementById('setTitle').value = set.title;
        document.getElementById('setDescription').value = set.description || '';
        document.getElementById('setJsonUrl').value = set.jsonUrl || '';
        document.getElementById('setQuestionsCount').value = set.questionsCount || 0;
        
        new bootstrap.Modal(document.getElementById('setModal')).show();
    } catch (error) {
        console.error('Error loading set:', error);
        alert('Error loading set');
    }
}

// Save Set
window.saveSet = async function() {
    const categoryId = document.getElementById('setCategoryId').value;
    const title = document.getElementById('setTitle').value.trim();
    const description = document.getElementById('setDescription').value.trim();
    let jsonUrl = document.getElementById('setJsonUrl').value.trim();
    const questionsCount = parseInt(document.getElementById('setQuestionsCount').value) || 0;
    
    if (!title || !jsonUrl) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Auto-convert GitHub URL to raw URL
    if (jsonUrl.includes('github.com') && jsonUrl.includes('/blob/')) {
        jsonUrl = jsonUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    
    const setData = {
        categoryId: categoryId,
        categoryName: currentCategoryName,
        title: title,
        description: description,
        jsonUrl: jsonUrl,
        questionsCount: questionsCount
    };
    
    try {
        if (editingId) {
            await updateDoc(doc(db, 'interview_sets', editingId), setData);
        } else {
            const id = Date.now().toString();
            await setDoc(doc(db, 'interview_sets', id), { ...setData, id: id });
        }
        
        bootstrap.Modal.getInstance(document.getElementById('setModal')).hide();
        viewSets(categoryId, currentCategoryName);
    } catch (error) {
        console.error('Error saving set:', error);
        alert('Error saving set: ' + error.message);
    }
}

// Delete Set
window.deleteSet = async function(setId) {
    if (!confirm('Delete this interview set?')) return;
    
    try {
        await deleteDoc(doc(db, 'interview_sets', setId));
        viewSets(currentCategoryId, currentCategoryName);
    } catch (error) {
        console.error('Error deleting set:', error);
        alert('Error deleting set: ' + error.message);
    }
}

// View JSON Format
window.viewJSON = function() {
    const jsonFormat = [
        {
            "category": "Java",
            "level": "Easy",
            "topic": "Basics",
            "question": "What is Java?",
            "answer": "Java is a high-level, object-oriented programming language.",
            "details": "Java was developed by Sun Microsystems in 1995.",
            "example_code": "public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println(\"Hello World\");\n    }\n}"
        },
        {
            "category": "Java",
            "level": "Medium",
            "topic": "OOP",
            "question": "What is inheritance?",
            "answer": "Inheritance is a mechanism where one class acquires properties of another class.",
            "details": "It promotes code reusability and establishes a relationship between parent and child classes.",
            "example_code": "class Parent {\n    void display() {\n        System.out.println(\"Parent\");\n    }\n}\n\nclass Child extends Parent {\n    // inherits display() method\n}"
        }
    ];
    
    const jsonString = JSON.stringify(jsonFormat, null, 2);
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
        <html>
        <head>
            <title>Interview Questions JSON Format</title>
            <style>
                body { font-family: monospace; padding: 20px; background: #f5f5f5; }
                pre { background: white; padding: 20px; border-radius: 8px; overflow-x: auto; }
                h2 { color: #333; }
                .info { background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <h2>📋 Interview Questions JSON Format</h2>
            <div class="info">
                <strong>Required Fields:</strong><br>
                • category: Category name<br>
                • level: Easy, Medium, Hard<br>
                • topic: Topic name<br>
                • question: The interview question<br>
                • answer: Short answer<br>
                • details: Detailed explanation (optional)<br>
                • example_code: Code example (optional)
            </div>
            <pre>${jsonString}</pre>
        </body>
        </html>
    `);
}

// Initialize
window.loadCategories();
