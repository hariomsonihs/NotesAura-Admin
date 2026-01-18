import { db } from './firebase-config.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentCategoryId = null;
let currentProgramId = null;
let detailsQuill = null;
let codeFiles = [];

// Load Categories
async function loadCategories() {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border"></div></div>';

    try {
        const snapshot = await getDocs(collection(db, 'programCategories'));
        
        const categoriesArray = [];
        for (const docSnap of snapshot.docs) {
            const category = docSnap.data();
            const categoryId = docSnap.id;
            
            const programsQuery = query(collection(db, 'programs'), where('categoryId', '==', categoryId));
            const programsSnapshot = await getDocs(programsQuery);
            const programCount = programsSnapshot.size;
            
            category.id = categoryId;
            category.programCount = programCount;
            categoriesArray.push(category);
        }
        
        categoriesArray.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        
        container.innerHTML = '';
        
        if (categoriesArray.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted">No categories yet. Add your first category!</div>';
            return;
        }

        categoriesArray.forEach(category => {
            const categoryId = category.id;
            const programCount = category.programCount;

            const card = `
                <div class="col-md-6 col-lg-4">
                    <div class="category-card">
                        <div class="d-flex align-items-center mb-3">
                            <div class="category-color-box" style="background: linear-gradient(135deg, ${category.color}, ${adjustBrightness(category.color, -30)});">
                                <i class="fas fa-code"></i>
                            </div>
                            <div class="flex-grow-1">
                                <h5 class="mb-0">${category.name}</h5>
                                <small class="text-muted">${programCount} Programs</small>
                            </div>
                        </div>
                        <p class="text-muted mb-3">${category.description || 'No description'}</p>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-secondary" onclick="moveCategory('${categoryId}', 'up')" title="Move Up">
                                <i class="fas fa-arrow-up"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="moveCategory('${categoryId}', 'down')" title="Move Down">
                                <i class="fas fa-arrow-down"></i>
                            </button>
                            <button class="btn btn-sm btn-info" onclick="viewCategoryJSON('${categoryId}', '${category.name}')" title="View JSON">
                                <i class="fas fa-file-code"></i>
                            </button>
                            <button class="btn btn-sm btn-primary flex-grow-1" onclick="viewPrograms('${categoryId}', '${category.name}')">
                                <i class="fas fa-eye"></i> View Programs
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="editCategory('${categoryId}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteCategory('${categoryId}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += card;
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        container.innerHTML = '<div class="col-12 text-center text-danger">Error loading categories</div>';
    }
}

function adjustBrightness(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

// Move Category
window.moveCategory = async function(categoryId, direction) {
    try {
        const snapshot = await getDocs(collection(db, 'programCategories'));
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({id: doc.id, ...doc.data()});
        });
        
        categories.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        
        const currentIndex = categories.findIndex(c => c.id === categoryId);
        if (currentIndex === -1) return;
        
        if (direction === 'up' && currentIndex > 0) {
            const temp = categories[currentIndex].orderIndex || currentIndex;
            categories[currentIndex].orderIndex = categories[currentIndex - 1].orderIndex || (currentIndex - 1);
            categories[currentIndex - 1].orderIndex = temp;
            
            await updateDoc(doc(db, 'programCategories', categories[currentIndex].id), {orderIndex: categories[currentIndex].orderIndex});
            await updateDoc(doc(db, 'programCategories', categories[currentIndex - 1].id), {orderIndex: categories[currentIndex - 1].orderIndex});
        } else if (direction === 'down' && currentIndex < categories.length - 1) {
            const temp = categories[currentIndex].orderIndex || currentIndex;
            categories[currentIndex].orderIndex = categories[currentIndex + 1].orderIndex || (currentIndex + 1);
            categories[currentIndex + 1].orderIndex = temp;
            
            await updateDoc(doc(db, 'programCategories', categories[currentIndex].id), {orderIndex: categories[currentIndex].orderIndex});
            await updateDoc(doc(db, 'programCategories', categories[currentIndex + 1].id), {orderIndex: categories[currentIndex + 1].orderIndex});
        }
        
        loadCategories();
    } catch (error) {
        console.error('Error moving category:', error);
        alert('Error moving category');
    }
};

// Move Program
window.moveProgram = async function(programId, direction) {
    try {
        const q = query(collection(db, 'programs'), where('categoryId', '==', currentCategoryId));
        const snapshot = await getDocs(q);
        const programs = [];
        snapshot.forEach(doc => {
            programs.push({id: doc.id, ...doc.data()});
        });
        
        programs.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        
        const currentIndex = programs.findIndex(p => p.id === programId);
        if (currentIndex === -1) return;
        
        if (direction === 'up' && currentIndex > 0) {
            const temp = programs[currentIndex].orderIndex || currentIndex;
            programs[currentIndex].orderIndex = programs[currentIndex - 1].orderIndex || (currentIndex - 1);
            programs[currentIndex - 1].orderIndex = temp;
            
            await updateDoc(doc(db, 'programs', programs[currentIndex].id), {orderIndex: programs[currentIndex].orderIndex});
            await updateDoc(doc(db, 'programs', programs[currentIndex - 1].id), {orderIndex: programs[currentIndex - 1].orderIndex});
        } else if (direction === 'down' && currentIndex < programs.length - 1) {
            const temp = programs[currentIndex].orderIndex || currentIndex;
            programs[currentIndex].orderIndex = programs[currentIndex + 1].orderIndex || (currentIndex + 1);
            programs[currentIndex + 1].orderIndex = temp;
            
            await updateDoc(doc(db, 'programs', programs[currentIndex].id), {orderIndex: programs[currentIndex].orderIndex});
            await updateDoc(doc(db, 'programs', programs[currentIndex + 1].id), {orderIndex: programs[currentIndex + 1].orderIndex});
        }
        
        loadPrograms(currentCategoryId);
    } catch (error) {
        console.error('Error moving program:', error);
        alert('Error moving program');
    }
};

// Add Category
window.addCategory = async function() {
    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('categoryDesc').value.trim();
    const color = document.getElementById('categoryColor').value;

    if (!name) {
        alert('Please enter category name');
        return;
    }

    try {
        await addDoc(collection(db, 'programCategories'), {
            name,
            description,
            color,
            icon: '',
            programCount: 0,
            orderIndex: 0,
            timestamp: Date.now()
        });

        bootstrap.Modal.getInstance(document.getElementById('addCategoryModal')).hide();
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryDesc').value = '';
        loadCategories();
        alert('Category added successfully!');
    } catch (error) {
        console.error('Error adding category:', error);
        alert('Error adding category');
    }
};

// Edit Category
window.editCategory = async function(categoryId) {
    try {
        const docSnap = await getDoc(doc(db, 'programCategories', categoryId));
        if (docSnap.exists()) {
            const category = docSnap.data();
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryDesc').value = category.description || '';
            document.getElementById('categoryColor').value = category.color;
            
            currentCategoryId = categoryId;
            
            const modal = new bootstrap.Modal(document.getElementById('addCategoryModal'));
            modal.show();
            
            // Change button to update
            const modalFooter = document.querySelector('#addCategoryModal .modal-footer');
            modalFooter.innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="updateCategory()">Update Category</button>
            `;
        }
    } catch (error) {
        console.error('Error loading category:', error);
        alert('Error loading category');
    }
};

// Update Category
window.updateCategory = async function() {
    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('categoryDesc').value.trim();
    const color = document.getElementById('categoryColor').value;

    if (!name) {
        alert('Please enter category name');
        return;
    }

    try {
        await updateDoc(doc(db, 'programCategories', currentCategoryId), {
            name,
            description,
            color
        });

        bootstrap.Modal.getInstance(document.getElementById('addCategoryModal')).hide();
        loadCategories();
        alert('Category updated successfully!');
        
        // Reset button
        const modalFooter = document.querySelector('#addCategoryModal .modal-footer');
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="addCategory()">Add Category</button>
        `;
        currentCategoryId = null;
    } catch (error) {
        console.error('Error updating category:', error);
        alert('Error updating category');
    }
};

// Delete Category
window.deleteCategory = async function(categoryId) {
    if (!confirm('Are you sure? All programs in this category will be deleted!')) return;

    try {
        // Delete all programs in category
        const programsQuery = query(collection(db, 'programs'), where('categoryId', '==', categoryId));
        const programsSnapshot = await getDocs(programsQuery);
        
        for (const docSnap of programsSnapshot.docs) {
            await deleteDoc(doc(db, 'programs', docSnap.id));
        }

        // Delete category
        await deleteDoc(doc(db, 'programCategories', categoryId));
        
        loadCategories();
        alert('Category and all programs deleted successfully!');
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category');
    }
};

// View Programs
window.viewPrograms = async function(categoryId, categoryName) {
    currentCategoryId = categoryId;
    document.getElementById('programsModalTitle').textContent = categoryName + ' - Programs';
    
    // Auto-detect and set language based on category name
    const detectedLanguage = detectLanguageFromCategory(categoryName);
    if (detectedLanguage) {
        document.getElementById('programLanguage').value = detectedLanguage;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('programsModal'));
    modal.show();
    
    loadPrograms(categoryId);
};

// View Category JSON
window.viewCategoryJSON = async function(categoryId, categoryName) {
    try {
        const q = query(collection(db, 'programs'), where('categoryId', '==', categoryId));
        const snapshot = await getDocs(q);
        
        const programs = [];
        for (const docSnap of snapshot.docs) {
            const program = docSnap.data();
            
            // Parse code files
            let codeData = '';
            try {
                const codeFiles = JSON.parse(program.code);
                if (codeFiles.length === 1) {
                    codeData = codeFiles[0].code;
                } else {
                    codeData = program.code;
                }
            } catch (e) {
                codeData = program.code || '';
            }
            
            programs.push({
                program_name: program.title,
                description: program.description || '',
                instruction: program.details ? program.details.replace(/<[^>]*>/g, '').replace(/\n+/g, '\n') : '',
                code: codeData,
                output: program.output || '',
                language: program.language,
                downloadLink: program.downloadLink || ''
            });
        }
        
        // Sort by orderIndex
        programs.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        
        // Create JSON blob and open in new tab
        const jsonString = JSON.stringify(programs, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
            alert('Please allow popups to view JSON');
        }
        
        // Clean up URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
    } catch (error) {
        console.error('Error generating JSON:', error);
        alert('Error generating JSON: ' + error.message);
    }
};

function detectLanguageFromCategory(categoryName) {
    const lowerName = categoryName.toLowerCase();
    if (lowerName.includes('java') && !lowerName.includes('javascript')) return 'java';
    if (lowerName.includes('python')) return 'python';
    if (lowerName.includes('c++') || lowerName.includes('cpp')) return 'cpp';
    if (lowerName.includes('javascript') || lowerName.includes('js')) return 'javascript';
    if (lowerName.includes('html')) return 'html';
    if (lowerName.includes('css')) return 'css';
    if (lowerName.includes('android')) return 'java';
    if (lowerName.includes('kotlin')) return 'kotlin';
    if (lowerName.includes('swift') || lowerName.includes('ios')) return 'swift';
    if (lowerName.includes('flutter')) return 'dart';
    if (lowerName.includes('react')) return 'javascript';
    if (lowerName.includes('angular')) return 'typescript';
    if (lowerName.includes('vue')) return 'javascript';
    if (lowerName.includes('node')) return 'javascript';
    if (lowerName.includes('go')) return 'go';
    if (lowerName.includes('ruby')) return 'ruby';
    if (lowerName.includes('php')) return 'php';
    if (lowerName.includes('sql')) return 'sql';
    if (lowerName.includes('c') && !lowerName.includes('c++')) return 'c';
    return 'java';
}

// Load Programs
let allProgramsCache = [];

async function loadPrograms(categoryId) {
    const container = document.getElementById('programsList');
    container.innerHTML = '<div class="text-center"><div class="spinner-border"></div></div>';

    try {
        const q = query(collection(db, 'programs'), 
            where('categoryId', '==', categoryId));
        const snapshot = await getDocs(q);
        
        // Sort manually
        allProgramsCache = [];
        snapshot.forEach((docSnap) => {
            const program = docSnap.data();
            program.id = docSnap.id;
            allProgramsCache.push(program);
        });
        allProgramsCache.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        
        displayPrograms(allProgramsCache);
    } catch (error) {
        console.error('Error loading programs:', error);
        container.innerHTML = '<div class="text-center text-danger">Error loading programs</div>';
    }
}

function displayPrograms(programsArray) {
    const container = document.getElementById('programsList');
    container.innerHTML = '';
    
    if (programsArray.length === 0) {
        container.innerHTML = '<div class="text-center text-muted">No programs found</div>';
        return;
    }

    programsArray.forEach((program, index) => {
        const programId = program.id;
        
        const item = `
            <div class="program-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="d-flex align-items-start">
                        <input class="form-check-input me-2 program-checkbox" type="checkbox" value="${programId}" onchange="updateDeleteButton()">
                        <div>
                            <h6 class="mb-1">${index + 1}. ${program.title}</h6>
                            <small class="text-muted">${program.description || 'No description'}</small>
                            <br><span class="badge bg-info mt-1">${program.language.toUpperCase()}</span>
                            ${program.jsonUrl ? '<span class="badge bg-success mt-1 ms-1">JSON</span>' : ''}
                        </div>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-secondary" onclick="moveProgram('${programId}', 'up')" title="Move Up">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="moveProgram('${programId}', 'down')" title="Move Down">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="viewProgramDetails('${programId}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="editProgram('${programId}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProgram('${programId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += item;
    });
}

// Show Bulk Import Modal
window.showBulkImportModal = function() {
    document.getElementById('jsonUrl').value = '';
    document.getElementById('importProgress').style.display = 'none';
    const modal = new bootstrap.Modal(document.getElementById('bulkImportModal'));
    modal.show();
};

// Import Programs from JSON
window.importPrograms = async function() {
    const url = document.getElementById('jsonUrl').value.trim();
    if (!url) {
        alert('Please enter GitHub JSON URL');
        return;
    }
    
    // Convert GitHub URL to raw URL
    let rawUrl = url;
    if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
        rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    
    document.getElementById('importProgress').style.display = 'block';
    document.getElementById('importStatus').textContent = 'Fetching JSON...';
    document.getElementById('importProgressBar').style.width = '10%';
    
    try {
        const response = await fetch(rawUrl);
        if (!response.ok) throw new Error('Failed to fetch JSON');
        
        const programs = await response.json();
        if (!Array.isArray(programs)) throw new Error('Invalid JSON format');
        
        document.getElementById('importStatus').textContent = `Importing ${programs.length} programs...`;
        document.getElementById('importProgressBar').style.width = '30%';
        
        const language = detectLanguageFromCategory(document.getElementById('programsModalTitle').textContent);
        
        // Get current max orderIndex
        const q = query(collection(db, 'programs'), where('categoryId', '==', currentCategoryId));
        const snapshot = await getDocs(q);
        let maxOrder = snapshot.size;
        
        let imported = 0;
        let skipped = 0;
        
        // Get existing programs to check duplicates
        const existingPrograms = [];
        snapshot.forEach(doc => {
            existingPrograms.push(doc.data().title.toLowerCase());
        });
        
        for (const prog of programs) {
            const title = prog.program_name || 'Untitled';
            
            // Check for duplicate
            if (existingPrograms.includes(title.toLowerCase())) {
                skipped++;
                continue;
            }
            
            const codeData = prog.code ? [{name: 'Main.' + getFileExtension(language), code: prog.code}] : [];
            
            await addDoc(collection(db, 'programs'), {
                categoryId: currentCategoryId,
                title: prog.program_name || 'Untitled',
                description: prog.description || '',
                language: language,
                code: JSON.stringify(codeData),
                output: prog.output || '',
                details: prog.instruction ? `<p>${prog.instruction.replace(/\n/g, '<br>')}</p>` : '',
                downloadLink: '',
                orderIndex: maxOrder++,
                timestamp: Date.now()
            });
            
            imported++;
            existingPrograms.push(title.toLowerCase());
            const progress = 30 + (imported / programs.length * 60);
            document.getElementById('importProgressBar').style.width = progress + '%';
            document.getElementById('importStatus').textContent = `Imported ${imported}/${programs.length} programs...`;
        }
        
        document.getElementById('importProgressBar').style.width = '100%';
        let statusMsg = `✅ Successfully imported ${imported} programs!`;
        if (skipped > 0) statusMsg += ` (${skipped} duplicates skipped)`;
        document.getElementById('importStatus').textContent = statusMsg;
        
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('bulkImportModal')).hide();
            loadPrograms(currentCategoryId);
            loadCategories();
        }, 2000);
        
    } catch (error) {
        console.error('Import error:', error);
        document.getElementById('importStatus').textContent = '❌ Error: ' + error.message;
        document.getElementById('importProgressBar').classList.add('bg-danger');
    }
};

// Toggle Select All
window.toggleSelectAll = function() {
    const selectAll = document.getElementById('selectAllPrograms');
    const checkboxes = document.querySelectorAll('.program-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateDeleteButton();
};

// Update Delete Button Visibility
window.updateDeleteButton = function() {
    const checkboxes = document.querySelectorAll('.program-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    deleteBtn.style.display = checkboxes.length > 0 ? 'inline-block' : 'none';
};

// Delete Selected Programs
window.deleteSelected = async function() {
    const checkboxes = document.querySelectorAll('.program-checkbox:checked');
    if (checkboxes.length === 0) return;
    
    if (!confirm(`Delete ${checkboxes.length} selected programs?`)) return;
    
    try {
        const deletePromises = [];
        checkboxes.forEach(checkbox => {
            deletePromises.push(deleteDoc(doc(db, 'programs', checkbox.value)));
        });
        
        await Promise.all(deletePromises);
        
        document.getElementById('selectAllPrograms').checked = false;
        await loadPrograms(currentCategoryId);
        await loadCategories();
        alert(`${checkboxes.length} programs deleted successfully!`);
    } catch (error) {
        console.error('Error deleting programs:', error);
        alert('Error deleting programs: ' + error.message);
    }
};

// Show Add Program Modal
window.showAddProgramModal = function() {
    document.getElementById('programModalTitle').textContent = 'Add Program';
    document.getElementById('programTitle').value = '';
    document.getElementById('programDesc').value = '';
    
    const categoryName = document.getElementById('programsModalTitle').textContent.split(' - ')[0];
    const detectedLanguage = detectLanguageFromCategory(categoryName);
    document.getElementById('programLanguage').value = detectedLanguage;
    
    codeFiles = [{name: 'Main.' + getFileExtension(detectedLanguage), code: ''}];
    renderCodeFiles();
    
    document.getElementById('programOutput').value = '';
    detailsQuill.root.innerHTML = '';
    
    currentProgramId = null;
    
    const modal = new bootstrap.Modal(document.getElementById('addProgramModal'));
    modal.show();
};

function getFileExtension(language) {
    const extensions = {
        'java': 'java', 'python': 'py', 'c': 'c', 'cpp': 'cpp',
        'javascript': 'js', 'html': 'html', 'css': 'css', 'kotlin': 'kt',
        'swift': 'swift', 'dart': 'dart', 'go': 'go', 'ruby': 'rb', 'php': 'php'
    };
    return extensions[language] || 'txt';
}

window.addCodeFile = function() {
    const language = document.getElementById('programLanguage').value;
    codeFiles.push({name: 'File' + (codeFiles.length + 1) + '.' + getFileExtension(language), code: ''});
    renderCodeFiles();
};

function renderCodeFiles() {
    const container = document.getElementById('codeFilesContainer');
    container.innerHTML = '';
    
    codeFiles.forEach((file, index) => {
        const fileDiv = `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <input type="text" class="form-control form-control-sm w-50" 
                               value="${file.name}" 
                               onchange="updateFileName(${index}, this.value)" 
                               placeholder="Filename">
                        <button class="btn btn-sm btn-danger" onclick="removeCodeFile(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <textarea class="form-control" rows="8" 
                              style="font-family: monospace; font-size: 13px;" 
                              onchange="updateFileCode(${index}, this.value)" 
                              placeholder="Enter code...">${file.code}</textarea>
                </div>
            </div>
        `;
        container.innerHTML += fileDiv;
    });
}

window.updateFileName = function(index, name) {
    codeFiles[index].name = name;
};

window.updateFileCode = function(index, code) {
    codeFiles[index].code = code;
};

window.removeCodeFile = function(index) {
    if (codeFiles.length === 1) {
        alert('At least one file is required');
        return;
    }
    codeFiles.splice(index, 1);
    renderCodeFiles();
};

// Save Program
window.saveProgram = async function() {
    const title = document.getElementById('programTitle').value.trim();
    const description = document.getElementById('programDesc').value.trim();
    const jsonUrl = document.getElementById('programJsonUrl').value.trim();
    const language = document.getElementById('programLanguage').value;
    const code = JSON.stringify(codeFiles);
    const output = document.getElementById('programOutput').value.trim();
    const downloadLink = document.getElementById('programDownloadLink').value.trim();
    const details = detailsQuill.root.innerHTML;

    if (!title) {
        alert('Please enter title');
        return;
    }
    
    // If jsonUrl is provided, code is optional
    if (!jsonUrl && (codeFiles.length === 0 || !codeFiles[0].code)) {
        alert('Please enter JSON URL or at least one code file');
        return;
    }
    
    // Check for duplicate title in edit mode
    if (!currentProgramId) {
        const q = query(collection(db, 'programs'), 
            where('categoryId', '==', currentCategoryId),
            where('title', '==', title));
        const duplicateCheck = await getDocs(q);
        if (!duplicateCheck.empty) {
            alert('A program with this title already exists in this category!');
            return;
        }
    }

    try {
        const programData = {
            categoryId: currentCategoryId,
            title,
            description,
            language,
            timestamp: Date.now()
        };
        
        // If jsonUrl is provided, only save jsonUrl and basic info
        if (jsonUrl) {
            programData.jsonUrl = jsonUrl;
            programData.code = '';
            programData.output = '';
            programData.downloadLink = '';
            programData.details = '';
        } else {
            // Save full program data
            programData.code = code;
            programData.output = output;
            programData.downloadLink = downloadLink;
            programData.details = details;
        }

        if (currentProgramId) {
            await updateDoc(doc(db, 'programs', currentProgramId), programData);
            alert('Program updated successfully!');
        } else {
            const q = query(collection(db, 'programs'), where('categoryId', '==', currentCategoryId));
            const snapshot = await getDocs(q);
            const maxOrder = snapshot.size;
            
            programData.orderIndex = maxOrder;
            await addDoc(collection(db, 'programs'), programData);
            alert('Program added successfully!');
        }

        bootstrap.Modal.getInstance(document.getElementById('addProgramModal')).hide();
        loadPrograms(currentCategoryId);
        loadCategories();
    } catch (error) {
        console.error('Error saving program:', error);
        alert('Error saving program');
    }
};

// Edit Program
window.editProgram = async function(programId) {
    try {
        const docSnap = await getDoc(doc(db, 'programs', programId));
        if (docSnap.exists()) {
            const program = docSnap.data();
            
            document.getElementById('programModalTitle').textContent = 'Edit Program';
            document.getElementById('programTitle').value = program.title;
            document.getElementById('programDesc').value = program.description || '';
            document.getElementById('programJsonUrl').value = program.jsonUrl || '';
            document.getElementById('programLanguage').value = program.language;
            
            try {
                codeFiles = JSON.parse(program.code);
            } catch (e) {
                codeFiles = [{name: 'Main.' + getFileExtension(program.language), code: program.code}];
            }
            renderCodeFiles();
            
            document.getElementById('programOutput').value = program.output || '';
            document.getElementById('programDownloadLink').value = program.downloadLink || '';
            detailsQuill.root.innerHTML = program.details || '';
            
            currentProgramId = programId;
            
            const modal = new bootstrap.Modal(document.getElementById('addProgramModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading program:', error);
        alert('Error loading program');
    }
};

// Delete Program
window.deleteProgram = async function(programId) {
    if (!confirm('Are you sure you want to delete this program?')) return;

    try {
        await deleteDoc(doc(db, 'programs', programId));
        loadPrograms(currentCategoryId);
        loadCategories(); // Refresh counts
        alert('Program deleted successfully!');
    } catch (error) {
        console.error('Error deleting program:', error);
        alert('Error deleting program');
    }
};

// Auto Format Details
window.autoFormatDetails = function() {
    const text = detailsQuill.getText();
    if (!text.trim()) {
        alert('Please enter some text first');
        return;
    }
    
    detailsQuill.setText('');
    const lines = text.split('\n');
    let index = 0;
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Main numbered headings (1), 2), 3))
        if (/^\d+\)/.test(trimmed)) {
            detailsQuill.insertText(index, trimmed + '\n', { 'header': 2, 'bold': true });
            index += trimmed.length + 1;
        }
        // Sub items with roman numerals (i., ii., iii.)
        else if (/^(i{1,3}|iv|v|vi{0,3}|ix|x)\./.test(trimmed)) {
            detailsQuill.insertText(index, '  ' + trimmed + '\n', { 'bold': true });
            index += trimmed.length + 3;
        }
        // File paths (contains / or \\)
        else if (trimmed.includes('/') || trimmed.includes('\\\\')) {
            detailsQuill.insertText(index, trimmed + '\n', { 'code-block': true });
            index += trimmed.length + 1;
        }
        // Emoji bullets or checkmarks
        else if (/^[📌✅🔥]/.test(trimmed)) {
            detailsQuill.insertText(index, trimmed + '\n');
            index += trimmed.length + 1;
        }
        // Lines with colons (labels)
        else if (trimmed.includes(':') && trimmed.length < 50) {
            detailsQuill.insertText(index, trimmed + '\n', { 'bold': true });
            index += trimmed.length + 1;
        }
        // Regular text
        else {
            detailsQuill.insertText(index, trimmed + '\n');
            index += trimmed.length + 1;
        }
    });
    
    alert('Text formatted successfully!');
};

// View Program Details
window.viewProgramDetails = async function(programId) {
    try {
        const docSnap = await getDoc(doc(db, 'programs', programId));
        if (docSnap.exists()) {
            const program = docSnap.data();
            
            const detailsHtml = `
                <div class="modal fade" id="programDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${program.title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p class="text-muted">${program.description || ''}</p>
                                <span class="badge bg-info mb-3">${program.language.toUpperCase()}</span>
                                
                                <h6>Code:</h6>
                                <div class="code-preview mb-3">${escapeHtml(program.code)}</div>
                                
                                <h6>Output:</h6>
                                <div class="code-preview">${escapeHtml(program.output || 'No output')}</div>
                                
                                ${program.details ? `<h6 class="mt-3">Details:</h6><div class="code-preview">${program.details}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('programDetailsModal');
            if (existingModal) existingModal.remove();
            
            document.body.insertAdjacentHTML('beforeend', detailsHtml);
            const modal = new bootstrap.Modal(document.getElementById('programDetailsModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading program details:', error);
        alert('Error loading program details');
    }
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    
    // Initialize Quill editor
    detailsQuill = new Quill('#detailsEditor', {
        theme: 'snow',
        modules: {
            toolbar: [
                ['undo', 'redo'],
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['link'],
                ['clean']
            ]
        }
    });
    
    // Add undo/redo handlers
    const toolbar = detailsQuill.getModule('toolbar');
    toolbar.addHandler('undo', () => detailsQuill.history.undo());
    toolbar.addHandler('redo', () => detailsQuill.history.redo());
    
    // Reset modal on close
    document.getElementById('addCategoryModal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryDesc').value = '';
        currentCategoryId = null;
        
        const modalFooter = document.querySelector('#addCategoryModal .modal-footer');
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="addCategory()">Add Category</button>
        `;
    });
    
    // Program search functionality
    const programSearchInput = document.getElementById('programSearchInput');
    if (programSearchInput) {
        programSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = allProgramsCache.filter(program => 
                program.title.toLowerCase().includes(searchTerm) ||
                (program.description && program.description.toLowerCase().includes(searchTerm)) ||
                program.language.toLowerCase().includes(searchTerm)
            );
            displayPrograms(filtered);
        });
    }
});
