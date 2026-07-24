/**
 * VacAsia - Firebase Configuration & Initialization
 * Replace placeholder values with your actual Firebase project credentials
 */

// ============================================================================
// FIREBASE CONFIGURATION - UPDATE THESE VALUES
// ============================================================================

const firebaseConfig = {
  // Get these values from your Firebase Project Settings
  // https://console.firebase.google.com/project/YOUR_PROJECT_ID/settings/general
  
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional: for Google Analytics
};

// ============================================================================
// FIREBASE INITIALIZATION
// ============================================================================

// Dynamically load Firebase SDK
async function initializeFirebase() {
  try {
    // Import Firebase modules
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
    const { getFirestore, enableIndexedDbPersistence } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
    const { getStorage } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js');

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);

    // Initialize Firestore
    window.db = getFirestore(app);
    
    // Enable offline persistence for Firestore
    try {
      await enableIndexedDbPersistence(window.db);
      console.log('Firestore offline persistence enabled');
    } catch (error) {
      if (error.code === 'failed-precondition') {
        console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (error.code === 'unimplemented') {
        console.log('The current browser does not support offline persistence.');
      }
    }

    // Initialize Authentication
    window.auth = getAuth(app);

    // Initialize Storage
    window.storage = getStorage(app);

    console.log('Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return false;
  }
}

// ============================================================================
// FIRESTORE COLLECTION TEMPLATES & STRUCTURES
// ============================================================================

/**
 * FIRESTORE COLLECTION STRUCTURE:
 * 
 * /users/{uid}
 *   - email (string)
 *   - displayName (string)
 *   - phone (string)
 *   - location (string)
 *   - profilePicture (string - URL)
 *   - bio (string)
 *   - memberSince (timestamp)
 *   - updatedAt (timestamp)
 * 
 * /users/{uid}/bookings/{bookingId}
 *   - destination (string)
 *   - startDate (string - YYYY-MM-DD)
 *   - endDate (string - YYYY-MM-DD)
 *   - travelers (number)
 *   - tickets (number)
 *   - totalPrice (number)
 *   - status (string - pending, confirmed, cancelled, completed)
 *   - createdAt (timestamp)
 *   - updatedAt (timestamp)
 *   - notes (string)
 * 
 * /users/{uid}/favorites/{destinationId}
 *   - name (string)
 *   - country (string)
 *   - description (string)
 *   - imageUrl (string)
 *   - rating (number)
 *   - priceRange (string - budget, moderate, luxury)
 *   - tags (array - beach, city, nature, adventure, culture, family)
 *   - addedAt (timestamp)
 * 
 * /destinations/{destinationId}
 *   - name (string)
 *   - country (string)
 *   - description (string)
 *   - imageUrl (string)
 *   - imageGallery (array)
 *   - rating (number)
 *   - priceRange (string - budget, moderate, luxury)
 *   - estimatedCost (number)
 *   - bestSeason (string)
 *   - tags (array - beach, city, nature, adventure, culture, family)
 *   - attractions (array of strings)
 *   - weather (object with seasonal info)
 *   - mapLocation (geopoint or coordinates object)
 *   - reviews (subcollection)
 *   - createdAt (timestamp)
 *   - updatedAt (timestamp)
 * 
 * /destinations/{destinationId}/reviews/{reviewId}
 *   - userId (string)
 *   - userName (string)
 *   - rating (number 1-5)
 *   - comment (string)
 *   - visitDate (string - YYYY-MM-DD)
 *   - helpful (number - count of helpful votes)
 *   - createdAt (timestamp)
 *   - updatedAt (timestamp)
 * 
 * /admin/settings/{settingId}
 *   - maintenance (boolean)
 *   - maintenanceMessage (string)
 *   - features (object with feature flags)
 *   - updatedAt (timestamp)
 */

// ============================================================================
// TEMPLATE DATA FUNCTIONS
// ============================================================================

/**
 * Template for new user document
 * @param {Object} userData - User data from authentication
 * @returns {Object} Formatted user document
 */
function createUserDocument(userData) {
  return {
    email: userData.email,
    displayName: userData.displayName || '',
    phone: '',
    location: '',
    profilePicture: userData.photoURL || '',
    bio: '',
    memberSince: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Template for new booking document
 * @param {Object} bookingData - Booking form data
 * @returns {Object} Formatted booking document
 */
function createBookingDocument(bookingData) {
  return {
    destination: bookingData.destination || '',
    startDate: bookingData.startDate || '',
    endDate: bookingData.endDate || '',
    travelers: parseInt(bookingData.travelers) || 1,
    tickets: parseInt(bookingData.tickets) || 1,
    totalPrice: parseFloat(bookingData.totalPrice) || 0,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    notes: bookingData.notes || ''
  };
}

/**
 * Template for new favorite document
 * @param {Object} destinationData - Destination data
 * @returns {Object} Formatted favorite document
 */
function createFavoriteDocument(destinationData) {
  return {
    name: destinationData.name || '',
    country: destinationData.country || '',
    description: destinationData.description || '',
    imageUrl: destinationData.imageUrl || '',
    rating: destinationData.rating || 0,
    priceRange: destinationData.priceRange || 'moderate',
    tags: destinationData.tags || [],
    addedAt: new Date()
  };
}

/**
 * Template for new destination document
 * @param {Object} destinationData - Destination details
 * @returns {Object} Formatted destination document
 */
function createDestinationDocument(destinationData) {
  return {
    name: destinationData.name || '',
    country: destinationData.country || '',
    description: destinationData.description || '',
    imageUrl: destinationData.imageUrl || '',
    imageGallery: destinationData.imageGallery || [],
    rating: destinationData.rating || 0,
    priceRange: destinationData.priceRange || 'moderate',
    estimatedCost: destinationData.estimatedCost || 0,
    bestSeason: destinationData.bestSeason || '',
    tags: destinationData.tags || [],
    attractions: destinationData.attractions || [],
    weather: destinationData.weather || {},
    mapLocation: destinationData.mapLocation || null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Template for new review document
 * @param {Object} reviewData - Review details
 * @returns {Object} Formatted review document
 */
function createReviewDocument(reviewData) {
  return {
    userId: reviewData.userId || '',
    userName: reviewData.userName || '',
    rating: parseInt(reviewData.rating) || 5,
    comment: reviewData.comment || '',
    visitDate: reviewData.visitDate || '',
    helpful: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// ============================================================================
// FIRESTORE HELPER FUNCTIONS
// ============================================================================

/**
 * Add a new document to Firestore
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID (optional - auto-generated if not provided)
 * @param {Object} data - Document data
 * @returns {Promise<string>} Document ID
 */
async function addDocument(collection, data, docId = null) {
  try {
    if (!window.db) {
      throw new Error('Firebase not initialized');
    }

    const { doc, setDoc, addDoc, collection: firestoreCollection } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    if (docId) {
      await setDoc(doc(window.db, collection, docId), data);
      return docId;
    } else {
      const docRef = await addDoc(firestoreCollection(window.db, collection), data);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error adding document:', error);
    throw error;
  }
}

/**
 * Get a document from Firestore
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @returns {Promise<Object>} Document data
 */
async function getDocument(collection, docId) {
  try {
    if (!window.db) {
      throw new Error('Firebase not initialized');
    }

    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const docSnapshot = await getDoc(doc(window.db, collection, docId));
    
    if (docSnapshot.exists()) {
      return { id: docSnapshot.id, ...docSnapshot.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
}

/**
 * Update a document in Firestore
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @param {Object} data - Data to update
 * @returns {Promise<void>}
 */
async function updateDocument(collection, docId, data) {
  try {
    if (!window.db) {
      throw new Error('Firebase not initialized');
    }

    const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    await updateDoc(doc(window.db, collection, docId), {
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
}

/**
 * Delete a document from Firestore
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @returns {Promise<void>}
 */
async function deleteDocument(collection, docId) {
  try {
    if (!window.db) {
      throw new Error('Firebase not initialized');
    }

    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    await deleteDoc(doc(window.db, collection, docId));
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

/**
 * Query documents from Firestore
 * @param {string} collectionName - Collection name
 * @param {Array} constraints - Array of where/orderBy constraints
 * @returns {Promise<Array>} Array of documents
 */
async function queryDocuments(collectionName, constraints = []) {
  try {
    if (!window.db) {
      throw new Error('Firebase not initialized');
    }

    const { collection, query, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    let q;
    if (constraints.length > 0) {
      q = query(collection(window.db, collectionName), ...constraints);
    } else {
      q = query(collection(window.db, collectionName));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error querying documents:', error);
    throw error;
  }
}

// ============================================================================
// INITIALIZATION ON PAGE LOAD
// ============================================================================

// Initialize Firebase when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
  initializeFirebase();
}

// ============================================================================
// EXPORT for module usage
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeFirebase,
    createUserDocument,
    createBookingDocument,
    createFavoriteDocument,
    createDestinationDocument,
    createReviewDocument,
    addDocument,
    getDocument,
    updateDocument,
    deleteDocument,
    queryDocuments,
    firebaseConfig
  };
}
