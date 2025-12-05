let subcategories = [];
let categories = [];
let editingSubcategoryId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadCategories().then(() => {
        loadSubcategories();
    });
});

function loadCategories() {
    return db.collection('ebook_categories')
        .orderBy('order', 'asc')
        .get()
        .then(querySnapshot => {
            categories = [];
            const select = document.getElementById('categorySelect');
            select.innerHTML = '<option value="">Select Category</option>';

            querySnapshot.forEach(doc => {
                const category = { id: doc.id, ...doc.data() };
                categories.push(category);
                
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = category.name;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading categories:', error);
        });
}

function loadSubcategories() {
    db.collection('ebook_subcategories')
        .get()
        .then(querySnapshot => {
            subcategories = [];
            const grid = document.getElementById('categoriesGrid');
            grid.innerHTML = '';

            // Group subcategories by category and sort within each category
            const subcategoriesByCategory = {};
            querySnapshot.forEach(doc => {
                const subcategory = { id: doc.id, ...doc.data() };
                subcategories.push(subcategory);
                
                if (!subcategoriesByCategory[subcategory.categoryId]) {
                    subcategoriesByCategory[subcategory.categoryId] = [];
                }
                subcategoriesByCategory[subcategory.categoryId].push(subcategory);
            });

            // Sort subcategories within each category by order
            Object.keys(subcategoriesByCategory).forEach(categoryId => {
                subcategoriesByCategory[categoryId].sort((a, b) => (a.order || 0) - (b.order || 0));
            });

            // Display categories with their subcategories
            categories.forEach(category => {
                const categorySubcategories = subcategoriesByCategory[category.id] || [];
                const collapseId = `collapse-${category.id}`;
                
                const categoryCard = document.createElement('div');
                categoryCard.className = 'col-12 col-md-6 col-lg-4 col-xl-3';
                categoryCard.innerHTML = `
                    <div class="card category-card h-100">
                        <div class="category-header d-flex justify-content-between align-items-center" 
                             data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                            <div>
                                <h5 class="mb-1">${category.name}</h5>
                                <small class="opacity-75">${categorySubcategories.length} subcategories</small>
                            </div>
                            <button class="collapse-toggle" type="button">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        </div>
                        <div class="collapse show" id="${collapseId}">
                            <div class="card-body">
                                ${categorySubcategories.length === 0 ? 
                                    '<p class="text-muted text-center py-3"><i class="fas fa-inbox"></i><br>No subcategories yet</p>' :
                                    categorySubcategories.map(subcategory => `
                                        <div class="subcategory-item d-flex justify-content-between align-items-start">
                                            <div class="flex-grow-1">
                                                <div class="d-flex align-items-center mb-2">
                                                    <span class="badge badge-order me-2">${subcategory.order || 0}</span>
                                                    <h6 class="mb-0">${subcategory.name}</h6>
                                                </div>
                                                ${subcategory.description ? `<p class="text-muted small mb-2">${subcategory.description}</p>` : ''}
                                                ${subcategory.imageUrl ? '<i class="fas fa-image text-success"></i> Has Image' : '<i class="fas fa-image text-muted"></i> No Image'}
                                            </div>
                                            <div class="btn-group-vertical">
                                                <button class="btn btn-sm btn-outline-primary" onclick="editSubcategory('${subcategory.id}')" title="Edit">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger" onclick="deleteSubcategory('${subcategory.id}')" title="Delete">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')
                                }
                            </div>
                        </div>
                    </div>
                `;
                grid.appendChild(categoryCard);
            });

            // Initialize search functionality
            initializeSearch();
        })
        .catch(error => {
            console.error('Error loading subcategories:', error);
            alert('Error loading subcategories');
        });
}

function editSubcategory(subcategoryId) {
    const subcategory = subcategories.find(s => s.id === subcategoryId);
    if (!subcategory) return;

    editingSubcategoryId = subcategoryId;
    document.getElementById('modalTitle').textContent = 'Edit E-book Subcategory';
    document.getElementById('subcategoryId').value = subcategoryId;
    document.getElementById('categorySelect').value = subcategory.categoryId;
    document.getElementById('subcategoryName').value = subcategory.name;
    document.getElementById('subcategoryDescription').value = subcategory.description || '';
    document.getElementById('subcategoryImageUrl').value = subcategory.imageUrl || '';
    document.getElementById('subcategoryOrder').value = subcategory.order || 0;

    new bootstrap.Modal(document.getElementById('subcategoryModal')).show();
}

function saveSubcategory() {
    const categoryId = document.getElementById('categorySelect').value;
    const name = document.getElementById('subcategoryName').value.trim();
    const description = document.getElementById('subcategoryDescription').value.trim();
    const imageUrl = document.getElementById('subcategoryImageUrl').value.trim();
    const order = parseInt(document.getElementById('subcategoryOrder').value) || 0;

    if (!categoryId || !name) {
        alert('Please select category and enter subcategory name');
        return;
    }

    const subcategoryData = {
        categoryId,
        name,
        description,
        imageUrl,
        order
    };

    const savePromise = editingSubcategoryId 
        ? db.collection('ebook_subcategories').doc(editingSubcategoryId).update(subcategoryData)
        : db.collection('ebook_subcategories').add(subcategoryData);

    savePromise
        .then(() => {
            bootstrap.Modal.getInstance(document.getElementById('subcategoryModal')).hide();
            resetForm();
            loadSubcategories();
            alert(editingSubcategoryId ? 'Subcategory updated successfully!' : 'Subcategory added successfully!');
        })
        .catch(error => {
            console.error('Error saving subcategory:', error);
            alert('Error saving subcategory');
        });
}

function deleteSubcategory(subcategoryId) {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;

    db.collection('ebook_subcategories').doc(subcategoryId).delete()
        .then(() => {
            loadSubcategories();
            alert('Subcategory deleted successfully!');
        })
        .catch(error => {
            console.error('Error deleting subcategory:', error);
            alert('Error deleting subcategory');
        });
}

function resetForm() {
    editingSubcategoryId = null;
    document.getElementById('modalTitle').textContent = 'Add E-book Subcategory';
    document.getElementById('subcategoryForm').reset();
    document.getElementById('subcategoryId').value = '';
}

document.getElementById('subcategoryModal').addEventListener('hidden.bs.modal', resetForm);

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const categoryCards = document.querySelectorAll('.category-card');
        
        categoryCards.forEach(card => {
            const categoryName = card.querySelector('.category-header h5').textContent.toLowerCase();
            const subcategoryItems = card.querySelectorAll('.subcategory-item');
            let hasVisibleSubcategories = false;
            
            subcategoryItems.forEach(item => {
                const subcategoryName = item.querySelector('h6').textContent.toLowerCase();
                const description = item.querySelector('.text-muted')?.textContent.toLowerCase() || '';
                
                if (subcategoryName.includes(searchTerm) || description.includes(searchTerm) || categoryName.includes(searchTerm)) {
                    item.style.display = 'flex';
                    hasVisibleSubcategories = true;
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Show/hide entire category card based on search results
            if (hasVisibleSubcategories || categoryName.includes(searchTerm)) {
                card.closest('.col-12').style.display = 'block';
                // Expand collapsed categories when searching
                if (searchTerm && !card.querySelector('.collapse').classList.contains('show')) {
                    card.querySelector('[data-bs-toggle="collapse"]').click();
                }
            } else {
                card.closest('.col-12').style.display = 'none';
            }
        });
    });
}