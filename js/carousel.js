/* ============================================================
   Carousel
============================================================ */

/**
 * @param {Document|Element} root
 * @param {{ transitionTimeout?: number }} [options]
 * @returns {{ destroy: () => void } | null}
 */
export function initCarousel(root, options) {
    let TRANSITION_TIMEOUT = (options && options.transitionTimeout) || 600;

    /** @type {HTMLElement} */
    const carousel = root.querySelector('.carousel');

    if (!carousel) return null;

    const items       = [...carousel.querySelectorAll('.carousel-item')];
    const prevBtn   = root.querySelector('.carousel-prev');
    const nextBtn   = root.querySelector('.carousel-next');

    if (!prevBtn || !nextBtn || items.length === 0) return null;

    // Single slide: hide controls and bail, there is nothing to navigate
    if (items.length === 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        return {
            destroy: function () {
                prevBtn.style.display = '';
                nextBtn.style.display = '';
            },
        };
    }

    // Read initial active slide from the DOM - do not assume index 0
    let current = items.findIndex(function (item) {
        return item.classList.contains('active');
    });
    // fallback if no active class found
    if (current === -1) current = 0;

    let isAnimating = false;
    let cancelAnimation = null;

    function clearStates(el) {
        el.classList.remove('enter-next', 'enter-prev', 'exit-next', 'exit-prev');
    }

    /**
     * Executes the slide transition animation.
     * @param {number} index - The target slide index to display.
     * @param {number} direction - 1 for next (moving left), -1 for prev (moving right).
     */
    function showSlide(index, direction) {
        /*
        Classes for the Slide states.

        Class       | State
        --------------------------------------------------------------------------
        enter-next	| Slide is off-screen to the right, about to enter.
        Enter-prev  | Slide is off-screen to the left, about to enter.
        Exit-next	| Slide is leaving to the left (user went forward).
        Exit-prev	| Slide is leaving to the right (user went backward).
        Active      | Slide is fully visible, center stage.
         */

        if (isAnimating || index === current) return;
        isAnimating = true;

        let oldItem = items[current];
        let newItem = items[index];

        // Prepare new item to enter from the correct side
        newItem.classList.add(direction > 0 ? 'enter-next' : 'enter-prev');

        // Apply pending layout changes immediately
        // to ensure it registers the starting position
        void newItem.offsetWidth;

        // Trigger the animation by swapping classes
        newItem.classList.remove('enter-next', 'enter-prev');
        newItem.classList.add('active');

        oldItem.classList.remove('active');
        oldItem.classList.add(direction > 0 ? 'exit-next' : 'exit-prev');

        // Fallback if transitionend never fires
        // Case: the user has 'prefers-reduced-motion' on
        let fallbackTimer = setTimeout(function () {
            newItem.removeEventListener('transitionend', done);
            finalize();
        }, TRANSITION_TIMEOUT);

        // Cleanup Hook.
        // A "kill switch" for whatever animation is currently running.
        cancelAnimation = function () {
            clearTimeout(fallbackTimer);
            newItem.removeEventListener('transitionend', done);
        };

        function finalize() {
            clearStates(oldItem);
            clearStates(newItem);
            current     = index;
            isAnimating = false;
            cancelAnimation = null;
        }

        /** Release the lock when the animation completes */
        function done(e) {
            // Ignore child elements bubbling
            if (e.target !== newItem) return;

            // Ignore non-transform transitions (like opacity or color)
            if (e.propertyName !== 'transform') return;

            clearTimeout(fallbackTimer);
            newItem.removeEventListener('transitionend', done);
            finalize();
        }

        newItem.addEventListener('transitionend', done);
    }

    // Named handlers (required for removeEventListener)
    function onPrev() { showSlide((current - 1 + items.length) % items.length, -1); }
    function onNext() { showSlide((current + 1) % items.length, 1); }

    let startX = 0;

    function onTouchStart(e) { startX = e.changedTouches[0].clientX; }
    function onTouchEnd(e) {
        let diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) < 40) return;
        diff > 0
            ? showSlide((current + 1) % items.length, 1)
            : showSlide((current - 1 + items.length) % items.length, -1);
    }

    prevBtn.addEventListener('click', onPrev);
    nextBtn.addEventListener('click', onNext);

    carousel.addEventListener('touchstart', onTouchStart, { passive: true });
    carousel.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return {
        destroy: function () {
            if (cancelAnimation) cancelAnimation();
            isAnimating = false;

            prevBtn.removeEventListener('click', onPrev);
            nextBtn.removeEventListener('click', onNext);

            carousel.removeEventListener('touchstart', onTouchStart);
            carousel.removeEventListener('touchend',   onTouchEnd);
        },
    };
}