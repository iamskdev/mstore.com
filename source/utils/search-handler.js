/**
 * @file Manages all search-related functionality, including Fuse.js instance
 * creation and the search input UI component. This is the centralized module for search.
 */

import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js';

// --- Configuration (from former config.js) ---
const FUSE_CONFIG = {
  keys: ['name', 'category', 'description'],
  minMatchCharLength: 1,
  threshold: 0.4,
  includeMatches: true,
};

// --- UI Component (from former fuse.js) ---
class SearchComponent {
  /**
   * @param {object} options
   * @param {HTMLInputElement} options.searchInputEl - The search input element.
   * @param {HTMLUListElement} options.suggestionsBoxEl - The UL element to display suggestions.
   * @param {Fuse} options.fuseInstance - A pre-initialized Fuse.js instance.
   * @param {function(object): void} options.onResultClick - Callback when a suggestion is clicked. Receives the full item object.
   * @param {function(string): void} [options.onSearchSubmit] - Optional callback for when Enter is pressed on the input.
   */
  constructor({ searchInputEl, suggestionsBoxEl, fuseInstance, onResultClick, onSearchSubmit }) {
    this.searchInput = searchInputEl;
    this.suggestionsBox = suggestionsBoxEl;
    this.fuse = fuseInstance;
    this.onResultClick = onResultClick;
    this.onSearchSubmit = onSearchSubmit;
    this.activeSuggestionIndex = -1;

    if (!this.fuse) {
      throw new Error("SearchComponent requires a valid fuseInstance.");
    }

    this.init();
  }

  init() {
    this.searchInput.addEventListener('input', this.onInput.bind(this));
    this.searchInput.addEventListener('keydown', (e) => this.onKeydown(e));
    document.addEventListener('click', (e) => this.hideSuggestionsOnClickOutside(e));
  }

  onInput(e) {
    const input = e.target;
    let value = input.value;

    // --- Feature: Auto-capitalize first letter ---
    // Automatically capitalize the first letter of the input.
    if (value.length > 0) {
      const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
      
      // To prevent the cursor from jumping, we only update the value if it has actually changed.
      if (capitalizedValue !== value) {
        const start = input.selectionStart; // Save cursor start position
        const end = input.selectionEnd;     // Save cursor end position
        input.value = capitalizedValue;
        input.setSelectionRange(start, end); // Restore cursor position
      }
    }
    const query = input.value.trim();
    if (query.length < (this.fuse.options.minMatchCharLength || 1)) {
      this.clearSuggestions();
      return;
    }
    const results = this.fuse.search(query, { limit: 10 });
    this.displaySuggestions(results);
    this.activeSuggestionIndex = -1;
  }

  onKeydown(e) {
    const suggestions = this.suggestionsBox.querySelectorAll('.suggestion-item');
    if (suggestions.length === 0 && e.key !== 'Enter') return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.activeSuggestionIndex = (this.activeSuggestionIndex + 1) % suggestions.length;
        this.updateActiveSuggestion();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.activeSuggestionIndex = (this.activeSuggestionIndex - 1 + suggestions.length) % suggestions.length;
        this.updateActiveSuggestion();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.activeSuggestionIndex > -1 && suggestions[this.activeSuggestionIndex]) {
          suggestions[this.activeSuggestionIndex].click();
        } else if (this.onSearchSubmit && this.searchInput.value.trim()) {
          this.onSearchSubmit(this.searchInput.value.trim());
          this.clearSuggestions();
          window.dispatchEvent(new CustomEvent('closeSearchViewRequest'));
        }
        break;
      case 'Escape':
        this.clearSuggestions();
        break;
    }
  }

  updateActiveSuggestion() {
    const suggestions = this.suggestionsBox.querySelectorAll('.suggestion-item');
    suggestions.forEach((suggestion, index) => {
      suggestion.classList.toggle('active-suggestion', index === this.activeSuggestionIndex);
      if (index === this.activeSuggestionIndex) {
        suggestion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  displaySuggestions(results) {
    this.clearSuggestions();
    if (results.length === 0) return;

    results.forEach(result => {
      const { item, matches } = result;
      const li = document.createElement('li');
      li.className = 'suggestion-item';
      const nameMatch = matches.find(m => m.key === 'name');
      const highlightedText = nameMatch ? this.highlightMatches(item.name, nameMatch.indices) : item.name;

      li.innerHTML = `<span><i class="fas fa-magnifying-glass suggestion-icon"></i><span>${highlightedText}</span></span><i class="fas fa-arrow-up"></i>`;
      li.addEventListener('click', () => {
        this.searchInput.value = item.name;
        this.onResultClick(item); // Call the callback
      });
      this.suggestionsBox.appendChild(li);
    });
    this.suggestionsBox.style.display = 'block';
  }

  highlightMatches(text, indices) {
    let result = '';
    let lastIndex = 0;
    indices.forEach(([start, end]) => {
      result += text.substring(lastIndex, start);
      result += `<span class="highlight">${text.substring(start, end + 1)}</span>`;
      lastIndex = end + 1;
    });
    result += text.substring(lastIndex);
    return result;
  }

  clearSuggestions() {
    this.suggestionsBox.innerHTML = '';
    this.suggestionsBox.style.display = 'none';
  }

  hideSuggestionsOnClickOutside(e) {
    if (!this.suggestionsBox.contains(e.target) && e.target !== this.searchInput) {
      this.clearSuggestions();
    }
  }
}

/**
 * Initializes the entire search functionality.
 * @param {Array} [items] - Optional. An array of all items to search. If not provided, it will try to load from sessionStorage.
 * @returns {Fuse|null} The initialized Fuse.js instance, or null if initialization fails.
 */
export function initializeSearch(items) {
  let allItems = items;
  if (!Array.isArray(allItems) || allItems.length === 0) {
    allItems = JSON.parse(sessionStorage.getItem('allItems')) || [];
  }

  if (!allItems || allItems.length === 0) {
    console.warn("Search initialization skipped: no items provided or found in sessionStorage.");
    return null;
  }

  const fuseInstance = new Fuse(allItems, FUSE_CONFIG);
  // FIX: Use the correct ID for the search input from header.html
  const searchInputEl = document.getElementById('header-search-input');
  const suggestionsBoxEl = document.getElementById('search-suggestions');

  if (searchInputEl && suggestionsBoxEl) {
    new SearchComponent({
      searchInputEl,
      suggestionsBoxEl,
      fuseInstance,
      onResultClick: (item) => {
        // When a suggestion is clicked, perform a search for that item's name.
        // This will show the new search results page instead of redirecting.
        const query = item.name;
        searchInputEl.value = query;
        suggestionsBoxEl.style.display = 'none';
        window.dispatchEvent(new CustomEvent('performSearch', { detail: { query } }));
        window.dispatchEvent(new CustomEvent('closeSearchViewRequest'));
      },
      onSearchSubmit: (query) => {
        window.dispatchEvent(new CustomEvent('performSearch', { detail: { query } }));
      }
    });
  }

  return fuseInstance;
}