import { api, Post, Comment, Result } from "./api";

function getElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (el === null) {
        throw new Error(`Element #${id} not found`);
    }
    return el as T;
}

const searchInput = getElement<HTMLInputElement>("search-input");
const postList    = getElement<HTMLDivElement>("post-list");
const statusBar   = getElement<HTMLParagraphElement>("status-bar");
const sortSelect  = getElement<HTMLSelectElement>("sort-select");

type PageStatus = "idle" | "loading" | "success" | "error";
type SortField  = "title" | "date" | "category";

interface AppState {
    posts:        Post[];
    query:        string;
    status:       PageStatus;
    error:        string;
    sortBy:       SortField;
    focusedIndex: number;
}

interface PersistedState {
    query:  string;
    sortBy: SortField;
}

function isPersistedState(data: unknown): data is PersistedState {
    if (typeof data !== "object" || data === null) return false;
    const obj = data as Record<string, unknown>;
    return typeof obj.query === "string"
        && (obj.sortBy === "title" || obj.sortBy === "date" || obj.sortBy === "category");
}

function savePrefs(prefs: PersistedState): void {
    localStorage.setItem("blog-prefs", JSON.stringify(prefs));
}

function loadPrefs(): PersistedState | null {
    const raw = localStorage.getItem("blog-prefs");
    if (raw === null) return null;
    try {
        const data: unknown = JSON.parse(raw);
        return isPersistedState(data) ? data : null;
    } catch {
        return null;
    }
}

const initialPrefs = loadPrefs();
let state: AppState = {
    posts:        [],
    query:        initialPrefs?.query ?? "",
    status:       "idle",
    error:        "",
    sortBy:       initialPrefs?.sortBy ?? "date",
    focusedIndex: -1,
};

let renderCleanups: Array<() => void> = [];

function setState(patch: Partial<AppState>): void {
    state = { ...state, ...patch };
    savePrefs({ query: state.query, sortBy: state.sortBy });
    render();
}

function sortPosts(posts: Post[], by: SortField): Post[] {
    const sorted = [...posts];
    switch (by) {
        case "title":
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case "date":
            return sorted.sort((a, b) => b.pub_date.localeCompare(a.pub_date));
        case "category":
            return sorted.sort((a, b) => {
                if (a.category === null && b.category === null) return 0;
                if (a.category === null) return 1;
                if (b.category === null) return -1;
                return a.category.localeCompare(b.category);
            });
    }
}

function escapeHtml(s: string): string {
    const map: Record<string, string> = {
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    };
    return s.replace(/[&<>"']/g, (c) => map[c]);
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(text: string, query: string): string {
    const safe = escapeHtml(text);
    if (!query) return safe;
    const safeQuery = escapeRegex(escapeHtml(query));
    return safe.replace(new RegExp(safeQuery, "gi"), (m) => `<mark>${m}</mark>`);
}

function debounce<A extends unknown[]>(
    fn: (...args: A) => void,
    delay: number,
): (...args: A) => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (...args: A): void => {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

async function withRetry<T>(
    fn: () => Promise<Result<T>>,
    retries: number,
    delayMs: number,
): Promise<Result<T>> {
    statusBar.textContent = `Attempt 1/${retries + 1}…`;
    let result = await fn();
    let attempt = 1;
    let wait = delayMs;
    while (!result.ok && attempt <= retries) {
        statusBar.textContent = `Retry ${attempt + 1}/${retries + 1} (waiting ${wait}ms)…`;
        await new Promise<void>((resolve) => setTimeout(resolve, wait));
        wait *= 2;
        result = await fn();
        attempt += 1;
    }
    return result;
}

type ValidationResult =
    | { valid: true }
    | { valid: false; errors: Record<string, string> };

function validateComment(author: string, body: string): ValidationResult {
    const errors: Record<string, string> = {};
    if (author.length < 2 || author.length > 50) {
        errors.author = "Author must be 2 to 50 characters";
    }
    if (body.length < 10 || body.length > 500) {
        errors.body = "Body must be 10 to 500 characters";
    }
    return Object.keys(errors).length === 0
        ? { valid: true }
        : { valid: false, errors };
}

function renderComment(postId: number, comment: Comment): HTMLElement {
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
        if (parent === null) return;
        deleteBtn.textContent = "Deleting…";
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

function renderCommentForm(
    postId: number,
    parent: HTMLElement,
    onCreated: (c: Comment) => void,
): void {
    const form = document.createElement("form");

    const authorInput = document.createElement("input");
    authorInput.type        = "text";
    authorInput.placeholder = "Your name";
    authorInput.required    = true;
    const authorErr = document.createElement("span");
    authorErr.className = "error";

    const bodyTextarea = document.createElement("textarea");
    bodyTextarea.placeholder = "Your comment";
    bodyTextarea.required    = true;
    bodyTextarea.rows        = 3;
    const bodyErr = document.createElement("span");
    bodyErr.className = "error";

    const submitBtn = document.createElement("button");
    submitBtn.type        = "submit";
    submitBtn.textContent = "Post Comment";

    const feedback = document.createElement("p");

    form.append(authorInput, authorErr, bodyTextarea, bodyErr, submitBtn, feedback);

    form.addEventListener("submit", async (event: Event) => {
        event.preventDefault();
        authorErr.textContent = "";
        bodyErr.textContent = "";
        const author = authorInput.value.trim();
        const body   = bodyTextarea.value.trim();

        const validation = validateComment(author, body);
        if (!validation.valid) {
            authorErr.textContent = validation.errors.author ?? "";
            bodyErr.textContent   = validation.errors.body ?? "";
            return;
        }

        submitBtn.disabled = true;
        feedback.textContent = "Posting…";
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

function renderPost(post: Post, focused: boolean): HTMLElement {
    const article = document.createElement("article");
    article.dataset.id = String(post.id);
    article.tabIndex = 0;
    if (focused) article.classList.add("focused");

    const heading = document.createElement("h2");
    heading.innerHTML = highlightMatch(post.title, state.query);

    const meta = document.createElement("small");
    meta.textContent = `Category: ${post.category ?? "None"} | ${post.pub_date.slice(0, 10)}`;

    const excerpt = document.createElement("p");
    excerpt.textContent = post.body.slice(0, 120) + "…";

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

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let counterTimer: ReturnType<typeof setInterval> | null = null;
    let lastFetched = 0;

    function showComments(comments: Comment[]): void {
        commentsList.innerHTML = "";
        for (const c of comments) {
            commentsList.appendChild(renderComment(post.id, c));
        }
    }

    async function refreshComments(): Promise<void> {
        const result = await api.getComments(post.id);
        if (result.ok) {
            showComments(result.data.comments);
            lastFetched = performance.now();
        }
    }

    function startTimers(): void {
        pollTimer = setInterval(() => { void refreshComments(); }, 10000);
        counterTimer = setInterval(() => {
            const seconds = Math.floor((performance.now() - lastFetched) / 1000);
            updatedLabel.textContent = `Last updated: ${seconds}s ago`;
        }, 1000);
        updatedLabel.hidden = false;
    }

    function pauseTimers(): void {
        if (pollTimer !== null) { clearInterval(pollTimer); pollTimer = null; }
        if (counterTimer !== null) { clearInterval(counterTimer); counterTimer = null; }
    }

    function stopTimers(): void {
        pauseTimers();
        document.removeEventListener("visibilitychange", onVisibility);
        updatedLabel.hidden = true;
    }

    function onVisibility(): void {
        if (fullBody.hidden) return;
        if (document.hidden) pauseTimers();
        else if (pollTimer === null) startTimers();
    }

    async function expand(): Promise<void> {
        fullBody.hidden = false;
        excerpt.hidden = true;
        toggle.textContent = "Show less";
        commentsList.textContent = "Loading comments…";
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

    function collapse(): void {
        fullBody.hidden = true;
        excerpt.hidden = false;
        toggle.textContent = "Read more";
        commentsList.innerHTML = "";
        stopTimers();
    }

    toggle.addEventListener("click", () => {
        if (fullBody.hidden) void expand();
        else collapse();
    });

    article.addEventListener("keydown", (e: KeyboardEvent) => {
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

function render(): void {
    for (const c of renderCleanups) c();
    renderCleanups = [];
    postList.innerHTML = "";

    if (state.status === "loading") {
        statusBar.textContent = "Loading…";
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

async function loadPosts(query: string = ""): Promise<void> {
    setState({ status: "loading", query, focusedIndex: -1 });
    const result = await withRetry(() => api.getPosts(query), 3, 200);
    if (result.ok) {
        setState({ posts: result.data.posts, status: "success", error: "" });
    } else {
        setState({ status: "error", error: result.error });
    }
}

const debouncedLoad = debounce((q: string) => { void loadPosts(q); }, 300);

searchInput.addEventListener("input", () => {
    debouncedLoad(searchInput.value.trim());
});

sortSelect.addEventListener("change", () => {
    setState({ sortBy: sortSelect.value as SortField });
});

document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement
        || e.target instanceof HTMLTextAreaElement
        || e.target instanceof HTMLSelectElement) {
        return;
    }
    const count = state.posts.length;
    switch (e.key) {
        case "ArrowDown": {
            if (count === 0) return;
            e.preventDefault();
            const next = state.focusedIndex < 0 ? 0 : (state.focusedIndex + 1) % count;
            setState({ focusedIndex: next });
            postList.children[next]?.scrollIntoView({ block: "nearest" });
            break;
        }
        case "ArrowUp": {
            if (count === 0) return;
            e.preventDefault();
            const prev = state.focusedIndex <= 0 ? count - 1 : state.focusedIndex - 1;
            setState({ focusedIndex: prev });
            postList.children[prev]?.scrollIntoView({ block: "nearest" });
            break;
        }
        case "Enter": {
            if (postList.contains(e.target as Node)) return;
            if (state.focusedIndex < 0) return;
            const article = postList.children[state.focusedIndex] as HTMLElement | undefined;
            article?.querySelector("button")?.click();
            break;
        }
        case "Escape": {
            for (const child of Array.from(postList.children)) {
                const btn = (child as HTMLElement).querySelector("button");
                if (btn !== null && btn.textContent === "Show less") btn.click();
            }
            setState({ focusedIndex: -1 });
            break;
        }
    }
});

searchInput.value = state.query;
sortSelect.value  = state.sortBy;
void loadPosts(state.query);
