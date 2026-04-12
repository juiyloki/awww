function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function countdown(element: HTMLElement): Promise<void> {
    for (let i = 5; i >= 0; i--) {
        element.textContent = `${i}…`;
        await delay(1000);
    }
    element.textContent = "Go!";
}

interface Todo {
    userId:    number;
    id:        number;
    title:     string;
    completed: boolean;
}

async function fetchTodo(id: number): Promise<Todo> {
    const res = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    const data: Todo = await res.json();
    return data;
}

async function fetchWithTimeout<T>(url: string, ms: number): Promise<T> {
    const timeout = delay(ms).then((): never => {
        throw new Error(`Timed out after ${ms}ms`);
    });
    const request = fetch(url).then(async (res): Promise<T> => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as T;
    });
    return Promise.race([request, timeout]);
}

export { delay, countdown, fetchTodo, fetchWithTimeout, Todo };
