// ============================================================
// CALCULATE DASHBOARD STATS
// ============================================================
function calculateDashboardStats(
    data
) {

    const list =
        Array.isArray(data)
            ? data
            : [];


    /*
     * ========================================================
     * STATISTIK UTAMA DASHBOARD
     * ========================================================
     */

    const stats = {

        /*
         * TOTAL LEADS
         */
        total:
            list.length,


        /*
         * NEW
         */
        new:
            dashboardCountStatus(
                list,
                "New"
            ),


        /*
         * INTERESTED
         */
        interested:
            dashboardCountStatus(
                list,
                "Interested"
            ),


        /*
         * FOLLOW UP
         */
        followUp:
            dashboardCountStatus(
                list,
                "Follow Up"
            ),


        /*
         * CLOSING
         */
        closing:
            dashboardCountStatus(
                list,
                "Closing"
            )
    };


    /*
     * ========================================================
     * COMPATIBILITY / LEGACY STATISTICS
     * ========================================================
     */

    stats.flyerSent =
        dashboardCountStatus(
            list,
            "Flyer Sent"
        );


    stats.firstContact =
        dashboardCountStatus(
            list,
            "First Contact"
        );


    stats.firstMeeting =
        dashboardCountStatus(
            list,
            "First Meeting / Appointment / Site Survey"
        );


    stats.quotation =
        dashboardCountStatus(
            list,
            "Quotation"
        );


    stats.secondAppointment =
        dashboardCountStatus(
            list,
            "Second Appointment"
        );


    stats.deal =
        dashboardCountStatus(
            list,
            "Deal"
        );


    stats.noDeal =
        dashboardCountStatus(
            list,
            "No Deal"
        );


    /*
     * Appointment legacy
     */
    stats.appointment =
        dashboardCountDateField(
            list,
            "appointment"
        );


    /*
     * Site Survey legacy
     */
    stats.siteSurvey =
        dashboardCountDateField(
            list,
            "site_survey"
        );


    /*
     * SPK legacy
     */
    stats.spk =
        dashboardCountDateField(
            list,
            "spk"
        );


    /*
     * Not Interested legacy
     */
    stats.notInterested =
        dashboardCountStatus(
            list,
            "Not Interested"
        );


    /*
     * ========================================================
     * STATUS SUMMARY
     * ========================================================
     */

    stats.statuses = {

        new:
            stats.new,

        interested:
            stats.interested,

        followUp:
            stats.followUp,

        closing:
            stats.closing
    };


    /*
     * ========================================================
     * PIPELINE SUMMARY LEGACY
     * ========================================================
     */

    stats.pipeline = {

        new:
            stats.new,

        firstContact:
            stats.firstContact,

        firstMeeting:
            stats.firstMeeting,

        quotation:
            stats.quotation,

        secondAppointment:
            stats.secondAppointment,

        deal:
            stats.deal,

        noDeal:
            stats.noDeal
    };


    return stats;
}


// ============================================================
// DASHBOARD COUNT-UP
// ============================================================

/*
 * Animasi angka dari angka sebelumnya menuju angka baru.
 *
 * Contoh:
 *
 * 0 -> 2141
 *
 * atau ketika data berubah:
 *
 * 2141 -> 2150
 *
 * Durasi sekitar 1 detik.
 */
function dashboardAnimateNumber(
    element,
    targetValue,
    duration = 1000
) {

    if (!element) {
        return;
    }


    /*
     * Pastikan target berupa angka.
     */
    const target =
        Number(
            targetValue
        ) || 0;


    /*
     * Ambil angka yang sedang tampil.
     *
     * Kalau sebelumnya kosong,
     * mulai dari 0.
     */
    const current =
        Number(
            String(
                element.textContent || "0"
            ).replace(
                /[^\d-]/g,
                ""
            )
        ) || 0;


    /*
     * Jika angka sama,
     * tidak perlu animasi.
     */
    if (current === target) {

        element.textContent =
            target.toLocaleString(
                "en-US"
            );

        return;
    }


    /*
     * Batalkan animasi sebelumnya
     * jika masih berjalan.
     */
    if (
        element._dashboardAnimationFrame
    ) {

        cancelAnimationFrame(
            element._dashboardAnimationFrame
        );
    }


    const startTime =
        performance.now();


    /*
     * Easing:
     *
     * mulai cepat,
     * kemudian melambat.
     */
    function easeOutCubic(
        progress
    ) {

        return 1 -
            Math.pow(
                1 - progress,
                3
            );
    }


    /*
     * Jalankan animasi.
     */
    function animate(
        currentTime
    ) {

        const elapsed =
            currentTime -
            startTime;


        let progress =
            elapsed /
            duration;


        /*
         * Batasi 0 - 1.
         */
        progress =
            Math.min(
                Math.max(
                    progress,
                    0
                ),
                1
            );


        /*
         * Apply easing.
         */
        const easedProgress =
            easeOutCubic(
                progress
            );


        /*
         * Hitung angka saat ini.
         */
        const value =
            Math.round(
                current +
                (
                    target -
                    current
                ) *
                easedProgress
            );


        /*
         * Tampilkan angka.
         */
        element.textContent =
            value.toLocaleString(
                "en-US"
            );


        /*
         * Lanjutkan sampai selesai.
         */
        if (
            progress < 1
        ) {

            element._dashboardAnimationFrame =
                requestAnimationFrame(
                    animate
                );

        } else {

            /*
             * Pastikan angka akhir
             * benar-benar sama dengan target.
             */
            element.textContent =
                target.toLocaleString(
                    "en-US"
                );


            element._dashboardAnimationFrame =
                null;
        }
    }


    /*
     * Mulai animasi.
     */
    element._dashboardAnimationFrame =
        requestAnimationFrame(
            animate
        );
}


// ============================================================
// SET ELEMENT TEXT
// ============================================================

function dashboardSetElementText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    const numericValue =
        Number(
            value
        ) || 0;


    /*
     * Gunakan count-up untuk
     * angka dashboard.
     */
    dashboardAnimateNumber(
        element,
        numericValue,
        1000
    );
}


// ============================================================
// UPDATE DASHBOARD CARDS
// ============================================================

function renderDashboardStats(
    stats
) {

    if (!stats) {
        return;
    }


    /*
     * ========================================================
     * STAT CARD MAP
     * ========================================================
     */

    const statMap = {

        /*
         * ====================================================
         * STATISTIK UTAMA
         * ====================================================
         */

        statTotal:
            stats.total,

        statNew:
            stats.new,

        statInterested:
            stats.interested,

        statFollowUp:
            stats.followUp,

        statClosing:
            stats.closing,


        /*
         * ====================================================
         * PIPELINE / LEGACY CARDS
         * ====================================================
         */

        statFlyerSent:
            stats.flyerSent,

        statAppointment:
            stats.appointment,

        statSiteSurvey:
            stats.siteSurvey,

        statQuotation:
            stats.quotation,

        statSPK:
            stats.spk,

        statNotInterested:
            stats.notInterested
    };


    /*
     * Set semua angka kartu.
     */
    Object.entries(
        statMap
    ).forEach(
        ([id, value]) => {

            /*
             * Jika helper global tersedia,
             * tetap jalankan untuk compatibility.
             */
            if (
                typeof window.setText ===
                "function"
            ) {

                /*
                 * Jangan gunakan setText
                 * untuk angka utama karena
                 * bisa mematikan count-up.
                 *
                 * Count-up dilakukan oleh
                 * dashboardSetElementText().
                 */
            }


            /*
             * Count-up dashboard.
             */
            dashboardSetElementText(
                id,
                value
            );
        }
    );


    /*
     * ========================================================
     * LEGACY IDS
     * ========================================================
     */

    const alternatives = {

        /*
         * Total
         */
        totalLeads:
            stats.total,


        /*
         * New
         */
        newLeads:
            stats.new,


        /*
         * Interested
         */
        interestedLeads:
            stats.interested,


        /*
         * Follow Up
         */
        followUpLeads:
            stats.followUp,


        /*
         * Closing
         */
        closingLeads:
            stats.closing,


        /*
         * Legacy Flyer Sent
         */
        flyerSentLeads:
            stats.flyerSent,


        /*
         * Legacy Appointment
         */
        appointmentLeads:
            stats.appointment,


        /*
         * Legacy Site Survey
         */
        siteSurveyLeads:
            stats.siteSurvey,


        /*
         * Quotation
         */
        quotationLeads:
            stats.quotation,


        /*
         * SPK
         */
        spkLeads:
            stats.spk,


        /*
         * Not Interested
         */
        notInterestedLeads:
            stats.notInterested
    };


    Object.entries(
        alternatives
    ).forEach(
        ([id, value]) => {

            dashboardSetElementText(
                id,
                value
            );
        }
    );


    /*
     * ========================================================
     * GLOBAL STATUS SUMMARY
     * ========================================================
     */

    window.FSIDashboard =
        window.FSIDashboard ||
        {};


    window.FSIDashboard.statusStats = {

        /*
         * Dashboard utama
         */
        total:
            stats.total,

        new:
            stats.new,

        interested:
            stats.interested,

        followUp:
            stats.followUp,

        closing:
            stats.closing,


        /*
         * Pipeline lama
         */
        firstContact:
            stats.firstContact,

        firstMeeting:
            stats.firstMeeting,

        quotation:
            stats.quotation,

        secondAppointment:
            stats.secondAppointment,

        deal:
            stats.deal,

        noDeal:
            stats.noDeal
    };


    /*
     * Simpan stats utama secara global.
     */
    window.FSIDashboard.stats =
        stats;


    /*
     * Setelah angka dirender,
     * pastikan kartu interactive.
     */
    if (
        typeof dashboardBindStatCardClicks ===
        "function"
    ) {

        dashboardBindStatCardClicks();
    }


    /*
     * ========================================================
     * PLAYING CARD CAROUSEL
     * ========================================================
     *
     * Setelah semua angka selesai dirender,
     * refresh posisi kartu.
     */

    if (
        window.FSIDashboard &&
        window.FSIDashboard.statCarousel &&
        typeof window.FSIDashboard.statCarousel.init ===
        "function"
    ) {

        requestAnimationFrame(
            function () {

                window.FSIDashboard
                    .statCarousel
                    .init();

            }
        );
    }
}


// ============================================================
// PLAYING CARD CAROUSEL
// ============================================================

(function () {

    const carousel = {

        container: null,

        cards: [],

        currentIndex: 0,

        startX: 0,

        currentX: 0,

        dragging: false,

        threshold: 45,

        initialized: false
    };


    // ========================================================
    // GET CARDS
    // ========================================================

    function getCards() {

        carousel.container =
            document.querySelector(
                ".stats-grid"
            );

        if (
            !carousel.container
        ) {

            return [];
        }


        return Array.from(
            carousel.container.querySelectorAll(
                ".stat-card"
            )
        );
    }


    // ========================================================
    // SET CARD POSITION
    // ========================================================

    function setCardPosition(
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


        /*
         * CARD UTAMA
         */
        if (
            position === 0
        ) {

            card.classList.add(
                "carousel-center"
            );

            return;
        }


        /*
         * CARD KIRI
         */
        if (
            position === -1
        ) {

            card.classList.add(
                "carousel-left"
            );

            return;
        }


        /*
         * CARD KANAN
         */
        if (
            position === 1
        ) {

            card.classList.add(
                "carousel-right"
            );

            return;
        }


        /*
         * CARD JAUH KIRI
         */
        if (
            position === -2
        ) {

            card.classList.add(
                "carousel-far-left"
            );

            return;
        }


        /*
         * CARD JAUH KANAN
         */
        if (
            position === 2
        ) {

            card.classList.add(
                "carousel-far-right"
            );

            return;
        }


        /*
         * CARD LAINNYA
         */
        card.classList.add(
            "carousel-hidden"
        );
    }


    // ========================================================
    // REFRESH CAROUSEL
    // ========================================================

    function refresh() {

        const cards =
            carousel.cards;

        const total =
            cards.length;


        if (
            !total
        ) {

            return;
        }


        cards.forEach(
            function (
                card,
                index
            ) {

                let difference =
                    index -
                    carousel.currentIndex;


                /*
                 * Gunakan jarak terpendek
                 * dalam carousel.
                 */

                if (
                    difference >
                    total / 2
                ) {

                    difference -=
                        total;
                }


                if (
                    difference <
                    -total / 2
                ) {

                    difference +=
                        total;
                }


                setCardPosition(
                    card,
                    difference
                );
            }
        );
    }


    // ========================================================
    // GO TO
    // ========================================================

    function goTo(
        index
    ) {

        const total =
            carousel.cards.length;


        if (
            !total
        ) {

            return;
        }


        if (
            index < 0
        ) {

            index =
                total - 1;
        }


        if (
            index >= total
        ) {

            index = 0;
        }


        carousel.currentIndex =
            index;


        refresh();
    }


    // ========================================================
    // NEXT
    // ========================================================

    function next() {

        goTo(
            carousel.currentIndex + 1
        );
    }


    // ========================================================
    // PREVIOUS
    // ========================================================

    function previous() {

        goTo(
            carousel.currentIndex - 1
        );
    }


    // ========================================================
    // POINTER DOWN
    // ========================================================

    function pointerDown(
        event
    ) {

        /*
         * Hanya klik kiri mouse.
         */
        if (
            event.pointerType ===
            "mouse" &&
            event.button !== 0
        ) {

            return;
        }


        carousel.dragging =
            true;


        carousel.startX =
            event.clientX;


        carousel.currentX =
            event.clientX;


        if (
            carousel.container
        ) {

            carousel.container.classList.add(
                "is-dragging"
            );
        }
    }


    // ========================================================
    // POINTER MOVE
    // ========================================================

    function pointerMove(
        event
    ) {

        if (
            !carousel.dragging
        ) {

            return;
        }


        carousel.currentX =
            event.clientX;
    }


    // ========================================================
    // POINTER UP
    // ========================================================

    function pointerUp() {

        if (
            !carousel.dragging
        ) {

            return;
        }


        const distance =
            carousel.currentX -
            carousel.startX;


        carousel.dragging =
            false;


        if (
            carousel.container
        ) {

            carousel.container.classList.remove(
                "is-dragging"
            );
        }


        /*
         * Gerakan terlalu kecil
         * dianggap bukan swipe.
         */
        if (
            Math.abs(
                distance
            ) <
            carousel.threshold
        ) {

            return;
        }


        /*
         * Swipe kiri.
         */
        if (
            distance < 0
        ) {

            next();

        /*
         * Swipe kanan.
         */
        } else {

            previous();
        }
    }


    // ========================================================
    // TOUCH START
    // ========================================================

    function touchStart(
        event
    ) {

        if (
            !event.touches ||
            !event.touches.length
        ) {

            return;
        }


        carousel.dragging =
            true;


        carousel.startX =
            event.touches[0].clientX;


        carousel.currentX =
            event.touches[0].clientX;
    }


    // ========================================================
    // TOUCH MOVE
    // ========================================================

    function touchMove(
        event
    ) {

        if (
            !carousel.dragging
        ) {

            return;
        }


        if (
            !event.touches ||
            !event.touches.length
        ) {

            return;
        }


        carousel.currentX =
            event.touches[0].clientX;
    }


    // ========================================================
    // TOUCH END
    // ========================================================

    function touchEnd() {

        if (
            !carousel.dragging
        ) {

            return;
        }


        const distance =
            carousel.currentX -
            carousel.startX;


        carousel.dragging =
            false;


        if (
            Math.abs(
                distance
            ) <
            carousel.threshold
        ) {

            return;
        }


        if (
            distance < 0
        ) {

            next();

        } else {

            previous();
        }
    }


    // ========================================================
    // KEYBOARD
    // ========================================================

    function keyboard(
        event
    ) {

        const activeElement =
            document.activeElement;


        const tag =
            activeElement?.tagName;


        /*
         * Jangan ganggu form.
         */
        if (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT"
        ) {

            return;
        }


        if (
            event.key ===
            "ArrowLeft"
        ) {

            previous();
        }


        if (
            event.key ===
            "ArrowRight"
        ) {

            next();
        }
    }


    // ========================================================
    // BIND EVENTS
    // ========================================================

    function bindEvents() {

        if (
            !carousel.container
        ) {

            return;
        }


        /*
         * Pointer.
         */

        carousel.container.addEventListener(
            "pointerdown",
            pointerDown
        );


        carousel.container.addEventListener(
            "pointermove",
            pointerMove
        );


        carousel.container.addEventListener(
            "pointerup",
            pointerUp
        );


        carousel.container.addEventListener(
            "pointercancel",
            pointerUp
        );


        /*
         * Touch.
         */

        carousel.container.addEventListener(
            "touchstart",
            touchStart,
            {
                passive: true
            }
        );


        carousel.container.addEventListener(
            "touchmove",
            touchMove,
            {
                passive: true
            }
        );


        carousel.container.addEventListener(
            "touchend",
            touchEnd,
            {
                passive: true
            }
        );


        /*
         * Keyboard.
         */

        document.addEventListener(
            "keydown",
            keyboard
        );
    }


    // ========================================================
    // INITIALIZE
    // ========================================================

    function init() {

        const cards =
            getCards();


        if (
            !cards.length
        ) {

            return;
        }


        carousel.cards =
            cards;


        /*
         * Pastikan index masih valid.
         */
        if (
            carousel.currentIndex >=
            cards.length
        ) {

            carousel.currentIndex =
                0;
        }


        refresh();


        /*
         * Bind event hanya satu kali.
         */
        if (
            !carousel.initialized
        ) {

            bindEvents();

            carousel.initialized =
                true;
        }
    }


    // ========================================================
    // PUBLIC API
    // ========================================================

    window.FSIDashboard =
        window.FSIDashboard ||
        {};


    window.FSIDashboard.statCarousel = {

        init:
            init,

        next:
            next,

        previous:
            previous,

        goTo:
            goTo,

        refresh:
            refresh
    };


    // ========================================================
    // INITIAL LOAD
    // ========================================================

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            /*
             * Dashboard kadang belum selesai
             * dirender saat DOMContentLoaded.
             *
             * Coba beberapa kali.
             */

            setTimeout(
                init,
                100
            );


            setTimeout(
                init,
                500
            );


            setTimeout(
                init,
                1000
            );
        }
    );

})();
