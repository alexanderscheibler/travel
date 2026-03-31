import { initDropdown } from "./dropdown.js";

// DOM fixture
// Two dropdowns are enough to cover all multi-dropdown scenarios.
// Dropdown 0 has both an internal (#) and external (/) link to cover both
// link-type closing scenarios from a single menu.
// The standalone nav link exists to cover the mobile-menu-close-via-bubbling case.
function buildDOM() {
    document.body.innerHTML = `
        <nav class="main-nav" aria-label="Main navigation">
            <button class="nav-toggle" aria-expanded="false" aria-controls="navbar" type="button">
                <span class="sr-only">Toggle navigation</span>
            </button>
            <ul class="nav-list" id="navbar">
                <li class="nav-item">
                    <a href="#home" class="nav-link">Standalone Link</a>
                </li>
    
                <li class="nav-item has-dropdown">
                    <button class="nav-link dropdown-toggle" aria-haspopup="true" aria-expanded="false">
                        Destinations
                    </button>
                    <ul class="dropdown-menu">
                        <li><a href="#internal">Internal Link</a></li>
                        <li><a href="/external">External Link</a></li>
                    </ul>
                </li>
                <li class="nav-item has-dropdown">
                    <button class="nav-link dropdown-toggle" aria-haspopup="true" aria-expanded="false">
                        Accommodations
                    </button>
                    <ul class="dropdown-menu">
                        <li><a href="#country">Country Homes</a></li>
                        <li><a href="/external2">Find an Office</a></li>
                    </ul>
                </li>
            </ul>
        </nav>
    `;
}

/* =============================================================================
   DROPDOWN TEST
   ============================================================================= */

describe('Dropdown factory', () => {
    let instance, dropdowns, dropdownToggles, hamburgerToggle, navList, dropdownMenus;

    beforeEach(() => {
        buildDOM();
        instance        = initDropdown(document);
        dropdowns       = Array.from(document.querySelectorAll('.has-dropdown'));
        dropdownToggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
        dropdownMenus   = Array.from(document.querySelectorAll('.dropdown-menu'));
        hamburgerToggle = document.querySelector('.nav-toggle');
        navList         = document.querySelector('.nav-list');
    });


    afterEach(() => {
        instance && instance.destroy();
        document.body.innerHTML = '';
    });

    describe('Null guards', () => {
        test('returns null and does not throw when the hamburger menu is absent', () => {
            document.body.innerHTML = '<ul class="nav-list"></ul>';
            expect(() => initDropdown(document)).not.toThrow();
            expect(initDropdown(document)).toBeNull();
        });

        test('returns null and does not throw when menu items are absent', () => {
            document.body.innerHTML = '<button class="nav-toggle"></button>';
            expect(() => initDropdown(document)).not.toThrow();
            expect(initDropdown(document)).toBeNull();
        });

        test('returns a valid instance when all required elements exist', () => {
            expect(instance).not.toBeNull();
            expect(typeof instance.destroy).toBe('function');
        });
    });

    describe('Initial state', () => {
        test('all dropdowns are closed on initialization', () => {
            dropdowns.forEach(d => {
                expect(d.classList.contains('open')).toBe(false);
            });
        });

        test('all dropdowns start collapsed', () => {
            dropdownToggles.forEach(t => {
                expect(t.getAttribute('aria-expanded')).toBe('false');
            });
        });

        test('all dropdowns show they can expand', () => {
            dropdownToggles.forEach(t => {
                expect(t.getAttribute('aria-haspopup')).toBe('true');
            });
        });

        test('the hamburger menu is not expanded', () => {
            expect(hamburgerToggle.getAttribute('aria-expanded')).toBe('false');
            expect(navList.classList.contains('nav-open')).toBe(false);
        });

        test('the hamburger menu controls the navigation list', () => {
            expect(hamburgerToggle.getAttribute('aria-controls')).toBe('navbar');
        });
    });

    describe('Dropdown behavior', () => {
        test('clicking a dropdown toggle opens it', () => {
            // Open the first dropdown
            dropdownToggles[0].click();
            expect(dropdowns[0].classList.contains('open')).toBe(true);
        });

        test('clicking a dropdown toggle shows it is expanded', () => {
            // Open the first dropdown
            dropdownToggles[0].click();
            expect(dropdownToggles[0].getAttribute('aria-expanded')).toBe('true');
        });

        test('clicking a dropdown toggle opens it without the document instantly closing it', () => {
            const documentClickSpy = vi.fn();
            document.addEventListener('click', documentClickSpy);

            const bubblingClick = new MouseEvent('click', { bubbles: true });
            dropdownToggles[0].dispatchEvent(bubblingClick);

            expect(documentClickSpy).not.toHaveBeenCalled();
            expect(dropdowns[0].classList.contains('open')).toBe(true);

            document.removeEventListener('click', documentClickSpy);
        });

        test('all of the dropdowns can independently open', () => {
            dropdownToggles.forEach((toggle, i) => {
                document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

                toggle.click();

                expect(dropdowns[i].classList.contains('open')).toBe(true);
                expect(toggle.getAttribute('aria-expanded')).toBe('true');
            });
        });

        test('opening one dropdown closes every other open dropdown', () => {
            // Ensure the fixture has enough dropdowns to even run this test
            expect(dropdownToggles.length).toBeGreaterThanOrEqual(2);

            // Dynamically grab the first and last dropdowns
            // so it doesn't matter how many exist
            const firstIndex = 0;
            const nextIndex = dropdownToggles.length - 1;

            // Open the first
            dropdownToggles[firstIndex].click();

            // Open another one
            dropdownToggles[nextIndex].click();

            // The first one MUST close
            expect(dropdowns[firstIndex].classList.contains('open')).toBe(false);
            expect(dropdownToggles[firstIndex].getAttribute('aria-expanded')).toBe('false');

            // The newly clicked one MUST be open
            expect(dropdowns[nextIndex].classList.contains('open')).toBe(true);
            expect(dropdownToggles[nextIndex].getAttribute('aria-expanded')).toBe('true');
        });

        test('only the clicked dropdown opens - siblings stay closed', () => {
            // We need at least 2 dropdowns to test "siblings"
            expect(dropdownToggles.length).toBeGreaterThanOrEqual(2);

            // Click a target index
            const targetIndex = 0;
            dropdownToggles[targetIndex].click();

            // Filter out the target to get the siblings, and verify they are closed
            const siblings = dropdowns.filter((_, i) => i !== targetIndex);

            siblings.forEach(sibling => {
                expect(sibling.classList.contains('open')).toBe(false);
            });
        });

        test('clicking an already-open dropdown toggle closes it', () => {
            // Open the first dropdown
            dropdownToggles[0].click();
            dropdownToggles[0].click();
            expect(dropdowns[0].classList.contains('open')).toBe(false);
            expect(dropdownToggles[0].getAttribute('aria-expanded')).toBe('false');
        });

        test('clicking outside on the document closes all open dropdowns', () => {
            // Open the first dropdown
            dropdownToggles[0].click();
            document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(dropdowns[0].classList.contains('open')).toBe(false);
            expect(dropdownToggles[0].getAttribute('aria-expanded')).toBe('false');
        });

        test('clicking any link inside the dropdown menu closes it', () => {
            // Open the menu
            dropdownToggles[0].click();

            // Grab any anchor tag inside the open menu
            const menuLink = dropdownMenus[0].querySelector('a');

            // Dispatch a bubbling click
            menuLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            // Prove both visual and ARIA states reset
            expect(dropdowns[0].classList.contains('open')).toBe(false);
            expect(dropdownToggles[0].getAttribute('aria-expanded')).toBe('false');
        });

        test('clicking an external link inside a dropdown closes it', () => {
            // The last dropdown has an href="/external2" link
            const lastIndex = dropdownToggles.length - 1;
            dropdownToggles[lastIndex].click();

            const externalLink = dropdownMenus[lastIndex].querySelector('a[href^="/"]');
            externalLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(dropdowns[lastIndex].classList.contains('open')).toBe(false);
            expect(dropdownToggles[lastIndex].getAttribute('aria-expanded')).toBe('false');
        });
    });

    describe('Mobile nav toggle', () => {
        test('clicking the hamburger toggle opens the mobile menu', () => {
            // Open the hamburger menu
            hamburgerToggle.click();

            // Verify mobile menu is open
            expect(navList.classList.contains('nav-open')).toBe(true);
            expect(hamburgerToggle.getAttribute('aria-expanded')).toBe('true');
        });

        test('clicking the hamburger toggle when the mobile menu is open closes it', () => {
            // Open the hamburger menu
            hamburgerToggle.click();

            // Click on it again
            hamburgerToggle.click();

            // Verify menu is closed
            expect(navList.classList.contains('nav-open')).toBe(false);
            expect(hamburgerToggle.getAttribute('aria-expanded')).toBe('false');
        });

        test('opening a dropdown does NOT affect the mobile menu state', () => {
            // Open the hamburger menu
            hamburgerToggle.click();

            // Open the first dropdown
            dropdownToggles[0].click();

            // The dropdown must not close the already-open mobile menu
            expect(navList.classList.contains('nav-open')).toBe(true);
        });

        test('clicking the toggle opens the menu without the document instantly closing it', () => {
            // Create a spy to listen to the document
            const documentClickSpy = vi.fn();
            document.addEventListener('click', documentClickSpy);

            // Manually dispatch a "bubbling" event
            const bubblingClick = new MouseEvent('click', { bubbles: true });
            hamburgerToggle.dispatchEvent(bubblingClick);

            expect(documentClickSpy).not.toHaveBeenCalled();

            // Verify the menu successfully opened
            expect(navList.classList.contains('nav-open')).toBe(true);

            // Clean up our spy
            document.removeEventListener('click', documentClickSpy);
        });

        test('clicking outside closes the mobile menu', () => {
            // Open the hamburger menu
            hamburgerToggle.click();

            // Click outside it
            document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            // Verify mobile menu is closed
            expect(navList.classList.contains('nav-open')).toBe(false);
            expect(hamburgerToggle.getAttribute('aria-expanded')).toBe('false');
        });

        test('clicking a link inside a dropdown closes BOTH the dropdown and the mobile menu', () => {
            // Open the mobile menu
            hamburgerToggle.click();
            // Open the first dropdown
            dropdownToggles[0].click();

            const menuLink = dropdownMenus[0].querySelector('a');
            menuLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            // Everything should have been closed / collapsed
            expect(dropdowns[0].classList.contains('open')).toBe(false);
            expect(navList.classList.contains('nav-open')).toBe(false);
            expect(hamburgerToggle.getAttribute('aria-expanded')).toBe('false');
        });

        test('clicking a standalone nav link closes the mobile menu', () => {
            // Open mobile menu
            hamburgerToggle.click();

            // Grab the "Standalone" link that sits directly in the nav-list
            const standaloneLink = navList.querySelector('.nav-item > a.nav-link');
            standaloneLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            // The standalone link has no dedicated listener - it should close the mobile
            // menu because the click bubbles up to the document handler (onDocumentClick).
            expect(navList.classList.contains('nav-open')).toBe(false);
            expect(hamburgerToggle.getAttribute('aria-expanded')).toBe('false');
        });
    });

    describe('Accessibility (A11y)', () => {
        test('Escape closes all open dropdowns', () => {
            // Open one of the dropdowns
            dropdownToggles[0].click();

            // Hit Escape
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            // Loop through EVERY dropdown to guarantee they are all closed
            dropdowns.forEach((dropdown, index) => {
                expect(dropdown.classList.contains('open')).toBe(false);
                expect(dropdownToggles[index].getAttribute('aria-expanded')).toBe('false');
            });
        });

        test('Escape closes the mobile menu when it is open (no dropdown open)', () => {
            // Open the hamburger menu
            hamburgerToggle.click();

            // Hit Escape
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            // Verify mobile menu is closed
            expect(navList.classList.contains('nav-open')).toBe(false);
            expect(hamburgerToggle.getAttribute('aria-expanded')).toBe('false');
        });

        test('Escape closes BOTH a dropdown and the mobile menu simultaneously', () => {
            // Open the hamburger menu
            hamburgerToggle.click();
            dropdownToggles[1].click();

            // Hit Escape
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            expect(dropdowns[1].classList.contains('open')).toBe(false);
            expect(dropdownToggles[1].getAttribute('aria-expanded')).toBe('false');
            expect(navList.classList.contains('nav-open')).toBe(false);
            expect(hamburgerToggle.getAttribute('aria-expanded')).toBe('false');
        });

        test('non-Escape keydown events do not close the dropdown', () => {
            // Open a dropdown
            dropdownToggles[0].click();

            // Hit tab
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

            // Dropdown remains expanded
            expect(dropdowns[0].classList.contains('open')).toBe(true);
        });

        test('tabbing to a link INSIDE the same dropdown keeps it open', () => {
            // Open the first dropdown
            dropdownToggles[0].click();

            const internalLink = dropdownMenus[0].querySelector('a');

            // Simulate focus moving from the toggle down to the first link inside it
            const focusOutEvent = new FocusEvent('focusout', {
                bubbles: true,
                relatedTarget: internalLink // Focus stays inside the parent dropdown
            });

            dropdowns[0].dispatchEvent(focusOutEvent);

            // It MUST stay open so the user can actually activate the link
            expect(dropdowns[0].classList.contains('open')).toBe(true);
            expect(dropdownToggles[0].getAttribute('aria-expanded')).toBe('true');
        });

        test('tabbing OUTSIDE the dropdown closes it', () => {
            // Open the first dropdown
            dropdownToggles[0].click();

            // Simulate focus moving from the first dropdown to the document
            const focusOutEvent = new FocusEvent('focusout', {
                bubbles: true,
                relatedTarget: document.body
            });

            // Dispatch it from the open dropdown
            dropdowns[0].dispatchEvent(focusOutEvent);

            // Verify the dropdown has closed because the focus changed
            expect(dropdowns[0].classList.contains('open')).toBe(false);
            expect(dropdownToggles[0].getAttribute('aria-expanded')).toBe('false');
        });

        test('tabbing outside the nav closes both the open dropdown and the mobile menu', () => {
            // Open the hamburger menu
            hamburgerToggle.click();

            // Open the first dropdown
            dropdownToggles[0].click();

            // Create another element to change focus
            const externalEl = document.createElement('a');
            document.body.appendChild(externalEl);

            // Move to the other element
            const focusOutEvent = new FocusEvent('focusout', {
                bubbles: true,
                relatedTarget: externalEl
            });
            dropdowns[0].dispatchEvent(focusOutEvent);

            // Verify hamburger menu and dropdown are closed
            expect(dropdowns[0].classList.contains('open')).toBe(false);
            expect(dropdownToggles[0].getAttribute('aria-expanded')).toBe('false');
            expect(navList.classList.contains('nav-open')).toBe(false);
            expect(hamburgerToggle.getAttribute('aria-expanded')).toBe('false');

            // Clean up the test
            externalEl.remove();
        });

        test('focusing OUTSIDE the navigation closes the mobile menu', () => {
            // Open the hamburger menu
            hamburgerToggle.click();

            // Create a fake element outside the nav to represent the main page content
            const externalContentLink = document.createElement('a');
            document.body.appendChild(externalContentLink);

            // Simulate the user's focus moving to that external link
            const focusOutEvent = new FocusEvent('focusout', {
                bubbles: true,
                relatedTarget: externalContentLink
            });

            // Dispatch it from the nav toggle (as if they tabbed away from it)
            hamburgerToggle.dispatchEvent(focusOutEvent);

            // The mobile menu MUST close behind them
            expect(navList.classList.contains('nav-open')).toBe(false);
            expect(hamburgerToggle.getAttribute('aria-expanded')).toBe('false');

            // Clean up the test
            externalContentLink.remove();
        });

        test('the menu stays open when focus leaves the browser window entirely', () => {
            // Open a dropdown menu
            dropdownToggles[0].click();

            // Focus somewhere else (user ALT+TABs)
            const focusOutEvent = new FocusEvent('focusout', {
                bubbles: true,
                relatedTarget: null
            });

            // The dropdown must remain open
            expect(() => dropdowns[0].dispatchEvent(focusOutEvent)).not.toThrow();
            expect(dropdowns[0].classList.contains('open')).toBe(true);
            expect(dropdownToggles[0].getAttribute('aria-expanded')).toBe('true');
        });
    });

    describe('destroy()', () => {
        test('the dropdown toggles are disabled after component destruction', () => {
            // Open it first
            dropdownToggles[0].click();
            instance.destroy();

            // Try to close it
            dropdownToggles[0].click();

            // State didn't change (still open)
            expect(dropdowns[0].classList.contains('open')).toBe(true);
        });

        test('clicking outside the navigation no longer closes dropdowns after component destruction', () => {
            // Open it first
            dropdownToggles[0].click();
            instance.destroy();

            document.dispatchEvent(new MouseEvent('click'));

            expect(dropdowns[0].classList.contains('open')).toBe(true);
        });

        test('pressing Escape no longer closes dropdowns after component destruction', () => {
            // Open it first
            dropdownToggles[0].click();
            instance.destroy();

            // Hit Escape
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            expect(dropdowns[0].classList.contains('open')).toBe(true);
        });

        test('pressing Escape no longer closes the mobile menu after component destruction', () => {
            // Open the hamburger menu
            hamburgerToggle.click();
            instance.destroy();

            // Hit Escape
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            expect(navList.classList.contains('nav-open')).toBe(true);
        });

        test('the hamburger toggle is disabled after component destruction', () => {
            // Open it first
            hamburgerToggle.click();
            instance.destroy();

            // Try to close it
            hamburgerToggle.click();

            // State didn't change (still open)
            expect(navList.classList.contains('nav-open')).toBe(true);
        });

        test('tabbing outside the navigation no longer closes menus after component destruction', () => {
            // Open the hamburger menu
            hamburgerToggle.click(); // Open the menu
            instance.destroy(); // Kill the component

            // Simulate focusing outside
            const focusOutEvent = new FocusEvent('focusout', {
                bubbles: true,
                relatedTarget: document.body
            });
            hamburgerToggle.dispatchEvent(focusOutEvent);

            // Validate the menu did NOT close, because the listener was removed
            expect(navList.classList.contains('nav-open')).toBe(true);
        });

        test('no dropdown toggles remain active after component destruction', () => {
            // Verify every toggle is dead, not just the first one
            dropdownToggles.forEach((_, i) => {
                buildDOM();
                const localInstance  = initDropdown(document);
                const localDropdowns = Array.from(document.querySelectorAll('.has-dropdown'));
                const localToggles   = Array.from(document.querySelectorAll('.dropdown-toggle'));

                localInstance.destroy();
                localToggles[i].click(); // listener is gone - should not open

                expect(localDropdowns[i].classList.contains('open')).toBe(false);

                document.body.innerHTML = '';
            });
        });
    });
});