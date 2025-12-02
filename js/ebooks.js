let ebooks = [];
let categories = [];
let subcategories = [];
let editingEbookId = null;

// Send notification function
async function sendNotification(title, message, type, targetId, imageUrl) {
    try {
        const notificationData = {
            title: title,
            message: message,
            type: type,
            targetId: targetId,
            imageUrl: imageUrl || '',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            isRead: false
        };
        
        await db.collection('notifications').add(notificationData);
        console.log('Notification sent successfully');
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadEbooks();
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
    const categoryId = document.getElementById('categorySelect').value;
    if (!categoryId) {
        document.getElementById('subcategorySelect').innerHTML = '<option value="">Select Subcategory</option>';
        return;
    }

    db.collection('ebook_subcategories')
        .where('categoryId', '==', categoryId)
        .get()
        .then(querySnapshot => {
            const select = document.getElementById('subcategorySelect');
            select.innerHTML = '<option value="">Select Subcategory</option>';

            querySnapshot.forEach(doc => {
                const subcategory = { id: doc.id, ...doc.data() };
                
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = subcategory.name;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading subcategories:', error);
        });
}

function loadEbooks() {
    Promise.all([
        db.collection('ebook_categories').get(),
        db.collection('ebook_subcategories').get(),
        db.collection('ebooks').orderBy('order', 'asc').get()
    ]).then(([categoriesSnapshot, subcategoriesSnapshot, ebooksSnapshot]) => {
        // Build lookup maps
        const categoryMap = {};
        const subcategoryMap = {};
        
        categoriesSnapshot.forEach(doc => {
            categoryMap[doc.id] = doc.data().name;
        });
        
        subcategoriesSnapshot.forEach(doc => {
            subcategoryMap[doc.id] = doc.data().name;
        });

        ebooks = [];
        const tbody = document.getElementById('ebooksTableBody');
        tbody.innerHTML = '';

        ebooksSnapshot.forEach(doc => {
            const ebook = { id: doc.id, ...doc.data() };
            ebooks.push(ebook);
            
            const subcategory = subcategoriesSnapshot.docs.find(s => s.id === ebook.subcategoryId);
            const categoryId = subcategory ? subcategory.data().categoryId : '';
            const categoryName = categoryMap[categoryId] || 'Unknown';
            const subcategoryName = subcategoryMap[ebook.subcategoryId] || 'Unknown';
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${ebook.order || 0}</td>
                <td>${categoryName}</td>
                <td>${subcategoryName}</td>
                <td>${ebook.title}</td>
                <td>${ebook.author}</td>
                <td>
                    ${ebook.pdfUrl ? '<a href="' + ebook.pdfUrl + '" target="_blank" class="btn btn-sm btn-outline-success"><i class="fas fa-external-link-alt"></i></a>' : 'No URL'}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editEbook('${doc.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteEbook('${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
    }).catch(error => {
        console.error('Error loading ebooks:', error);
        alert('Error loading ebooks');
    });
}

function editEbook(ebookId) {
    const ebook = ebooks.find(e => e.id === ebookId);
    if (!ebook) return;

    editingEbookId = ebookId;
    document.getElementById('modalTitle').textContent = 'Edit E-book';
    document.getElementById('ebookId').value = ebookId;
    document.getElementById('ebookTitle').value = ebook.title;
    document.getElementById('ebookAuthor').value = ebook.author;
    document.getElementById('ebookDescription').value = ebook.description || '';
    document.getElementById('ebookPdfUrl').value = ebook.pdfUrl || '';
    document.getElementById('ebookImageUrl').value = ebook.imageUrl || '';
    document.getElementById('ebookOrder').value = ebook.order || 0;

    // Load subcategory's category first
    db.collection('ebook_subcategories').doc(ebook.subcategoryId).get()
        .then(doc => {
            if (doc.exists) {
                const subcategory = doc.data();
                document.getElementById('categorySelect').value = subcategory.categoryId;
                loadSubcategories();
                setTimeout(() => {
                    document.getElementById('subcategorySelect').value = ebook.subcategoryId;
                }, 100);
            }
        });

    new bootstrap.Modal(document.getElementById('ebookModal')).show();
}

function saveEbook() {
    const subcategoryId = document.getElementById('subcategorySelect').value;
    const title = document.getElementById('ebookTitle').value.trim();
    const author = document.getElementById('ebookAuthor').value.trim();
    const description = document.getElementById('ebookDescription').value.trim();
    const pdfUrl = document.getElementById('ebookPdfUrl').value.trim();
    const imageUrl = document.getElementById('ebookImageUrl').value.trim();
    const order = parseInt(document.getElementById('ebookOrder').value) || 0;

    if (!subcategoryId || !title || !author || !pdfUrl) {
        alert('Please fill in all required fields');
        return;
    }

    const ebookData = {
        subcategoryId,
        title,
        author,
        description,
        pdfUrl,
        imageUrl,
        order
    };

    const savePromise = editingEbookId 
        ? db.collection('ebooks').doc(editingEbookId).update(ebookData)
        : db.collection('ebooks').add(ebookData).then(() => {
            // Send notification for new ebook
            return sendNotification(
                'New Ebook Added!',
                `New ebook available: ${title}`,
                'ebook',
                subcategoryId,
                imageUrl
            );
        });

    savePromise
        .then(() => {
            bootstrap.Modal.getInstance(document.getElementById('ebookModal')).hide();
            resetForm();
            loadEbooks();
            alert(editingEbookId ? 'E-book updated successfully!' : 'E-book added successfully!');
        })
        .catch(error => {
            console.error('Error saving ebook:', error);
            alert('Error saving ebook');
        });
}

function deleteEbook(ebookId) {
    if (!confirm('Are you sure you want to delete this e-book?')) return;

    db.collection('ebooks').doc(ebookId).delete()
        .then(() => {
            loadEbooks();
            alert('E-book deleted successfully!');
        })
        .catch(error => {
            console.error('Error deleting ebook:', error);
            alert('Error deleting ebook');
        });
}

function resetForm() {
    editingEbookId = null;
    document.getElementById('modalTitle').textContent = 'Add E-book';
    document.getElementById('ebookForm').reset();
    document.getElementById('ebookId').value = '';
    document.getElementById('subcategorySelect').innerHTML = '<option value="">Select Subcategory</option>';
}

document.getElementById('ebookModal').addEventListener('hidden.bs.modal', resetForm);