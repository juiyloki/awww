"use strict";
(() => {
  // pages/static/pages/ts/api.ts
  function getCsrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
  }
  async function apiFetch(method, path, body) {
    try {
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken()
        }
      };
      if (body !== void 0) {
        options.body = JSON.stringify(body);
      }
      const res = await fetch(path, options);
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          message = err.error ?? message;
        } catch {
        }
        return { ok: false, error: message, status: res.status };
      }
      if (res.status === 204) {
        return { ok: true, data: {} };
      }
      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }
  var BlogApiClient = class {
    async getPosts(search) {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiFetch("GET", `/api/posts/${qs}`);
    }
    async getPost(id) {
      return apiFetch("GET", `/api/posts/${id}/`);
    }
    async getComments(postId) {
      return apiFetch("GET", `/api/posts/${postId}/comments/`);
    }
    async createComment(postId, payload) {
      return apiFetch("POST", `/api/posts/${postId}/comments/`, payload);
    }
    async updatePost(id, payload) {
      return apiFetch("PATCH", `/api/posts/${id}/`, payload);
    }
    async deleteComment(postId, commentId) {
      return apiFetch("DELETE", `/api/posts/${postId}/comments/${commentId}/`);
    }
  };
  var api = new BlogApiClient();

  // pages/static/pages/ts/main.ts
  function getElement(id) {
    const el = document.getElementById(id);
    if (el === null) {
      throw new Error(`Element #${id} not found`);
    }
    return el;
  }
  var searchInput = getElement("search-input");
  var postList = getElement("post-list");
  var statusBar = getElement("status-bar");
  var sortSelect = getElement("sort-select");
  function isPersistedState(data) {
    if (typeof data !== "object" || data === null)
      return false;
    const obj = data;
    return typeof obj.query === "string" && (obj.sortBy === "title" || obj.sortBy === "date" || obj.sortBy === "category");
  }
  function savePrefs(prefs) {
    localStorage.setItem("blog-prefs", JSON.stringify(prefs));
  }
  function loadPrefs() {
    const raw = localStorage.getItem("blog-prefs");
    if (raw === null)
      return null;
    try {
      const data = JSON.parse(raw);
      return isPersistedState(data) ? data : null;
    } catch {
      return null;
    }
  }
  var initialPrefs = loadPrefs();
  var state = {
    posts: [],
    query: initialPrefs?.query ?? "",
    status: "idle",
    error: "",
    sortBy: initialPrefs?.sortBy ?? "date",
    focusedIndex: -1
  };
  var renderCleanups = [];
  function setState(patch) {
    state = { ...state, ...patch };
    savePrefs({ query: state.query, sortBy: state.sortBy });
    render();
  }
  function sortPosts(posts, by) {
    const sorted = [...posts];
    switch (by) {
      case "title":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case "date":
        return sorted.sort((a, b) => b.pub_date.localeCompare(a.pub_date));
      case "category":
        return sorted.sort((a, b) => {
          if (a.category === null && b.category === null)
            return 0;
          if (a.category === null)
            return 1;
          if (b.category === null)
            return -1;
          return a.category.localeCompare(b.category);
        });
    }
  }
  function escapeHtml(s) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return s.replace(/[&<>"']/g, (c) => map[c]);
  }
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function highlightMatch(text, query) {
    const safe = escapeHtml(text);
    if (!query)
      return safe;
    const safeQuery = escapeRegex(escapeHtml(query));
    return safe.replace(new RegExp(safeQuery, "gi"), (m) => `<mark>${m}</mark>`);
  }
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      if (timer !== void 0)
        clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
  async function withRetry(fn, retries, delayMs) {
    statusBar.textContent = `Attempt 1/${retries + 1}\u2026`;
    let result = await fn();
    let attempt = 1;
    let wait = delayMs;
    while (!result.ok && attempt <= retries) {
      statusBar.textContent = `Retry ${attempt + 1}/${retries + 1} (waiting ${wait}ms)\u2026`;
      await new Promise((resolve) => setTimeout(resolve, wait));
      wait *= 2;
      result = await fn();
      attempt += 1;
    }
    return result;
  }
  function validateComment(author, body) {
    const errors = {};
    if (author.length < 2 || author.length > 50) {
      errors.author = "Author must be 2 to 50 characters";
    }
    if (body.length < 10 || body.length > 500) {
      errors.body = "Body must be 10 to 500 characters";
    }
    return Object.keys(errors).length === 0 ? { valid: true } : { valid: false, errors };
  }
  function renderComment(postId, comment) {
    const div = document.createElement("div");
    div.className = "comment";
    const author = document.createElement("strong");
    author.textContent = comment.author;
    const body = document.createElement("span");
    body.textContent = `: ${comment.body}`;
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    div.append(author, body, " ", deleteBtn);
    deleteBtn.addEventListener("click", async () => {
      const parent = div.parentElement;
      const next = div.nextSibling;
      if (parent === null)
        return;
      deleteBtn.textContent = "Deleting\u2026";
      div.remove();
      const result = await api.deleteComment(postId, comment.id);
      if (!result.ok) {
        parent.insertBefore(div, next);
        deleteBtn.textContent = "Delete";
        const err = document.createElement("span");
        err.className = "error";
        err.textContent = ` (failed: ${result.error})`;
        div.appendChild(err);
      }
    });
    return div;
  }
  function renderCommentForm(postId, parent, onCreated) {
    const form = document.createElement("form");
    const authorInput = document.createElement("input");
    authorInput.type = "text";
    authorInput.placeholder = "Your name";
    authorInput.required = true;
    const authorErr = document.createElement("span");
    authorErr.className = "error";
    const bodyTextarea = document.createElement("textarea");
    bodyTextarea.placeholder = "Your comment";
    bodyTextarea.required = true;
    bodyTextarea.rows = 3;
    const bodyErr = document.createElement("span");
    bodyErr.className = "error";
    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = "Post Comment";
    const feedback = document.createElement("p");
    form.append(authorInput, authorErr, bodyTextarea, bodyErr, submitBtn, feedback);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      authorErr.textContent = "";
      bodyErr.textContent = "";
      const author = authorInput.value.trim();
      const body = bodyTextarea.value.trim();
      const validation = validateComment(author, body);
      if (!validation.valid) {
        authorErr.textContent = validation.errors.author ?? "";
        bodyErr.textContent = validation.errors.body ?? "";
        return;
      }
      submitBtn.disabled = true;
      feedback.textContent = "Posting\u2026";
      const result = await api.createComment(postId, { author, body });
      if (result.ok) {
        feedback.textContent = "Comment posted!";
        form.reset();
        onCreated(result.data);
      } else {
        feedback.textContent = `Error: ${result.error}`;
      }
      submitBtn.disabled = false;
    });
    parent.appendChild(form);
  }
  function renderPost(post, focused) {
    const article = document.createElement("article");
    article.dataset.id = String(post.id);
    article.tabIndex = 0;
    if (focused)
      article.classList.add("focused");
    const heading = document.createElement("h2");
    heading.innerHTML = highlightMatch(post.title, state.query);
    const meta = document.createElement("small");
    meta.textContent = `Category: ${post.category ?? "None"} | ${post.pub_date.slice(0, 10)}`;
    const excerpt = document.createElement("p");
    excerpt.textContent = post.body.slice(0, 120) + "\u2026";
    const fullBody = document.createElement("p");
    fullBody.textContent = post.body;
    fullBody.hidden = true;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = "Read more";
    const commentsList = document.createElement("div");
    commentsList.className = "comments-list";
    const updatedLabel = document.createElement("p");
    updatedLabel.className = "last-updated";
    updatedLabel.hidden = true;
    let pollTimer = null;
    let counterTimer = null;
    let lastFetched = 0;
    function showComments(comments) {
      commentsList.innerHTML = "";
      for (const c of comments) {
        commentsList.appendChild(renderComment(post.id, c));
      }
    }
    async function refreshComments() {
      const result = await api.getComments(post.id);
      if (result.ok) {
        showComments(result.data.comments);
        lastFetched = performance.now();
      }
    }
    function startTimers() {
      pollTimer = setInterval(() => {
        void refreshComments();
      }, 1e4);
      counterTimer = setInterval(() => {
        const seconds = Math.floor((performance.now() - lastFetched) / 1e3);
        updatedLabel.textContent = `Last updated: ${seconds}s ago`;
      }, 1e3);
      updatedLabel.hidden = false;
    }
    function pauseTimers() {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (counterTimer !== null) {
        clearInterval(counterTimer);
        counterTimer = null;
      }
    }
    function stopTimers() {
      pauseTimers();
      document.removeEventListener("visibilitychange", onVisibility);
      updatedLabel.hidden = true;
    }
    function onVisibility() {
      if (fullBody.hidden)
        return;
      if (document.hidden)
        pauseTimers();
      else if (pollTimer === null)
        startTimers();
    }
    async function expand() {
      fullBody.hidden = false;
      excerpt.hidden = true;
      toggle.textContent = "Show less";
      commentsList.textContent = "Loading comments\u2026";
      const result = await api.getComments(post.id);
      if (result.ok) {
        showComments(result.data.comments);
        lastFetched = performance.now();
        startTimers();
        document.addEventListener("visibilitychange", onVisibility);
      } else {
        commentsList.textContent = `Error: ${result.error}`;
      }
    }
    function collapse() {
      fullBody.hidden = true;
      excerpt.hidden = false;
      toggle.textContent = "Read more";
      commentsList.innerHTML = "";
      stopTimers();
    }
    toggle.addEventListener("click", () => {
      if (fullBody.hidden)
        void expand();
      else
        collapse();
    });
    article.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target === article) {
        e.preventDefault();
        toggle.click();
      }
    });
    article.append(heading, meta, excerpt, fullBody, toggle, commentsList, updatedLabel);
    renderCommentForm(post.id, article, (c) => commentsList.appendChild(renderComment(post.id, c)));
    renderCleanups.push(stopTimers);
    return article;
  }
  function render() {
    for (const c of renderCleanups)
      c();
    renderCleanups = [];
    postList.innerHTML = "";
    if (state.status === "loading") {
      statusBar.textContent = "Loading\u2026";
      return;
    }
    if (state.status === "error") {
      statusBar.textContent = `Error: ${state.error}`;
      return;
    }
    const sorted = sortPosts(state.posts, state.sortBy);
    statusBar.textContent = `${sorted.length} post(s) found`;
    sorted.forEach((post, i) => {
      postList.appendChild(renderPost(post, i === state.focusedIndex));
    });
  }
  async function loadPosts(query = "") {
    setState({ status: "loading", query, focusedIndex: -1 });
    const result = await withRetry(() => api.getPosts(query), 3, 200);
    if (result.ok) {
      setState({ posts: result.data.posts, status: "success", error: "" });
    } else {
      setState({ status: "error", error: result.error });
    }
  }
  var debouncedLoad = debounce((q) => {
    void loadPosts(q);
  }, 300);
  searchInput.addEventListener("input", () => {
    debouncedLoad(searchInput.value.trim());
  });
  sortSelect.addEventListener("change", () => {
    setState({ sortBy: sortSelect.value });
  });
  document.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
      return;
    }
    const count = state.posts.length;
    switch (e.key) {
      case "ArrowDown": {
        if (count === 0)
          return;
        e.preventDefault();
        const next = state.focusedIndex < 0 ? 0 : (state.focusedIndex + 1) % count;
        setState({ focusedIndex: next });
        postList.children[next]?.scrollIntoView({ block: "nearest" });
        break;
      }
      case "ArrowUp": {
        if (count === 0)
          return;
        e.preventDefault();
        const prev = state.focusedIndex <= 0 ? count - 1 : state.focusedIndex - 1;
        setState({ focusedIndex: prev });
        postList.children[prev]?.scrollIntoView({ block: "nearest" });
        break;
      }
      case "Enter": {
        if (postList.contains(e.target))
          return;
        if (state.focusedIndex < 0)
          return;
        const article = postList.children[state.focusedIndex];
        article?.querySelector("button")?.click();
        break;
      }
      case "Escape": {
        for (const child of Array.from(postList.children)) {
          const btn = child.querySelector("button");
          if (btn !== null && btn.textContent === "Show less")
            btn.click();
        }
        setState({ focusedIndex: -1 });
        break;
      }
    }
  });
  searchInput.value = state.query;
  sortSelect.value = state.sortBy;
  void loadPosts(state.query);
})();
//# sourceMappingURL=main.js.map
