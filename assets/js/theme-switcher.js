// Theme Switcher for RonnieMLR.com
// Handles cycling between system, dark and light modes with a single button

// Theme values
const THEMES = {
  SYSTEM: 'system',
  DARK: 'dark',
  LIGHT: 'light'
};

// Theme cycling order
const THEME_CYCLE = [THEMES.SYSTEM, THEMES.DARK, THEMES.LIGHT];

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
function updateActiveIconState(themeValue) {
  const themeIcons = {
    system: document.querySelector('.theme-toggle-btn .theme-icon.system'),
    dark: document.querySelector('.theme-toggle-btn .theme-icon.dark'),
    light: document.querySelector('.theme-toggle-btn .theme-icon.light')
  };

  // Add a subtle animation class to the button
  const cycleButton = document.getElementById('theme-toggle-cycle');
  if (cycleButton) {
    cycleButton.classList.add('theme-changed');
    setTimeout(() => {
      cycleButton.classList.remove('theme-changed');
    }, 300);
  }

  // First remove active class from all icons
  Object.values(themeIcons).forEach(icon => {
    if (icon) icon.classList.remove('active');
  });
  
  // Then add it to the correct icon
  if (themeValue === THEMES.DARK || themeValue === THEMES.LIGHT) {
    if (themeIcons[themeValue]) {
      themeIcons[themeValue].classList.add('active');
      logger(`Set ${themeValue} icon as active`);
    }
  } else {
    if (themeIcons.system) {
      themeIcons.system.classList.add('active');
      logger('Set system icon as active');
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

// Get the next theme in the cycle
function getNextTheme(currentTheme) {
  const currentIndex = THEME_CYCLE.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
  return THEME_CYCLE[nextIndex];
}

// Handle theme cycling
function handleThemeCycle() {
  const currentTheme = getStoredThemePreference() || THEMES.SYSTEM;
  const nextTheme = getNextTheme(currentTheme);
  
  // Add a subtle animation to the button
  const cycleButton = document.getElementById('theme-toggle-cycle');
  if (cycleButton) cycleButton.classList.add('cycling');
  
  logger(`Cycling theme from ${currentTheme} to ${nextTheme}`);
  
  if (nextTheme === THEMES.SYSTEM) {
    // Clear the stored preference to revert to system
    localStorage.removeItem('theme');
    logger('Removed theme from localStorage (using system)');
    
    // Apply the system preference
    applyTheme(getSystemPreference());
  } else {
    // Store user's explicit preference
    localStorage.setItem('theme', nextTheme);
    logger(`Saved ${nextTheme} to localStorage`);
    
    // Apply the selected theme
    applyTheme(nextTheme);
  }
  
  // Update the UI
  updateActiveIconState(nextTheme);
  
  // Remove animation class after transition
  setTimeout(() => {
    const cycleButton = document.getElementById('theme-toggle-cycle');
    if (cycleButton) cycleButton.classList.remove('cycling');
  }, 300);
}

// Set up event handler for the theme toggle button
function setupThemeCycleHandler() {
  const cycleButton = document.getElementById('theme-toggle-cycle');
  
  if (cycleButton) {
    cycleButton.addEventListener('click', handleThemeCycle);
    logger('Added click handler to theme cycle button');
  } else {
    logger('ERROR: Theme cycle button not found in DOM');
  }
  
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
  updateActiveIconState(storedTheme || THEMES.SYSTEM);
  
  // Set up event handler
  setupThemeCycleHandler();
  
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