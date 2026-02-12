/**
 * Table Sorting Logic
 * Supports String, Number, and Semver sorting.
 */

const SortLogic = {
    /**
     * Parse a version string into comparable parts.
     * Handles standard semver (1.2.3) and ranges (^1.2.3, ~1.2.3).
     * Returns an array of numbers/strings: [major, minor, patch, pre-release]
     */
    parseVersion: (v) => {
        if (!v) return [-1];
        // Remove leading ^, ~, v, or other non-digit chars (loosely)
        // Keep the main version parts
        const clean = v.replace(/^[\^~v<>=\s]+/, '').split('-')[0]; // Ignore pre-release for basic sort for now, or handle it?
        // Let's handle standard X.Y.Z
        const parts = clean.split('.').map(p => parseInt(p, 10));
        // Filter out NaNs if any weird formatting
        return parts.map(p => isNaN(p) ? 0 : p);
    },

    /**
     * Compare two version strings.
     */
    compareVersions: (a, b) => {
        const vA = SortLogic.parseVersion(a);
        const vB = SortLogic.parseVersion(b);
        
        const len = Math.max(vA.length, vB.length);
        
        for (let i = 0; i < len; i++) {
            const numA = vA[i] || 0;
            const numB = vB[i] || 0;
            
            if (numA > numB) return 1;
            if (numA < numB) return -1;
        }
        return 0;
    },

    /**
     * Main comparison function.
     */
    compare: (a, b, type, direction = 'asc') => {
        let valA = a;
        let valB = b;
        let comparison = 0;

        // Handle null/undefined
        if (valA === valB) return 0;
        if (valA === null || valA === undefined || valA === '') return 1; // Empty last
        if (valB === null || valB === undefined || valB === '') return -1;

        switch (type) {
            case 'version':
                comparison = SortLogic.compareVersions(valA, valB);
                break;
            case 'number':
                valA = parseFloat(valA);
                valB = parseFloat(valB);
                comparison = valA - valB;
                break;
            case 'string':
            default:
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
                if (valA > valB) comparison = 1;
                else if (valA < valB) comparison = -1;
                break;
        }

        return direction === 'asc' ? comparison : -comparison;
    }
};

class TableManager {
    constructor(tableId) {
        this.table = document.getElementById(tableId);
        if (!this.table) throw new Error(`Table with id ${tableId} not found`);
        this.tbody = this.table.querySelector('tbody');
        this.headers = this.table.querySelectorAll('th[data-sortable="true"]');
        this.currentSort = { column: null, direction: 'asc' };
        
        this.init();
    }

    init() {
        this.headers.forEach((th, index) => {
            // Accessibility
            th.setAttribute('tabindex', '0');
            th.setAttribute('role', 'button');
            th.setAttribute('aria-sort', 'none');
            
            // Mouse Click
            th.addEventListener('click', () => {
                this.handleSort(th, index);
            });

            // Keyboard
            th.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleSort(th, index);
                }
            });
        });
    }

    handleSort(th, columnIndex) {
        const type = th.dataset.type || 'string';
        const columnKey = th.dataset.column || columnIndex; // Prefer explicit key

        // Determine direction
        let direction = 'asc';
        if (this.currentSort.column === columnKey && this.currentSort.direction === 'asc') {
            direction = 'desc';
        }

        this.sort(columnIndex, type, direction);
        this.updateUI(th, direction);
        
        this.currentSort = { column: columnKey, direction };
    }

    sort(columnIndex, type, direction) {
        const startTime = performance.now();
        
        const rows = Array.from(this.tbody.querySelectorAll('tr'));
        
        // Use a detached array for sorting to avoid DOM thrashing
        // We also extract values once to avoid repeated DOM access
        const mappedRows = rows.map((row, i) => {
            const cell = row.children[columnIndex];
            // Prefer data-value attribute if present (for clean values), else textContent
            const value = cell.dataset.value || cell.textContent.trim();
            return { el: row, value, index: i };
        });

        mappedRows.sort((a, b) => {
            return SortLogic.compare(a.value, b.value, type, direction);
        });

        // Reattach in new order using DocumentFragment
        const fragment = document.createDocumentFragment();
        mappedRows.forEach(obj => {
            fragment.appendChild(obj.el);
        });
        
        requestAnimationFrame(() => {
            this.tbody.appendChild(fragment);
            const endTime = performance.now();
            console.log(`Sort took ${endTime - startTime}ms`);
        });
    }

    updateUI(activeTh, direction) {
        // Reset all headers
        this.headers.forEach(th => {
            th.setAttribute('aria-sort', 'none');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.textContent = '↕'; // Default neutral
            th.classList.remove('bg-gray-100'); // Remove active highlight
        });

        // Set active header
        activeTh.setAttribute('aria-sort', direction === 'asc' ? 'ascending' : 'descending');
        activeTh.classList.add('bg-gray-100');
        const icon = activeTh.querySelector('.sort-icon');
        if (icon) {
            icon.textContent = direction === 'asc' ? '▲' : '▼';
        }
    }
}

// Export for Node.js testing, or attach to window for Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SortLogic, TableManager };
} else {
    window.TableManager = TableManager;
}
