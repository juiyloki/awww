"use strict";
(() => {
  // src/async.ts
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function countdown(element) {
    for (let i = 5; i >= 0; i--) {
      element.textContent = `${i}\u2026`;
      await delay(1e3);
    }
    element.textContent = "Go!";
  }
  async function fetchTodo(id) {
    const res = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return data;
  }
  async function fetchWithTimeout(url, ms) {
    const timeout = delay(ms).then(() => {
      throw new Error(`Timed out after ${ms}ms`);
    });
    const request = fetch(url).then(async (res) => {
      if (!res.ok)
        throw new Error(`HTTP ${res.status}`);
      return await res.json();
    });
    return Promise.race([request, timeout]);
  }

  // src/blog.ts
  function summarise(post) {
    const categoryName = post.category?.name ?? "Uncategorised";
    return `${post.title} (${categoryName}) \u2014 ${post.body.slice(0, 50)}...`;
  }
  function filterByCategory(posts2, categoryName) {
    const target = categoryName.toLowerCase();
    return posts2.filter((p) => p.category?.name.toLowerCase() === target);
  }
  function sortPosts(posts2, by) {
    const sorted = [...posts2];
    switch (by) {
      case "title":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case "date":
        return sorted.sort((a, b) => b.pubDate.localeCompare(a.pubDate));
      case "category":
        return sorted.sort((a, b) => {
          if (a.category === null && b.category === null)
            return 0;
          if (a.category === null)
            return 1;
          if (b.category === null)
            return -1;
          return a.category.name.localeCompare(b.category.name);
        });
    }
  }
  function validatePost(data) {
    if (typeof data !== "object" || data === null) {
      return { ok: false, reason: "data is not an object" };
    }
    const obj = data;
    if (typeof obj.id !== "number")
      return { ok: false, reason: "id must be a number" };
    if (typeof obj.title !== "string")
      return { ok: false, reason: "title must be a string" };
    if (typeof obj.slug !== "string")
      return { ok: false, reason: "slug must be a string" };
    if (typeof obj.body !== "string")
      return { ok: false, reason: "body must be a string" };
    if (typeof obj.pubDate !== "string")
      return { ok: false, reason: "pubDate must be a string" };
    let category;
    if (obj.category === null) {
      category = null;
    } else if (typeof obj.category === "object") {
      const cat = obj.category;
      if (typeof cat.id !== "number")
        return { ok: false, reason: "category.id must be a number" };
      if (typeof cat.name !== "string")
        return { ok: false, reason: "category.name must be a string" };
      if (typeof cat.slug !== "string")
        return { ok: false, reason: "category.slug must be a string" };
      category = { id: cat.id, name: cat.name, slug: cat.slug };
    } else {
      return { ok: false, reason: "category must be null or an object" };
    }
    return {
      ok: true,
      post: {
        id: obj.id,
        title: obj.title,
        slug: obj.slug,
        body: obj.body,
        pubDate: obj.pubDate,
        category
      }
    };
  }

  // src/status.ts
  function describeRequest(req) {
    const base = `${req.method} ${req.path}`;
    return req.body !== void 0 ? `${base} (has body)` : base;
  }

  // src/shape.ts
  function area(shape) {
    switch (shape.kind) {
      case "circle":
        return Math.PI * shape.radius ** 2;
      case "rectangle":
        return shape.width * shape.height;
      case "triangle":
        return 0.5 * shape.base * shape.height;
    }
  }
  var SVG_NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }
  function renderShape(shape) {
    switch (shape.kind) {
      case "circle":
        return svgEl("circle", { cx: 60, cy: 60, r: shape.radius, fill: "#FFB3BA" });
      case "rectangle":
        return svgEl("rect", {
          x: (120 - shape.width) / 2,
          y: (120 - shape.height) / 2,
          width: shape.width,
          height: shape.height,
          fill: "#E0BBE4"
        });
      case "triangle": {
        const cx = 60;
        const top = 60 - shape.height / 2;
        const bottom = 60 + shape.height / 2;
        const points = `${cx},${top} ${cx - shape.base / 2},${bottom} ${cx + shape.base / 2},${bottom}`;
        return svgEl("polygon", { points, fill: "#BAE1FF" });
      }
    }
  }

  // src/utils.ts
  function groupBy(items, keyFn) {
    const result = {};
    for (const item of items) {
      const key = keyFn(item);
      (result[key] ??= []).push(item);
    }
    return result;
  }
  function pipe(...fns) {
    return (arg) => fns.reduce((acc, fn) => fn(acc), arg);
  }
  function memoize(fn) {
    const cache = /* @__PURE__ */ new Map();
    return (arg) => {
      const cached = cache.get(arg);
      if (cached !== void 0)
        return cached;
      const promise = fn(arg);
      cache.set(arg, promise);
      return promise;
    };
  }

  // src/main.ts
  var output = document.getElementById("output");
  function show(label, value) {
    const line = document.createElement("p");
    line.textContent = `${label}: ${String(value)}`;
    output.appendChild(line);
  }
  function makeSection(title) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = title;
    section.appendChild(heading);
    output.appendChild(section);
    return section;
  }
  function greet(name, times) {
    return `Hello, ${name}! `.repeat(times).trim();
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function formatDuration(totalSeconds) {
    if (totalSeconds < 60)
      return `${totalSeconds}s`;
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    if (totalSeconds < 3600)
      return `${minutes}m ${seconds}s`;
    const hours = Math.floor(totalSeconds / 3600);
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  makeSection("Phase 1: primitives");
  show("greet", greet("World", 2));
  show("clamp(15, 0, 10)", clamp(15, 0, 10));
  show("clamp(-5, 0, 10)", clamp(-5, 0, 10));
  var testCases = [
    [0, "0s"],
    [5, "5s"],
    [62, "1m 2s"],
    [3661, "1h 1m 1s"],
    [86400, "24h 0m 0s"]
  ];
  var table = document.createElement("table");
  table.innerHTML = "<tr><th>Input</th><th>Expected</th><th>Got</th><th>\u2713</th></tr>";
  for (const [input, expected] of testCases) {
    const got = formatDuration(input);
    const pass = got === expected;
    const row = document.createElement("tr");
    row.innerHTML = `<td>${input}</td><td>${expected}</td><td>${got}</td>
                     <td>${pass ? "\u2705" : "\u274C"}</td>`;
    if (!pass)
      row.classList.add("error");
    table.appendChild(row);
  }
  output.appendChild(table);
  var phase2 = makeSection("Phase 2: async");
  var counter = document.createElement("h3");
  phase2.appendChild(counter);
  countdown(counter);
  async function renderTodos(parent) {
    const container = document.createElement("div");
    container.innerHTML = "<h3>Todos from API</h3>";
    parent.appendChild(container);
    for (const id of [1, 2, 3]) {
      const todo = await fetchTodo(id);
      const p = document.createElement("p");
      p.textContent = `${todo.completed ? "\u2705" : "\u2B1C"} ${todo.title}`;
      container.appendChild(p);
    }
  }
  async function testTimeout(parent) {
    const container = document.createElement("div");
    container.innerHTML = "<h3>fetchWithTimeout</h3>";
    parent.appendChild(container);
    const url = "https://jsonplaceholder.typicode.com/todos/1";
    for (const ms of [5e3, 1]) {
      const line = document.createElement("p");
      try {
        await fetchWithTimeout(url, ms);
        line.textContent = `${ms}ms deadline \u2192 \u2705 Succeeded`;
      } catch (err) {
        line.textContent = `${ms}ms deadline \u2192 \u274C Timed out (${err.message})`;
      }
      container.appendChild(line);
    }
  }
  async function compareFetchModes(parent) {
    const container = document.createElement("div");
    container.innerHTML = "<h3>Parallel vs sequential (todos 1 to 10)</h3>";
    parent.appendChild(container);
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const t0 = performance.now();
    const parallel = await Promise.all(ids.map((id) => fetchTodo(id)));
    const tParallel = performance.now() - t0;
    const t1 = performance.now();
    const sequential = [];
    for (const id of ids) {
      sequential.push(await fetchTodo(id));
    }
    const tSequential = performance.now() - t1;
    const list = document.createElement("ul");
    for (const todo of parallel) {
      const item = document.createElement("li");
      item.textContent = `${todo.completed ? "\u2705" : "\u2B1C"} ${todo.title}`;
      list.appendChild(item);
    }
    container.appendChild(list);
    const timing = document.createElement("p");
    timing.textContent = `parallel: ${tParallel.toFixed(0)}ms \xB7 sequential: ${tSequential.toFixed(0)}ms`;
    container.appendChild(timing);
  }
  var posts = [
    {
      id: 1,
      title: "Hello TypeScript",
      slug: "hello-ts",
      body: "TypeScript is JavaScript with types. It compiles to plain JS.",
      pubDate: "2025-01-01",
      category: { id: 1, name: "Tech", slug: "tech" }
    },
    {
      id: 2,
      title: "CSS Grid",
      slug: "css-grid",
      body: "CSS Grid is a two-dimensional layout system for the web.",
      pubDate: "2025-01-15",
      category: { id: 2, name: "Frontend", slug: "frontend" }
    },
    {
      id: 3,
      title: "Django REST",
      slug: "django-rest",
      body: "Build a REST API with Django and serve JSON to any client.",
      pubDate: "2025-02-01",
      category: { id: 1, name: "Tech", slug: "tech" }
    }
  ];
  function renderPostCard(post) {
    const card = document.createElement("article");
    card.innerHTML = `<h3>${post.title}</h3><p>${summarise(post)}</p>`;
    return card;
  }
  var phase3 = makeSection("Phase 3: blog");
  var cardList = document.createElement("div");
  phase3.appendChild(cardList);
  var sortLabel = document.createElement("label");
  sortLabel.textContent = "Sort by: ";
  var sortSelect = document.createElement("select");
  for (const option of ["title", "date", "category"]) {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    sortSelect.appendChild(opt);
  }
  sortLabel.appendChild(sortSelect);
  phase3.appendChild(sortLabel);
  function renderCards(by) {
    cardList.innerHTML = "";
    for (const post of sortPosts(posts, by)) {
      cardList.appendChild(renderPostCard(post));
    }
  }
  renderCards("title");
  sortSelect.addEventListener("change", () => {
    renderCards(sortSelect.value);
  });
  var techPosts = filterByCategory(posts, "tech");
  var filtered = document.createElement("div");
  filtered.innerHTML = `<h3>Tech posts: ${techPosts.map((p) => p.title).join(", ")}</h3>`;
  phase3.appendChild(filtered);
  var phase4 = makeSection("Phase 4: unions, guards, SVG");
  var sampleRequests = [
    { method: "GET", path: "/api/posts/" },
    { method: "POST", path: "/api/posts/", body: { title: "New" } }
  ];
  for (const req of sampleRequests) {
    const p = document.createElement("p");
    p.textContent = `describeRequest: ${describeRequest(req)}`;
    phase4.appendChild(p);
  }
  var shapes = [
    { kind: "circle", radius: 40 },
    { kind: "rectangle", width: 80, height: 60 },
    { kind: "triangle", base: 80, height: 80 }
  ];
  var gallery = document.createElement("div");
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
  var validator = document.createElement("div");
  validator.innerHTML = "<h3>Post JSON validator</h3>";
  var textarea = document.createElement("textarea");
  textarea.value = JSON.stringify({
    id: 1,
    title: "Title",
    slug: "slug",
    body: "This is a body.",
    pubDate: "2024-02-29",
    category: { id: 1, name: "Tech", slug: "tech" }
  }, null, 2);
  var validateBtn = document.createElement("button");
  validateBtn.textContent = "Validate";
  var validatorResult = document.createElement("div");
  validator.appendChild(textarea);
  validator.appendChild(validateBtn);
  validator.appendChild(validatorResult);
  phase4.appendChild(validator);
  validateBtn.addEventListener("click", () => {
    validatorResult.innerHTML = "";
    let parsed;
    try {
      parsed = JSON.parse(textarea.value);
    } catch (err) {
      const msg = document.createElement("p");
      msg.className = "error";
      msg.textContent = `\u274C Invalid JSON: ${err.message}`;
      validatorResult.appendChild(msg);
      return;
    }
    const result = validatePost(parsed);
    if (result.ok) {
      const msg = document.createElement("p");
      msg.textContent = "\u2705 Valid Post";
      validatorResult.appendChild(msg);
      validatorResult.appendChild(renderPostCard(result.post));
    } else {
      const msg = document.createElement("p");
      msg.className = "error";
      msg.textContent = `\u274C Invalid: ${result.reason}`;
      validatorResult.appendChild(msg);
    }
  });
  var phase5 = makeSection("Phase 5: generics");
  var grouped = groupBy(posts, (p) => p.category?.name ?? "Uncategorised");
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
  var process = pipe(
    (ps) => ps.filter((p) => p.category !== null),
    (ps) => ps.filter((p) => p.pubDate >= "2025-01-10"),
    (ps) => ps.sort((a, b) => a.title.localeCompare(b.title)),
    (ps) => ps.slice(0, 5)
  );
  var pipeGrid = document.createElement("div");
  pipeGrid.className = "pipe-grid";
  var pipeIn = document.createElement("div");
  pipeIn.innerHTML = "<h3>Pipe input</h3>";
  for (const p of posts)
    pipeIn.appendChild(renderPostCard(p));
  var pipeOut = document.createElement("div");
  pipeOut.innerHTML = "<h3>Pipe output</h3>";
  for (const p of process(posts))
    pipeOut.appendChild(renderPostCard(p));
  pipeGrid.appendChild(pipeIn);
  pipeGrid.appendChild(pipeOut);
  phase5.appendChild(pipeGrid);
  async function testMemoize(parent) {
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
  async function runAsyncPhases() {
    await renderTodos(phase2);
    await testTimeout(phase2);
    await compareFetchModes(phase2);
    await testMemoize(phase5);
  }
  runAsyncPhases();
})();
//# sourceMappingURL=main.js.map
