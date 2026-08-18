/**
 * VacAsia - Main Application JavaScript
 * Handles navigation, search, data saving, and Firebase/Firestore integration
 */

// ============================================================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ============================================================================

// Import Firebase modules (add this to HTML: <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js"></script>)
// and all other Firebase modules in firebaseConfig.js

// Initialize Firebase (see firebaseConfig.js for configuration)
let db = null; // Will be initialized in firebaseConfig.js
let auth = null; // Will be initialized in firebaseConfig.js

// ============================================================================
// NAVIGATION & UI FUNCTIONS
// ============================================================================

/**
 * Navigate to a different page
 * @param {string} page - Page name (e.g., 'search.html', 'booking.html')
 */
function navigateTo(page) {
  window.location.href = page;
}

/**
 * Smooth scroll to an element
 * @param {string} elementId - ID of the element to scroll to
 */
function smoothScroll(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Set active navigation link based on current page
 */
function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'VAmain.html';
  const navLinks = document.querySelectorAll('.nav-links a');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    navLinks.classList.toggle('mobile-open');
  }
}

/**
 * Theme toggle helpers
 */
const THEME_STORAGE_KEY = 'vacasia-theme';

function getStoredTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  const toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    const isDark = theme === 'dark';
    toggle.innerHTML = `<span class="theme-toggle-icon">${isDark ? '🌙' : '☀️'}</span>`;
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.setAttribute('title', isDark ? 'Dark mode is on' : 'Light mode is on');
    toggle.setAttribute('aria-pressed', String(isDark));
  }
}

function initializeThemeToggle() {
  let toggle = document.querySelector('.theme-toggle');

  if (!toggle) {
    toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Toggle color theme');
    document.body.appendChild(toggle);
  }

  setTheme(getStoredTheme());

  toggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });
}

function initializeTopbarScrollState() {
  const topbar = document.querySelector('.topbar');
  if (!topbar) {
    return;
  }

  const onScroll = () => {
    if (window.scrollY > 24) {
      topbar.classList.add('shrink');
    } else {
      topbar.classList.remove('shrink');
    }
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/**
 * Show notification/toast message
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.setAttribute('role', 'alert');
  
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove notification
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

/**
 * Show loading spinner
 * @param {boolean} show - Show or hide spinner
 */
function showLoadingSpinner(show = true) {
  let spinner = document.getElementById('loading-spinner');
  
  if (show) {
    if (!spinner) {
      spinner = document.createElement('div');
      spinner.id = 'loading-spinner';
      spinner.className = 'loading-spinner';
      spinner.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(spinner);
    }
    spinner.style.display = 'flex';
  } else if (spinner) {
    spinner.style.display = 'none';
  }
}

window.addEventListener('DOMContentLoaded', initializeThemeToggle);
document.addEventListener('DOMContentLoaded', initializeTopbarScrollState);
// ============================================================================
// LOCAL STORAGE FUNCTIONS (for offline data management)
// ============================================================================

/**
 * Save data to localStorage
 * @param {string} key - Data key
 * @param {any} value - Data value (will be JSON stringified)
 */
function saveToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
}

/**
 * Get data from localStorage
 * @param {string} key - Data key
 * @param {any} defaultValue - Default value if key not found
 * @returns {any} Parsed data or default value
 */
function getFromLocalStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
}

/**
 * Remove data from localStorage
 * @param {string} key - Data key
 */
function removeFromLocalStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing from localStorage:', error);
    return false;
  }
}

/**
 * Clear all localStorage data
 */
function clearLocalStorage() {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

// ============================================================================
// SEARCH & FILTER FUNCTIONS
// ============================================================================

/**
 * Perform search with filters
 * @param {Object} filters - Filter object
 *   - destination: string
 *   - travelStyle: string
 *   - budget: string
 *   - country: string
 * @returns {Promise<Array>} Search results from Firestore
 */
async function searchDestinations(filters) {
  if (!db) {
    console.error('Firebase not initialized');
    return [];
  }

  try {
    showLoadingSpinner(true);
    const { query, where, getDocs, collection } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    let searchQuery = collection(db, 'destinations');
    let results = [];

    // Build query with filters
    if (filters.destination) {
      // Search in destination name (case-insensitive)
      results = results.filter(d => 
        d.name?.toLowerCase().includes(filters.destination.toLowerCase())
      );
    }

    if (filters.travelStyle) {
      results = results.filter(d => d.tags?.includes(filters.travelStyle));
    }

    if (filters.budget) {
      results = results.filter(d => d.priceRange === filters.budget);
    }

    if (filters.country) {
      results = results.filter(d => d.country?.toLowerCase() === filters.country.toLowerCase());
    }

    // Save search history
    saveSearchHistory(filters);
    showLoadingSpinner(false);
    return results;
  } catch (error) {
    console.error('Error searching destinations:', error);
    showNotification('Error performing search', 'error');
    showLoadingSpinner(false);
    return [];
  }
}

/**
 * Save search query to history (localStorage)
 * @param {Object} filters - Filter object
 */
function saveSearchHistory(filters) {
  const searchHistory = getFromLocalStorage('searchHistory', []);
  const timestamp = new Date().toISOString();
  
  searchHistory.unshift({
    filters,
    timestamp
  });

  // Keep only last 20 searches
  if (searchHistory.length > 20) {
    searchHistory.pop();
  }

  saveToLocalStorage('searchHistory', searchHistory);
}

/**
 * Get search history
 * @returns {Array} Search history
 */
function getSearchHistory() {
  return getFromLocalStorage('searchHistory', []);
}

/**
 * Clear search history
 */
function clearSearchHistory() {
  removeFromLocalStorage('searchHistory');
  showNotification('Search history cleared', 'info');
}

// ============================================================================
// FAVORITES MANAGEMENT
// ============================================================================

/**
 * Add destination to favorites
 * @param {string} destinationId - Destination ID
 * @param {Object} destinationData - Destination data
 * @returns {Promise<boolean>}
 */
async function addToFavorites(destinationId, destinationData) {
  try {
    // Save to local favorites first
    const favorites = getFromLocalStorage('favorites', {});
    favorites[destinationId] = {
      ...destinationData,
      addedAt: new Date().toISOString()
    };
    saveToLocalStorage('favorites', favorites);

    // Sync to Firebase if user is logged in
    const currentUser = getCurrentUser();
    if (currentUser && db) {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      await setDoc(
        doc(db, 'users', currentUser.uid, 'favorites', destinationId),
        {
          ...destinationData,
          addedAt: new Date().toISOString()
        }
      );
    }

    showNotification(`Added to favorites!`, 'success');
    return true;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    showNotification('Error adding to favorites', 'error');
    return false;
  }
}

/**
 * Remove destination from favorites
 * @param {string} destinationId - Destination ID
 * @returns {Promise<boolean>}
 */
async function removeFromFavorites(destinationId) {
  try {
    // Remove from local favorites
    const favorites = getFromLocalStorage('favorites', {});
    delete favorites[destinationId];
    saveToLocalStorage('favorites', favorites);

    // Remove from Firebase if user is logged in
    const currentUser = getCurrentUser();
    if (currentUser && db) {
      const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      await deleteDoc(doc(db, 'users', currentUser.uid, 'favorites', destinationId));
    }

    showNotification('Removed from favorites', 'info');
    return true;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    showNotification('Error removing from favorites', 'error');
    return false;
  }
}

/**
 * Get all favorites
 * @returns {Object} Favorites object
 */
function getFavorites() {
  return getFromLocalStorage('favorites', {});
}

/**
 * Check if destination is in favorites
 * @param {string} destinationId - Destination ID
 * @returns {boolean}
 */
function isFavorite(destinationId) {
  const favorites = getFavorites();
  return destinationId in favorites;
}

// ============================================================================
// BOOKING MANAGEMENT
// ============================================================================

/**
 * Create a new booking
 * @param {Object} bookingData - Booking details
 *   - destination: string
 *   - travelers: number
 *   - startDate: string (YYYY-MM-DD)
 *   - endDate: string (YYYY-MM-DD)
 *   - tickets: number
 *   - totalPrice: number
 * @returns {Promise<string>} Booking ID
 */
async function createBooking(bookingData) {
  try {
    showLoadingSpinner(true);

    // Add timestamps and status
    const booking = {
      ...bookingData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to local storage
    const bookings = getFromLocalStorage('bookings', {});
    const bookingId = `booking_${Date.now()}`;
    bookings[bookingId] = booking;
    saveToLocalStorage('bookings', bookings);

    // Save to Firebase if user is logged in
    const currentUser = getCurrentUser();
    if (currentUser && db) {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      await setDoc(
        doc(db, 'users', currentUser.uid, 'bookings', bookingId),
        booking
      );
    }

    showNotification('Booking created successfully!', 'success');
    showLoadingSpinner(false);
    return bookingId;
  } catch (error) {
    console.error('Error creating booking:', error);
    showNotification('Error creating booking', 'error');
    showLoadingSpinner(false);
    return null;
  }
}

/**
 * Get all bookings
 * @returns {Object} Bookings object
 */
function getBookings() {
  return getFromLocalStorage('bookings', {});
}

/**
 * Get booking by ID
 * @param {string} bookingId - Booking ID
 * @returns {Object} Booking data
 */
function getBooking(bookingId) {
  const bookings = getBookings();
  return bookings[bookingId] || null;
}

/**
 * Update booking status
 * @param {string} bookingId - Booking ID
 * @param {string} status - New status (pending, confirmed, cancelled, completed)
 * @returns {Promise<boolean>}
 */
async function updateBookingStatus(bookingId, status) {
  try {
    const bookings = getBookings();
    if (!bookings[bookingId]) return false;

    bookings[bookingId].status = status;
    bookings[bookingId].updatedAt = new Date().toISOString();
    saveToLocalStorage('bookings', bookings);

    // Update in Firebase if user is logged in
    const currentUser = getCurrentUser();
    if (currentUser && db) {
      const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      await updateDoc(
        doc(db, 'users', currentUser.uid, 'bookings', bookingId),
        {
          status,
          updatedAt: new Date().toISOString()
        }
      );
    }

    showNotification('Booking updated', 'success');
    return true;
  } catch (error) {
    console.error('Error updating booking:', error);
    showNotification('Error updating booking', 'error');
    return false;
  }
}

/**
 * Cancel booking
 * @param {string} bookingId - Booking ID
 * @returns {Promise<boolean>}
 */
async function cancelBooking(bookingId) {
  return updateBookingStatus(bookingId, 'cancelled');
}

// ============================================================================
// TRANSACTION MANAGEMENT
// ============================================================================

/**
 * Create a new transaction record for a booking payment or reservation.
 * @param {Object} transactionData
 * @returns {string|null} Transaction ID
 */
function createTransaction(transactionData) {
  try {
    const transaction = {
      ...transactionData,
      status: transactionData.status || 'pending',
      currency: transactionData.currency || 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const transactions = getFromLocalStorage('transactions', {});
    const transactionId = `txn_${Date.now()}`;
    transactions[transactionId] = transaction;
    saveToLocalStorage('transactions', transactions);

    showNotification('Transaction saved successfully!', 'success');
    return transactionId;
  } catch (error) {
    console.error('Error creating transaction:', error);
    showNotification('Error creating transaction', 'error');
    return null;
  }
}

/**
 * Get all transactions as an object keyed by transaction ID.
 * @returns {Object}
 */
function getTransactions() {
  return getFromLocalStorage('transactions', {});
}

/**
 * Get a transaction by ID.
 * @param {string} transactionId
 * @returns {Object|null}
 */
function getTransaction(transactionId) {
  const transactions = getTransactions();
  return transactions[transactionId] || null;
}

/**
 * Update transaction status.
 * @param {string} transactionId
 * @param {string} status
 * @returns {boolean}
 */
function updateTransactionStatus(transactionId, status) {
  try {
    const transactions = getTransactions();
    if (!transactions[transactionId]) {
      return false;
    }

    transactions[transactionId].status = status;
    transactions[transactionId].updatedAt = new Date().toISOString();
    saveToLocalStorage('transactions', transactions);

    showNotification('Transaction updated', 'success');
    return true;
  } catch (error) {
    console.error('Error updating transaction:', error);
    showNotification('Error updating transaction', 'error');
    return false;
  }
}

// ============================================================================
// USER AUTHENTICATION HELPERS
// ============================================================================

/**
 * Get current logged-in user
 * @returns {Object|null} Current user object or null
 */
function getCurrentUser() {
  // This should be initialized from Firebase Auth
  // Placeholder implementation
  const storedUser = getFromLocalStorage('currentUser', null);
  return storedUser;
}

/**
 * Set current user (typically called after login)
 * @param {Object} user - User object from Firebase Auth
 */
function setCurrentUser(user) {
  if (user) {
    saveToLocalStorage('currentUser', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });
  } else {
    removeFromLocalStorage('currentUser');
  }
}

/**
 * Check if user is logged in
 * @returns {boolean}
 */
function isUserLoggedIn() {
  return getCurrentUser() !== null;
}

/**
 * Logout user
 */
function logoutUser() {
  removeFromLocalStorage('currentUser');
  showNotification('Logged out successfully', 'info');
  navigateTo('VAmain.html');
}

// ============================================================================
// USER PROFILE MANAGEMENT
// ============================================================================

/**
 * Save user profile data
 * @param {Object} profileData - Profile data
 *   - name: string
 *   - email: string
 *   - phone: string
 *   - location: string
 *   - bio: string
 * @returns {Promise<boolean>}
 */
async function saveUserProfile(profileData) {
  try {
    showLoadingSpinner(true);

    // Save to local storage
    saveToLocalStorage('userProfile', profileData);

    // Save to Firebase if user is logged in
    const currentUser = getCurrentUser();
    if (currentUser && db) {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          ...profileData,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }

    showNotification('Profile updated successfully', 'success');
    showLoadingSpinner(false);
    return true;
  } catch (error) {
    console.error('Error saving profile:', error);
    showNotification('Error saving profile', 'error');
    showLoadingSpinner(false);
    return false;
  }
}

/**
 * Get user profile data
 * @returns {Object} Profile data
 */
function getUserProfile() {
  return getFromLocalStorage('userProfile', {});
}

// ============================================================================
// FORM VALIDATION HELPERS
// ============================================================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
function validatePassword(password) {
  const result = {
    isValid: true,
    strength: 'weak',
    issues: []
  };

  if (password.length < 8) {
    result.issues.push('Password must be at least 8 characters');
    result.isValid = false;
  }

  if (!/[A-Z]/.test(password)) {
    result.issues.push('Password must contain uppercase letter');
    result.isValid = false;
  }

  if (!/[0-9]/.test(password)) {
    result.issues.push('Password must contain number');
    result.isValid = false;
  }

  if (!/[!@#$%^&*]/.test(password)) {
    result.issues.push('Password must contain special character');
    result.isValid = false;
  }

  if (result.isValid) {
    result.strength = 'strong';
  } else if (password.length >= 6) {
    result.strength = 'medium';
  }

  return result;
}

/**
 * Get form data as object
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Form data
 */
function getFormData(form) {
  const formData = new FormData(form);
  const data = {};
  
  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }
  
  return data;
}

/**
 * Validate form field
 * @param {string} fieldName - Field name
 * @param {string} value - Field value
 * @param {Object} rules - Validation rules
 * @returns {Object} Validation result
 */
function validateField(fieldName, value, rules = {}) {
  const result = { isValid: true, errors: [] };

  if (rules.required && (!value || value.trim() === '')) {
    result.errors.push(`${fieldName} is required`);
    result.isValid = false;
  }

  if (rules.minLength && value.length < rules.minLength) {
    result.errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
    result.isValid = false;
  }

  if (rules.email && !isValidEmail(value)) {
    result.errors.push(`${fieldName} must be a valid email`);
    result.isValid = false;
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    result.errors.push(`${fieldName} format is invalid`);
    result.isValid = false;
  }

  return result;
}

// ============================================================================
// DATA SYNC & OFFLINE MODE
// ============================================================================

/**
 * Sync local data with Firebase
 * @returns {Promise<boolean>}
 */
async function syncDataWithFirebase() {
  try {
    if (!isUserLoggedIn() || !db) {
      return false;
    }

    showLoadingSpinner(true);
    const currentUser = getCurrentUser();
    const { doc, setDoc, collection, writeBatch } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    // Sync bookings
    const bookings = getBookings();
    const userRef = doc(db, 'users', currentUser.uid);
    
    const batch = writeBatch(db);
    for (const [bookingId, bookingData] of Object.entries(bookings)) {
      batch.set(doc(collection(userRef, 'bookings'), bookingId), bookingData);
    }

    // Sync favorites
    const favorites = getFavorites();
    for (const [destId, favData] of Object.entries(favorites)) {
      batch.set(doc(collection(userRef, 'favorites'), destId), favData);
    }

    await batch.commit();
    showNotification('Data synced with cloud', 'success');
    showLoadingSpinner(false);
    return true;
  } catch (error) {
    console.error('Error syncing data:', error);
    showNotification('Error syncing data', 'error');
    showLoadingSpinner(false);
    return false;
  }
}

/**
 * Check if offline
 * @returns {boolean}
 */
function isOffline() {
  return !navigator.onLine;
}

/**
 * Add offline action to queue
 * @param {Object} action - Action to queue
 */
function queueOfflineAction(action) {
  const queue = getFromLocalStorage('offlineQueue', []);
  queue.push({
    ...action,
    queuedAt: new Date().toISOString()
  });
  saveToLocalStorage('offlineQueue', queue);
}

/**
 * Process offline action queue
 * @returns {Promise<void>}
 */
async function processOfflineQueue() {
  if (isOffline()) return;

  const queue = getFromLocalStorage('offlineQueue', []);
  if (queue.length === 0) return;

  try {
    showLoadingSpinner(true);
    
    for (const action of queue) {
      // Process each queued action
      console.log('Processing queued action:', action);
      // Implementation depends on action type
    }

    removeFromLocalStorage('offlineQueue');
    showNotification('Offline actions synced', 'success');
    showLoadingSpinner(false);
  } catch (error) {
    console.error('Error processing offline queue:', error);
    showLoadingSpinner(false);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {string} format - Format (short, long)
 * @returns {string}
 */
function formatDate(date, format = 'short') {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } else if (format === 'long') {
    return dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  
  return dateObj.toISOString();
}

/**
 * Calculate days between two dates
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {number} Number of days
 */
function daysBetween(startDate, endDate) {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string}
 */
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function}
 */
function debounce(func, delay = 300) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function}
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize app on page load
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('VacAsia app initialized');
  
  // Set active navigation link
  setActiveNavLink();
  
  // Check for offline queue on page load
  if (!isOffline()) {
    processOfflineQueue();
  }
  
  // Setup online/offline event listeners
  window.addEventListener('online', () => {
    console.log('Back online');
    processOfflineQueue();
    showNotification('Back online - syncing data', 'info');
  });
  
  window.addEventListener('offline', () => {
    console.log('Going offline');
    showNotification('Going offline - changes will sync when back online', 'warning');
  });
});

// ============================================================================
// EXPORT for module usage (if using modules)
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Navigation
    navigateTo,
    smoothScroll,
    setActiveNavLink,
    toggleMobileMenu,
    showNotification,
    showLoadingSpinner,
    
    // Local Storage
    saveToLocalStorage,
    getFromLocalStorage,
    removeFromLocalStorage,
    clearLocalStorage,
    
    // Search
    searchDestinations,
    saveSearchHistory,
    getSearchHistory,
    clearSearchHistory,
    
    // Favorites
    addToFavorites,
    removeFromFavorites,
    getFavorites,
    isFavorite,
    
    // Bookings
    createBooking,
    getBookings,
    getBooking,
    updateBookingStatus,
    cancelBooking,

    // Transactions
    createTransaction,
    getTransactions,
    getTransaction,
    updateTransactionStatus,
    
    // User & Auth
    getCurrentUser,
    setCurrentUser,
    isUserLoggedIn,
    logoutUser,
    saveUserProfile,
    getUserProfile,
    
    // Form Validation
    isValidEmail,
    validatePassword,
    getFormData,
    validateField,
    
    // Sync & Offline
    syncDataWithFirebase,
    isOffline,
    queueOfflineAction,
    processOfflineQueue,
    
    // Utilities
    formatDate,
    daysBetween,
    formatCurrency,
    debounce,
    throttle
  };
}
