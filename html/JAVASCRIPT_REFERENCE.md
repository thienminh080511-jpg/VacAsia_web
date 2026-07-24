# VacAsia JavaScript Functions & API Reference

## Overview

The VacAsia application includes comprehensive JavaScript functionality for:
- **Navigation & UI Management** - Handle page navigation, notifications, and loading states
- **Local Data Storage** - Save user data locally with localStorage
- **Search & Filters** - Search destinations with filtering and save search history
- **Favorites Management** - Add/remove favorite destinations
- **Booking System** - Create and manage travel bookings
- **User Authentication** - Login, logout, and profile management
- **Firebase/Firestore Integration** - Sync data to cloud database
- **Offline Support** - Queue actions when offline, sync when back online
- **Form Validation** - Validate user inputs with comprehensive error handling

## File Structure

```
html/
├── app.js                  # Main application logic (all functions)
├── firebaseConfig.js       # Firebase configuration & templates
├── FIREBASE_SETUP.md       # Complete Firebase setup guide
├── *.html                  # HTML pages with scripts included
└── style.css              # CSS styles including UI components
```

## Quick Start

### 1. Include Scripts in HTML
All HTML files already include these scripts in the `<head>`:
```html
<script src="firebaseConfig.js"></script>
<script src="app.js"></script>
```

### 2. Configure Firebase (Required for cloud features)
See `FIREBASE_SETUP.md` for detailed instructions. You'll need to:
1. Create a Firebase project
2. Add your credentials to `firebaseConfig.js`
3. Enable Authentication, Firestore, and Storage
4. Set security rules

### 3. Start Using Functions
Once scripts are loaded, all functions are globally available:
```javascript
// Example: Add a destination to favorites
addToFavorites('destination-id', destinationData);

// Example: Create a booking
createBooking(bookingData);

// Example: Show notification
showNotification('Success!', 'success');
```

---

## Navigation & UI Functions

### `navigateTo(page)`
Navigate to a different page.

**Parameters:**
- `page` (string) - Page filename (e.g., 'search.html', 'booking.html')

**Example:**
```javascript
navigateTo('booking.html');
```

---

### `smoothScroll(elementId)`
Smooth scroll to an element on the page.

**Parameters:**
- `elementId` (string) - ID of the element to scroll to

**Example:**
```javascript
smoothScroll('booking-form');
```

---

### `setActiveNavLink()`
Automatically highlights the current page in navigation menu. Called automatically on page load.

**Example:**
```javascript
setActiveNavLink();
```

---

### `toggleMobileMenu()`
Toggle mobile navigation menu visibility.

**Example:**
```html
<button onclick="toggleMobileMenu()">☰</button>
```

---

### `showNotification(message, type, duration)`
Display a toast notification to the user.

**Parameters:**
- `message` (string) - Notification message
- `type` (string, optional) - Type: 'success', 'error', 'info', 'warning' (default: 'info')
- `duration` (number, optional) - Duration in milliseconds (default: 3000)

**Example:**
```javascript
showNotification('Destination added to favorites!', 'success');
showNotification('Error saving booking', 'error', 5000);
showNotification('Processing...', 'info');
```

---

### `showLoadingSpinner(show)`
Show or hide a loading spinner.

**Parameters:**
- `show` (boolean, optional) - Show (true) or hide (false) spinner (default: true)

**Example:**
```javascript
showLoadingSpinner(true);   // Show spinner
// ... perform operation ...
showLoadingSpinner(false);  // Hide spinner
```

---

## Local Storage Functions

### `saveToLocalStorage(key, value)`
Save data to browser's localStorage (persists across page refreshes).

**Parameters:**
- `key` (string) - Data key
- `value` (any) - Data value (automatically JSON stringified)

**Returns:** boolean - Success status

**Example:**
```javascript
saveToLocalStorage('userPreferences', {
  theme: 'dark',
  language: 'en'
});
```

---

### `getFromLocalStorage(key, defaultValue)`
Retrieve data from localStorage.

**Parameters:**
- `key` (string) - Data key
- `defaultValue` (any, optional) - Default value if not found

**Returns:** Parsed data or default value

**Example:**
```javascript
const prefs = getFromLocalStorage('userPreferences', {});
console.log(prefs.theme); // 'dark'
```

---

### `removeFromLocalStorage(key)`
Remove a specific item from localStorage.

**Parameters:**
- `key` (string) - Data key to remove

**Example:**
```javascript
removeFromLocalStorage('userPreferences');
```

---

### `clearLocalStorage()`
Clear all localStorage data. **Warning: This clears all saved data!**

**Example:**
```javascript
clearLocalStorage();
```

---

## Search & Filter Functions

### `searchDestinations(filters)`
Search destinations with filters. Results filtered from localStorage (or Firestore if connected).

**Parameters:**
- `filters` (object) - Filter object
  - `destination` (string) - Destination name
  - `travelStyle` (string) - Travel style (beach, city, nature, adventure, culture, family)
  - `budget` (string) - Budget level (budget, moderate, luxury)
  - `country` (string) - Country name

**Returns:** Promise<Array> - Array of matching destinations

**Example:**
```javascript
const results = await searchDestinations({
  destination: 'Tokyo',
  travelStyle: 'city',
  budget: 'moderate'
});
```

---

### `saveSearchHistory(filters)`
Save a search query to history (automatically called by searchDestinations).

**Parameters:**
- `filters` (object) - Search filter object

**Example:**
```javascript
saveSearchHistory({ destination: 'Bali', travelStyle: 'beach' });
```

---

### `getSearchHistory()`
Retrieve search history (last 20 searches).

**Returns:** Array of search objects with filters and timestamps

**Example:**
```javascript
const history = getSearchHistory();
history.forEach(search => {
  console.log(search.filters);
  console.log(search.timestamp);
});
```

---

### `clearSearchHistory()`
Clear all search history.

**Example:**
```javascript
clearSearchHistory();
showNotification('Search history cleared', 'info');
```

---

## Favorites Management

### `addToFavorites(destinationId, destinationData)`
Add a destination to favorites.

**Parameters:**
- `destinationId` (string) - Unique destination ID
- `destinationData` (object) - Destination information
  - `name` (string) - Destination name
  - `country` (string) - Country
  - `description` (string) - Description
  - `imageUrl` (string) - Image URL
  - `rating` (number) - Rating 0-5
  - `priceRange` (string) - Price range

**Returns:** Promise<boolean> - Success status

**Example:**
```javascript
await addToFavorites('kyoto-001', {
  name: 'Kyoto, Japan',
  country: 'Japan',
  description: 'Ancient temples and traditional culture',
  imageUrl: 'https://...',
  rating: 4.8,
  priceRange: 'moderate'
});
```

---

### `removeFromFavorites(destinationId)`
Remove a destination from favorites.

**Parameters:**
- `destinationId` (string) - Destination ID to remove

**Returns:** Promise<boolean> - Success status

**Example:**
```javascript
await removeFromFavorites('kyoto-001');
```

---

### `getFavorites()`
Get all favorited destinations.

**Returns:** Object with destinationId as keys

**Example:**
```javascript
const favorites = getFavorites();
Object.entries(favorites).forEach(([id, destination]) => {
  console.log(destination.name);
});
```

---

### `isFavorite(destinationId)`
Check if a destination is in favorites.

**Parameters:**
- `destinationId` (string) - Destination ID to check

**Returns:** boolean

**Example:**
```javascript
if (isFavorite('kyoto-001')) {
  console.log('Already favorited!');
}
```

---

## Booking Management

### `createBooking(bookingData)`
Create a new travel booking.

**Parameters:**
- `bookingData` (object) - Booking details
  - `destination` (string) - Destination name
  - `travelers` (number) - Number of travelers
  - `startDate` (string) - Start date (YYYY-MM-DD)
  - `endDate` (string) - End date (YYYY-MM-DD)
  - `tickets` (number) - Number of tickets
  - `totalPrice` (number) - Total price
  - `notes` (string, optional) - Additional notes

**Returns:** Promise<string> - Booking ID

**Example:**
```javascript
const bookingId = await createBooking({
  destination: 'Bali, Indonesia',
  travelers: 2,
  startDate: '2026-12-20',
  endDate: '2026-12-27',
  tickets: 2,
  totalPrice: 4500,
  notes: 'Honeymoon trip'
});
```

---

### `getBookings()`
Get all bookings.

**Returns:** Object with bookingId as keys

**Example:**
```javascript
const bookings = getBookings();
Object.entries(bookings).forEach(([id, booking]) => {
  console.log(booking.destination, booking.status);
});
```

---

### `getBooking(bookingId)`
Get a specific booking.

**Parameters:**
- `bookingId` (string) - Booking ID

**Returns:** Object or null

**Example:**
```javascript
const booking = getBooking('booking_1234567890');
console.log(booking.destination);
```

---

### `updateBookingStatus(bookingId, status)`
Update booking status.

**Parameters:**
- `bookingId` (string) - Booking ID
- `status` (string) - New status: 'pending', 'confirmed', 'cancelled', 'completed'

**Returns:** Promise<boolean> - Success status

**Example:**
```javascript
await updateBookingStatus('booking_123', 'confirmed');
```

---

### `cancelBooking(bookingId)`
Cancel a booking.

**Parameters:**
- `bookingId` (string) - Booking ID to cancel

**Returns:** Promise<boolean> - Success status

**Example:**
```javascript
await cancelBooking('booking_123');
```

---

## User Authentication & Profile

### `getCurrentUser()`
Get the currently logged-in user object.

**Returns:** Object with uid, email, displayName or null if not logged in

**Example:**
```javascript
const user = getCurrentUser();
if (user) {
  console.log(`Welcome, ${user.email}`);
}
```

---

### `setCurrentUser(user)`
Set the current user (typically called after Firebase authentication).

**Parameters:**
- `user` (object) - User object from Firebase Auth or null to logout

**Example:**
```javascript
// After Firebase login
setCurrentUser({
  uid: 'user123',
  email: 'user@example.com',
  displayName: 'John Doe'
});
```

---

### `isUserLoggedIn()`
Check if user is currently logged in.

**Returns:** boolean

**Example:**
```javascript
if (!isUserLoggedIn()) {
  navigateTo('login.html');
}
```

---

### `logoutUser()`
Logout the current user.

**Example:**
```javascript
logoutUser();
// User redirected to home page
```

---

### `saveUserProfile(profileData)`
Save or update user profile information.

**Parameters:**
- `profileData` (object) - Profile details
  - `name` (string) - Full name
  - `email` (string) - Email address
  - `phone` (string) - Phone number
  - `location` (string) - Location
  - `bio` (string) - Biography

**Returns:** Promise<boolean> - Success status

**Example:**
```javascript
await saveUserProfile({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  location: 'New York, USA',
  bio: 'Travel enthusiast exploring Asia'
});
```

---

### `getUserProfile()`
Get the current user's profile data.

**Returns:** Object with profile information

**Example:**
```javascript
const profile = getUserProfile();
console.log(profile.name, profile.location);
```

---

## Form Validation

### `isValidEmail(email)`
Validate email format.

**Parameters:**
- `email` (string) - Email to validate

**Returns:** boolean

**Example:**
```javascript
if (isValidEmail('user@example.com')) {
  console.log('Valid email');
}
```

---

### `validatePassword(password)`
Check password strength and requirements.

**Parameters:**
- `password` (string) - Password to validate

**Returns:** Object
- `isValid` (boolean) - Whether password meets all requirements
- `strength` ('weak', 'medium', 'strong')
- `issues` (array) - List of unmet requirements

**Example:**
```javascript
const validation = validatePassword('MyP@ssw0rd');
if (validation.isValid) {
  console.log(`Password strength: ${validation.strength}`);
} else {
  console.log('Issues:', validation.issues);
}
```

---

### `getFormData(form)`
Extract form data as an object.

**Parameters:**
- `form` (HTMLFormElement) - Form element

**Returns:** Object with field names as keys

**Example:**
```javascript
const form = document.querySelector('#booking-form');
const data = getFormData(form);
console.log(data.destination, data.startDate);
```

---

### `validateField(fieldName, value, rules)`
Validate a single form field.

**Parameters:**
- `fieldName` (string) - Field name for error messages
- `value` (string) - Field value to validate
- `rules` (object) - Validation rules
  - `required` (boolean) - Field is required
  - `minLength` (number) - Minimum length
  - `email` (boolean) - Must be valid email
  - `pattern` (RegExp) - Must match pattern

**Returns:** Object
- `isValid` (boolean) - Whether field is valid
- `errors` (array) - List of validation errors

**Example:**
```javascript
const result = validateField('Email', 'user@example.com', {
  required: true,
  email: true
});

if (result.isValid) {
  console.log('Email is valid');
} else {
  result.errors.forEach(error => console.log(error));
}
```

---

## Data Synchronization & Offline Mode

### `syncDataWithFirebase()`
Manually sync local data with Firebase/Firestore.

**Returns:** Promise<boolean> - Success status

**Example:**
```javascript
const success = await syncDataWithFirebase();
if (success) {
  showNotification('Data synced with cloud', 'success');
}
```

---

### `isOffline()`
Check if the user is currently offline.

**Returns:** boolean

**Example:**
```javascript
if (isOffline()) {
  showNotification('You are offline - changes will sync when back online', 'warning');
}
```

---

### `queueOfflineAction(action)`
Add an action to a queue to be processed when back online.

**Parameters:**
- `action` (object) - Action object with type and data

**Example:**
```javascript
queueOfflineAction({
  type: 'addToFavorites',
  destinationId: 'kyoto-001',
  data: destinationData
});
```

---

### `processOfflineQueue()`
Process queued actions (called automatically when back online).

**Returns:** Promise<void>

**Example:**
```javascript
// Automatically called when connection restored
// Can also call manually
await processOfflineQueue();
```

---

## Utility Functions

### `formatDate(date, format)`
Format a date to readable string.

**Parameters:**
- `date` (string|Date) - Date to format
- `format` (string, optional) - 'short' or 'long' (default: 'short')

**Returns:** string - Formatted date

**Example:**
```javascript
const date = formatDate('2026-12-25', 'long');
console.log(date); // "Saturday, December 25, 2026"
```

---

### `daysBetween(startDate, endDate)`
Calculate days between two dates.

**Parameters:**
- `startDate` (string|Date) - Start date
- `endDate` (string|Date) - End date

**Returns:** number - Number of days

**Example:**
```javascript
const days = daysBetween('2026-12-20', '2026-12-27');
console.log(days); // 7
```

---

### `formatCurrency(amount, currency)`
Format a number as currency.

**Parameters:**
- `amount` (number) - Amount to format
- `currency` (string, optional) - Currency code (default: 'USD')

**Returns:** string - Formatted currency

**Example:**
```javascript
const price = formatCurrency(2500.50, 'USD');
console.log(price); // "$2,500.50"
```

---

### `debounce(func, delay)`
Create a debounced function (delays execution until input stops).

**Parameters:**
- `func` (function) - Function to debounce
- `delay` (number, optional) - Delay in milliseconds (default: 300)

**Returns:** function - Debounced function

**Example:**
```javascript
const debouncedSearch = debounce(searchDestinations, 500);

// In search input event:
searchInput.addEventListener('input', (e) => {
  debouncedSearch({ destination: e.target.value });
});
```

---

### `throttle(func, limit)`
Create a throttled function (limits execution frequency).

**Parameters:**
- `func` (function) - Function to throttle
- `limit` (number, optional) - Time limit in milliseconds (default: 300)

**Returns:** function - Throttled function

**Example:**
```javascript
const throttledScroll = throttle(() => {
  console.log('Scrolling...');
}, 500);

window.addEventListener('scroll', throttledScroll);
```

---

## Firebase Firestore Functions

> **Note:** These functions require Firebase configuration in `firebaseConfig.js`

### `addDocument(collection, data, docId)`
Add a document to Firestore.

**Parameters:**
- `collection` (string) - Collection name
- `data` (object) - Document data
- `docId` (string, optional) - Document ID (auto-generated if not provided)

**Returns:** Promise<string> - Document ID

**Example:**
```javascript
const docId = await addDocument('destinations', {
  name: 'Bali',
  country: 'Indonesia',
  rating: 4.7
});
```

---

### `getDocument(collection, docId)`
Get a document from Firestore.

**Parameters:**
- `collection` (string) - Collection name
- `docId` (string) - Document ID

**Returns:** Promise<Object> - Document data with id field

**Example:**
```javascript
const destination = await getDocument('destinations', 'bali-001');
console.log(destination.name);
```

---

### `updateDocument(collection, docId, data)`
Update a Firestore document.

**Parameters:**
- `collection` (string) - Collection name
- `docId` (string) - Document ID
- `data` (object) - Data to update

**Returns:** Promise<void>

**Example:**
```javascript
await updateDocument('destinations', 'bali-001', {
  rating: 4.8
});
```

---

### `deleteDocument(collection, docId)`
Delete a document from Firestore.

**Parameters:**
- `collection` (string) - Collection name
- `docId` (string) - Document ID

**Returns:** Promise<void>

**Example:**
```javascript
await deleteDocument('destinations', 'bali-001');
```

---

### `queryDocuments(collectionName, constraints)`
Query documents from Firestore.

**Parameters:**
- `collectionName` (string) - Collection name
- `constraints` (array, optional) - Array of where/orderBy constraints from Firebase SDK

**Returns:** Promise<Array> - Array of matching documents

**Example:**
```javascript
// Simple query - get all documents
const allDests = await queryDocuments('destinations');

// With constraints (requires Firebase imports)
const { where } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
const budget = await queryDocuments('destinations', [
  where('priceRange', '==', 'budget')
]);
```

---

## Firestore Collection Templates

See `firebaseConfig.js` for document templates:
- `createUserDocument(userData)` - Template for user documents
- `createBookingDocument(bookingData)` - Template for bookings
- `createFavoriteDocument(destinationData)` - Template for favorites
- `createDestinationDocument(destinationData)` - Template for destinations
- `createReviewDocument(reviewData)` - Template for reviews

**Example:**
```javascript
const userDoc = createUserDocument({
  email: 'user@example.com',
  displayName: 'John Doe'
});

await addDocument('users', userDoc, userId);
```

---

## CSS Classes for UI Components

### Notifications
```html
<div class="notification notification-success">Success!</div>
<div class="notification notification-error">Error!</div>
<div class="notification notification-info">Info</div>
<div class="notification notification-warning">Warning</div>
```

### Buttons
```html
<button class="button">Primary Button</button>
<button class="button button-secondary">Secondary Button</button>
<button class="button button-success">Success Button</button>
<button class="button button-danger">Danger Button</button>
```

### Badges
```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-danger">Danger</span>
<span class="badge badge-warning">Warning</span>
```

### Form Validation States
```html
<input class="form-error" placeholder="Invalid field">
<span class="form-error-message">This field is required</span>

<input class="form-success" placeholder="Valid field">
```

### Rating Stars
```html
<div class="rating">
  <span class="star filled">★</span>
  <span class="star filled">★</span>
  <span class="star filled">★</span>
  <span class="star">★</span>
  <span class="star">★</span>
</div>
```

---

## Complete Example: Booking Form

```html
<form id="booking-form" class="form-card">
  <label>
    Destination
    <input type="text" name="destination" required />
  </label>
  
  <label>
    Travel Date
    <input type="date" name="startDate" required />
  </label>
  
  <label>
    End Date
    <input type="date" name="endDate" required />
  </label>
  
  <label>
    Travelers
    <select name="travelers" required>
      <option>1</option>
      <option>2</option>
      <option>3+</option>
    </select>
  </label>
  
  <button type="submit" class="button">Book Now</button>
</form>

<script>
document.getElementById('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  showLoadingSpinner(true);
  
  try {
    const formData = getFormData(e.target);
    
    // Validate required fields
    for (const [key, value] of Object.entries(formData)) {
      const validation = validateField(key, value, { required: true });
      if (!validation.isValid) {
        showNotification(validation.errors[0], 'error');
        showLoadingSpinner(false);
        return;
      }
    }
    
    // Create booking
    const bookingId = await createBooking(formData);
    
    if (bookingId) {
      showNotification('Booking created successfully!', 'success');
      e.target.reset();
    }
  } catch (error) {
    showNotification('Error creating booking', 'error');
    console.error(error);
  } finally {
    showLoadingSpinner(false);
  }
});
</script>
```

---

## Troubleshooting

### Firebase not initialized
- Check that `firebaseConfig.js` is loaded before `app.js`
- Verify credentials in `firebaseConfig.js` are correct
- Check browser console for Firebase errors

### Data not saving to Firestore
- Verify user is logged in: `isUserLoggedIn()`
- Check Firebase security rules allow write access
- Ensure Firestore is enabled in Firebase Console

### Notifications not appearing
- Check that `style.css` is loaded
- Verify `showNotification()` function is called
- Check browser console for JavaScript errors

### Offline queue not syncing
- Call `processOfflineQueue()` manually when online
- Check that user is logged in
- Verify connection is restored

---

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [MDN Web Docs - Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Form Validation Best Practices](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation)

---

## Support & Updates

For issues or feature requests, review:
1. Browser console for error messages
2. Firestore Console for data verification
3. `FIREBASE_SETUP.md` for Firebase configuration
4. This reference for function usage examples

