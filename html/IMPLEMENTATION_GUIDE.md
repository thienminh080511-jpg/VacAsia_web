# VacAsia Implementation Guide

Complete practical examples showing how to implement JavaScript functions in your HTML pages.

## Table of Contents
1. [Login/Register Form](#loginregister-form)
2. [Search Page](#search-page)
3. [Booking Form](#booking-form)
4. [Favorites Management](#favorites-management)
5. [Profile Management](#profile-management)
6. [Navigation Setup](#navigation-setup)

---

## Login/Register Form

### HTML
```html
<section class="content-block">
  <h2>Welcome back</h2>
  <p>Sign in to continue planning your next Asian vacation.</p>
  
  <form id="login-form" class="form-card">
    <label>
      Email address
      <input 
        type="email" 
        name="email" 
        placeholder="you@example.com"
        id="login-email"
        required
      />
    </label>
    
    <label>
      Password
      <input 
        type="password" 
        name="password" 
        placeholder="••••••••"
        id="login-password"
        required
      />
    </label>
    
    <button type="submit" class="button">Login</button>
  </form>
  
  <p>Don't have an account? <a href="register.html">Register here</a>.</p>
</section>
```

### JavaScript Implementation
```javascript
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  // Validate inputs
  if (!isValidEmail(email)) {
    showNotification('Please enter a valid email', 'error');
    return;
  }
  
  if (!password || password.length < 6) {
    showNotification('Password must be at least 6 characters', 'error');
    return;
  }
  
  showLoadingSpinner(true);
  
  try {
    // Firebase authentication (requires Firebase Auth setup)
    if (window.auth) {
      const { signInWithEmailAndPassword } = await import(
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js'
      );
      
      const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
      const user = userCredential.user;
      
      // Save user to local state
      setCurrentUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });
      
      showNotification(`Welcome back, ${user.email}!`, 'success');
      
      // Redirect after 1 second
      setTimeout(() => navigateTo('profile.html'), 1000);
    } else {
      // Demo mode - just save to localStorage
      setCurrentUser({
        uid: 'demo-user',
        email: email,
        displayName: email.split('@')[0]
      });
      
      showNotification('Logged in successfully (demo mode)', 'success');
      setTimeout(() => navigateTo('profile.html'), 1000);
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification(error.message || 'Login failed', 'error');
  } finally {
    showLoadingSpinner(false);
  }
});
```

### Register Form HTML
```html
<section class="content-block">
  <h2>Create your VacAsia account</h2>
  <p>Join thousands of travelers planning their next adventure.</p>
  
  <form id="register-form" class="form-card">
    <label>
      Full Name
      <input 
        type="text" 
        name="displayName" 
        placeholder="John Doe"
        required
      />
    </label>
    
    <label>
      Email address
      <input 
        type="email" 
        name="email" 
        placeholder="you@example.com"
        required
      />
    </label>
    
    <label>
      Password
      <input 
        type="password" 
        name="password" 
        placeholder="••••••••"
        id="register-password"
        required
      />
      <small id="password-strength"></small>
    </label>
    
    <label>
      Confirm Password
      <input 
        type="password" 
        name="confirmPassword" 
        placeholder="••••••••"
        required
      />
    </label>
    
    <button type="submit" class="button">Create Account</button>
  </form>
  
  <p>Already have an account? <a href="login.html">Login here</a>.</p>
</section>
```

### Register JavaScript
```javascript
// Real-time password strength validation
document.getElementById('register-password')?.addEventListener('input', (e) => {
  const validation = validatePassword(e.target.value);
  const strengthEl = document.getElementById('password-strength');
  
  if (strengthEl) {
    strengthEl.textContent = `Strength: ${validation.strength}`;
    strengthEl.style.color = 
      validation.strength === 'strong' ? '#28a745' :
      validation.strength === 'medium' ? '#ffc107' :
      '#dc3545';
  }
});

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = getFormData(e.target);
  
  // Validate all fields
  const validations = {
    displayName: validateField('Name', formData.displayName, { required: true, minLength: 2 }),
    email: validateField('Email', formData.email, { required: true, email: true }),
    password: validatePassword(formData.password)
  };
  
  // Check if all validations pass
  for (const [field, validation] of Object.entries(validations)) {
    if (!validation.isValid) {
      const message = validation.errors?.[0] || validation.issues?.[0];
      showNotification(message, 'error');
      return;
    }
  }
  
  // Check passwords match
  if (formData.password !== formData.confirmPassword) {
    showNotification('Passwords do not match', 'error');
    return;
  }
  
  showLoadingSpinner(true);
  
  try {
    // Firebase registration (requires Firebase Auth setup)
    if (window.auth) {
      const { createUserWithEmailAndPassword, updateProfile } = await import(
        'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js'
      );
      
      const userCredential = await createUserWithEmailAndPassword(
        window.auth, 
        formData.email, 
        formData.password
      );
      
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, { displayName: formData.displayName });
      
      // Save user profile to Firestore
      if (window.db) {
        const { doc, setDoc } = await import(
          'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js'
        );
        
        await setDoc(doc(window.db, 'users', user.uid), {
          email: user.email,
          displayName: formData.displayName,
          memberSince: new Date(),
          updatedAt: new Date()
        });
      }
      
      setCurrentUser({
        uid: user.uid,
        email: user.email,
        displayName: formData.displayName
      });
      
      showNotification('Account created successfully!', 'success');
      setTimeout(() => navigateTo('profile.html'), 1000);
    }
  } catch (error) {
    console.error('Registration error:', error);
    showNotification(error.message || 'Registration failed', 'error');
  } finally {
    showLoadingSpinner(false);
  }
});
```

---

## Search Page

### HTML
```html
<section class="content-block">
  <h2>Search filters</h2>
  
  <form id="search-form" class="form-card">
    <label>
      Destination name
      <input 
        type="text" 
        id="search-destination"
        name="destination"
        placeholder="Tokyo, Bali, Seoul" 
      />
    </label>
    
    <label>
      Travel style
      <select name="travelStyle">
        <option value="">Any</option>
        <option>Beach</option>
        <option>City</option>
        <option>Nature</option>
        <option>Adventure</option>
        <option>Culture</option>
        <option>Family</option>
      </select>
    </label>
    
    <label>
      Budget
      <select name="budget">
        <option value="">Any</option>
        <option value="budget">Budget</option>
        <option value="moderate">Moderate</option>
        <option value="luxury">Luxury</option>
      </select>
    </label>
    
    <label>
      Country
      <input 
        type="text" 
        name="country"
        placeholder="Japan, Indonesia, Thailand" 
      />
    </label>
    
    <button type="submit" class="button">Search</button>
  </form>
  
  <div id="search-results"></div>
  <div id="search-history"></div>
</section>
```

### JavaScript Implementation
```javascript
// Debounce search as user types (optional live search)
const searchInput = document.getElementById('search-destination');
const debouncedSearch = debounce(async (e) => {
  if (e.target.value.length >= 2) {
    performSearch();
  }
}, 500);

searchInput?.addEventListener('input', debouncedSearch);

// Handle search form submission
document.getElementById('search-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  performSearch();
});

async function performSearch() {
  showLoadingSpinner(true);
  
  try {
    const formData = getFormData(document.getElementById('search-form'));
    
    // Remove empty filters
    const filters = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== '')
    );
    
    // Perform search
    const results = await searchDestinations(filters);
    
    // Display results
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = displaySearchResults(results);
    }
    
    if (results.length === 0) {
      showNotification('No destinations found matching your criteria', 'info');
    }
  } catch (error) {
    console.error('Search error:', error);
    showNotification('Error performing search', 'error');
  } finally {
    showLoadingSpinner(false);
  }
}

// Display search results
function displaySearchResults(results) {
  if (results.length === 0) {
    return '<p class="muted">No destinations found. Try adjusting your filters.</p>';
  }
  
  return `
    <h3>Results (${results.length})</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
      ${results.map(dest => `
        <div style="border: 1px solid #ddd; border-radius: 12px; padding: 1rem; cursor: pointer;" 
             onclick="navigateTo('destination.html?id=${dest.id}')">
          <img src="${dest.imageUrl}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;" />
          <h4 style="margin: 0 0 0.5rem;">${dest.name}</h4>
          <p style="margin: 0 0 0.5rem; color: #666; font-size: 0.9rem;">${dest.country}</p>
          <p style="margin: 0; color: #999; font-size: 0.9rem;">${dest.description}</p>
          <div style="display: flex; justify-content: space-between; margin-top: 1rem; align-items: center;">
            <span style="color: #f2c94c; font-weight: bold;">★ ${dest.rating || 'N/A'}</span>
            <button class="button" style="padding: 0.5rem 1rem; font-size: 0.9rem;" 
                    onclick="event.stopPropagation(); addToFavorites('${dest.id}', ${JSON.stringify(dest)})">
              ♥ Favorite
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Display recent searches
function updateSearchHistoryDisplay() {
  const history = getSearchHistory();
  const historyContainer = document.getElementById('search-history');
  
  if (historyContainer && history.length > 0) {
    historyContainer.innerHTML = `
      <div style="margin-top: 2rem;">
        <h3>Recent Searches</h3>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${history.slice(0, 5).map((search, idx) => `
            <button class="button button-secondary" style="font-size: 0.9rem;"
                    onclick="document.getElementById('search-destination').value = '${search.filters.destination || ''}'; performSearch();">
              ${search.filters.destination || 'Search'}
            </button>
          `).join('')}
          <button class="button button-secondary" style="font-size: 0.9rem;" onclick="clearSearchHistory(); updateSearchHistoryDisplay();">
            Clear
          </button>
        </div>
      </div>
    `;
  }
}

// Update on page load
document.addEventListener('DOMContentLoaded', updateSearchHistoryDisplay);
```

---

## Booking Form

### HTML
```html
<section class="content-block">
  <h2>Trip details</h2>
  
  <form id="booking-form" class="form-card">
    <label>
      Destination
      <input 
        type="text" 
        name="destination" 
        placeholder="Kyoto, Japan"
        required 
      />
    </label>
    
    <label>
      Check-in Date
      <input 
        type="date" 
        name="startDate"
        id="start-date"
        required 
      />
    </label>
    
    <label>
      Check-out Date
      <input 
        type="date" 
        name="endDate"
        id="end-date"
        required 
      />
    </label>
    
    <label>
      Number of Travelers
      <select name="travelers" required>
        <option value="">Select</option>
        <option value="1">1 traveler</option>
        <option value="2">2 travelers</option>
        <option value="3">3 travelers</option>
        <option value="4">4 travelers</option>
        <option value="5">5+ travelers</option>
      </select>
    </label>
    
    <label>
      Number of Tickets
      <select name="tickets" required>
        <option value="">Select</option>
        <option value="1">1 ticket</option>
        <option value="2">2 tickets</option>
        <option value="3">3 tickets</option>
        <option value="4">4 tickets</option>
        <option value="5">5 tickets</option>
      </select>
    </label>
    
    <label>
      Estimated Total Price
      <input 
        type="number" 
        name="totalPrice" 
        placeholder="$0.00"
        step="0.01"
        min="0"
        required 
      />
    </label>
    
    <label>
      Special Requests (Optional)
      <textarea name="notes" placeholder="Any special requirements..."></textarea>
    </label>
    
    <button type="submit" class="button">Book Now</button>
  </form>
</section>
```

### JavaScript Implementation
```javascript
document.getElementById('booking-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Check if user is logged in
  if (!isUserLoggedIn()) {
    showNotification('Please login to make a booking', 'warning');
    setTimeout(() => navigateTo('login.html'), 1500);
    return;
  }
  
  showLoadingSpinner(true);
  
  try {
    const formData = getFormData(e.target);
    
    // Validate all required fields
    const validations = {
      destination: validateField('Destination', formData.destination, { required: true, minLength: 2 }),
      startDate: validateField('Start Date', formData.startDate, { required: true }),
      endDate: validateField('End Date', formData.endDate, { required: true }),
      travelers: validateField('Travelers', formData.travelers, { required: true }),
      tickets: validateField('Tickets', formData.tickets, { required: true }),
      totalPrice: validateField('Total Price', formData.totalPrice, { required: true })
    };
    
    for (const [field, validation] of Object.entries(validations)) {
      if (!validation.isValid) {
        showNotification(validation.errors[0], 'error');
        showLoadingSpinner(false);
        return;
      }
    }
    
    // Validate date logic
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      showNotification('End date must be after start date', 'error');
      showLoadingSpinner(false);
      return;
    }
    
    // Calculate trip duration
    const days = daysBetween(formData.startDate, formData.endDate);
    
    // Create booking
    const bookingData = {
      ...formData,
      travelers: parseInt(formData.travelers),
      tickets: parseInt(formData.tickets),
      totalPrice: parseFloat(formData.totalPrice),
      tripDays: days
    };
    
    const bookingId = await createBooking(bookingData);
    
    if (bookingId) {
      showNotification(
        `Booking confirmed! Booking ID: ${bookingId}`,
        'success',
        5000
      );
      
      // Reset form
      e.target.reset();
      
      // Redirect to history after 2 seconds
      setTimeout(() => navigateTo('history.html'), 2000);
    }
  } catch (error) {
    console.error('Booking error:', error);
    showNotification('Error creating booking. Please try again.', 'error');
  } finally {
    showLoadingSpinner(false);
  }
});

// Auto-calculate trip duration
const startDate = document.getElementById('start-date');
const endDate = document.getElementById('end-date');

if (startDate && endDate) {
  const updateDuration = () => {
    if (startDate.value && endDate.value) {
      const days = daysBetween(startDate.value, endDate.value);
      console.log(`Trip duration: ${days} days`);
    }
  };
  
  startDate.addEventListener('change', updateDuration);
  endDate.addEventListener('change', updateDuration);
}
```

---

## Favorites Management

### HTML
```html
<section class="content-block">
  <h2>Your Favorites</h2>
  <div id="favorites-container"></div>
</section>
```

### JavaScript Implementation
```javascript
function displayFavorites() {
  const favorites = getFavorites();
  const container = document.getElementById('favorites-container');
  
  if (!container) return;
  
  if (Object.keys(favorites).length === 0) {
    container.innerHTML = `
      <p class="muted">No favorites yet. 
        <a href="search.html">Search destinations</a> to add some!</p>
    `;
    return;
  }
  
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
      ${Object.entries(favorites).map(([id, dest]) => `
        <div style="border: 1px solid #ddd; border-radius: 12px; overflow: hidden; background: white;">
          <img src="${dest.imageUrl}" 
               style="width: 100%; height: 200px; object-fit: cover;" />
          <div style="padding: 1rem;">
            <h4 style="margin: 0 0 0.5rem;">${dest.name}</h4>
            <p style="margin: 0 0 0.5rem; color: #666; font-size: 0.9rem;">${dest.country}</p>
            <p style="margin: 0 0 1rem; color: #999; font-size: 0.9rem;">${dest.description}</p>
            <div style="display: flex; gap: 0.5rem;">
              <button class="button" style="flex: 1; padding: 0.5rem;" 
                      onclick="navigateTo('destination.html?id=${id}')">
                View
              </button>
              <button class="button button-danger" style="flex: 1; padding: 0.5rem;" 
                      onclick="removeFavorite('${id}')">
                Remove
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function removeFavorite(destinationId) {
  if (confirm('Remove from favorites?')) {
    await removeFromFavorites(destinationId);
    displayFavorites();
  }
}

// Display on page load
document.addEventListener('DOMContentLoaded', displayFavorites);

// Refresh when user adds favorites from search page
window.addEventListener('storage', (e) => {
  if (e.key === 'favorites') {
    displayFavorites();
  }
});
```

---

## Profile Management

### HTML
```html
<section class="content-block">
  <h2>Edit Profile</h2>
  
  <form id="profile-form" class="form-card">
    <label>
      Full Name
      <input 
        type="text" 
        name="name"
        placeholder="John Doe"
        required 
      />
    </label>
    
    <label>
      Email
      <input 
        type="email" 
        name="email"
        placeholder="john@example.com"
        required 
      />
    </label>
    
    <label>
      Phone
      <input 
        type="tel" 
        name="phone"
        placeholder="+1 (555) 123-4567"
      />
    </label>
    
    <label>
      Location
      <input 
        type="text" 
        name="location"
        placeholder="City, Country"
      />
    </label>
    
    <label>
      Biography
      <textarea name="bio" placeholder="Tell us about yourself..."></textarea>
    </label>
    
    <button type="submit" class="button">Save Changes</button>
    <button type="button" class="button button-secondary" onclick="logoutUser()">Logout</button>
  </form>
  
  <div id="profile-info"></div>
</section>
```

### JavaScript Implementation
```javascript
function loadProfile() {
  const profile = getUserProfile();
  const form = document.getElementById('profile-form');
  
  if (form && profile) {
    form.elements.name.value = profile.name || '';
    form.elements.email.value = profile.email || '';
    form.elements.phone.value = profile.phone || '';
    form.elements.location.value = profile.location || '';
    form.elements.bio.value = profile.bio || '';
  }
  
  // Display profile info
  displayProfileInfo(profile);
}

function displayProfileInfo(profile) {
  const infoContainer = document.getElementById('profile-info');
  const user = getCurrentUser();
  
  if (infoContainer && user) {
    infoContainer.innerHTML = `
      <div style="background: #f5f5f5; border-radius: 12px; padding: 1.5rem; margin-top: 2rem;">
        <p><strong>Member Since:</strong> ${profile.memberSince ? formatDate(profile.memberSince, 'long') : 'Recently'}</p>
        <p><strong>Account Status:</strong> Active</p>
        <p><strong>Bookings:</strong> ${Object.keys(getBookings()).length}</p>
        <p><strong>Favorites:</strong> ${Object.keys(getFavorites()).length}</p>
      </div>
    `;
  }
}

document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  showLoadingSpinner(true);
  
  try {
    const formData = getFormData(e.target);
    
    // Validate required fields
    const nameValidation = validateField('Name', formData.name, { required: true, minLength: 2 });
    const emailValidation = validateField('Email', formData.email, { required: true, email: true });
    
    if (!nameValidation.isValid) {
      showNotification(nameValidation.errors[0], 'error');
      showLoadingSpinner(false);
      return;
    }
    
    if (!emailValidation.isValid) {
      showNotification(emailValidation.errors[0], 'error');
      showLoadingSpinner(false);
      return;
    }
    
    // Save profile
    const success = await saveUserProfile(formData);
    
    if (success) {
      showNotification('Profile updated successfully!', 'success');
      loadProfile(); // Reload to show updates
    }
  } catch (error) {
    console.error('Profile error:', error);
    showNotification('Error updating profile', 'error');
  } finally {
    showLoadingSpinner(false);
  }
});

// Load profile on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  if (!isUserLoggedIn()) {
    showNotification('Please login to view your profile', 'warning');
    setTimeout(() => navigateTo('login.html'), 1500);
  } else {
    loadProfile();
  }
});
```

---

## Navigation Setup

### Add to HTML Header (optional mobile menu toggle)
```html
<header class="topbar">
  <a class="brand" href="VAmain.html">VacAsia</a>
  
  <button class="mobile-menu-toggle" onclick="toggleMobileMenu()">☰</button>
  
  <nav class="nav-links" aria-label="Primary navigation">
    <a href="VAmain.html">Home</a>
    <a href="search.html">Search</a>
    <a href="favorites.html">Favorites</a>
    <a href="booking.html">Booking</a>
    <a href="history.html">History</a>
    <a href="about.html">About</a>
    <a href="contact.html">Contact</a>
    <a id="profile-link" href="#" style="display: none;">Profile</a>
    <a id="logout-link" href="#" style="display: none;" onclick="logoutUser()">Logout</a>
  </nav>
</header>
```

### JavaScript - Update Navigation Based on Auth State
```javascript
function updateNavigation() {
  const profileLink = document.getElementById('profile-link');
  const logoutLink = document.getElementById('logout-link');
  const isLoggedIn = isUserLoggedIn();
  
  if (profileLink) {
    profileLink.style.display = isLoggedIn ? 'inline' : 'none';
    if (isLoggedIn) {
      const user = getCurrentUser();
      profileLink.href = 'profile.html';
      profileLink.textContent = `${user.email.split('@')[0]}`;
    }
  }
  
  if (logoutLink) {
    logoutLink.style.display = isLoggedIn ? 'inline' : 'none';
  }
}

// Update on page load and when auth state changes
document.addEventListener('DOMContentLoaded', updateNavigation);
window.addEventListener('storage', updateNavigation);
```

---

## Complete Example: Booking History Page

```html
<section class="content-block">
  <h2>Your Bookings</h2>
  <div id="bookings-container"></div>
</section>

<script>
function displayBookingHistory() {
  const bookings = getBookings();
  const container = document.getElementById('bookings-container');
  
  if (!container) return;
  
  // Check if user is logged in
  if (!isUserLoggedIn()) {
    container.innerHTML = `
      <p class="muted">Please <a href="login.html">login</a> to view your bookings.</p>
    `;
    return;
  }
  
  if (Object.keys(bookings).length === 0) {
    container.innerHTML = `
      <p class="muted">No bookings yet. 
        <a href="booking.html">Make a booking</a> to start your adventure!</p>
    `;
    return;
  }
  
  // Group bookings by status
  const byStatus = {};
  Object.entries(bookings).forEach(([id, booking]) => {
    if (!byStatus[booking.status]) byStatus[booking.status] = [];
    byStatus[booking.status].push([id, booking]);
  });
  
  let html = '';
  
  const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  statuses.forEach(status => {
    if (byStatus[status]) {
      html += `<h3 style="text-transform: capitalize; margin-top: 2rem;">${status} Bookings</h3>`;
      html += '<div style="display: grid; gap: 1rem;">';
      
      byStatus[status].forEach(([id, booking]) => {
        const bgColor = 
          status === 'confirmed' ? '#d4edda' :
          status === 'completed' ? '#cce5ff' :
          status === 'cancelled' ? '#f8d7da' :
          '#fff3cd';
        
        html += `
          <div style="background: ${bgColor}; border: 1px solid #ddd; border-radius: 12px; padding: 1.5rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <p><strong>Destination:</strong> ${booking.destination}</p>
                <p><strong>Dates:</strong> ${formatDate(booking.startDate)} to ${formatDate(booking.endDate)}</p>
                <p><strong>Travelers:</strong> ${booking.travelers}</p>
              </div>
              <div>
                <p><strong>Tickets:</strong> ${booking.tickets}</p>
                <p><strong>Total Price:</strong> ${formatCurrency(booking.totalPrice)}</p>
                <p><strong>Status:</strong> <span class="badge badge-primary">${status}</span></p>
              </div>
            </div>
            <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
              <button class="button button-secondary" style="padding: 0.5rem 1rem;" 
                      onclick="viewBookingDetails('${id}')">
                View Details
              </button>
              ${status === 'pending' ? `
                <button class="button" style="padding: 0.5rem 1rem;" 
                        onclick="updateBookingStatus('${id}', 'confirmed')">
                  Confirm
                </button>
              ` : ''}
              ${status !== 'completed' && status !== 'cancelled' ? `
                <button class="button button-danger" style="padding: 0.5rem 1rem;" 
                        onclick="cancelBooking('${id}')">
                  Cancel
                </button>
              ` : ''}
            </div>
          </div>
        `;
      });
      
      html += '</div>';
    }
  });
  
  container.innerHTML = html;
}

function viewBookingDetails(bookingId) {
  const booking = getBooking(bookingId);
  if (booking) {
    alert(`
Booking ID: ${bookingId}
Destination: ${booking.destination}
Check-in: ${formatDate(booking.startDate, 'long')}
Check-out: ${formatDate(booking.endDate, 'long')}
Travelers: ${booking.travelers}
Tickets: ${booking.tickets}
Total Price: ${formatCurrency(booking.totalPrice)}
Status: ${booking.status}
${booking.notes ? `Notes: ${booking.notes}` : ''}
    `);
  }
}

document.addEventListener('DOMContentLoaded', displayBookingHistory);
</script>
```

---

## Tips & Best Practices

1. **Always check if user is logged in** before showing user-specific content
2. **Use showLoadingSpinner** during async operations
3. **Validate form inputs** before submitting
4. **Show notifications** for all user actions (success, error, info)
5. **Handle errors gracefully** with try-catch blocks
6. **Use debounce** for search inputs to reduce unnecessary function calls
7. **Save to localStorage** before Firestore for instant feedback
8. **Test offline functionality** by disabling network in DevTools
9. **Check browser console** for debugging JavaScript errors
10. **Use formatDate and formatCurrency** for consistent user-facing dates and prices

---

## Testing in Console

```javascript
// Test notifications
showNotification('Success!', 'success');
showNotification('Error occurred', 'error');

// Test data saving
saveToLocalStorage('test', { hello: 'world' });
getFromLocalStorage('test');

// Test favorites
addToFavorites('test-id', { name: 'Test Destination' });
getFavorites();

// Test bookings
createBooking({
  destination: 'Test',
  travelers: 1,
  startDate: '2026-12-01',
  endDate: '2026-12-05',
  tickets: 1,
  totalPrice: 1000
});
getBookings();

// Test validation
isValidEmail('test@example.com');
validatePassword('MyP@ssw0rd');
```

---

For detailed function documentation, see `JAVASCRIPT_REFERENCE.md`.

