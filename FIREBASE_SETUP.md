# Firebase Setup Guide for VacAsia

## Overview
This guide will help you configure Firebase and Firestore for the VacAsia application.

## Prerequisites
- Google account
- Firebase project created at https://console.firebase.google.com

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create project" or "Add project"
3. Enter project name: `vacasia`
4. Accept terms and click "Create project"
5. Wait for project initialization (~1-2 minutes)

## Step 2: Get Firebase Configuration

1. In Firebase Console, go to Project Settings (⚙️ icon)
2. Under "General" tab, scroll to "Your apps" section
3. If no app exists, click "Add app" and select Web (`</>`)`
4. Follow the registration flow (name your app as `VacAsia Web`)
5. You'll see the Firebase config. Copy the following values:

```javascript
{
  apiKey: "AIzaSy...",
  authDomain: "vacasia-xxx.firebaseapp.com",
  projectId: "vacasia-xxx",
  storageBucket: "vacasia-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXX"  // Optional
}
```

## Step 3: Update firebaseConfig.js

1. Open `firebaseConfig.js` in the `html/` folder
2. Replace the placeholder values with your actual Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",           // Replace with your apiKey
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",  // Replace with your authDomain
  projectId: "YOUR_PROJECT_ID",              // Replace with your projectId
  storageBucket: "YOUR_PROJECT_ID.appspot.com",  // Replace with your storageBucket
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",  // Replace with messagingSenderId
  appId: "YOUR_APP_ID",                      // Replace with appId
  measurementId: "YOUR_MEASUREMENT_ID"       // Optional - replace with measurementId
};
```

## Step 4: Enable Firebase Services

### Enable Authentication
1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Enable the following sign-in methods:
   - Email/Password
   - Google (Optional)
   - GitHub (Optional)

### Enable Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose location (closest to your users)
4. Select "Start in test mode" (for development)
   - **Important**: In production, set proper security rules
5. Click "Create"

### Enable Cloud Storage
1. In Firebase Console, go to "Storage"
2. Click "Get started"
3. Choose location (same as Firestore)
4. Set storage rules (for development, allow read/write for now)
5. Click "Done"

## Step 5: Add HTML Script Tags

Add these script tags to your HTML files (in the `<head>` section):

```html
<!-- Firebase Configuration -->
<script src="firebaseConfig.js"></script>

<!-- Firebase SDK (already imported in firebaseConfig.js, but can also include directly) -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js"></script>

<!-- Main Application Script -->
<script src="app.js"></script>
```

## Step 6: Set Firestore Security Rules (Development)

1. In Firestore Database, go to "Rules" tab
2. Replace default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow development access (CHANGE FOR PRODUCTION)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      
      // User's subcollections
      match /bookings/{bookingId} {
        allow read, write: if request.auth.uid == userId;
      }
      
      match /favorites/{favoriteId} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    
    // Public destinations collection
    match /destinations/{destinationId} {
      allow read: if true;
      allow write: if request.auth.token.isAdmin == true;
      
      // Reviews subcollection
      match /reviews/{reviewId} {
        allow read: if true;
        allow create: if request.auth != null;
        allow update, delete: if request.auth.uid == resource.data.userId;
      }
    }
    
    // Admin settings
    match /admin/settings/{document=**} {
      allow read: if true;
      allow write: if request.auth.token.isAdmin == true;
    }
  }
}
```

## Step 7: Set Cloud Storage Security Rules (Development)

1. In Storage, go to "Rules" tab
2. Replace default rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow development access (CHANGE FOR PRODUCTION)
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    // User profile pictures
    match /users/{userId}/profile-picture/{allFiles=**} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    
    // Destination images
    match /destinations/{destinationId}/{allFiles=**} {
      allow read: if true;
      allow write: if request.auth.token.isAdmin == true;
    }
  }
}
```

## Step 8: Create Initial Firestore Collections

You can add sample data manually or programmatically:

### Sample Destination Document
```
Collection: destinations
Document ID: kyoto-japan

{
  name: "Kyoto, Japan",
  country: "Japan",
  description: "Ancient temples and traditional culture",
  imageUrl: "https://...",
  rating: 4.8,
  priceRange: "moderate",
  estimatedCost: 2500,
  bestSeason: "Spring/Fall",
  tags: ["culture", "city", "nature"],
  attractions: ["Fushimi Inari", "Arashiyama Bamboo", "Kinkaku-ji"],
  weather: {
    spring: "Mild, 15-20°C",
    summer: "Hot, 25-30°C",
    fall: "Cool, 15-20°C",
    winter: "Cold, 5-10°C"
  },
  createdAt: <timestamp>,
  updatedAt: <timestamp>
}
```

### Sample User Document
```
Collection: users
Document ID: <uid from Firebase Auth>

{
  email: "user@example.com",
  displayName: "John Doe",
  phone: "+1234567890",
  location: "Singapore",
  profilePicture: "https://...",
  bio: "Travel enthusiast",
  memberSince: <timestamp>,
  updatedAt: <timestamp>
}
```

## Step 9: Test the Integration

1. Open any HTML file in browser
2. Check browser console (F12 > Console tab)
3. You should see: `Firebase initialized successfully`
4. Try creating a booking or adding a favorite
5. Check Firestore Console to see if data is being saved

## Troubleshooting

### Firebase Not Initializing
- Check browser console for errors
- Verify firebaseConfig.js has correct credentials
- Check that all Firebase services are enabled

### "Missing or insufficient permissions"
- Check Firestore security rules
- Make sure user is authenticated
- Verify uid in database rules matches auth uid

### Offline Mode Not Working
- Check browser supports IndexedDB
- Clear browser storage and refresh
- Some browsers/incognito mode may not support persistence

### CORS Errors
- This is usually not an issue with Firebase
- Check that domain is added to Firebase console allowed domains

## Production Checklist

Before deploying to production:

1. ✅ Update Firestore security rules (no blanket allow)
2. ✅ Update Cloud Storage security rules
3. ✅ Enable production authentication methods
4. ✅ Set up email verification
5. ✅ Configure password reset
6. ✅ Set up backup/recovery procedures
7. ✅ Enable monitoring and logging
8. ✅ Set up rate limiting
9. ✅ Test with real users
10. ✅ Plan data migration strategy

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/start)
- [Firebase Authentication Guide](https://firebase.google.com/docs/auth)
- [Cloud Storage Guide](https://firebase.google.com/docs/storage)

## Support

For issues:
1. Check Firebase Console status page
2. Review browser console for errors
3. Check Firestore security rules
4. Visit [Firebase Community](https://stackoverflow.com/questions/tagged/firebase)
