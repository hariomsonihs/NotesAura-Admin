let subcategories = [];
let categories = [];
let editingSubcategoryId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadSubcategories();
});

function loadCategories() {
    db.collection('ebook_categories')
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
        .orderBy('order', 'asc')
        .get()
        .then(querySnapshot => {
            subcategories = [];
            const tbody = document.getElementById('subcategoriesTableBody');
            tbody.innerHTML = '';

            querySnapshot.forEach(doc => {
                const subcategory = { id: doc.id, ...doc.data() };
                subcategories.push(subcategory);
                
                const category = categories.find(c => c.id === subcategory.categoryId);
                const categoryName = category ? category.name : 'Unknown';
                
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${subcategory.order || 0}</td>
                    <td>${categoryName}</td>
                    <td>${subcategory.name}</td>
                    <td>${subcategory.description || ''}</td>
                    <td>${subcategory.imageUrl ? '<i class="fas fa-image text-success"></i>' : '<i class="fas fa-image text-muted"></i>'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editSubcategory('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteSubcategory('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            });
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