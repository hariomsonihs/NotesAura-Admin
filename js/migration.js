import { db } from './firebase-config.js';
import { collection, getDocs, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Migration script to fix courses with category names instead of IDs
window.migrateCourseCategories = async function() {
    if (!confirm('This will update all courses to use category IDs instead of names. Continue?')) {
        return;
    }

    try {
        console.log('Starting migration...');
        
        // Load all categories to create name-to-id mapping
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categoryNameToId = {};
        
        categoriesSnapshot.forEach(doc => {
            const category = doc.data();
            categoryNameToId[category.name] = doc.id;
        });
        
        console.log('Category mapping:', categoryNameToId);
        
        // Load all courses
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        let updatedCount = 0;
        
        for (const courseDoc of coursesSnapshot.docs) {
            const course = courseDoc.data();
            const currentCategory = course.category;
            
            // Check if category is a name (not an ID)
            if (currentCategory && categoryNameToId[currentCategory]) {
                const newCategoryId = categoryNameToId[currentCategory];
                
                console.log(`Updating course "${course.title}": "${currentCategory}" -> "${newCategoryId}"`);
                
                await updateDoc(doc(db, 'courses', courseDoc.id), {
                    category: newCategoryId
                });
                
                updatedCount++;
            }
        }
        
        console.log(`Migration completed. Updated ${updatedCount} courses.`);
        alert(`Migration completed successfully! Updated ${updatedCount} courses.`);
        
        // Reload the page to see changes
        location.reload();
        
    } catch (error) {
        console.error('Migration failed:', error);
        alert('Migration failed: ' + error.message);
    }
}

// Add migration button to the page
document.addEventListener('DOMContentLoaded', function() {
    // Add migration button to courses page
    if (document.getElementById('coursesGrid')) {
        const header = document.querySelector('.d-flex.justify-content-between.align-items-center');
        if (header) {
            const migrationBtn = document.createElement('button');
            migrationBtn.className = 'btn btn-warning btn-sm';
            migrationBtn.innerHTML = '<i class="fas fa-sync"></i> Migrate Categories';
            migrationBtn.onclick = window.migrateCourseCategories;
            header.appendChild(migrationBtn);
        }
    }
});