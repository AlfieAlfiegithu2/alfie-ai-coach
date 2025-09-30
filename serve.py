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

        # Check if it's a request for a file that exists
        if os.path.exists(os.path.join('dist', path.lstrip('/'))) and os.path.isfile(os.path.join('dist', path.lstrip('/'))):
            # Serve the actual file
            return super().do_GET()

        # For all other routes (including /hero), serve index.html
        # This allows React Router to handle client-side routing
        self.path = '/index.html'
        return super().do_GET()

if __name__ == "__main__":
    os.chdir('.')
    PORT = 8080

    with socketserver.TCPServer(("", PORT), SPAHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        print("SPA mode: All routes will serve index.html for React Router")
        print("OAuth callbacks will be handled correctly")
        print("Static assets will be served directly from dist/")
        httpd.serve_forever()
