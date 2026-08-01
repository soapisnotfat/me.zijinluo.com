(function () {
  "use strict";

  var script = document.currentScript;

  if (!script) {
    var scripts = document.querySelectorAll("script[src]");
    script = Array.prototype.find.call(scripts, function (candidate) {
      try {
        return new URL(candidate.src, document.baseURI).pathname.endsWith(
          "/assets/search.js"
        );
      } catch (_error) {
        return false;
      }
    });
  }

  var scriptUrl = new URL(
    script && script.src ? script.src : "./assets/search.js",
    document.baseURI
  );
  var indexUrl = new URL("../search-index.json", scriptUrl);
  var indexPromise = null;
  var controlSequence = 0;

  function getSearchItems(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!payload || typeof payload !== "object") {
      throw new Error("The search index has an invalid format.");
    }

    var items = payload.items || payload.pages || payload.entries;

    if (!Array.isArray(items)) {
      throw new Error("The search index has no searchable entries.");
    }

    return items;
  }

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(indexUrl.href, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Search index request failed: " + response.status);
          }

          return response.json();
        })
        .then(getSearchItems)
        .catch(function (error) {
          indexPromise = null;
          throw error;
        });
    }

    return indexPromise;
  }

  function searchableText(item) {
    var tags = Array.isArray(item.tags) ? item.tags.join(" ") : item.tags || "";

    return [item.title, item.summary, item.body, tags]
      .filter(function (value) {
        return typeof value === "string";
      })
      .join(" ")
      .toLocaleLowerCase();
  }

  function matchingItems(items, query) {
    var terms = query
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return items
      .filter(function (item) {
        var text = searchableText(item);
        return terms.every(function (term) {
          return text.indexOf(term) !== -1;
        });
      })
      .slice(0, 6);
  }

  function createStatus(message) {
    var status = document.createElement("p");
    status.className = "search-status";
    status.setAttribute("role", "status");
    status.textContent = message;
    return status;
  }

  function initSearch(control) {
    var toggle = control.querySelector(".search-toggle");
    var form = control.querySelector(".site-search-form");
    var input = control.querySelector(".site-search-input");
    var results = control.querySelector(".search-results");
    var close = control.querySelector(".search-close");

    if (!toggle || !form || !input || !results) {
      return;
    }

    controlSequence += 1;
    var controlId = "site-search-" + controlSequence;
    var formId = form.id || controlId + "-form";
    var resultsId = results.id || controlId + "-results";
    var requestSequence = 0;

    form.id = formId;
    results.id = resultsId;
    toggle.setAttribute("aria-controls", formId);
    toggle.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", resultsId);
    input.setAttribute("aria-autocomplete", "list");
    results.setAttribute("aria-live", "polite");
    results.setAttribute("aria-label", "Search results");
    form.hidden = true;
    results.hidden = true;

    function clearResults() {
      results.replaceChildren();
      results.hidden = true;
    }

    function setOpen(open, returnFocus) {
      control.classList.toggle("is-open", open);
      form.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));

      if (open) {
        window.requestAnimationFrame(function () {
          input.focus();
        });
      } else {
        requestSequence += 1;
        clearResults();
        if (returnFocus) {
          toggle.focus();
        }
      }
    }

    function renderMessage(message) {
      results.replaceChildren(createStatus(message));
      results.hidden = false;
    }

    function renderMatches(matches, query) {
      results.replaceChildren();

      if (matches.length === 0) {
        renderMessage('No results for "' + query + '".');
        return;
      }

      var status = createStatus(
        matches.length + (matches.length === 1 ? " result." : " results.")
      );
      var list = document.createElement("ul");
      list.className = "search-results-list";

      matches.forEach(function (item) {
        var itemUrl = item.url || item.href || item.path;
        if (typeof item.title !== "string" || typeof itemUrl !== "string") {
          return;
        }

        var row = document.createElement("li");
        var link = document.createElement("a");
        var title = document.createElement("span");

        link.className = "search-result-link";
        link.href = new URL(itemUrl, indexUrl).href;
        title.className = "search-result-title";
        title.textContent = item.title;
        link.appendChild(title);

        if (typeof item.summary === "string" && item.summary.trim()) {
          var summary = document.createElement("span");
          summary.className = "search-result-summary";
          summary.textContent = item.summary;
          link.appendChild(summary);
        }

        row.appendChild(link);
        list.appendChild(row);
      });

      if (!list.children.length) {
        renderMessage('No results for "' + query + '".');
        return;
      }

      results.append(status, list);
      results.hidden = false;
    }

    function search() {
      var query = input.value.trim();
      var currentRequest = ++requestSequence;

      if (!query) {
        clearResults();
        return;
      }

      renderMessage("Searching…");
      loadIndex()
        .then(function (items) {
          if (currentRequest === requestSequence) {
            renderMatches(matchingItems(items, query), query);
          }
        })
        .catch(function () {
          if (currentRequest === requestSequence) {
            renderMessage("Search is unavailable. Please try again.");
          }
        });
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true", false);
    });

    if (close) {
      close.addEventListener("click", function () {
        setOpen(false, true);
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      search();
    });

    input.addEventListener("input", search);
    input.addEventListener("search", search);

    control.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        event.preventDefault();
        setOpen(false, true);
        return;
      }

      var links = Array.prototype.slice.call(
        results.querySelectorAll(".search-result-link")
      );
      if (!links.length) {
        return;
      }

      var activeIndex = links.indexOf(document.activeElement);
      if (event.key === "ArrowDown") {
        if (document.activeElement === input || activeIndex >= 0) {
          event.preventDefault();
          links[activeIndex < 0 ? 0 : (activeIndex + 1) % links.length].focus();
        }
      } else if (event.key === "ArrowUp" && activeIndex >= 0) {
        event.preventDefault();
        if (activeIndex === 0) {
          input.focus();
        } else {
          links[activeIndex - 1].focus();
        }
      }
    });
  }

  function init() {
    document.querySelectorAll(".search-control").forEach(initSearch);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
