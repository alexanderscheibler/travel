import { vi } from 'vitest';
import { initCarousel } from './carousel';


// DOM fixture — by default mirrors the real index.html markup (2 slides)
function buildDOM(slideCount = 2) {
    const slideHTML = Array.from({ length: slideCount }, (_, i) => `
        <div class="carousel-item ${i === 0 ? 'active' : ''}">
            <div class="carousel-caption"><h1>Slide ${i + 1}</h1></div>
        </div>
    `).join('');

    document.body.innerHTML = `
    <div class="banner-wrapper">
        <div class="carousel" id="banner" role="region" aria-label="Featured destinations">
            <button class="carousel-control carousel-prev" aria-label="Previous slide">
                <img width="40" src="images/icons/chevron-left.svg" aria-hidden="true">
            </button>
            <button class="carousel-control carousel-next" aria-label="Next slide">
                <img width="40" src="images/icons/chevron-right.svg" aria-hidden="true">
            </button>

            ${slideHTML}
        </div>
    </div>
  `;
}

// Event helpers
function fireTransitionEnd(el, propertyName = 'transform') {
    const event = new Event('transitionend');
    // Manually attach the property name to our fake event
    event.propertyName = propertyName;
    el.dispatchEvent(event);
}

function fireTouchSwipe(el, startX, endX) {
    el.dispatchEvent(
        new TouchEvent('touchstart', {
            changedTouches: [new Touch({ identifier: 1, target: el, clientX: startX, clientY: 0 })],
        })
    );
    el.dispatchEvent(
        new TouchEvent('touchend', {
            changedTouches: [new Touch({ identifier: 1, target: el, clientX: endX, clientY: 0 })],
        })
    );
}

/* =============================================================================
   CAROUSEL TESTS
   ============================================================================= */

// Code is initialized against incomplete, missing or non-default DOM
describe('Carousel factory', () => {
    afterEach(() => { document.body.innerHTML = ''; });

    test('returns null and does not throw when the carousel container is missing', () => {
        document.body.innerHTML = ``;
        expect(initCarousel(document)).toBeNull();
        expect(() => initCarousel(document)).not.toThrow();
    });

    test('returns null and does not throw when prev/next buttons are absent', () => {
        document.body.innerHTML = `
            <div class="carousel">
                <div class="carousel-item active"></div>
            </div>
        `;
        expect(initCarousel(document)).toBeNull();
        expect(() => initCarousel(document)).not.toThrow();
    });

    test('returns null and does not throw when there are no slides', () => {
        document.body.innerHTML = `
            <div class="carousel"></div>
            <button class="carousel-prev"></button>
            <button class="carousel-next"></button>
        `;
        expect(initCarousel(document)).toBeNull();
        expect(() => initCarousel(document)).not.toThrow();
    });

    test('returns a valid instance when all required elements exist', () => {
        document.body.innerHTML = `
            <div class="carousel">
                <div class="carousel-item active"></div>
            </div>
            <button class="carousel-prev"></button>
            <button class="carousel-next"></button>
        `;
        const instance = initCarousel(document);
        expect(instance).not.toBeNull();
        expect(typeof instance.destroy).toBe('function');
        instance.destroy();
    });

    test('correctly identifies the initially active slide from the DOM', () => {
        // Active on the SECOND slide
        document.body.innerHTML = `
        <div class="carousel">
            <button class="carousel-prev"></button>
            <button class="carousel-next"></button>
            <div class="carousel-item"></div>
            <div class="carousel-item active"></div>
            <div class="carousel-item"></div>
        </div>
    `;
        initCarousel(document);
        const prevBtn = document.querySelector('.carousel-prev');
        const items   = Array.from(document.querySelectorAll('.carousel-item'));

        prevBtn.click();
        items[0].dispatchEvent(new Event('transitionend'));

        expect(items[0].classList.contains('active')).toBe(true);
        expect(items[1].classList.contains('active')).toBe(false);
    });

    test('defaults to the first slide if none are explicitly marked as active', () => {
        // Neither slide has the 'active' class
        document.body.innerHTML = `
        <div class="carousel">
            <button class="carousel-prev"></button>
            <button class="carousel-next"></button>
            <div class="carousel-item">Slide 1</div>
            <div class="carousel-item">Slide 2</div>
            <div class="carousel-item">Slide 3</div>
        </div>
    `;
        initCarousel(document);

        const items = Array.from(document.querySelectorAll('.carousel-item'));
        const nextBtn = document.querySelector('.carousel-next');

        // If the fallback to index 0 worked, clicking 'next' should take us to index 1
        nextBtn.click();
        fireTransitionEnd(items[1]);

        expect(items[1].classList.contains('active')).toBe(true);
    });
});

// Verify the transitionTimeout property, which controls how long
// the fallback timer waits before forcibly completing the carousel animation.
describe('transitionTimeout option', () => {
    let instance, items, nextBtn;

    beforeEach(() => {
        buildDOM(2);
        vi.useFakeTimers();
        items   = Array.from(document.querySelectorAll('.carousel-item'));
        nextBtn = document.querySelector('.carousel-next');
    });

    afterEach(() => {
        instance && instance.destroy();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    test('a custom timeout shorter than 600ms releases the lock at that threshold', () => {
        instance = initCarousel(document, { transitionTimeout: 200 });

        nextBtn.click();
        expect(items[0].classList.contains('exit-next')).toBe(true);

        // 199ms — lock must still be held
        vi.advanceTimersByTime(199);
        expect(items[0].classList.contains('exit-next')).toBe(true);

        // 200ms — fallback fires, lock releases
        vi.advanceTimersByTime(1);
        expect(items[0].classList.contains('exit-next')).toBe(false);
        expect(items[1].classList.contains('active')).toBe(true);
    });

    test('a custom timeout longer than 600ms does NOT release the lock at the default 600ms', () => {
        instance = initCarousel(document, { transitionTimeout: 1000 });

        nextBtn.click();

        // Advance past the default 600ms — the custom timer is 1000ms so
        // the lock must still be active
        vi.advanceTimersByTime(600);
        expect(items[0].classList.contains('exit-next')).toBe(true);

        // Now advance to the custom threshold
        vi.advanceTimersByTime(400);
        expect(items[0].classList.contains('exit-next')).toBe(false);
        expect(items[1].classList.contains('active')).toBe(true);
    });
});


// Edge case: carousel created with only 1 image.
// A single slide has nothing to navigate. Controls must be hidden.
// This suite intentionally does NOT test navigation - there is nothing to navigate to.
describe('Carousel with 1 slide - no navigation', () => {
    let instance, prevBtn, nextBtn;

    beforeEach(() => {
        buildDOM(1);
        vi.useFakeTimers();
        instance = initCarousel(document);
        prevBtn  = document.querySelector('.carousel-prev');
        nextBtn  = document.querySelector('.carousel-next');
    });

    afterEach(() => {
        instance && instance.destroy();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    test('returns a valid instance', () => {
        expect(instance).not.toBeNull();
        expect(typeof instance.destroy).toBe('function');
    });

    test('hides the prev button', () => {
        expect(prevBtn.style.display).toBe('none');
    });

    test('hides the next button', () => {
        expect(nextBtn.style.display).toBe('none');
    });

    test('the only slide remains active', () => {
        const slide = document.querySelector('.carousel-item');
        expect(slide.classList.contains('active')).toBe(true);
    });

    test('destroy() restores controls visibility', () => {
        instance.destroy();
        expect(prevBtn.style.display).toBe('');
        expect(nextBtn.style.display).toBe('');
    });
});

describe.each([
    ['Carousel with 2 slides - current index.html', 2],
    ['Carousel with 3 slides', 3],
])('%s', (label, slides) => {
    let instance, items, nextBtn, prevBtn, carousel, first, second, last;

    beforeEach(() => {
        buildDOM(slides);
        vi.useFakeTimers();
        instance = initCarousel(document);
        items    = Array.from(document.querySelectorAll('.carousel-item'));
        nextBtn  = document.querySelector('.carousel-next');
        prevBtn  = document.querySelector('.carousel-prev');
        carousel = document.querySelector('.carousel');

        // Figure out the carousel items for dynamic testing
        first  = items[0];
        second = items[1];
        last   = items[items.length - 1];
    });

    afterEach(() => {
        instance && instance.destroy();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    // Slide navigation
    describe('Slide navigation', () => {
        test('next button activates the next slide', () => {
            // Get to the second slide
            nextBtn.click();
            fireTransitionEnd(second);

            expect(second.classList.contains('active')).toBe(true);
            expect(first.classList.contains('active')).toBe(false);
        });

        test('prev button activates the previous slide', () => {
            // Get to the second slide
            nextBtn.click();
            fireTransitionEnd(second);

            // Now go back
            prevBtn.click();
            fireTransitionEnd(first);

            expect(first.classList.contains('active')).toBe(true);
            expect(second.classList.contains('active')).toBe(false);
        });

        test('prev button wraps from the first slide to the last slide', () => {
            // Get to the previous slide (from slide 1)
            prevBtn.click();
            fireTransitionEnd(last);

            expect(last.classList.contains('active')).toBe(true);
            expect(first.classList.contains('active')).toBe(false);
        });

        test('next button wraps from the last slide back to the first slide', () => {
            // Advance through all slides to reach the last one
            for (let i = 1; i < items.length; i++) {
                nextBtn.click();
                fireTransitionEnd(items[i]);
            }

            // One more next must wrap back to the first slide
            nextBtn.click();
            fireTransitionEnd(first);

            expect(first.classList.contains('active')).toBe(true);
        });
    });

    // isAnimating lock
    describe('Rapid interaction', () => {
        test('ignores a second same-direction click while a slide transition is in progress', () => {
            // Trigger the animation
            nextBtn.click();

            // Must be ignored — transition should be locked
            nextBtn.click();

            // Complete the first transition
            fireTransitionEnd(second);

            // If the lock worked: current = second slide, which is active
            expect(second.classList.contains('active')).toBe(true);
            expect(first.classList.contains('active')).toBe(false);
        });

        test('ignores a Prev click issued while a Next animation is still running', () => {
            // Trigger the animation forward
            nextBtn.click();

            // Attempt to reverse the direction before it finishes
            prevBtn.click();

            fireTransitionEnd(second);

            // Only the original Next (forward) should have taken effect
            expect(second.classList.contains('active')).toBe(true);
            expect(first.classList.contains('active')).toBe(false);
        });

        test('ignores a Next click issued while a Prev animation is still running', () => {
            // Advance once
            nextBtn.click();
            fireTransitionEnd(second);

            // Trigger the animation backwards
            prevBtn.click();

            // Attempt to interrupt — must be ignored
            nextBtn.click();

            fireTransitionEnd(first);

            // Verify it has not moved back to the second slide
            expect(first.classList.contains('active')).toBe(true);
            expect(second.classList.contains('active')).toBe(false);
        });

        test('recovers navigation if the CSS transition fails to complete normally', () => {
            // Trigger the animation
            nextBtn.click();

            // After clicking, the lock is on and classes are applied
            expect(first.classList.contains('exit-next')).toBe(true);

            // Transitionend never fires - fallback should kick in to release the lock
            vi.advanceTimersByTime(600);

            // finalize() should have run and removed The exit class
            expect(first.classList.contains('exit-next')).toBe(false);

            // Find the slide that comes after
            const secondIndex = items.indexOf(second);
            const nextAfterSecond = items[(secondIndex + 1) % items.length];

            // Advance from the second slide
            nextBtn.click();

            // No transitioned - fallback should handle this one too
            vi.advanceTimersByTime(600);

            // Verify lock has been released - carousel has advanced
            // No DEADLOCK
            expect(nextAfterSecond.classList.contains('active')).toBe(true);
        });

        test('cleans up the safety timer when the animation completes successfully', () => {
            const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

            nextBtn.click();
            fireTransitionEnd(second); // normal path — fallback must be cancelled

            expect(clearTimeoutSpy).toHaveBeenCalled();
            clearTimeoutSpy.mockRestore();
        });
    });

    // transitionend listener
    describe('Animation completion lifecycle', () => {
        test('ignores background animations happening on other CSS properties', () => {
            nextBtn.click();

            // Fire a transitionend for an unrelated property
            const opacityEvent = new Event('transitionend');
            opacityEvent.propertyName = 'opacity';
            second.dispatchEvent(opacityEvent);

            // The lock should still be active, meaning the exit-next class isn't cleaned up yet
            expect(first.classList.contains('exit-next')).toBe(true);

            // Now fire the correct transform event
            const transformEvent = new Event('transitionend');
            transformEvent.propertyName = 'transform';
            second.dispatchEvent(transformEvent);

            // Now it should be cleaned up
            expect(first.classList.contains('exit-next')).toBe(false);
        });

        test('removes directional CSS classes once the slide finishes moving', () => {
            nextBtn.click();
            fireTransitionEnd(second);

            // Verify no leftover animation classes — transition completed cleanly
            expect(second.classList.contains('enter-next')).toBe(false);
            expect(first.classList.contains('exit-next')).toBe(false);
        });

        // DEFENSIVE: No child elements currently have CSS transitions.
        // This test is to avoid a regression that would change the carousel
        // animation behaviour. This must be in place in case a transition
        // is added to a CHILD in the carousel
        // (e.g. .carousel-caption { transition: opacity 0.3s }).
        test('child element animations do not interrupt the slide transition', () => {
            nextBtn.click();

            const child = document.createElement('span');
            second.appendChild(child);
            child.dispatchEvent(new Event('transitionend', { bubbles: true }));

            // Guard fired — lock must still be on
            expect(second.classList.contains('active')).toBe(true);
            expect(first.classList.contains('exit-next')).toBe(true);

            // The real transitionend on second must still complete the transition
            fireTransitionEnd(second);

            expect(second.classList.contains('active')).toBe(true);
            expect(first.classList.contains('exit-next')).toBe(false); // cleaned up
            expect(first.classList.contains('active')).toBe(false);
        });
    });

    // Touch swipe
    describe('Touch swipe', () => {
        test('swiping left advances to the next slide', () => {
            // (startX > endX, diff > 40)
            fireTouchSwipe(carousel, 300, 100); // diff = 200
            fireTransitionEnd(second);
            expect(second.classList.contains('active')).toBe(true);
        });

        test('swiping right goes to the previous slide', () => {
            // (startX < endX, diff > 40)
            fireTouchSwipe(carousel, 100, 300); // diff = -200
            fireTransitionEnd(last);
            expect(last.classList.contains('active')).toBe(true);
        });

        test('ignores short swipe gestures to prevent accidental navigation', () => {
            // diff = 30, below the 40 px threshold
            fireTouchSwipe(carousel, 300, 270);

            // Verify the current slide has not changed
            expect(first.classList.contains('active')).toBe(true);
            expect(second.classList.contains('active')).toBe(false);
        });

        test('ignores swipe gestures while an animation is already in progress', () => {
            // Start an animation via button
            nextBtn.click();

            // While it is animating, attempt to swipe right (prev)
            fireTouchSwipe(carousel, 100, 300);

            // Finish the original transition
            fireTransitionEnd(second);

            // We should be on the second slide. The swipe should have been completely ignored.
            expect(second.classList.contains('active')).toBe(true);
            expect(first.classList.contains('active')).toBe(false);
        });
    });

    // destroy()
    describe('destroy()', () => {
        test('the next button is disabled after component destruction', () => {
            instance.destroy();
            nextBtn.click();

            // The state didn't change
            expect(first.classList.contains('active')).toBe(true);
            expect(second.classList.contains('active')).toBe(false);
        });

        test('the previous button is disabled after component destruction', () => {
            instance.destroy();
            prevBtn.click();

            expect(first.classList.contains('active')).toBe(true);
            expect(second.classList.contains('active')).toBe(false);
            expect(last.classList.contains('active')).toBe(false);
        });

        test('touch swipe gestures are ignored after component destruction', () => {
            instance.destroy();
            fireTouchSwipe(carousel, 300, 100);

            // State didn't change
            expect(first.classList.contains('active')).toBe(true);
            expect(second.classList.contains('active')).toBe(false);
        });

        test('cleans up pending timers if destroyed mid-animation', () => {
            const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

            nextBtn.click();

            // Destroy the carousel WHILE it is animating
            instance.destroy();

            // Destroy should immediately clear the fallback timer to prevent memory leaks
            expect(clearTimeoutSpy).toHaveBeenCalled();

            clearTimeoutSpy.mockRestore();
        });
    });
});