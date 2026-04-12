import { Post } from "./blog";

enum PostStatus {
    Draft     = "draft",
    Published = "published",
    Archived  = "archived",
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiRequest {
    method: HttpMethod;
    path:   string;
    body?:  unknown;
}

function isPost(value: unknown): value is Post {
    return (
        typeof value === "object" &&
        value !== null &&
        "title" in value &&
        "slug"  in value
    );
}

function describeRequest(req: ApiRequest): string {
    const base = `${req.method} ${req.path}`;
    return req.body !== undefined ? `${base} (has body)` : base;
}

export { PostStatus, HttpMethod, ApiRequest, isPost, describeRequest };
