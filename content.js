// Constants
const STORAGE_PREFIX = "GH_PR_Filters_";
const SUBNAV_SEARCH_SELECTOR = ".subnav-search";
const SUBNAV_SEARCH_INPUT_SELECTOR = SUBNAV_SEARCH_SELECTOR + " .subnav-search-input";
const FILTERS_SEARCH_SELECTOR = "#filters-select-menu .SelectMenu-list";
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 500;

class GitHubPRFilter {
  constructor() {
    this.filters = [];
    this.retryAttempts = 0;
    this.init();
  }

  init() {
    this.setupNavigationObserver();
    this.handleLocationChange();
  }

  setupNavigationObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.target.id === "js-repo-pjax-container" ||
          mutation.target.getAttribute("data-turbo-body") !== null
        ) {
          this.handleLocationChange();
          break;
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("popstate", () => this.handleLocationChange());
    window.addEventListener("turbo:render", () => this.handleLocationChange());
  }

  handleLocationChange() {
    // Reset retry attempts on new location change
    this.retryAttempts = 0;

    // Check if we're on a PR page
    if (!this.isPullRequestPage()) {
      return;
    }

    this.filters = this.loadFilters();

    if (document.querySelector(SUBNAV_SEARCH_SELECTOR)) {
      this.initializeDropdown();
    } else {
      this.retryInitialization();
    }
  }

  isPullRequestPage() {
    return window.location.pathname.includes("/pulls");
  }

  retryInitialization() {
    if (this.retryAttempts >= MAX_RETRY_ATTEMPTS) {
      console.warn("Failed to initialize GitHub PR Filter after maximum retry attempts");
      return;
    }

    this.retryAttempts++;
    setTimeout(() => {
      if (document.querySelector(SUBNAV_SEARCH_SELECTOR)) {
        this.initializeDropdown();
      } else {
        this.retryInitialization();
      }
    }, RETRY_DELAY);
  }

  getRepoPath() {
    return window.location.pathname.split("/").slice(1, 3).join("/");
  }

  getStorageKey() {
    return STORAGE_PREFIX + "global";
  }

  loadFilters() {
    try {
      const stored = localStorage.getItem(this.getStorageKey());
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading filters:", error);
      return [];
    }
  }

  saveFilters() {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.filters));
    } catch (error) {
      console.error("Error saving filters:", error);
    }
  }

  createOption(label, value, disabled = false) {
    const option = document.createElement("option");
    option.textContent = label;
    option.value = value;
    option.disabled = disabled;
    return option;
  }

  async addNewFilter(query) {
    try {
      if (!query) return;

      const label = await this.promptAsync("Enter filter label:");
      if (!label) return;

      const newFilter = { label, query };
      this.filters.push(newFilter);
      this.saveFilters();

      // Reinitialize the entire dropdown to ensure correct order
      this.initializeDropdown(); // TODO: Clear old items
    } catch (error) {
      console.error("Error adding filter:", error);
    }
  }

  promptAsync(message) {
    return new Promise((resolve) => {
      const result = prompt(message);
      resolve(result || "");
    });
  }

  createElementFromHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
  }

  createFilterItem(label, query, checked) {
    const encodedQuery = encodeURIComponent(query);

    const itemHtml = `
      <a class="SelectMenu-item custom-item" role="menuitemradio" aria-checked="${checked}" href="/${this.getRepoPath()}/issues?q=${encodedQuery}" data-turbo-frame="repo-content-turbo-frame">
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" class="octicon octicon-check SelectMenu-icon SelectMenu-icon--check">
          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
        </svg>
        ${label}
      </a>
    `

    return this.createElementFromHtml(itemHtml);
  }

  createAddToFavButton() {
    const favButtonHtml = `
      <button id="fav-button" class="Button Button--iconOnly Button--invisible Button--medium" data-view-component="true" type="button" variant="small" id="favorite-query-button" role="button">
        <svg class="octicon octicon-search subnav-search-icon" data-view-component="true" width="16" version="1.1" viewBox="0 0 471.701 471.701" height="16" aria-hidden="true">
            <path d="M433.601,67.001c-24.7-24.7-57.4-38.2-92.3-38.2s-67.7,13.6-92.4,38.3l-12.9,12.9l-13.1-13.1 c-24.7-24.7-57.6-38.4-92.5-38.4c-34.8,0-67.6,13.6-92.2,38.2c-24.7,24.7-38.3,57.5-38.2,92.4c0,34.9,13.7,67.6,38.4,92.3 l187.8,187.8c2.6,2.6,6.1,4,9.5,4c3.4,0,6.9-1.3,9.5-3.9l188.2-187.5c24.7-24.7,38.3-57.5,38.3-92.4 C471.801,124.501,458.301,91.701,433.601,67.001z M414.401,232.701l-178.7,178l-178.3-178.3c-19.6-19.6-30.4-45.6-30.4-73.3 s10.7-53.7,30.3-73.2c19.5-19.5,45.5-30.3,73.1-30.3c27.7,0,53.8,10.8,73.4,30.4l22.6,22.6c5.3,5.3,13.8,5.3,19.1,0l22.4-22.4 c19.6-19.6,45.7-30.4,73.3-30.4c27.6,0,53.6,10.8,73.2,30.3c19.6,19.6,30.3,45.6,30.3,73.3 C444.801,187.101,434.001,213.101,414.401,232.701z"></path>
        </svg>
      </button>
    `

    const favButton = this.createElementFromHtml(favButtonHtml)
    favButton.addEventListener("click", async () => {
        const input = document.querySelector(SUBNAV_SEARCH_INPUT_SELECTOR)
        await this.addNewFilter(input.value);
    });

    return favButton;
  }

  clearOldItems(filtersDropdown) {
    if (!filtersDropdown) {
      return
    }

    const elementsToRemove = filtersDropdown.querySelectorAll(`.custom-item`);
    elementsToRemove.forEach(element => {
      filtersDropdown.removeChild(element);
    });
  }

  initializeDropdown() {
    const filtersDropdown = document.querySelector(FILTERS_SEARCH_SELECTOR);
    if (!filtersDropdown) return;

    this.clearOldItems(filtersDropdown);

    const filterContainer = document.querySelector(SUBNAV_SEARCH_SELECTOR);
    if (!filterContainer) return;

    // Add existing filters
    if (this.filters.length > 0) {
      this.filters.slice().reverse().forEach((filter) => {
        filtersDropdown.prepend(this.createFilterItem(filter.label, filter.query, false));
      });
    }

    filterContainer.appendChild(this.createAddToFavButton());
  }
}

// Initialize the filter manager when the document is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new GitHubPRFilter());
} else {
  new GitHubPRFilter();
}
