interface Category {
    id:   number;
    name: string;
    slug: string;
}

interface Post {
    id:       number;
    title:    string;
    slug:     string;
    body:     string;
    pubDate:  string;
    category: Category | null;
}

interface Comment {
    id:      number;
    author:  string;
    body:    string;
    created: string;
}

function summarise(post: Post): string {
    const categoryName = post.category?.name ?? "Uncategorised";
    return `${post.title} (${categoryName}) — ${post.body.slice(0, 50)}...`;
}

function filterByCategory(posts: Post[], categoryName: string): Post[] {
    const target = categoryName.toLowerCase();
    return posts.filter((p) => p.category?.name.toLowerCase() === target);
}

function sortPosts(posts: Post[], by: "title" | "date" | "category"): Post[] {
    const sorted = [...posts];
    switch (by) {
        case "title":
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case "date":
            return sorted.sort((a, b) => b.pubDate.localeCompare(a.pubDate));
        case "category":
            return sorted.sort((a, b) => {
                if (a.category === null && b.category === null) return 0;
                if (a.category === null) return 1;
                if (b.category === null) return -1;
                return a.category.name.localeCompare(b.category.name);
            });
    }
}

type ValidationResult = { ok: true; post: Post } | { ok: false; reason: string };

function validatePost(data: unknown): ValidationResult {
    if (typeof data !== "object" || data === null) {
        return { ok: false, reason: "data is not an object" };
    }
    const obj = data as Record<string, unknown>;
    if (typeof obj.id !== "number")      return { ok: false, reason: "id must be a number" };
    if (typeof obj.title !== "string")   return { ok: false, reason: "title must be a string" };
    if (typeof obj.slug !== "string")    return { ok: false, reason: "slug must be a string" };
    if (typeof obj.body !== "string")    return { ok: false, reason: "body must be a string" };
    if (typeof obj.pubDate !== "string") return { ok: false, reason: "pubDate must be a string" };

    let category: Category | null;
    if (obj.category === null) {
        category = null;
    } else if (typeof obj.category === "object") {
        const cat = obj.category as Record<string, unknown>;
        if (typeof cat.id !== "number")   return { ok: false, reason: "category.id must be a number" };
        if (typeof cat.name !== "string") return { ok: false, reason: "category.name must be a string" };
        if (typeof cat.slug !== "string") return { ok: false, reason: "category.slug must be a string" };
        category = { id: cat.id, name: cat.name, slug: cat.slug };
    } else {
        return { ok: false, reason: "category must be null or an object" };
    }

    return {
        ok: true,
        post: {
            id:       obj.id,
            title:    obj.title,
            slug:     obj.slug,
            body:     obj.body,
            pubDate:  obj.pubDate,
            category,
        },
    };
}

export { Post, Comment, Category, summarise, filterByCategory, sortPosts, validatePost };
