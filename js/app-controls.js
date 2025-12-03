import { db } from './firebase-config.js';
import { initAuthGuard } from './auth-guard.js';
import { collection, doc, getDocs, setDoc, getDoc, updateDoc, Timestamp, addDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

initAuthGuard();

// Load App Status
async function loadAppStatus() {
    try {
        const configDoc = await getDoc(doc(db, 'app_config', 'main'));
        let config = {};
        
        if (!configDoc.exists()) {
            // Create default config if doesn't exist
            config = {
                maintenanceMode: false,
                forceUpdate: false,
                minAppVersion: '1.0.0',
                latestAppVersion: '1.0.0',
                updateMessage: 'Please update to the latest version',
                playStoreUrl: '',
                featureFlags: {
                    courseDownloads: true,
                    paymentSystem: true,
                    socialSharing: true,
                    pushNotifications: true,
                    darkMode: true,
                    betaFeatures: false
                },
                createdAt: Timestamp.now()
            };
            
            await setDoc(doc(db, 'app_config', 'main'), config);
            console.log('Created default app config');
        } else {
            config = configDoc.data();
        }
        
        // Update UI with current config
        document.getElementById('maintenanceMode').checked = config.maintenanceMode || false;
        
        // Update Force Update button text based on status
        const forceUpdateBtn = document.getElementById('forceUpdateBtn');
        if (config.forceUpdate) {
            forceUpdateBtn.innerHTML = '<i class="fas fa-times"></i> Disable Update';
            forceUpdateBtn.className = 'btn btn-success btn-sm';
        } else {
            forceUpdateBtn.innerHTML = '<i class="fas fa-mobile-alt"></i> Setup Update';
            forceUpdateBtn.className = 'btn btn-warning btn-sm';
        }
        document.getElementById('minAppVersion').value = config.minAppVersion || '1.0.0';
        document.getElementById('latestAppVersion').value = config.latestAppVersion || '1.0.0';
        document.getElementById('updateMessage').value = config.updateMessage || '';
        document.getElementById('apkDownloadUrl').value = config.apkDownloadUrl || '';
        document.getElementById('playStoreUrl').value = config.playStoreUrl || '';
        
        // Update status display
        document.getElementById('appVersion').textContent = config.latestAppVersion || '1.0.0';
        document.getElementById('appStatus').textContent = config.maintenanceMode ? 'Maintenance' : 'Online';
        
        // Load feature flags
        loadFeatureFlags(config.featureFlags || {});
        
        // Load announcement
        if (config.announcement) {
            document.getElementById('announcementText').value = config.announcement.text || '';
            document.getElementById('announcementType').value = config.announcement.type || 'info';
        }
        
    } catch (error) {
        console.error('Error loading app status:', error);
        alert('Error loading app config: ' + error.message);
    }
}

// Load Feature Flags
function loadFeatureFlags(flags) {
    const flagElements = {
        'courseDownloads': document.getElementById('courseDownloads'),
        'paymentSystem': document.getElementById('paymentSystem'),
        'socialSharing': document.getElementById('socialSharing'),
        'pushNotifications': document.getElementById('pushNotifications'),
        'darkMode': document.getElementById('darkMode'),
        'betaFeatures': document.getElementById('betaFeatures')
    };
    
    Object.keys(flagElements).forEach(flag => {
        if (flagElements[flag]) {
            flagElements[flag].checked = flags[flag] !== false; // Default to true if not specified
        }
    });
}

// Load App Statistics
async function loadAppStats() {
    try {
        // Active Users (users who logged in last 24 hours)
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let activeUsers = 0;
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const lastLogin = user.lastLoginAt?.toDate();
            if (lastLogin && lastLogin > oneDayAgo) {
                activeUsers++;
            }
        });
        
        document.getElementById('activeUsers').textContent = activeUsers;
        document.getElementById('activeSessions').textContent = activeUsers;
        
        // Total Downloads (mock data - would come from app analytics)
        document.getElementById('totalDownloads').textContent = '10,000+';
        
    } catch (error) {
        console.error('Error loading app stats:', error);
    }
}

// Save App Configuration
async function saveAppConfig() {
    try {
        const config = {
            minAppVersion: document.getElementById('minAppVersion').value,
            latestAppVersion: document.getElementById('latestAppVersion').value,
            updateMessage: document.getElementById('updateMessage').value,
            apkDownloadUrl: document.getElementById('apkDownloadUrl').value,
            playStoreUrl: document.getElementById('playStoreUrl').value,
            updatedAt: Timestamp.now()
        };
        
        await setDoc(doc(db, 'app_config', 'main'), config, { merge: true });
        alert('App configuration saved successfully!');
        
        // Update display
        document.getElementById('appVersion').textContent = config.latestAppVersion;
        
    } catch (error) {
        console.error('Error saving app config:', error);
        alert('Error saving configuration: ' + error.message);
    }
}

// Save Feature Flags
async function saveFeatureFlags() {
    try {
        const featureFlags = {
            courseDownloads: document.getElementById('courseDownloads').checked,
            paymentSystem: document.getElementById('paymentSystem').checked,
            socialSharing: document.getElementById('socialSharing').checked,
            pushNotifications: document.getElementById('pushNotifications').checked,
            darkMode: document.getElementById('darkMode').checked,
            betaFeatures: document.getElementById('betaFeatures').checked
        };
        
        await setDoc(doc(db, 'app_config', 'main'), {
            featureFlags: featureFlags,
            updatedAt: Timestamp.now()
        }, { merge: true });
        
        alert('Feature flags saved successfully!');
        logAppEvent('Feature flags updated', 'success');
        
    } catch (error) {
        console.error('Error saving feature flags:', error);
        alert('Error saving feature flags: ' + error.message);
    }
}

// Toggle Maintenance Mode
async function toggleMaintenanceMode() {
    try {
        const isMaintenanceMode = document.getElementById('maintenanceMode').checked;
        
        await setDoc(doc(db, 'app_config', 'main'), {
            maintenanceMode: isMaintenanceMode,
            updatedAt: Timestamp.now()
        }, { merge: true });
        
        document.getElementById('appStatus').textContent = isMaintenanceMode ? 'Maintenance' : 'Online';
        
        const message = isMaintenanceMode ? 'Maintenance mode enabled' : 'Maintenance mode disabled';
        alert(message);
        logAppEvent(message, isMaintenanceMode ? 'warning' : 'success');
        
    } catch (error) {
        console.error('Error toggling maintenance mode:', error);
        alert('Error updating maintenance mode: ' + error.message);
    }
}

// Show Force Update Modal
function showForceUpdateModal() {
    const configDoc = doc(db, 'app_config', 'main');
    getDoc(configDoc).then(docSnap => {
        if (docSnap.exists()) {
            const config = docSnap.data();
            
            // If already enabled, disable it
            if (config.forceUpdate) {
                disableForceUpdate();
                return;
            }
            
            // Pre-fill modal with existing data
            document.getElementById('modalLatestVersion').value = config.latestAppVersion || '';
            document.getElementById('modalApkUrl').value = config.apkDownloadUrl || '';
            document.getElementById('modalUpdateMessage').value = config.updateMessage || '';
            document.getElementById('modalPlayStoreUrl').value = config.playStoreUrl || '';
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('forceUpdateModal'));
            modal.show();
        }
    });
}

// Disable Force Update
async function disableForceUpdate() {
    if (!confirm('Are you sure you want to disable force update?')) {
        return;
    }
    
    try {
        await setDoc(doc(db, 'app_config', 'main'), {
            forceUpdate: false,
            updatedAt: Timestamp.now()
        }, { merge: true });
        
        // Update button
        const forceUpdateBtn = document.getElementById('forceUpdateBtn');
        forceUpdateBtn.innerHTML = '<i class="fas fa-mobile-alt"></i> Setup Update';
        forceUpdateBtn.className = 'btn btn-warning btn-sm';
        
        alert('Force update disabled successfully!');
        logAppEvent('Force update disabled', 'info');
        
    } catch (error) {
        console.error('Error disabling force update:', error);
        alert('Error disabling force update: ' + error.message);
    }
}

// Enable Force Update with Configuration
async function enableForceUpdateWithConfig() {
    try {
        const latestVersion = document.getElementById('modalLatestVersion').value.trim();
        const apkUrl = document.getElementById('modalApkUrl').value.trim();
        const updateMessage = document.getElementById('modalUpdateMessage').value.trim();
        const playStoreUrl = document.getElementById('modalPlayStoreUrl').value.trim();
        
        // Validation
        if (!latestVersion) {
            alert('Please enter the latest app version');
            return;
        }
        
        if (!apkUrl) {
            alert('Please enter the APK download URL');
            return;
        }
        
        // Save configuration and enable force update
        await setDoc(doc(db, 'app_config', 'main'), {
            forceUpdate: true,
            latestAppVersion: latestVersion,
            apkDownloadUrl: apkUrl,
            updateMessage: updateMessage || 'Please update to the latest version',
            playStoreUrl: playStoreUrl,
            updatedAt: Timestamp.now()
        }, { merge: true });
        
        // Update UI
        document.getElementById('latestAppVersion').value = latestVersion;
        document.getElementById('apkDownloadUrl').value = apkUrl;
        document.getElementById('updateMessage').value = updateMessage;
        document.getElementById('playStoreUrl').value = playStoreUrl;
        
        // Update button
        const forceUpdateBtn = document.getElementById('forceUpdateBtn');
        forceUpdateBtn.innerHTML = '<i class="fas fa-times"></i> Disable Update';
        forceUpdateBtn.className = 'btn btn-success btn-sm';
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('forceUpdateModal'));
        modal.hide();
        
        alert('Force update enabled successfully! All users will now see the update screen.');
        logAppEvent(`Force update enabled for version ${latestVersion}`, 'warning');
        
    } catch (error) {
        console.error('Error enabling force update:', error);
        alert('Error enabling force update: ' + error.message);
    }
}

// Emergency Shutdown
async function emergencyShutdown() {
    if (!confirm('Are you sure you want to perform an emergency shutdown? This will disable the app for all users.')) {
        return;
    }
    
    try {
        await setDoc(doc(db, 'app_config', 'main'), {
            emergencyShutdown: true,
            maintenanceMode: true,
            shutdownReason: 'Emergency shutdown initiated by admin',
            shutdownAt: Timestamp.now()
        }, { merge: true });
        
        document.getElementById('maintenanceMode').checked = true;
        document.getElementById('appStatus').textContent = 'Shutdown';
        
        alert('Emergency shutdown activated!');
        logAppEvent('Emergency shutdown activated', 'error');
        
    } catch (error) {
        console.error('Error performing emergency shutdown:', error);
        alert('Error performing emergency shutdown: ' + error.message);
    }
}

// Publish Announcement
async function publishAnnouncement() {
    try {
        const text = document.getElementById('announcementText').value.trim();
        const type = document.getElementById('announcementType').value;
        
        if (!text) {
            alert('Please enter announcement text');
            return;
        }
        
        const announcement = {
            text: text,
            type: type,
            publishedAt: Timestamp.now(),
            isActive: true
        };
        
        await setDoc(doc(db, 'app_config', 'main'), {
            announcement: announcement,
            updatedAt: Timestamp.now()
        }, { merge: true });
        
        alert('Announcement published successfully!');
        logAppEvent('Announcement published: ' + text.substring(0, 50) + '...', 'info');
        
    } catch (error) {
        console.error('Error publishing announcement:', error);
        alert('Error publishing announcement: ' + error.message);
    }
}

// Clear Announcement
async function clearAnnouncement() {
    try {
        await setDoc(doc(db, 'app_config', 'main'), {
            announcement: null,
            updatedAt: Timestamp.now()
        }, { merge: true });
        
        document.getElementById('announcementText').value = '';
        alert('Announcement cleared successfully!');
        logAppEvent('Announcement cleared', 'info');
        
    } catch (error) {
        console.error('Error clearing announcement:', error);
        alert('Error clearing announcement: ' + error.message);
    }
}

// Log App Event
async function logAppEvent(message, type = 'info') {
    try {
        const event = {
            message: message,
            type: type,
            timestamp: Timestamp.now(),
            adminUser: 'admin' // Would be actual admin user
        };
        
        // Add to app_events collection
        await setDoc(doc(collection(db, 'app_events')), event);
        
        // Update UI
        updateAppEventsUI(event);
        
    } catch (error) {
        console.error('Error logging app event:', error);
    }
}

// Update App Events UI
function updateAppEventsUI(event) {
    const eventsContainer = document.getElementById('appEvents');
    const eventElement = document.createElement('div');
    eventElement.className = 'list-group-item d-flex align-items-center';
    
    const iconClass = {
        'info': 'fas fa-info-circle text-primary',
        'success': 'fas fa-check-circle text-success',
        'warning': 'fas fa-exclamation-triangle text-warning',
        'error': 'fas fa-times-circle text-danger'
    }[event.type] || 'fas fa-info-circle text-primary';
    
    eventElement.innerHTML = `
        <i class="${iconClass} me-3"></i>
        <div>
            <div>${event.message}</div>
            <small class="text-muted">${new Date().toLocaleString()}</small>
        </div>
    `;
    
    eventsContainer.insertBefore(eventElement, eventsContainer.firstChild);
    
    // Keep only last 10 events
    while (eventsContainer.children.length > 10) {
        eventsContainer.removeChild(eventsContainer.lastChild);
    }
}

// Load Recent App Events
async function loadAppEvents() {
    try {
        const eventsSnapshot = await getDocs(collection(db, 'app_events'));
        const events = [];
        
        eventsSnapshot.forEach(doc => {
            events.push(doc.data());
        });
        
        // Sort by timestamp (newest first)
        events.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
        
        const eventsContainer = document.getElementById('appEvents');
        eventsContainer.innerHTML = '';
        
        events.slice(0, 10).forEach(event => {
            updateAppEventsUI(event);
        });
        
    } catch (error) {
        console.error('Error loading app events:', error);
    }
}

// Event Listeners
document.getElementById('maintenanceMode').addEventListener('change', toggleMaintenanceMode);
document.getElementById('forceUpdateBtn').addEventListener('click', showForceUpdateModal);
document.getElementById('emergencyShutdown').addEventListener('click', emergencyShutdown);
document.getElementById('saveAppConfig').addEventListener('click', saveAppConfig);
document.getElementById('saveFeatureFlags').addEventListener('click', saveFeatureFlags);
document.getElementById('publishAnnouncement').addEventListener('click', publishAnnouncement);
document.getElementById('clearAnnouncement').addEventListener('click', clearAnnouncement);
document.getElementById('refreshStatus').addEventListener('click', () => {
    loadAppStatus();
    loadAppStats();
    loadAppEvents();
});

// Modal event listener
document.getElementById('enableForceUpdate').addEventListener('click', enableForceUpdateWithConfig);

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadAppStatus();
    await loadAppStats();
    await loadAppEvents();
    
    // Log app controls access
    logAppEvent('Admin accessed app controls panel', 'info');
});