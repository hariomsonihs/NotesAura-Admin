import { db } from './firebase-config.js';
import { initAuthGuard } from './auth-guard.js';
import { collection, getDocs, addDoc, query, where, orderBy, limit, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Initialize Auth Guard
initAuthGuard();

// DOM Elements
const targetAudienceSelect = document.getElementById('targetAudience');
const notificationForm = document.getElementById('notificationForm');
const previewBtn = document.getElementById('previewBtn');
const targetStats = document.getElementById('targetStats');
const notificationPreview = document.getElementById('notificationPreview');

// Notification type icons
const typeIcons = {
    'general': '📢',
    'course': '📚',
    'achievement': '🏆',
    'reminder': '⏰',
    'promotion': '🎉'
};

// Update target statistics
async function updateTargetStats() {
    const audience = targetAudienceSelect.value;
    if (!audience) {
        targetStats.innerHTML = '<p class="text-muted">Select target audience to see statistics</p>';
        return;
    }

    try {
        let count = 0;
        let description = '';

        switch (audience) {
            case 'all':
                const allUsers = await getDocs(collection(db, 'users'));
                count = allUsers.size;
                description = 'All registered users';
                break;

            case 'enrolled':
                const enrolledUsers = await getDocs(collection(db, 'enrollments'));
                const uniqueUsers = new Set();
                enrolledUsers.forEach(doc => {
                    const enrollment = doc.data();
                    if (enrollment.userId) {
                        uniqueUsers.add(enrollment.userId);
                    }
                });
                count = uniqueUsers.size;
                description = 'Users with at least one enrollment';
                break;

            case 'new':
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const newUsersQuery = query(
                    collection(db, 'users'),
                    where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))
                );
                const newUsers = await getDocs(newUsersQuery);
                count = newUsers.size;
                description = 'Users registered in the last 7 days';
                break;

            case 'inactive':
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const inactiveUsersQuery = query(
                    collection(db, 'users'),
                    where('lastLoginAt', '<', Timestamp.fromDate(thirtyDaysAgo))
                );
                const inactiveUsers = await getDocs(inactiveUsersQuery);
                count = inactiveUsers.size;
                description = 'Users inactive for 30+ days';
                break;

            case 'premium':
                const premiumUsersQuery = query(
                    collection(db, 'users'),
                    where('premium', '==', true)
                );
                const premiumUsers = await getDocs(premiumUsersQuery);
                count = premiumUsers.size;
                description = 'Premium subscribers';
                break;
        }

        targetStats.innerHTML = `
            <div class="text-center">
                <h3 class="text-primary">${count}</h3>
                <p class="text-muted mb-0">${description}</p>
                <small class="text-success">✓ Ready to send</small>
            </div>
        `;
    } catch (error) {
        console.error('Error loading target stats:', error);
        targetStats.innerHTML = '<p class="text-danger">Error loading statistics</p>';
    }
}

// Update notification preview
function updatePreview() {
    const title = document.getElementById('notificationTitle').value || 'Notification Title';
    const message = document.getElementById('notificationMessage').value || 'Your message will appear here...';
    const type = document.getElementById('notificationType').value || 'general';
    const icon = typeIcons[type] || '📢';

    // Update small preview
    const previewElement = notificationPreview.querySelector('.preview-notification');
    if (previewElement) {
        previewElement.querySelector('.preview-icon').textContent = icon;
        previewElement.querySelector('.preview-title').textContent = title;
        previewElement.querySelector('.preview-message').textContent = message;
    }
}

// Show preview modal
function showPreviewModal() {
    const title = document.getElementById('notificationTitle').value || 'Notification Title';
    const message = document.getElementById('notificationMessage').value || 'Your message will appear here...';
    const type = document.getElementById('notificationType').value || 'general';
    const icon = typeIcons[type] || '📢';

    document.getElementById('previewIconLarge').textContent = icon;
    document.getElementById('previewTitleLarge').textContent = title;
    document.getElementById('previewMessageLarge').textContent = message;

    const modal = new bootstrap.Modal(document.getElementById('previewModal'));
    modal.show();
}

// Send notification
async function sendNotification(formData) {
    try {
        const audience = formData.get('audience');
        const title = formData.get('title');
        const message = formData.get('message');
        const type = formData.get('type');
        const scheduleTime = formData.get('scheduleTime');

        // Get target user IDs based on audience
        let targetUserIds = [];
        
        switch (audience) {
            case 'all':
                const allUsers = await getDocs(collection(db, 'users'));
                targetUserIds = allUsers.docs.map(doc => doc.id);
                break;

            case 'enrolled':
                const enrolledUsers = await getDocs(collection(db, 'enrollments'));
                const uniqueUsers = new Set();
                enrolledUsers.forEach(doc => {
                    const enrollment = doc.data();
                    if (enrollment.userId) {
                        uniqueUsers.add(enrollment.userId);
                    }
                });
                targetUserIds = Array.from(uniqueUsers);
                break;

            case 'new':
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const newUsersQuery = query(
                    collection(db, 'users'),
                    where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))
                );
                const newUsers = await getDocs(newUsersQuery);
                targetUserIds = newUsers.docs.map(doc => doc.id);
                break;

            case 'premium':
                const premiumUsersQuery = query(
                    collection(db, 'users'),
                    where('premium', '==', true)
                );
                const premiumUsers = await getDocs(premiumUsersQuery);
                targetUserIds = premiumUsers.docs.map(doc => doc.id);
                break;
        }

        // Create bulk notification record
        const bulkNotification = {
            title,
            message,
            type,
            audience,
            targetUserIds,
            recipientCount: targetUserIds.length,
            status: scheduleTime ? 'scheduled' : 'sent',
            scheduledFor: scheduleTime ? Timestamp.fromDate(new Date(scheduleTime)) : null,
            sentAt: scheduleTime ? null : Timestamp.now(),
            createdAt: Timestamp.now()
        };

        await addDoc(collection(db, 'bulk_notifications'), bulkNotification);

        // If not scheduled, send individual notifications immediately
        if (!scheduleTime) {
            const batch = [];
            for (const userId of targetUserIds) {
                batch.push({
                    userId,
                    title,
                    message,
                    type,
                    icon: typeIcons[type] || '📢',
                    isRead: false,
                    createdAt: Timestamp.now()
                });
            }

            // Send in batches of 500 (Firestore limit)
            for (let i = 0; i < batch.length; i += 500) {
                const batchSlice = batch.slice(i, i + 500);
                await Promise.all(
                    batchSlice.map(notification => 
                        addDoc(collection(db, 'admin_notifications'), notification)
                    )
                );
            }
        }

        // Show success message
        alert(`Notification ${scheduleTime ? 'scheduled' : 'sent'} successfully to ${targetUserIds.length} users!`);
        
        // Reset form
        notificationForm.reset();
        updateTargetStats();
        updatePreview();
        loadRecentNotifications();

    } catch (error) {
        console.error('Error sending notification:', error);
        alert('Error sending notification. Please try again.');
    }
}

// Load recent notifications
async function loadRecentNotifications() {
    try {
        const q = query(
            collection(db, 'bulk_notifications'),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
        const snapshot = await getDocs(q);
        const tbody = document.getElementById('notificationsTable');

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No notifications sent yet</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const notification = doc.data();
            const row = document.createElement('tr');
            
            const statusBadge = notification.status === 'sent' 
                ? '<span class="badge bg-success">Sent</span>'
                : '<span class="badge bg-warning">Scheduled</span>';

            const sentTime = notification.sentAt 
                ? notification.sentAt.toDate().toLocaleString()
                : notification.scheduledFor?.toDate().toLocaleString() || 'N/A';

            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <span class="me-2">${typeIcons[notification.type] || '📢'}</span>
                        <div>
                            <div class="fw-bold">${notification.title}</div>
                            <small class="text-muted">${notification.message.substring(0, 50)}...</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-info">${notification.audience}</span>
                </td>
                <td>${notification.recipientCount}</td>
                <td>${statusBadge}</td>
                <td>${sentTime}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewNotification('${doc.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading recent notifications:', error);
    }
}

// Event Listeners
targetAudienceSelect.addEventListener('change', updateTargetStats);

document.getElementById('notificationTitle').addEventListener('input', updatePreview);
document.getElementById('notificationMessage').addEventListener('input', updatePreview);
document.getElementById('notificationType').addEventListener('change', updatePreview);

previewBtn.addEventListener('click', showPreviewModal);

document.getElementById('sendFromPreview').addEventListener('click', () => {
    const modal = bootstrap.Modal.getInstance(document.getElementById('previewModal'));
    modal.hide();
    notificationForm.dispatchEvent(new Event('submit'));
});

notificationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('audience', document.getElementById('targetAudience').value);
    formData.append('title', document.getElementById('notificationTitle').value);
    formData.append('message', document.getElementById('notificationMessage').value);
    formData.append('type', document.getElementById('notificationType').value);
    formData.append('scheduleTime', document.getElementById('scheduleTime').value);

    if (confirm('Are you sure you want to send this notification?')) {
        await sendNotification(formData);
    }
});

document.getElementById('refreshBtn').addEventListener('click', loadRecentNotifications);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updatePreview();
    loadRecentNotifications();
});

// Global function for viewing notifications
window.viewNotification = function(id) {
    alert('View notification details: ' + id);
};