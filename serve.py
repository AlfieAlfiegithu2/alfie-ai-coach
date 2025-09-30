#!/usr/bin/env python3
import http.server
import socketserver
import os
import urllib.parse

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='dist', **kwargs)

    def do_GET(self):
        # Parse the URL
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        # Handle OAuth callback URLs (common patterns)
        if (path.startswith('/auth/callback') or
            path.startswith('/api/auth/callback') or
            'access_token' in parsed_path.query or
            'error' in parsed_path.query):
            # Serve index.html for OAuth callbacks - React Router will handle the auth state
            self.path = '/index.html'
            return super().do_GET()

        # Check if it's a request for a static file that exists
        # Handle common static file extensions
        static_extensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.ogg', '.json']
        if any(path.endswith(ext) for ext in static_extensions):
            file_path = path.lstrip('/')
            if os.path.exists(os.path.join('dist', file_path)) and os.path.isfile(os.path.join('dist', file_path)):
                # Serve the actual file
                return super().do_GET()

        # For all other routes (including /hero, /hero/, /auth, etc.), serve index.html
        # This allows React Router to handle client-side routing
        self.path = '/index.html'
        return super().do_GET()

if __name__ == "__main__":
    os.chdir('.')
    PORT = 8080

    # Bind to both IPv4 and IPv6
    try:
        with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
            print(f"Serving at http://localhost:{PORT}")
            print("SPA mode: All routes will serve index.html for React Router")
            print("OAuth callbacks will be handled correctly")
            print("Static assets will be served directly from dist/")
            httpd.serve_forever()
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"Port {PORT} is already in use. Trying IPv4 only...")
            with socketserver.TCPServer(("0.0.0.0", PORT), SPAHandler) as httpd:
                print(f"Serving at http://localhost:{PORT}")
                print("SPA mode: All routes will serve index.html for React Router")
                print("OAuth callbacks will be handled correctly")
                print("Static assets will be served directly from dist/")
                httpd.serve_forever()
        else:
            raise
