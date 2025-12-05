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
    loadCategories().then(() => {
        loadEbooks();
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

            // Sort subcategories by order within the category
            const subcategoriesArray = [];
            querySnapshot.forEach(doc => {
                subcategoriesArray.push({ id: doc.id, ...doc.data() });
            });
            
            subcategoriesArray.sort((a, b) => (a.order || 0) - (b.order || 0));

            subcategoriesArray.forEach(subcategory => {
                const option = document.createElement('option');
                option.value = subcategory.id;
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
        db.collection('ebooks').get()
    ]).then(([categoriesSnapshot, subcategoriesSnapshot, ebooksSnapshot]) => {
        // Build lookup maps
        const categoryMap = {};
        const subcategoryMap = {};
        const subcategoryToCategoryMap = {};
        
        categoriesSnapshot.forEach(doc => {
            categoryMap[doc.id] = doc.data().name;
        });
        
        subcategoriesSnapshot.forEach(doc => {
            const subcategoryData = doc.data();
            subcategoryMap[doc.id] = subcategoryData.name;
            subcategoryToCategoryMap[doc.id] = subcategoryData.categoryId;
        });

        ebooks = [];
        const grid = document.getElementById('subcategoriesGrid');
        grid.innerHTML = '';

        // Group ebooks by subcategory and sort within each subcategory
        const ebooksBySubcategory = {};
        ebooksSnapshot.forEach(doc => {
            const ebook = { id: doc.id, ...doc.data() };
            ebooks.push(ebook);
            
            if (!ebooksBySubcategory[ebook.subcategoryId]) {
                ebooksBySubcategory[ebook.subcategoryId] = [];
            }
            ebooksBySubcategory[ebook.subcategoryId].push(ebook);
        });

        // Sort ebooks within each subcategory by order
        Object.keys(ebooksBySubcategory).forEach(subcategoryId => {
            ebooksBySubcategory[subcategoryId].sort((a, b) => (a.order || 0) - (b.order || 0));
        });

        // Display subcategories with their ebooks
        Object.keys(subcategoryMap).forEach(subcategoryId => {
            const subcategoryEbooks = ebooksBySubcategory[subcategoryId] || [];
            const categoryId = subcategoryToCategoryMap[subcategoryId];
            const categoryName = categoryMap[categoryId] || 'Unknown';
            const subcategoryName = subcategoryMap[subcategoryId] || 'Unknown';
            const collapseId = `collapse-${subcategoryId}`;
            
            const subcategoryCard = document.createElement('div');
            subcategoryCard.className = 'col-12 col-md-6 col-lg-4 col-xl-3';
            subcategoryCard.innerHTML = `
                <div class="card subcategory-card h-100">
                    <div class="subcategory-header" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                        <div class="category-breadcrumb">
                            <i class="fas fa-folder"></i> ${categoryName}
                        </div>
                        <h5 class="mb-1">${subcategoryName}</h5>
                        <small class="opacity-75">${subcategoryEbooks.length} ebooks</small>
                    </div>
                    <div class="collapse show" id="${collapseId}">
                        <div class="card-body">
                            ${subcategoryEbooks.length === 0 ? 
                                '<p class="text-muted text-center py-3"><i class="fas fa-book-open"></i><br>No ebooks yet</p>' :
                                subcategoryEbooks.map(ebook => `
                                    <div class="ebook-item">
                                        <div class="d-flex justify-content-between align-items-start mb-2">
                                            <div class="flex-grow-1">
                                                <div class="d-flex align-items-center mb-1">
                                                    <span class="badge badge-order me-2">${ebook.order || 0}</span>
                                                    <h6 class="ebook-title mb-0">${ebook.title}</h6>
                                                </div>
                                                <p class="ebook-author mb-2">by ${ebook.author}</p>
                                                ${ebook.description ? `<p class="text-muted small mb-2">${ebook.description}</p>` : ''}
                                                <div class="d-flex align-items-center gap-2">
                                                    ${ebook.pdfUrl ? `<a href="${ebook.pdfUrl}" target="_blank" class="pdf-link"><i class="fas fa-external-link-alt me-1"></i>View PDF</a>` : '<span class="text-muted">No PDF</span>'}
                                                    ${ebook.imageUrl ? '<i class="fas fa-image text-success" title="Has Cover"></i>' : '<i class="fas fa-image text-muted" title="No Cover"></i>'}
                                                </div>
                                            </div>
                                            <div class="btn-group-vertical ms-2">
                                                <button class="btn btn-sm btn-outline-primary" onclick="editEbook('${ebook.id}')" title="Edit">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger" onclick="deleteEbook('${ebook.id}')" title="Delete">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(subcategoryCard);
        });

        // Initialize search functionality
        initializeEbookSearch();
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

// Search functionality for ebooks
function initializeEbookSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const subcategoryCards = document.querySelectorAll('.subcategory-card');
        
        subcategoryCards.forEach(card => {
            const categoryName = card.querySelector('.category-breadcrumb').textContent.toLowerCase();
            const subcategoryName = card.querySelector('.subcategory-header h5').textContent.toLowerCase();
            const ebookItems = card.querySelectorAll('.ebook-item');
            let hasVisibleEbooks = false;
            
            ebookItems.forEach(item => {
                const title = item.querySelector('.ebook-title').textContent.toLowerCase();
                const author = item.querySelector('.ebook-author').textContent.toLowerCase();
                const description = item.querySelector('.text-muted')?.textContent.toLowerCase() || '';
                
                if (title.includes(searchTerm) || author.includes(searchTerm) || description.includes(searchTerm) || 
                    categoryName.includes(searchTerm) || subcategoryName.includes(searchTerm)) {
                    item.style.display = 'block';
                    hasVisibleEbooks = true;
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Show/hide entire subcategory card based on search results
            if (hasVisibleEbooks || categoryName.includes(searchTerm) || subcategoryName.includes(searchTerm)) {
                card.closest('.col-12').style.display = 'block';
                // Expand collapsed subcategories when searching
                if (searchTerm && !card.querySelector('.collapse').classList.contains('show')) {
                    card.querySelector('[data-bs-toggle="collapse"]').click();
                }
            } else {
                card.closest('.col-12').style.display = 'none';
            }
        });
    });
}