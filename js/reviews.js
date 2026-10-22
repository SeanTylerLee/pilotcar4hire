(function (global) {
  "use strict";

  var COMMENT_MAX = 280;
  var SUCCESS_COPY = "Your review has been submitted and will be published within 24 hours";
  var byListing = {};
  var loaded = false;
  var loading = null;

  function escapeHtml(str) {
    if (typeof global.escapeHtml === "function") return global.escapeHtml(str);
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function listingIdOf(listing) {
    return listing && (listing.id || listing.listingId) || "";
  }

  function mapReview(row) {
    return {
      id: row.id,
      listingId: row.listing_id || row.listingId,
      stars: Number(row.stars) || 0,
      comment: row.comment || "",
      publishedAt: row.published_at || row.publishedAt || row.created_at || row.createdAt || null,
    };
  }

  function reviewsFor(listingId) {
    return byListing[listingId] || [];
  }

  function starGlyphs(count, max) {
    var n = Math.max(0, Math.min(5, Math.round(Number(count) || 0)));
    var total = max == null ? 5 : max;
    var html = "";
    for (var i = 1; i <= total; i += 1) {
      html += '<span class="' + (i <= n ? "is-on" : "is-off") + '">★</span>';
    }
    return html;
  }

  function averageStars(rows) {
    if (!rows.length) return 0;
    var sum = 0;
    rows.forEach(function (row) { sum += row.stars; });
    return Math.round((sum / rows.length) * 10) / 10;
  }

  function formatReviewDate(value) {
    if (!value) return "";
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  async function loadPublishedReviews() {
    if (loaded) return byListing;
    if (loading) return loading;
    if (typeof useLocalDev === "function" && useLocalDev()) {
      loaded = true;
      return byListing;
    }
    if (typeof supabase === "undefined" || !supabase) {
      loaded = true;
      return byListing;
    }

    loading = supabase
      .from("listing_reviews")
      .select("id, listing_id, stars, comment, published_at, created_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .then(function (res) {
        byListing = {};
        if (!res.error) {
          (res.data || []).forEach(function (row) {
            var review = mapReview(row);
            if (!review.listingId) return;
            if (!byListing[review.listingId]) byListing[review.listingId] = [];
            byListing[review.listingId].push(review);
          });
        }
        loaded = true;
        loading = null;
        return byListing;
      })
      .catch(function () {
        loaded = true;
        loading = null;
        return byListing;
      });

    return loading;
  }

  async function submitListingReview(listingId, stars, comment, source) {
    if (typeof useLocalDev === "function" && useLocalDev()) {
      throw new Error("Reviews need a live connection.");
    }
    if (typeof supabase === "undefined" || !supabase) {
      throw new Error("Reviews are not available right now.");
    }
    var { data, error } = await supabase.rpc("submit_listing_review", {
      p_listing_id: listingId,
      p_stars: Number(stars),
      p_comment: String(comment || "").trim(),
      p_source: source || "web",
    });
    if (error) throw new Error(error.message || "Could not submit review.");
    return data;
  }

  function formatAverage(avg) {
    return (Math.round(Number(avg) * 10) / 10).toFixed(1);
  }

  function summaryHtml(rows) {
    if (!rows.length) {
      return (
        '<div class="listing-review-summary listing-review-summary--empty" aria-label="Add review">' +
          '<span class="listing-review-add">Add review</span>' +
        "</div>"
      );
    }
    var avg = averageStars(rows);
    var avgLabel = formatAverage(avg);
    var see = rows.length === 1 ? "See review" : "See reviews";
    return (
      '<div class="listing-review-summary" aria-label="' + escapeHtml(avgLabel + " rating. " + see) + '">' +
        '<div class="listing-review-badge-row">' +
          '<span class="listing-stars" aria-hidden="true">' + starGlyphs(avg) + "</span>" +
          '<span class="listing-review-avg">' + escapeHtml(avgLabel) + "</span>" +
        "</div>" +
        '<span class="listing-review-see">' + escapeHtml(see) + "</span>" +
      "</div>"
    );
  }

  function commentsHtml(rows) {
    if (!rows.length) return "";
    var items = rows.map(function (row) {
      var when = formatReviewDate(row.publishedAt);
      return (
        '<li class="listing-review">' +
          '<div class="listing-review-meta">' +
            '<span class="listing-stars" aria-label="' + escapeHtml(row.stars + " out of 5 stars") + '">' +
              starGlyphs(row.stars) +
            "</span>" +
            (when ? '<time datetime="' + escapeHtml(row.publishedAt) + '">' + escapeHtml(when) + "</time>" : "") +
          "</div>" +
          (row.comment
            ? '<p class="listing-review-comment">' + escapeHtml(row.comment) + "</p>"
            : "") +
        "</li>"
      );
    }).join("");
    return (
      '<p class="listing-reviews-heading">Reviews</p>' +
      '<ul class="listing-review-list">' + items + "</ul>"
    );
  }

  function formHtml(listing) {
    var name = (listing && listing.businessName) || "this pilot";
    return (
      '<form class="listing-review-form" novalidate>' +
        '<p class="listing-review-form-title">Leave a review</p>' +
        '<fieldset class="listing-star-picker">' +
          '<legend>Rating</legend>' +
          '<div class="listing-star-buttons" role="radiogroup" aria-label="Rating for ' + escapeHtml(name) + '">' +
            [1, 2, 3, 4, 5].map(function (n) {
              return (
                '<button type="button" class="listing-star-btn" data-stars="' + n + '" aria-label="' + n +
                " star" + (n === 1 ? "" : "s") + '" aria-pressed="false">★</button>'
              );
            }).join("") +
          "</div>" +
        "</fieldset>" +
        '<label class="listing-review-comment-label">' +
          "<span>Comment (optional)</span>" +
          '<textarea name="comment" maxlength="' + COMMENT_MAX + '" rows="3" placeholder="A short note about this escort"></textarea>' +
        "</label>" +
        '<p class="listing-review-count-hint"><span data-el="chars">0</span>/' + COMMENT_MAX + "</p>" +
        '<p class="listing-review-status" hidden></p>' +
        '<button type="submit" class="btn-secondary btn-small">Submit review</button>' +
      "</form>"
    );
  }

  function setStatus(el, text, isError) {
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || "";
    el.classList.toggle("is-error", !!isError);
    el.classList.toggle("is-success", !!text && !isError);
  }

  function bindForm(root, listing) {
    var form = root.querySelector(".listing-review-form");
    if (!form) return;
    var id = listingIdOf(listing);
    var picker = form.querySelector(".listing-star-buttons");
    var statusEl = form.querySelector(".listing-review-status");
    var commentEl = form.querySelector('textarea[name="comment"]');
    var charsEl = form.querySelector('[data-el="chars"]');
    var submitBtn = form.querySelector('button[type="submit"]');
    var selected = 0;

    function paintStars() {
      form.querySelectorAll(".listing-star-btn").forEach(function (btn) {
        var n = Number(btn.getAttribute("data-stars"));
        var on = n <= selected;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", n === selected ? "true" : "false");
      });
    }

    if (picker) {
      picker.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-stars]");
        if (!btn) return;
        selected = Number(btn.getAttribute("data-stars")) || 0;
        paintStars();
        setStatus(statusEl, "", false);
      });
    }

    if (commentEl && charsEl) {
      commentEl.addEventListener("input", function () {
        charsEl.textContent = String((commentEl.value || "").length);
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!id) {
        setStatus(statusEl, "This listing cannot be reviewed yet.", true);
        return;
      }
      if (selected < 1 || selected > 5) {
        setStatus(statusEl, "Choose a rating from 1 to 5 stars.", true);
        return;
      }
      var comment = (commentEl && commentEl.value ? commentEl.value : "").trim();
      if (submitBtn) submitBtn.disabled = true;
      setStatus(statusEl, "Submitting…", false);
      submitListingReview(id, selected, comment, "web")
        .then(function () {
          form.innerHTML =
            '<p class="listing-review-thanks">' + escapeHtml(SUCCESS_COPY) + "</p>";
        })
        .catch(function (err) {
          setStatus(statusEl, (err && err.message) || "Could not submit review.", true);
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  function attachListingReviews(card, listing, options) {
    if (!card || !listing) return;
    var opts = options || {};
    var allowWrite = opts.allowWrite !== false;
    var id = listingIdOf(listing);
    if (!id) return;

    var existing = card.querySelector(".listing-reviews");
    if (existing) existing.remove();

    var rows = reviewsFor(id);
    if (!rows.length && !allowWrite) return;
    var wrap = document.createElement("div");
    wrap.className = "listing-reviews";
    wrap.innerHTML = commentsHtml(rows) + (allowWrite ? formHtml(listing) : "");
    card.appendChild(wrap);
    if (allowWrite) bindForm(wrap, listing);

    var titleRow = card.querySelector(".listing-card-title-row") || card.querySelector(".listing-card-head");
    if (titleRow && (rows.length || allowWrite)) {
      var existingSummary = card.querySelector(".listing-review-summary");
      if (existingSummary) existingSummary.remove();
      titleRow.insertAdjacentHTML("beforeend", summaryHtml(rows));
    }
  }

  global.loadPublishedReviews = loadPublishedReviews;
  global.reviewsForListing = reviewsFor;
  global.attachListingReviews = attachListingReviews;
  global.submitListingReview = submitListingReview;
})(window);
