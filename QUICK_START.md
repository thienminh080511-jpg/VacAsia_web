# VacAsia Quick Start Guide

Get your VacAsia application up and running in minutes!

## What's Been Added

✅ **app.js** - Main JavaScript file with 50+ functions for:
- Navigation and UI management
- Local data storage
- Search and filtering
- Favorites management
- Booking system
- User authentication
- Firebase/Firestore integration
- Offline support

✅ **firebaseConfig.js** - Firebase configuration template

✅ **Comprehensive Documentation**:
- `FIREBASE_SETUP.md` - Complete Firebase setup guide
- `JAVASCRIPT_REFERENCE.md` - Full API reference with examples
- `IMPLEMENTATION_GUIDE.md` - Practical implementation examples

✅ **Enhanced CSS** - New styles for:
- Notifications and alerts
- Loading spinners
- Forms and validation
- Buttons and badges
- Rating stars
- Modal dialogs

✅ **HTML Updates** - All HTML files now include:
- Firebase initialization script
- Main app script
- Ready to use!

---

## 5-Minute Setup

### Step 1: Verify Files
Check that these files are in `/html/` folder:
```
✓ app.js
✓ firebaseConfig.js
✓ FIREBASE_SETUP.md
✓ JAVASCRIPT_REFERENCE.md
✓ IMPLEMENTATION_GUIDE.md
✓ style.css (updated)
✓ All .html files (updated)
```

### Step 2: Test Basic Functions
Open any HTML file in browser and try in console:
```javascript
// Show notification
showNotification('Hello VacAsia!', 'success');

// Save data
saveToLocalStorage('test', { message: 'It works!' });

// Check if offline
console.log('Online:', !isOffline());
```

You should see a notification at the bottom of the page! ✨

### Step 3: Configure Firebase (Optional but Recommended)
For cloud features (sync bookings, favorites to cloud):

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project or use existing one
3. Get your credentials from Project Settings
4. Update `firebaseConfig.js` with your credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_KEY_HERE",
     authDomain: "YOUR_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     // ... other keys
   };
   ```
5. Follow `FIREBASE_SETUP.md` for detailed instructions

### Step 4: Test Features
Try these in HTML pages:

**Search Page (search.html)**
- Fill search form and submit
- Should show mock results
- Search history saved automatically

**Booking Page (booking.html)**
- Fill booking form
- Click "Book Now"
- Booking saved to localStorage
- Shows in History page

**Favorites**
- Add destinations to favorites (from search)
- View in Favorites page
- Remove as needed

**Profile Page (profile.html)**
- View/edit profile info
- Changes saved to browser storage

---

## Key Features to Test

### 1. Navigation
```javascript
// Navigate to page
navigateTo('search.html');

// Smooth scroll
smoothScroll('booking-form');
```

### 2. Notifications
```javascript
showNotification('Success!', 'success');      // Green
showNotification('Error!', 'error');          // Red
showNotification('Info', 'info');             // Blue
showNotification('Warning', 'warning');       // Yellow
```

### 3. Forms & Validation
```javascript
// Validate email
isValidEmail('user@example.com');  // true

// Check password strength
validatePassword('MyP@ssw0rd123!');

// Extract form data
const data = getFormData(document.getElementById('my-form'));
```

### 4. Bookings
```javascript
// Create booking
const bookingId = await createBooking({
  destination: 'Tokyo, Japan',
  travelers: 2,
  startDate: '2026-12-20',
  endDate: '2026-12-27',
  tickets: 2,
  totalPrice: 5000
});

// Get all bookings
const bookings = getBookings();

// Update status
await updateBookingStatus(bookingId, 'confirmed');
```

### 5. Favorites
```javascript
// Add to favorites
await addToFavorites('tokyo-001', {
  name: 'Tokyo, Japan',
  country: 'Japan',
  rating: 4.8
});

// Check if favorite
if (isFavorite('tokyo-001')) {
  console.log('Already liked!');
}

// Get all favorites
const favs = getFavorites();
```

### 6. User Profile
```javascript
// Save profile
await saveUserProfile({
  name: 'John Doe',
  email: 'john@example.com',
  location: 'Singapore'
});

// Get profile
const profile = getUserProfile();
console.log(profile.name);
```

### 7. Offline Support
```javascript
// Check if offline
if (isOffline()) {
  console.log('You are offline');
}

// Queue action for later
queueOfflineAction({
  type: 'addBooking',
  data: bookingData
});

// Process when back online
await processOfflineQueue();
```

---

## File Organization

```
html/
├── VAmain.html              ← Main page (includes scripts)
├── search.html              ← Search destinations
├── booking.html             ← Make bookings
├── favorites.html           ← View favorites
├── history.html             ← Booking history
├── profile.html             ← User profile
├── login.html               ← Login page
├── register.html            ← Registration
├── about.html               ← About page
├── contact.html             ← Contact page
├── destination.html         ← Destination details
│
├── app.js                   ← 50+ JavaScript functions ⭐
├── firebaseConfig.js        ← Firebase setup ⭐
├── style.css                ← CSS styles (updated) ⭐
│
├── FIREBASE_SETUP.md        ← Firebase guide 📖
├── JAVASCRIPT_REFERENCE.md  ← Complete API docs 📖
└── IMPLEMENTATION_GUIDE.md  ← Code examples 📖
```

---

## Common Tasks

### Make Login Work
1. User enters email/password on `login.html`
2. JavaScript validates inputs
3. Saves to localStorage OR sends to Firebase
4. Redirects to profile page

**Code Snippet:**
```javascript
// In login.html form submit handler
setCurrentUser({
  uid: 'user-123',
  email: userEmail,
  displayName: userName
});
navigateTo('profile.html');
```

### Add Booking
1. User fills booking form
2. JavaScript validates dates, amount
3. Creates booking with unique ID
4. Saves to localStorage
5. Shows in History page

**Code Snippet:**
```javascript
const bookingId = await createBooking(formData);
showNotification('Booking created!', 'success');
navigateTo('history.html');
```

### Save Favorites
1. User clicks heart icon on destination
2. `addToFavorites()` saves destination
3. Stored in localStorage (and Firebase if logged in)
4. Shows in Favorites page

**Code Snippet:**
```javascript
await addToFavorites(destinationId, destinationData);
showNotification('Added to favorites!', 'success');
```

---

## Debugging Tips

### Check Console
Open browser DevTools: `F12` or `Right-click > Inspect`
Go to **Console** tab to see:
- Error messages
- Function logs
- Data saved

### Test Functions
```javascript
// Test in console
console.log('Current user:', getCurrentUser());
console.log('Bookings:', getBookings());
console.log('Favorites:', getFavorites());
console.log('Is offline?', isOffline());
```

### Check LocalStorage
In DevTools > Application > LocalStorage:
- Should see keys: `favorites`, `bookings`, `searchHistory`, `userProfile`
- Click to see what's saved

### Check Network
In DevTools > Network tab:
- See what API calls are made (if Firebase connected)
- Check for errors

---

## Next Steps

### Phase 1: Core Features (Complete)
✅ Navigation and UI
✅ Local data storage
✅ Forms and validation
✅ Notifications
✅ Loading states

### Phase 2: Backend Integration (Ready)
1. Follow `FIREBASE_SETUP.md`
2. Add Firebase credentials to `firebaseConfig.js`
3. Enable Authentication, Firestore, Storage
4. Update HTML forms with Firebase logic (see `IMPLEMENTATION_GUIDE.md`)

### Phase 3: Advanced Features
- Email verification
- Password reset
- Image uploads
- Reviews and ratings
- Admin panel
- Push notifications

---

## Useful Commands

### Check if working
```javascript
// In browser console
typeof showNotification === 'function' ? '✓ app.js loaded' : '✗ Error'
typeof firebaseConfig !== 'undefined' ? '✓ firebaseConfig.js loaded' : '✗ Error'
```

### Show all available functions
```javascript
console.log('Available functions:', {
  navigation: ['navigateTo', 'smoothScroll', 'setActiveNavLink'],
  storage: ['saveToLocalStorage', 'getFromLocalStorage', 'removeFromLocalStorage'],
  search: ['searchDestinations', 'getSearchHistory', 'clearSearchHistory'],
  favorites: ['addToFavorites', 'removeFromFavorites', 'getFavorites'],
  bookings: ['createBooking', 'getBookings', 'updateBookingStatus'],
  user: ['getCurrentUser', 'setCurrentUser', 'isUserLoggedIn', 'logoutUser'],
  validation: ['isValidEmail', 'validatePassword', 'validateField'],
  utils: ['formatDate', 'daysBetween', 'formatCurrency', 'debounce', 'throttle']
});
```

---

## Troubleshooting

### Scripts not loading
- Check all HTML files have both script tags
- Verify files are in same `html/` folder
- Clear browser cache (Ctrl+Shift+Delete)

### Functions undefined
- Open DevTools console (F12)
- Type: `typeof showNotification` should be `function`
- If not, reload page and check for errors

### Data not saving
- Check LocalStorage in DevTools
- Look for keys: `favorites`, `bookings`, etc.
- Clear cache and try again

### Notifications not showing
- Check CSS is loaded (view page source)
- Look for `.notification` classes in style.css
- Open DevTools > Elements and search for notification div

### Firebase not connecting
- Check `firebaseConfig.js` has your real credentials
- Check Firebase project is created
- Check Firestore is enabled
- Review `FIREBASE_SETUP.md` step by step

---

## File Size Summary

- **app.js**: ~25 KB (all JavaScript logic)
- **firebaseConfig.js**: ~10 KB (config + templates)
- **style.css**: ~15 KB (updated with new styles)
- **Documentation**: ~100 KB (3 guides)
- **Total**: Lightweight and modular ✨

---

## Resources

📖 **Read These:**
1. [FIREBASE_SETUP.md](FIREBASE_SETUP.md) - Setup Firebase
2. [JAVASCRIPT_REFERENCE.md](JAVASCRIPT_REFERENCE.md) - API docs
3. [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - Code examples

🔗 **External Resources:**
- [Firebase Docs](https://firebase.google.com/docs)
- [MDN Web Docs](https://developer.mozilla.org)
- [JavaScript.info](https://javascript.info)

💡 **Get Help:**
- Check console for error messages
- Review code examples in guides
- Test functions in DevTools console

---

## You're Ready! 🚀

Start by:
1. ✅ Opening an HTML file
2. ✅ Testing notifications: `showNotification('It works!', 'success')`
3. ✅ Filling out a form
4. ✅ Checking saved data in DevTools > Application > LocalStorage

**Have fun building VacAsia! 🌏✈️**

