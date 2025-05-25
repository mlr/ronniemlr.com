// Theme Switcher for RonnieMLR.com
// Handles 3-way toggle between system, dark and light modes

// Theme values
const THEMES = {
  SYSTEM: 'system',
  DARK: 'dark',
  LIGHT: 'light'
};

// Make initializeTheme available globally
window.initializeTheme = initializeTheme;

// Simple logger for debugging
function log(message) {
  console.log(`[Theme] ${message}`);
}

// Enable debugging in console with: localStorage.setItem('debug-theme', 'true')
const isDebug = localStorage.getItem('debug-theme') === 'true';
const logger = isDebug ? log : () => {};

// Function to get system color scheme preference
function getSystemPreference() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
}

// Function to get user's stored theme preference
function getStoredThemePreference() {
  return localStorage.getItem('theme');
}

// Function to determine which theme to use
function getEffectiveTheme() {
  const storedTheme = getStoredThemePreference();
  
  // If user has explicitly chosen a theme, use that
  if (storedTheme === THEMES.DARK || storedTheme === THEMES.LIGHT) {
    return storedTheme;
  }
  
  // Otherwise, use system preference
  return getSystemPreference();
}

// Actually apply the theme to the document
function applyTheme(theme) {
  logger(`Applying theme: ${theme}`);
  
  if (theme === THEMES.DARK) {
    document.documentElement.classList.add('dark');
    logger('Added dark class to HTML');
  } else {
    document.documentElement.classList.remove('dark');
    logger('Removed dark class from HTML');
  }
}

// Update the UI to show which theme is active
function updateActiveButtonState(themeValue) {
  const buttons = {
    system: document.getElementById('theme-toggle-system'),
    dark: document.getElementById('theme-toggle-dark'),
    light: document.getElementById('theme-toggle-light')
  };

  // First remove active class from all buttons
  Object.values(buttons).forEach(button => {
    if (button) button.classList.remove('active');
  });
  
  // Then add it to the correct button
  if (themeValue === THEMES.DARK || themeValue === THEMES.LIGHT) {
    if (buttons[themeValue]) {
      buttons[themeValue].classList.add('active');
      logger(`Set ${themeValue} button as active`);
    }
  } else {
    if (buttons.system) {
      buttons.system.classList.add('active');
      logger('Set system button as active');
    }
  }
  
  // Debug display
  if (isDebug) {
    const debugEl = document.getElementById('theme-debug');
    if (debugEl) {
      const effectiveTheme = getEffectiveTheme();
      debugEl.textContent = `Theme: ${themeValue} (${effectiveTheme})`;
      debugEl.classList.remove('hidden');
    }
  }
}

// Handle a user selecting a theme
function handleThemeSelection(theme) {
  logger(`User selected: ${theme}`);
  
  if (theme === THEMES.SYSTEM) {
    // Clear the stored preference to revert to system
    localStorage.removeItem('theme');
    logger('Removed theme from localStorage (using system)');
    
    // Apply the system preference
    applyTheme(getSystemPreference());
  } else {
    // Store user's explicit preference
    localStorage.setItem('theme', theme);
    logger(`Saved ${theme} to localStorage`);
    
    // Apply the selected theme
    applyTheme(theme);
  }
  
  // Update the UI
  updateActiveButtonState(theme);
}

// Set up event handlers for theme buttons
function setupThemeToggleHandlers() {
  const buttons = {
    system: document.getElementById('theme-toggle-system'),
    dark: document.getElementById('theme-toggle-dark'),
    light: document.getElementById('theme-toggle-light')
  };

  logger(`Buttons found: system=${!!buttons.system}, dark=${!!buttons.dark}, light=${!!buttons.light}`);
  
  // Add click listeners
  Object.entries(buttons).forEach(([theme, button]) => {
    if (button) {
      button.addEventListener('click', () => handleThemeSelection(theme));
      logger(`Added click handler to ${theme} button`);
    }
  });
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ({ matches }) => {
    logger(`System preference changed to ${matches ? 'dark' : 'light'}`);
    
    // Only react to system changes if the user hasn't set an explicit preference
    if (!getStoredThemePreference()) {
      applyTheme(matches ? THEMES.DARK : THEMES.LIGHT);
    }
  });
}

// Initialize theme on page load
function initializeTheme() {
  logger('Initializing theme');
  
  // Get stored theme preference
  const storedTheme = getStoredThemePreference();
  logger(`Stored theme: ${storedTheme || 'none (using system)'}`);
  
  // Get effective theme (what will actually be applied)
  const effectiveTheme = getEffectiveTheme();
  logger(`Effective theme: ${effectiveTheme}`);
  
  // Apply the theme
  applyTheme(effectiveTheme);
  
  // Update UI
  updateActiveButtonState(storedTheme || THEMES.SYSTEM);
  
  // Set up event handlers
  setupThemeToggleHandlers();
  
  // Log final state
  logger(`Initialization complete. Dark mode is ${document.documentElement.classList.contains('dark') ? 'ON' : 'OFF'}`);
  
  return effectiveTheme;
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTheme);
} else {
  // DOM is already ready
  initializeTheme();
}