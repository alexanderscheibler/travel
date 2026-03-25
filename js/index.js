
    /* ============================================================
    Carousel
    ============================================================ */

    (function () {
    var carousel = document.querySelector('.carousel');
    var items = Array.prototype.slice.call(document.querySelectorAll('.carousel-item'));
    var prevBtn = document.querySelector('.carousel-prev');
    var nextBtn = document.querySelector('.carousel-next');
    var current = 0;
    var isAnimating = false;

    function clearStates(el) {
    el.classList.remove('enter-next', 'enter-prev', 'exit-next', 'exit-prev');
}

    function showSlide(index, direction) {
    if (isAnimating || index === current) return;
    isAnimating = true;

    var oldItem = items[current];
    var newItem = items[index];

    // 1. Prepare new item to enter from the correct side
    newItem.classList.add(direction > 0 ? 'enter-next' : 'enter-prev');

    // 2. Apply pending layout changes immediately
    // to ensure it registers the starting position
    void newItem.offsetWidth;

    // 3. Trigger the animation by swapping classes
    newItem.classList.remove('enter-next', 'enter-prev');
    newItem.classList.add('active');

    oldItem.classList.remove('active');
    oldItem.classList.add(direction > 0 ? 'exit-next' : 'exit-prev');

    // 4. Release the lock when the animation completes
    var done = function (e) {
    // Prevent bubbling events from child elements
    if (e.target !== newItem) return;

    newItem.removeEventListener('transitionend', done);

    clearStates(oldItem);
    clearStates(newItem);

    current = index;
    isAnimating = false;
};

    // Listen to the newItem, since we know for a fact its transform is changing
    newItem.addEventListener('transitionend', done);
}

    prevBtn.addEventListener('click', function () {
    showSlide((current - 1 + items.length) % items.length, -1);
});

    nextBtn.addEventListener('click', function () {
    showSlide((current + 1) % items.length, 1);
});

    var startX = 0;
    var endX = 0;

    carousel.addEventListener('touchstart', function (e) {
    startX = e.changedTouches[0].clientX;
}, { passive: true });

    carousel.addEventListener('touchend', function (e) {
    endX = e.changedTouches[0].clientX;
    var diff = startX - endX;

    if (Math.abs(diff) < 40) return;

    if (diff > 0) {
    showSlide((current + 1) % items.length, 1);
} else {
    showSlide((current - 1 + items.length) % items.length, -1);
}
}, { passive: true });
}());



    /* ============================================================
    Dropdown navigation
    ============================================================ */
    (function () {
    var toggles = document.querySelectorAll('.dropdown-toggle');

    toggles.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var parent = btn.closest('.has-dropdown');
    var isOpen = parent.classList.contains('open');

    /* Close all open dropdowns first */
    document.querySelectorAll('.has-dropdown.open').forEach(function (el) {
    el.classList.remove('open');
    el.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
});

    if (!isOpen) {
    parent.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
}
});
});

    /* Close on outside click */
    document.addEventListener('click', function () {
    document.querySelectorAll('.has-dropdown.open').forEach(function (el) {
    el.classList.remove('open');
    el.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
});
});

    /* Mobile nav toggle */
    var navToggle = document.querySelector('.nav-toggle');
    var navList   = document.querySelector('.nav-list');

    navToggle.addEventListener('click', function () {
    var expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navList.classList.toggle('nav-open');
});
}());