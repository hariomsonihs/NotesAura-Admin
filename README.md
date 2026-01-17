# NotesAura Web Admin Panel

Complete web-based admin panel for NotesAura Programming Guide app with real-time Firebase sync.

## 🚀 Features

- **Dashboard**: Overview stats with total courses, users, practice lists, and quiz categories
- **Course Management**: Add, edit, delete courses with search and filters
- **User Management**: View all users and their details
- **Practice Management**: Manage practice lists with emoji icons
- **Quiz Management**: Manage quiz categories
- **Interview Management**: Manage interview categories
- **Real-time Sync**: All changes automatically sync with Android app via Firebase

## 📋 Setup Instructions

### 1. Firebase Configuration
1. Copy `js/firebase-config.example.js` to `js/firebase-config.js`
2. Add your actual Firebase project credentials in `firebase-config.js`
3. Make sure to add `firebase-config.js` to `.gitignore` for security

### 2. Firestore Security Rules
Update your Firestore rules to allow admin access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Create Admin User
1. Go to Firebase Console → Authentication
2. Add a new user with email/password
3. Use this email/password to login to the web admin panel

### 4. Run the Admin Panel

#### Option A: Using Live Server (Recommended)
1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. Panel will open at `http://localhost:5500`

#### Option B: Using Python HTTP Server
```bash
cd web-admin-panel
python -m http.server 8000
```
Then open `http://localhost:8000` in browser

#### Option C: Using Node.js HTTP Server
```bash
npm install -g http-server
cd web-admin-panel
http-server
```
Then open `http://localhost:8080` in browser

### 5. Login
- Open the admin panel in your browser
- Enter your Firebase admin email and password
- You'll be redirected to the dashboard

## 📁 File Structure

```
web-admin-panel/
├── index.html              # Login page
├── dashboard.html          # Dashboard with stats
├── courses.html            # Course management
├── users.html              # User management
├── practice.html           # Practice management
├── quiz.html               # Quiz management
├── interview.html          # Interview management
├── css/
│   └── style.css          # All styles
├── js/
│   ├── firebase-config.js # Firebase configuration
│   ├── auth.js            # Authentication logic
│   ├── dashboard.js       # Dashboard functionality
│   ├── courses.js         # Course CRUD operations
│   ├── users.js           # User management
│   ├── practice.js        # Practice CRUD operations
│   ├── quiz.js            # Quiz CRUD operations
│   └── interview.js       # Interview CRUD operations
└── README.md              # This file
```

## 🔥 Firebase Collections Used

- `courses` - Course data
- `users` - User profiles
- `practice_lists` - Practice exercises
- `quiz_categories` - Quiz categories
- `interview_categories` - Interview questions

## 💡 Usage

### Adding a Course
1. Go to "Courses" page
2. Click "Add Course" button
3. Fill in course details (title, description, category, etc.)
4. Click "Save"
5. Course will immediately appear in Android app

### Managing Users
1. Go to "Users" page
2. View all registered users
3. Click "View" to see user details
4. Search users by name or email

### Adding Practice/Quiz/Interview
1. Go to respective page
2. Click "Add" button
3. Fill in details with emoji icon
4. Click "Save"
5. Changes sync instantly with Android app

## 🔒 Security Notes

- Only authenticated users can access the admin panel
- Update Firestore rules for production use
- Consider adding role-based access control
- Use environment variables for sensitive data in production

## 🌐 Deployment Options

### Option 1: Firebase Hosting (Recommended)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Option 2: Netlify
1. Drag and drop `web-admin-panel` folder to Netlify
2. Site will be live instantly

### Option 3: Vercel
```bash
npm i -g vercel
cd web-admin-panel
vercel
```

### Option 4: GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Select main branch and root folder

## 📱 Real-time Sync

All changes made in the web admin panel are instantly synced with the Android app because both use the same Firebase project. When you:

- Add/Edit/Delete a course → Android app shows it immediately
- Add practice/quiz/interview → Available in Android app instantly
- No need to rebuild or update the Android app

## 🎨 Customization

### Change Colors
Edit `css/style.css` and modify gradient colors:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Add New Features
1. Create new HTML page
2. Add navigation link in sidebar
3. Create corresponding JS file
4. Import Firebase functions as needed

## 🐛 Troubleshooting

**Login not working?**
- Check Firebase Authentication is enabled
- Verify email/password in Firebase Console
- Check browser console for errors

**Data not loading?**
- Verify Firestore rules allow read/write
- Check Firebase project ID in config
- Open browser console to see errors

**Changes not syncing?**
- Ensure both web and Android use same Firebase project
- Check internet connection
- Verify Firestore rules

## 📞 Support

For issues or questions, check:
- Browser console for errors
- Firebase Console for authentication/database issues
- Network tab for API call failures

---

**NotesAura Web Admin Panel** - Manage your app from anywhere! 🚀
