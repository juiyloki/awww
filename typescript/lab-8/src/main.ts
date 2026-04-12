import { countdown, fetchTodo, fetchWithTimeout, Todo } from "./async";
import { Post, summarise, filterByCategory, sortPosts, validatePost } from "./blog";
import { ApiRequest, describeRequest } from "./status";
import { Shape, area, renderShape } from "./shape";
import { groupBy, pipe, memoize } from "./utils";

const output = document.getElementById("output")!;

function show(label: string, value: unknown): void {
    const line = document.createElement("p");
    line.textContent = `${label}: ${String(value)}`;
    output.appendChild(line);
}

function makeSection(title: string): HTMLElement {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = title;
    section.appendChild(heading);
    output.appendChild(section);
    return section;
}

function greet(name: string, times: number): string {
    return `Hello, ${name}! `.repeat(times).trim();
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function formatDuration(totalSeconds: number): string {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    if (totalSeconds < 3600) return `${minutes}m ${seconds}s`;
    const hours = Math.floor(totalSeconds / 3600);
    return `${hours}h ${minutes}m ${seconds}s`;
}

makeSection("Phase 1: primitives");
show("greet", greet("World", 2));
show("clamp(15, 0, 10)", clamp(15, 0, 10));
show("clamp(-5, 0, 10)", clamp(-5, 0, 10));

const testCases: Array<[number, string]> = [
    [0, "0s"], [5, "5s"], [62, "1m 2s"],
    [3661, "1h 1m 1s"], [86400, "24h 0m 0s"],
];
const table = document.createElement("table");
table.innerHTML = "<tr><th>Input</th><th>Expected</th><th>Got</th><th>✓</th></tr>";
for (const [input, expected] of testCases) {
    const got = formatDuration(input);
    const pass = got === expected;
    const row = document.createElement("tr");
    row.innerHTML = `<td>${input}</td><td>${expected}</td><td>${got}</td>
                     <td>${pass ? "✅" : "❌"}</td>`;
    if (!pass) row.classList.add("error");
    table.appendChild(row);
}
output.appendChild(table);

const phase2 = makeSection("Phase 2: async");
const counter = document.createElement("h3");
phase2.appendChild(counter);
countdown(counter);

async function renderTodos(parent: HTMLElement): Promise<void> {
    const container = document.createElement("div");
    container.innerHTML = "<h3>Todos from API</h3>";
    parent.appendChild(container);
    for (const id of [1, 2, 3]) {
        const todo = await fetchTodo(id);
        const p = document.createElement("p");
        p.textContent = `${todo.completed ? "✅" : "⬜"} ${todo.title}`;
        container.appendChild(p);
    }
}

async function testTimeout(parent: HTMLElement): Promise<void> {
    const container = document.createElement("div");
    container.innerHTML = "<h3>fetchWithTimeout</h3>";
    parent.appendChild(container);
    const url = "https://jsonplaceholder.typicode.com/todos/1";
    for (const ms of [5000, 1]) {
        const line = document.createElement("p");
        try {
            await fetchWithTimeout<Todo>(url, ms);
            line.textContent = `${ms}ms deadline → ✅ Succeeded`;
        } catch (err) {
            line.textContent = `${ms}ms deadline → ❌ Timed out (${(err as Error).message})`;
        }
        container.appendChild(line);
    }
}

async function compareFetchModes(parent: HTMLElement): Promise<void> {
    const container = document.createElement("div");
    container.innerHTML = "<h3>Parallel vs sequential (todos 1 to 10)</h3>";
    parent.appendChild(container);
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const t0 = performance.now();
    const parallel = await Promise.all(ids.map((id) => fetchTodo(id)));
    const tParallel = performance.now() - t0;

    const t1 = performance.now();
    const sequential: Todo[] = [];
    for (const id of ids) {
        sequential.push(await fetchTodo(id));
    }
    const tSequential = performance.now() - t1;

    const list = document.createElement("ul");
    for (const todo of parallel) {
        const item = document.createElement("li");
        item.textContent = `${todo.completed ? "✅" : "⬜"} ${todo.title}`;
        list.appendChild(item);
    }
    container.appendChild(list);

    const timing = document.createElement("p");
    timing.textContent = `parallel: ${tParallel.toFixed(0)}ms · sequential: ${tSequential.toFixed(0)}ms`;
    container.appendChild(timing);
}

const posts: Post[] = [
    {
        id: 1, title: "Hello TypeScript", slug: "hello-ts",
        body: "TypeScript is JavaScript with types. It compiles to plain JS.",
        pubDate: "2025-01-01",
        category: { id: 1, name: "Tech", slug: "tech" },
    },
    {
        id: 2, title: "CSS Grid", slug: "css-grid",
        body: "CSS Grid is a two-dimensional layout system for the web.",
        pubDate: "2025-01-15",
        category: { id: 2, name: "Frontend", slug: "frontend" },
    },
    {
        id: 3, title: "Django REST", slug: "django-rest",
        body: "Build a REST API with Django and serve JSON to any client.",
        pubDate: "2025-02-01",
        category: { id: 1, name: "Tech", slug: "tech" },
    },
];

function renderPostCard(post: Post): HTMLElement {
    const card = document.createElement("article");
    card.innerHTML = `<h3>${post.title}</h3><p>${summarise(post)}</p>`;
    return card;
}

const phase3 = makeSection("Phase 3: blog");
const cardList = document.createElement("div");
phase3.appendChild(cardList);

const sortLabel = document.createElement("label");
sortLabel.textContent = "Sort by: ";
const sortSelect = document.createElement("select");
for (const option of ["title", "date", "category"] as const) {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    sortSelect.appendChild(opt);
}
sortLabel.appendChild(sortSelect);
phase3.appendChild(sortLabel);

function renderCards(by: "title" | "date" | "category"): void {
    cardList.innerHTML = "";
    for (const post of sortPosts(posts, by)) {
        cardList.appendChild(renderPostCard(post));
    }
}
renderCards("title");
sortSelect.addEventListener("change", () => {
    renderCards(sortSelect.value as "title" | "date" | "category");
});

const techPosts = filterByCategory(posts, "tech");
const filtered = document.createElement("div");
filtered.innerHTML = `<h3>Tech posts: ${techPosts.map((p) => p.title).join(", ")}</h3>`;
phase3.appendChild(filtered);

const phase4 = makeSection("Phase 4: unions, guards, SVG");

const sampleRequests: ApiRequest[] = [
    { method: "GET",  path: "/api/posts/" },
    { method: "POST", path: "/api/posts/", body: { title: "New" } },
];
for (const req of sampleRequests) {
    const p = document.createElement("p");
    p.textContent = `describeRequest: ${describeRequest(req)}`;
    phase4.appendChild(p);
}

const shapes: Shape[] = [
    { kind: "circle",    radius: 40 },
    { kind: "rectangle", width: 80, height: 60 },
    { kind: "triangle",  base: 80, height: 80 },
];
const gallery = document.createElement("div");
gallery.className = "shape-gallery";
for (const shape of shapes) {
    const figure = document.createElement("figure");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "120");
    svg.setAttribute("height", "120");
    svg.setAttribute("viewBox", "0 0 120 120");
    svg.appendChild(renderShape(shape));
    const caption = document.createElement("figcaption");
    caption.textContent = `Area: ${area(shape).toFixed(2)}`;
    figure.appendChild(svg);
    figure.appendChild(caption);
    gallery.appendChild(figure);
}
phase4.appendChild(gallery);

const validator = document.createElement("div");
validator.innerHTML = "<h3>Post JSON validator</h3>";
const textarea = document.createElement("textarea");
textarea.value = JSON.stringify({
    id: 1,
    title: "Title",
    slug: "slug",
    body: "This is a body.",
    pubDate: "2024-02-29",
    category: { id: 1, name: "Tech", slug: "tech" },
}, null, 2);
const validateBtn = document.createElement("button");
validateBtn.textContent = "Validate";
const validatorResult = document.createElement("div");
validator.appendChild(textarea);
validator.appendChild(validateBtn);
validator.appendChild(validatorResult);
phase4.appendChild(validator);

validateBtn.addEventListener("click", () => {
    validatorResult.innerHTML = "";
    let parsed: unknown;
    try {
        parsed = JSON.parse(textarea.value);
    } catch (err) {
        const msg = document.createElement("p");
        msg.className = "error";
        msg.textContent = `❌ Invalid JSON: ${(err as Error).message}`;
        validatorResult.appendChild(msg);
        return;
    }
    const result = validatePost(parsed);
    if (result.ok) {
        const msg = document.createElement("p");
        msg.textContent = "✅ Valid Post";
        validatorResult.appendChild(msg);
        validatorResult.appendChild(renderPostCard(result.post));
    } else {
        const msg = document.createElement("p");
        msg.className = "error";
        msg.textContent = `❌ Invalid: ${result.reason}`;
        validatorResult.appendChild(msg);
    }
});

const phase5 = makeSection("Phase 5: generics");

const grouped = groupBy(posts, (p) => p.category?.name ?? "Uncategorised");
for (const [name, group] of Object.entries(grouped)) {
    const section = document.createElement("section");
    const heading = document.createElement("h3");
    heading.textContent = name;
    section.appendChild(heading);
    for (const post of group) {
        section.appendChild(renderPostCard(post));
    }
    phase5.appendChild(section);
}

const process = pipe<Post[]>(
    (ps) => ps.filter((p) => p.category !== null),
    (ps) => ps.filter((p) => p.pubDate >= "2025-01-10"),
    (ps) => ps.sort((a, b) => a.title.localeCompare(b.title)),
    (ps) => ps.slice(0, 5),
);
const pipeGrid = document.createElement("div");
pipeGrid.className = "pipe-grid";
const pipeIn = document.createElement("div");
pipeIn.innerHTML = "<h3>Pipe input</h3>";
for (const p of posts) pipeIn.appendChild(renderPostCard(p));
const pipeOut = document.createElement("div");
pipeOut.innerHTML = "<h3>Pipe output</h3>";
for (const p of process(posts)) pipeOut.appendChild(renderPostCard(p));
pipeGrid.appendChild(pipeIn);
pipeGrid.appendChild(pipeOut);
phase5.appendChild(pipeGrid);

async function testMemoize(parent: HTMLElement): Promise<void> {
    const container = document.createElement("div");
    container.innerHTML = "<h3>memoize(fetchTodo)</h3>";
    parent.appendChild(container);
    const cachedFetch = memoize(fetchTodo);

    for (let i = 0; i < 2; i++) {
        const t0 = performance.now();
        const todo = await cachedFetch(1);
        const elapsed = performance.now() - t0;
        const label = i === 0 ? "MISS" : "HIT";
        const p = document.createElement("p");
        p.textContent = `Cache ${label} (${elapsed.toFixed(0)}ms): ${todo.title}`;
        container.appendChild(p);
    }
}

async function runAsyncPhases(): Promise<void> {
    await renderTodos(phase2);
    await testTimeout(phase2);
    await compareFetchModes(phase2);
    await testMemoize(phase5);
}
runAsyncPhases();
