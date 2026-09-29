/* =========================================================
   DASHBOARD STATS
   + PLAYING CARD CAROUSEL
========================================================= */


/* =========================================================
   NUMBER FORMAT
========================================================= */

function dashboardFormatNumber(value) {
    const number = Number(value) || 0;

    return number.toLocaleString("en-US");
}


/* =========================================================
   ANIMATED NUMBER
========================================================= */

function dashboardAnimateNumber(
    element,
    targetValue,
    duration = 650
) {
    if (!element) return;

    const target = Math.max(
        0,
        Number(targetValue) || 0
    );

    const start = Number(
        element.dataset.currentValue || 0
    );

    const startTime = performance.now();

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function update(currentTime) {

        const elapsed =
            currentTime - startTime;

        const progress =
            Math.min(
                elapsed / duration,
                1
            );

        const eased =
            easeOutCubic(progress);

        const current =
            Math.round(
                start +
                (target - start) * eased
            );

        element.textContent =
            dashboardFormatNumber(current);

        element.dataset.currentValue =
            String(current);

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent =
                dashboardFormatNumber(target);

            element.dataset.currentValue =
                String(target);
        }
    }

    requestAnimationFrame(update);
}


/* =========================================================
   SET DASHBOARD NUMBER
========================================================= */

function dashboardSetElementText(id, value) {

    const element =
        document.getElementById(id);

    if (!element) return;

    dashboardAnimateNumber(
        element,
        value
    );
}


/* =========================================================
   PLAYING CARD CAROUSEL
========================================================= */

const dashboardStatsCarousel = {
    currentIndex: 0,
    cards: [],
    startX: 0,
    currentX: 0,
    isDragging: false,
    threshold: 45,
    initialized: false
};


/* =========================================================
   GET CARDS
========================================================= */

function dashboardCarouselGetCards() {

    const container =
        document.querySelector(".stats-grid");

    if (!container) {
        return [];
    }

    return Array.from(
        container.querySelectorAll(".stat-card")
    );
}


/* =========================================================
   POSITION CARD
========================================================= */

function dashboardCarouselPositionCard(
    card,
    position
) {

    card.classList.remove(
        "carousel-center",
        "carousel-left",
        "carousel-right",
        "carousel-far-left",
        "carousel-far-right",
        "carousel-hidden"
    );

    if (position === 0) {

        card.classList.add(
            "carousel-center"
        );

        return;
    }

    if (position === -1) {

        card.classList.add(
            "carousel-left"
        );

        return;
    }

    if (position === 1) {

        card.classList.add(
            "carousel-right"
        );

        return;
    }

    if (position === -2) {

        card.classList.add(
            "carousel-far-left"
        );

        return;
    }

    if (position === 2) {

        card.classList.add(
            "carousel-far-right"
        );

        return;
    }

    card.classList.add(
        "carousel-hidden"
    );
}


/* =========================================================
   REFRESH CAROUSEL
========================================================= */

function dashboardCarouselRefresh() {

    const cards =
        dashboardStatsCarousel.cards;

    const total =
        cards.length;

    if (!total) return;

    cards.forEach(
        (card, index) => {

            let difference =
                index -
                dashboardStatsCarousel.currentIndex;

            /*
             * Convert difference into
             * shortest circular distance.
             */

            if (difference > total / 2) {
                difference -= total;
            }

            if (difference < -total / 2) {
                difference += total;
            }

            dashboardCarouselPositionCard(
                card,
                difference
            );
        }
    );
}


/* =========================================================
   GO TO INDEX
========================================================= */

function dashboardCarouselGoTo(index) {

    const total =
        dashboardStatsCarousel.cards.length;

    if (!total) return;

    if (index < 0) {
        index = total - 1;
    }

    if (index >= total) {
        index = 0;
    }

    dashboardStatsCarousel.currentIndex =
        index;

    dashboardCarouselRefresh();
}


/* =========================================================
   NEXT
========================================================= */

function dashboardCarouselNext() {

    dashboardCarouselGoTo(
        dashboardStatsCarousel.currentIndex + 1
    );
}


/* =========================================================
   PREVIOUS
========================================================= */

function dashboardCarouselPrevious() {

    dashboardCarouselGoTo(
        dashboardStatsCarousel.currentIndex - 1
    );
}


/* =========================================================
   POINTER DOWN
========================================================= */

function dashboardCarouselPointerDown(event) {

    dashboardStatsCarousel.isDragging = true;

    dashboardStatsCarousel.startX =
        event.clientX;

    dashboardStatsCarousel.currentX =
        event.clientX;

    const container =
        document.querySelector(".stats-grid");

    if (container) {
        container.classList.add(
            "is-dragging"
        );
    }
}


/* =========================================================
   POINTER MOVE
========================================================= */

function dashboardCarouselPointerMove(event) {

    if (
        !dashboardStatsCarousel.isDragging
    ) {
        return;
    }

    dashboardStatsCarousel.currentX =
        event.clientX;
}


/* =========================================================
   POINTER UP
========================================================= */

function dashboardCarouselPointerUp() {

    if (
        !dashboardStatsCarousel.isDragging
    ) {
        return;
    }

    const distance =
        dashboardStatsCarousel.currentX -
        dashboardStatsCarousel.startX;

    dashboardStatsCarousel.isDragging =
        false;

    const container =
        document.querySelector(".stats-grid");

    if (container) {
        container.classList.remove(
            "is-dragging"
        );
    }

    if (
        Math.abs(distance) <
        dashboardStatsCarousel.threshold
    ) {
        return;
    }

    if (distance < 0) {
        dashboardCarouselNext();
    } else {
        dashboardCarouselPrevious();
    }
}


/* =========================================================
   TOUCH SUPPORT
========================================================= */

function dashboardCarouselTouchStart(event) {

    if (!event.touches?.length) {
        return;
    }

    dashboardStatsCarousel.isDragging =
        true;

    dashboardStatsCarousel.startX =
        event.touches[0].clientX;

    dashboardStatsCarousel.currentX =
        event.touches[0].clientX;
}


function dashboardCarouselTouchMove(event) {

    if (
        !dashboardStatsCarousel.isDragging
    ) {
        return;
    }

    if (!event.touches?.length) {
        return;
    }

    dashboardStatsCarousel.currentX =
        event.touches[0].clientX;
}


function dashboardCarouselTouchEnd() {

    if (
        !dashboardStatsCarousel.isDragging
    ) {
        return;
    }

    const distance =
        dashboardStatsCarousel.currentX -
        dashboardStatsCarousel.startX;

    dashboardStatsCarousel.isDragging =
        false;

    if (
        Math.abs(distance) <
        dashboardStatsCarousel.threshold
    ) {
        return;
    }

    if (distance < 0) {
        dashboardCarouselNext();
    } else {
        dashboardCarouselPrevious();
    }
}


/* =========================================================
   MOUSE / TOUCH / KEYBOARD EVENTS
========================================================= */

function dashboardCarouselBindEvents() {

    const container =
        document.querySelector(".stats-grid");

    if (!container) return;


    /* Pointer */

    container.addEventListener(
        "pointerdown",
        dashboardCarouselPointerDown
    );

    container.addEventListener(
        "pointermove",
        dashboardCarouselPointerMove
    );

    container.addEventListener(
        "pointerup",
        dashboardCarouselPointerUp
    );

    container.addEventListener(
        "pointercancel",
        dashboardCarouselPointerUp
    );


    /* Touch */

    container.addEventListener(
        "touchstart",
        dashboardCarouselTouchStart,
        {
            passive: true
        }
    );

    container.addEventListener(
        "touchmove",
        dashboardCarouselTouchMove,
        {
            passive: true
        }
    );

    container.addEventListener(
        "touchend",
        dashboardCarouselTouchEnd,
        {
            passive: true
        }
    );


    /* Keyboard */

    document.addEventListener(
        "keydown",
        event => {

            /*
             * Do not interfere with
             * typing inside inputs.
             */

            const tag =
                document.activeElement?.tagName;

            if (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT"
            ) {
                return;
            }

            if (event.key === "ArrowLeft") {

                dashboardCarouselPrevious();

            } else if (
                event.key === "ArrowRight"
            ) {

                dashboardCarouselNext();
            }
        }
    );
}


/* =========================================================
   INITIALIZE CAROUSEL
========================================================= */

function dashboardCarouselInit() {

    const container =
        document.querySelector(".stats-grid");

    if (!container) {
        return;
    }

    const cards =
        dashboardCarouselGetCards();

    if (!cards.length) {
        return;
    }

    dashboardStatsCarousel.cards =
        cards;

    dashboardStatsCarousel.currentIndex =
        Math.min(
            dashboardStatsCarousel.currentIndex,
            cards.length - 1
        );

    dashboardCarouselRefresh();

    if (
        !dashboardStatsCarousel.initialized
    ) {

        dashboardCarouselBindEvents();

        dashboardStatsCarousel.initialized =
            true;
    }
}


/* =========================================================
   REFRESH AFTER DASHBOARD RENDER
========================================================= */

function dashboardCarouselRefreshAfterRender() {

    /*
     * Small delay allows dashboard HTML
     * to finish rendering before measuring
     * and positioning the cards.
     */

    requestAnimationFrame(() => {
        dashboardCarouselInit();
    });
}


/* =========================================================
   AUTO INIT
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        dashboardCarouselInit();

    }
);
