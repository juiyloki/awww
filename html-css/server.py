# server.py

import socket
import threading
import os
# unquote_plus decodes browser form encoding back to normal text
from urllib.parse import unquote_plus

# MIME types: map file extensions to Content-Type header value
# The Content-Type header identifies type of bytes

MIME_TYPES = {
    ".html": "text/html",
    ".css":  "text/css",
    ".js":   "application/javascript",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".ico":  "image/x-icon",
}

# Global visitor counter
VISITOR_COUNT = 0

# Lock to prevent a race condition
counter_lock = threading.Lock()


def read_file(path):
    """
    Read a file from public/ safely.
    Returns a tuple: (file_bytes, http_status_string, mime_type_string)
    """
    # Resolve the absolute path of the allowed root folder
    public_root = os.path.abspath("public")

    # Build the full path of what the browser is asking for (resolving any "..")
    abs_path = os.path.abspath(os.path.join("public", path.lstrip("/")))

    # Block any paths not starting with public/
    if not abs_path.startswith(public_root + os.sep):
        return b"<h1>403 Forbidden</h1>", "403 Forbidden", "text/html"

    # Look up the MIME type and fall back to raw binary stream if extension is unknown
    ext  = os.path.splitext(abs_path)[1].lower()
    mime = MIME_TYPES.get(ext, "application/octet-stream")

    try:
        with open(abs_path, "rb") as f:   # "rb" = read binary for every file typr
            return f.read(), "200 OK", mime
    except FileNotFoundError:
        return b"<h1>404 Not Found</h1>", "404 Not Found", "text/html"


def parse_request(request_data):
    """Return the URL path from a raw HTTP request string."""
    if not request_data:
        return ""

    # The request line is the first line; split the whole request by newline
    lines = request_data.split('\n')
    first_line = lines[0]

    # Split "GET /path HTTP/1.1" by spaces and find the path
    parts = first_line.split(' ')
    if len(parts) < 2:
        return ""  # invalid request
    path = parts[1]

    return path


def parse_post_body(request_data):
    """Parse a URL-encoded POST body into a dict of {field_name: value}."""
    # Headers and body are separated by a blank line (\r\n\r\n)
    # split(..., 1) means split at most once — the body itself may contain \r\n\r\n
    parts = request_data.split("\r\n\r\n", 1)
    if len(parts) < 2:
        return {}

    body = parts[1]
    result = {}

    for pair in body.split("&"):      # split into individual "key=value" strings
        if "=" in pair:
            key, value = pair.split("=", 1)        # maxsplit=1: value might contain '='
            result[unquote_plus(key)] = unquote_plus(value)

    return result


def generate_response(content, status="200 OK", mime="text/html"):
    """Build a complete HTTP response and return it as bytes."""
    # Ensure content is bytes
    if isinstance(content, str):
        content = content.encode("utf-8")

    response_line    = f"HTTP/1.1 {status}\r\n"
    response_headers = (
        f"Content-Type: {mime}\r\n"
        # no-store: force browser to always fetch fresh CSS/HTML
        # must-revalidate: if anything is cached, check with server before using it
        f"Cache-Control: no-store, must-revalidate\r\n"
        f"Content-Length: {len(content)}\r\n"
        f"\r\n"   # blank line = end of headers, start of body
    )
    return response_line.encode() + response_headers.encode() + content


def handle_client(client_connection, client_address):
    """Read one HTTP request from client_connection and write back a response."""
    
    request_data = client_connection.recv(4096).decode("utf-8", errors="replace")
    print(f"--- Request from {client_address} ---\n{request_data}\n{'─'*40}")

    path = parse_request(request_data)
    print(f"Path requested: '{path}'")

    # Contact form submission
    if path == "/submit":
        # Parse the POST body to get the form fields
        fields  = parse_post_body(request_data)
        name    = fields.get("name", "stranger")
        email   = fields.get("email", "")
        subject = fields.get("subject", "")
        message = fields.get("message", "")

        # Build a confirmation page using the submitted data
        html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Submitted!</title><link rel="stylesheet" href="/style.css"></head>
<body>
    <h1>Thanks, {name}!</h1>
    <p>We received your message and will reply to <strong>{email}</strong> soon.</p>
    <p><strong>Subject:</strong> {subject}</p>
    <p><strong>Message:</strong> {message}</p>
    <p><a href="index.html">← Back to Home</a></p>
</body>
</html>"""
        response = generate_response(html)

    # Other: serve a static file
    else:
        # "/" on its own has no filename, so map it to the default page
        file_path = "/index.html" if path == "/" else path
        content, status, mime = read_file(file_path)
        response = generate_response(content, status, mime)

    client_connection.sendall(response)
    client_connection.close()


def start_server():
    """Create the TCP socket, bind to port 8000, and accept connections forever."""
    # AF_INET = IPv4,  SOCK_STREAM = TCP
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    # SO_REUSEADDR: restarts the server immediately after Ctrl+C without blocking the port
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    server_socket.bind(("localhost", 8000))
    server_socket.listen(5)

    print("Server running on http://localhost:8000 ...")
    print("Press Ctrl+C to stop.\n")

    while True:
        # Blocks until someone connects, then hands them off to a thread
        client_connection, client_address = server_socket.accept()
        print(f"Connection received from {client_address}!")

        # Spawn a new thread per client, so multiple visitors load simultaneously
        thread = threading.Thread(
            target=handle_client,
            args=(client_connection, client_address),
            daemon=True,   # kills thread when the main program exits
        )
        thread.start()


if __name__ == "__main__":
    start_server()
