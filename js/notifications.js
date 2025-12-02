import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    getDoc, 
    query, 
    orderBy, 
    where, 
    limit,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let allUsers = [];
let allNotifications = [];

// Load users for dropdown
async function loadUsers() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        allUsers = [];
        
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            allUsers.push({
                id: doc.id,
                email: userData.email,
                name: userData.name || userData.email,
                fcmToken: userData.fcmToken
            });
        });

        const userSelect = document.getElementById('specificUser');
        userSelect.innerHTML = '<option value="">Select a user</option>';
        
        allUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.name} (${user.email})`;
            userSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error loading users', 'danger');
    }
}

// Load notifications history
async function loadNotifications() {
    try {
        const filterType = document.getElementById('filterType').value;
        let notificationsQuery;

        if (filterType !== 'all') {
            // Simple query without orderBy to avoid composite index requirement
            notificationsQuery = query(
                collection(db, 'admin_notifications'),
                where('type', '==', filterType)
            );
        } else {
            // Simple query for all notifications
            notificationsQuery = query(
                collection(db, 'admin_notifications')
            );
        }

        const snapshot = await getDocs(notificationsQuery);
        allNotifications = [];
        
        snapshot.forEach((doc) => {
            allNotifications.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort notifications by sentAt timestamp (client-side)
        allNotifications.sort((a, b) => {
            const timeA = a.sentAt ? a.sentAt.seconds : 0;
            const timeB = b.sentAt ? b.sentAt.seconds : 0;
            return timeB - timeA; // Descending order (newest first)
        });

        displayNotifications();
    } catch (error) {
        console.error('Error loading notifications:', error);
        showAlert('Error loading notifications', 'danger');
    }
}

// Display notifications in table
function displayNotifications() {
    const tbody = document.getElementById('notificationsTable');
    
    if (allNotifications.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-bell-slash fa-2x mb-2"></i><br>
                    No notifications found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = allNotifications.map(notification => {
        const sentAt = notification.sentAt ? 
            new Date(notification.sentAt.seconds * 1000).toLocaleString() : 
            'Unknown';
        
        const recipientCount = notification.recipientType === 'all' ? 
            'All Users' : 
            '1 User';

        const statusBadge = getStatusBadge(notification.status || 'sent');
        const typeBadge = getTypeBadge(notification.type || 'custom');

        return `
            <tr>
                <td>
                    <strong>${notification.title}</strong>
                </td>
                <td>
                    <div class="text-truncate" style="max-width: 200px;" title="${notification.message}">
                        ${notification.message}
                    </div>
                </td>
                <td>${typeBadge}</td>
                <td>${recipientCount}</td>
                <td>${sentAt}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewNotificationDetails('${notification.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Get status badge
function getStatusBadge(status) {
    const badges = {
        'sent': '<span class="badge bg-success">Sent</span>',
        'pending': '<span class="badge bg-warning">Pending</span>',
        'failed': '<span class="badge bg-danger">Failed</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

// Get type badge
function getTypeBadge(type) {
    const badges = {
        'custom': '<span class="badge bg-primary">Custom</span>',
        'course': '<span class="badge bg-info">Course</span>',
        'ebook': '<span class="badge bg-success">E-book</span>',
        'interview': '<span class="badge bg-warning">Interview</span>'
    };
    return badges[type] || '<span class="badge bg-secondary">Other</span>';
}

// Send custom notification
async function sendCustomNotification() {
    const form = document.getElementById('notificationForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const title = document.getElementById('notificationTitle').value.trim();
    const message = document.getElementById('notificationMessage').value.trim();
    const recipientType = document.getElementById('recipientType').value;
    const specificUser = document.getElementById('specificUser').value;
    const icon = document.getElementById('notificationIcon').value.trim();
    const actionUrl = document.getElementById('actionUrl').value.trim();

    if (!title || !message || !recipientType) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }

    if (recipientType === 'specific' && !specificUser) {
        showAlert('Please select a specific user', 'danger');
        return;
    }

    try {
        // Show loading
        const sendBtn = document.querySelector('#sendNotificationModal .btn-primary');
        const originalText = sendBtn.innerHTML;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        sendBtn.disabled = true;

        // Prepare notification data
        const notificationData = {
            title,
            message,
            type: 'custom',
            recipientType,
            icon: icon || null,
            actionUrl: actionUrl || null,
            sentAt: serverTimestamp(),
            sentBy: auth.currentUser.email,
            status: 'sent'
        };

        if (recipientType === 'specific') {
            const selectedUser = allUsers.find(u => u.id === specificUser);
            notificationData.recipientId = specificUser;
            notificationData.recipientEmail = selectedUser?.email;
        }

        // Save to admin_notifications collection
        await addDoc(collection(db, 'admin_notifications'), notificationData);

        // Send to app_notifications collection for mobile app
        const appNotificationData = {
            title,
            message,
            type: 'custom',
            icon: icon || 'https://via.placeholder.com/64x64/007bff/ffffff?text=N',
            actionUrl: actionUrl || null,
            timestamp: serverTimestamp(),
            isRead: false
        };

        if (recipientType === 'all') {
            // Send to all users
            for (const user of allUsers) {
                await addDoc(collection(db, 'app_notifications'), {
                    ...appNotificationData,
                    userId: user.id
                });
            }
        } else {
            // Send to specific user
            await addDoc(collection(db, 'app_notifications'), {
                ...appNotificationData,
                userId: specificUser
            });
        }

        // Also add to old notifications collection for backward compatibility
        await addDoc(collection(db, 'notifications'), {
            title,
            message,
            type: 'custom',
            icon: icon || 'https://via.placeholder.com/64x64/007bff/ffffff?text=N',
            actionUrl: actionUrl || null,
            timestamp: serverTimestamp(),
            isRead: false,
            targetId: recipientType === 'specific' ? specificUser : 'all'
        });

        showAlert('Notification sent successfully!', 'success');
        
        // Reset form and close modal
        form.reset();
        document.getElementById('userSelectDiv').style.display = 'none';
        bootstrap.Modal.getInstance(document.getElementById('sendNotificationModal')).hide();
        
        // Reload notifications
        loadNotifications();

    } catch (error) {
        console.error('Error sending notification:', error);
        showAlert('Notification saved but may not deliver immediately. Error: ' + error.message, 'warning');
    } finally {
        // Reset button
        const sendBtn = document.querySelector('#sendNotificationModal .btn-primary');
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Notification';
        sendBtn.disabled = false;
    }
}

// FCM will be handled by Firebase Cloud Functions automatically
// No need for manual FCM calls from web admin

// View notification details
async function viewNotificationDetails(notificationId) {
    try {
        const notification = allNotifications.find(n => n.id === notificationId);
        if (!notification) return;

        const sentAt = notification.sentAt ? 
            new Date(notification.sentAt.seconds * 1000).toLocaleString() : 
            'Unknown';

        const detailsContent = document.getElementById('notificationDetailsContent');
        detailsContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Basic Information</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Title:</strong></td><td>${notification.title}</td></tr>
                        <tr><td><strong>Type:</strong></td><td>${getTypeBadge(notification.type)}</td></tr>
                        <tr><td><strong>Status:</strong></td><td>${getStatusBadge(notification.status)}</td></tr>
                        <tr><td><strong>Sent At:</strong></td><td>${sentAt}</td></tr>
                        <tr><td><strong>Sent By:</strong></td><td>${notification.sentBy || 'System'}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Recipients</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Type:</strong></td><td>${notification.recipientType === 'all' ? 'All Users' : 'Specific User'}</td></tr>
                        ${notification.recipientEmail ? `<tr><td><strong>User:</strong></td><td>${notification.recipientEmail}</td></tr>` : ''}
                    </table>
                    
                    ${notification.icon ? `
                        <h6>Icon</h6>
                        <img src="${notification.icon}" alt="Icon" style="max-width: 64px; max-height: 64px;" class="border rounded">
                    ` : ''}
                </div>
            </div>
            
            <div class="mt-3">
                <h6>Message</h6>
                <div class="border rounded p-3 bg-light">
                    ${notification.message}
                </div>
            </div>
            
            ${notification.actionUrl ? `
                <div class="mt-3">
                    <h6>Action URL</h6>
                    <a href="${notification.actionUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-external-link-alt"></i> ${notification.actionUrl}
                    </a>
                </div>
            ` : ''}
        `;

        new bootstrap.Modal(document.getElementById('notificationDetailsModal')).show();
    } catch (error) {
        console.error('Error viewing notification details:', error);
        showAlert('Error loading notification details', 'danger');
    }
}

// Show alert
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
    loadNotifications();

    // Recipient type change handler
    document.getElementById('recipientType').addEventListener('change', function() {
        const userSelectDiv = document.getElementById('userSelectDiv');
        if (this.value === 'specific') {
            userSelectDiv.style.display = 'block';
        } else {
            userSelectDiv.style.display = 'none';
        }
    });

    // Filter change handler
    document.getElementById('filterType').addEventListener('change', loadNotifications);
});

// Make functions globally available
window.sendCustomNotification = sendCustomNotification;
window.viewNotificationDetails = viewNotificationDetails;
window.loadNotifications = loadNotifications;