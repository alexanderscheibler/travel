/* ============================================================
   Dropdown navigation
============================================================ */
/**
 * @param {Document|Element} root
 * @returns {{ destroy: () => void } | null}
 */
export function initDropdown(root) {
    const navToggle = root.querySelector('.nav-toggle');
    const navList   = root.querySelector('.nav-list');

    if (!navToggle || !navList) return null;

    // Grab the specific container for THIS instance of the menu
    // We'll use this for accessibility
    const navContainer = navToggle.closest('nav') || root;

    const toggles = [...root.querySelectorAll('.dropdown-toggle')];

    /** Close all currently open dropdown menus */
    function closeAll() {
        root.querySelectorAll('.has-dropdown.open').forEach(function (el) {
            el.classList.remove('open');
            el.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
        });
    }

    /** Close the mobile hamburger menu */
    function closeMobile() {
        navList.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
    }

    /** Close everything if the user tabbed out or changed focus */
    function onDocumentFocusOut(e) {
        if (!e.relatedTarget) return;

        // If focus leaves an open dropdown, close the dropdowns
        if (!e.relatedTarget.closest('.has-dropdown.open')) {
            closeAll();
        }

        // If focus leaves the main navigation wrapper entirely, close the mobile menu.
        // We use .contains() to scope this to the specific navigation instance,
        // preventing conflicts with other <nav> elements (like footers).
        if (!navContainer.contains(e.relatedTarget)) {
            closeMobile();
        }
    }

    // Store {btn, handler} pairs so we can remove them in destroy()
    const dropdownHandlers = toggles.map(function (btn) {
        function handler(e) {
            // Prevent the click from bubbling up to the document and instantly triggering closeAll()
            e.stopPropagation();

            const parent = btn.closest('.has-dropdown');
            const isOpen = parent.classList.contains('open');
            closeAll();
            if (!isOpen) {
                parent.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
            }
        }
        btn.addEventListener('click', handler);
        return { btn: btn, handler: handler };
    });

    /** Close everything if the user clicks somewhere else */
    function onDocumentClick() {
        closeAll();
        closeMobile();
    }

    /** Close everything if the user hits Escape */
    function onDocumentKeydown(e) {
        if (e.key === 'Escape') {
            closeAll();
            closeMobile();
        }
    }

    /** Expand the mobile menu */
    function onNavToggle(e) {
        // Prevent the click from bubbling to the document and instantly closing the menu
        e.stopPropagation();

        const expanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', String(!expanded));
        navList.classList.toggle('nav-open');
    }

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onDocumentKeydown);
    document.addEventListener('focusout', onDocumentFocusOut);
    navToggle.addEventListener('click', onNavToggle);

    return {
        destroy: function () {
            document.removeEventListener('click', onDocumentClick);
            document.removeEventListener('keydown', onDocumentKeydown);
            document.removeEventListener('focusout', onDocumentFocusOut);
            navToggle.removeEventListener('click', onNavToggle);
            dropdownHandlers.forEach(function (entry) {
                entry.btn.removeEventListener('click', entry.handler);
            });
        },
    };
}