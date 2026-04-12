type Result<T> =
    | { ok: true;  data: T }
    | { ok: false; error: string; status?: number };

interface Post {
    id:       number;
    title:    string;
    slug:     string;
    body:     string;
    pub_date: string;
    category: string | null;
}

interface Comment {
    id:      number;
    author:  string;
    body:    string;
    created: string;
}

type CreateCommentPayload = Pick<Comment, "author" | "body">;
type UpdatePostPayload    = Partial<Pick<Post, "title" | "body" | "slug">>;

function getCsrfToken(): string {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
}

async function apiFetch<T>(method: string, path: string, body?: unknown): Promise<Result<T>> {
    try {
        const options: RequestInit = {
            method,
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken":  getCsrfToken(),
            },
        };
        if (body !== undefined) {
            options.body = JSON.stringify(body);
        }

        const res = await fetch(path, options);

        if (!res.ok) {
            let message = `HTTP ${res.status}`;
            try {
                const err = await res.json();
                message = err.error ?? message;
            } catch { /* response body not JSON */ }
            return { ok: false, error: message, status: res.status };
        }

        if (res.status === 204) {
            return { ok: true, data: {} as T };
        }

        const data: T = await res.json();
        return { ok: true, data };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}

class BlogApiClient {
    async getPosts(search?: string): Promise<Result<{ posts: Post[] }>> {
        const qs = search ? `?search=${encodeURIComponent(search)}` : "";
        return apiFetch("GET", `/api/posts/${qs}`);
    }

    async getPost(id: number): Promise<Result<Post>> {
        return apiFetch("GET", `/api/posts/${id}/`);
    }

    async getComments(postId: number): Promise<Result<{ comments: Comment[] }>> {
        return apiFetch("GET", `/api/posts/${postId}/comments/`);
    }

    async createComment(postId: number, payload: CreateCommentPayload): Promise<Result<Comment>> {
        return apiFetch("POST", `/api/posts/${postId}/comments/`, payload);
    }

    async updatePost(id: number, payload: UpdatePostPayload): Promise<Result<Post>> {
        return apiFetch("PATCH", `/api/posts/${id}/`, payload);
    }

    async deleteComment(postId: number, commentId: number): Promise<Result<unknown>> {
        return apiFetch("DELETE", `/api/posts/${postId}/comments/${commentId}/`);
    }
}

const api = new BlogApiClient();

export { api, BlogApiClient, Post, Comment, Result, CreateCommentPayload, UpdatePostPayload };
