import { db } from './firebase-config.js';
import { collection, getDocs, doc, updateDoc, addDoc, orderBy, query, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let allRatings = [];
let currentTab = 'all';

document.addEventListener('DOMContentLoaded', function() {
    loadRatings();
    loadCourses();
});

async function loadRatings() {
    try {
        const q = query(collection(db, 'course_ratings'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        allRatings = [];
        originalRatings = [];
        
        snapshot.forEach(doc => {
            const rating = {
                id: doc.id,
                ...doc.data()
            };
            allRatings.push(rating);
        });
        
        originalRatings = [...allRatings];
        console.log('Loaded ratings:', allRatings.length);
        displayRatings();
    } catch (error) {
        console.error('Error loading ratings:', error);
    }
}

async function loadCourses() {
    try {
        const snapshot = await getDocs(collection(db, 'courses'));
        const courseFilter = document.getElementById('courseFilter');
        
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().title;
            courseFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

window.showTab = function(tab) {
    currentTab = tab;
    document.querySelectorAll('.nav-link').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    displayRatings();
}

function displayRatings() {
    const container = document.getElementById('ratingsContainer');
    let filteredRatings = [...allRatings];
    
    if (currentTab === 'course') {
        filteredRatings = groupByCourse(filteredRatings);
    } else if (currentTab === 'user') {
        filteredRatings = groupByUser(filteredRatings);
    }
    
    container.innerHTML = '';
    
    if (currentTab === 'all') {
        filteredRatings.forEach(rating => {
            container.appendChild(createRatingCard(rating));
        });
    } else {
        Object.keys(filteredRatings).forEach(key => {
            const groupDiv = document.createElement('div');
            groupDiv.innerHTML = `<h5 class="mt-4 mb-3 text-primary">${key}</h5>`;
            container.appendChild(groupDiv);
            
            filteredRatings[key].forEach(rating => {
                container.appendChild(createRatingCard(rating));
            });
        });
    }
}

function groupByCourse(ratings) {
    return ratings.reduce((groups, rating) => {
        const courseId = rating.courseId || 'Unknown Course';
        if (!groups[courseId]) groups[courseId] = [];
        groups[courseId].push(rating);
        return groups;
    }, {});
}

function groupByUser(ratings) {
    return ratings.reduce((groups, rating) => {
        const userName = rating.userName || 'Anonymous';
        if (!groups[userName]) groups[userName] = [];
        groups[userName].push(rating);
        return groups;
    }, {});
}

function createRatingCard(rating) {
    const card = document.createElement('div');
    card.className = 'rating-card';
    
    const stars = '★'.repeat(rating.rating) + '☆'.repeat(5 - rating.rating);
    const date = new Date(rating.timestamp).toLocaleDateString();
    
    // Handle multiple replies
    let repliesHtml = '';
    if (rating.adminReplies && rating.adminReplies.length > 0) {
        rating.adminReplies.forEach((reply, index) => {
            const replyDate = new Date(reply.timestamp).toLocaleDateString();
            repliesHtml += `
                <div class="existing-reply mb-2">
                    <strong>Admin Reply ${index + 1}:</strong> <small class="text-muted">${replyDate}</small><br>
                    ${reply.message}
                </div>
            `;
        });
    } else if (rating.adminReply) {
        // Legacy single reply support
        repliesHtml = `
            <div class="existing-reply mb-2">
                <strong>Admin Reply:</strong><br>
                ${rating.adminReply}
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="rating-header">
            <div>
                <strong>${rating.userName || 'Anonymous'}</strong>
                <div class="stars">${stars}</div>
            </div>
            <div class="rating-meta">
                Course: ${rating.courseId}<br>
                Date: ${date}
            </div>
        </div>
        
        ${rating.comment ? `<div class="rating-comment">"${rating.comment}"</div>` : ''}
        
        <div class="reply-section">
            ${repliesHtml}
            <div class="mb-2">
                <textarea class="form-control" placeholder="Write your reply..." id="reply-${rating.id}" rows="3"></textarea>
            </div>
            <button class="btn btn-success btn-sm" onclick="sendReply('${rating.id}', '${rating.userId}')">
                <i class="fas fa-reply"></i> Send Reply
            </button>
        </div>
    `;
    
    return card;
}

window.sendReply = async function(ratingId, userId) {
    const replyText = document.getElementById(`reply-${ratingId}`).value.trim();
    
    if (!replyText) {
        alert('Please enter a reply message');
        return;
    }
    
    try {
        // Get current rating to check existing replies
        const ratingDoc = await getDoc(doc(db, 'course_ratings', ratingId));
        const ratingData = ratingDoc.data();
        
        let adminReplies = ratingData.adminReplies || [];
        
        // Add new reply to array
        adminReplies.push({
            message: replyText,
            timestamp: Date.now(),
            adminId: 'admin' // You can get actual admin ID if needed
        });
        
        // Update rating with new reply
        await updateDoc(doc(db, 'course_ratings', ratingId), {
            adminReplies: adminReplies,
            lastReplyTimestamp: Date.now()
        });
        
        // Send notification to user
        await sendNotificationToUser(userId, replyText, ratingId);
        
        // Clear the input
        document.getElementById(`reply-${ratingId}`).value = '';
        
        alert('Reply sent successfully!');
        loadRatings(); // Refresh the display
        
    } catch (error) {
        console.error('Error sending reply:', error);
        alert('Error sending reply');
    }
}

async function sendNotificationToUser(userId, replyText, ratingId) {
    try {
        // Get the original rating to include user's comment
        const ratingDoc = await getDoc(doc(db, 'course_ratings', ratingId));
        const ratingData = ratingDoc.data();
        
        const userComment = ratingData.comment || 'your rating';
        const courseId = ratingData.courseId || 'course';
        
        const notificationData = {
            userId: userId,
            title: 'Admin Reply to Your Rating',
            message: `Admin replied to your comment: "${userComment.substring(0, 40)}..." - ${replyText.substring(0, 30)}...`,
            type: 'rating_reply',
            targetId: ratingId,
            data: {
                ratingId: ratingId,
                replyText: replyText,
                originalComment: userComment,
                courseId: courseId
            },
            timestamp: Date.now(),
            isRead: false
        };
        
        // Send to both collections for compatibility
        await addDoc(collection(db, 'notifications'), notificationData);
        await addDoc(collection(db, 'app_notifications'), notificationData);
        console.log('Notification sent to user:', userId);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

let originalRatings = [];

window.applyFilters = function() {
    const courseFilter = document.getElementById('courseFilter').value;
    const ratingFilter = document.getElementById('ratingFilter').value;
    
    // Store original if not already stored
    if (originalRatings.length === 0) {
        originalRatings = [...allRatings];
    }
    
    let filtered = [...originalRatings];
    
    if (courseFilter) {
        filtered = filtered.filter(rating => rating.courseId === courseFilter);
    }
    
    if (ratingFilter) {
        filtered = filtered.filter(rating => rating.rating == parseInt(ratingFilter));
    }
    
    allRatings = filtered;
    displayRatings();
    
    console.log('Applied filters - Course:', courseFilter, 'Rating:', ratingFilter, 'Results:', filtered.length);
}

window.clearFilters = function() {
    document.getElementById('courseFilter').value = '';
    document.getElementById('ratingFilter').value = '';
    allRatings = [...originalRatings];
    displayRatings();
}