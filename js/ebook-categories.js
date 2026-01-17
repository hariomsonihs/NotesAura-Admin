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
            const grid = document.getElementById('categoriesGrid');
            grid.innerHTML = '';

            if (querySnapshot.empty) {
                grid.innerHTML = `
                    <div class="col-12">
                        <div class="empty-state">
                            <i class="fas fa-folder-open"></i>
                            <h5>No Categories Yet</h5>
                            <p>Start by adding your first e-book category</p>
                        </div>
                    </div>
                `;
                return;
            }

            querySnapshot.forEach(doc => {
                const category = { id: doc.id, ...doc.data() };
                categories.push(category);
                
                const categoryCard = document.createElement('div');
                categoryCard.className = 'col-12 col-md-6 col-lg-4 col-xl-3';
                categoryCard.innerHTML = `
                    <div class="card category-card h-100">
                        <div class="category-header">
                            <h5 class="category-title">${category.name}</h5>
                            ${category.description ? `<p class="category-description">${category.description}</p>` : ''}
                        </div>
                        <div class="category-body">
                            <div class="category-stats">
                                <span class="order-badge">Order: ${category.order || 0}</span>
                                <div class="image-status">
                                    ${category.imageUrl ? 
                                        '<i class="fas fa-image text-success"></i> <span>Has Image</span>' : 
                                        '<i class="fas fa-image text-muted"></i> <span>No Image</span>'
                                    }
                                </div>
                            </div>
                            <div class="category-actions">
                                <button class="btn btn-action btn-edit" onclick="editCategory('${doc.id}')" title="Edit Category">
                                    <i class="fas fa-edit me-1"></i>Edit
                                </button>
                                <button class="btn btn-action btn-delete" onclick="deleteCategory('${doc.id}')" title="Delete Category">
                                    <i class="fas fa-trash me-1"></i>Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                grid.appendChild(categoryCard);
            });

            // Initialize search functionality
            initializeCategorySearch();
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

// Search functionality for categories
function initializeCategorySearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const categoryCards = document.querySelectorAll('.category-card');
        
        categoryCards.forEach(card => {
            const categoryName = card.querySelector('.category-title').textContent.toLowerCase();
            const categoryDescription = card.querySelector('.category-description')?.textContent.toLowerCase() || '';
            
            if (categoryName.includes(searchTerm) || categoryDescription.includes(searchTerm)) {
                card.closest('.col-12').style.display = 'block';
            } else {
                card.closest('.col-12').style.display = 'none';
            }
        });
    });
}