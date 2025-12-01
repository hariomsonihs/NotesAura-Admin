let categories = [];
let editingCategoryId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            loadCategories();
        } else {
            window.location.href = 'index.html';
        }
    });
});

function loadCategories() {
    db.collection('ebook_categories')
        .orderBy('order', 'asc')
        .get()
        .then(querySnapshot => {
            categories = [];
            const tbody = document.getElementById('categoriesTableBody');
            tbody.innerHTML = '';

            querySnapshot.forEach(doc => {
                const category = { id: doc.id, ...doc.data() };
                categories.push(category);
                
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${category.order || 0}</td>
                    <td>${category.name}</td>
                    <td>${category.description || ''}</td>
                    <td>${category.imageUrl ? '<i class="fas fa-image text-success"></i>' : '<i class="fas fa-image text-muted"></i>'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editCategory('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            });
        })
        .catch(error => {
            console.error('Error loading categories:', error);
            alert('Error loading categories');
        });
}

function editCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    editingCategoryId = categoryId;
    document.getElementById('modalTitle').textContent = 'Edit E-book Category';
    document.getElementById('categoryId').value = categoryId;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryImageUrl').value = category.imageUrl || '';
    document.getElementById('categoryOrder').value = category.order || 0;

    new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('categoryDescription').value.trim();
    const imageUrl = document.getElementById('categoryImageUrl').value.trim();
    const order = parseInt(document.getElementById('categoryOrder').value) || 0;

    if (!name) {
        alert('Please enter category name');
        return;
    }

    const categoryData = {
        name,
        description,
        imageUrl,
        order
    };

    const savePromise = editingCategoryId 
        ? db.collection('ebook_categories').doc(editingCategoryId).update(categoryData)
        : db.collection('ebook_categories').add(categoryData);

    savePromise
        .then(() => {
            bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
            resetForm();
            loadCategories();
            alert(editingCategoryId ? 'Category updated successfully!' : 'Category added successfully!');
        })
        .catch(error => {
            console.error('Error saving category:', error);
            alert('Error saving category');
        });
}

function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    db.collection('ebook_categories').doc(categoryId).delete()
        .then(() => {
            loadCategories();
            alert('Category deleted successfully!');
        })
        .catch(error => {
            console.error('Error deleting category:', error);
            alert('Error deleting category');
        });
}

function resetForm() {
    editingCategoryId = null;
    document.getElementById('modalTitle').textContent = 'Add E-book Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
}

document.getElementById('categoryModal').addEventListener('hidden.bs.modal', resetForm);