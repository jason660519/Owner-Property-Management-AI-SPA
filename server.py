import http.server
import socketserver
import os
import sys
import mimetypes

PORT = 3001

# Ensure correct MIME types and encoding
mimetypes.add_type('text/markdown; charset=utf-8', '.md')
mimetypes.add_type('text/html; charset=utf-8', '.html')
mimetypes.add_type('application/javascript; charset=utf-8', '.js')
mimetypes.add_type('text/css; charset=utf-8', '.css')
mimetypes.add_type('application/json; charset=utf-8', '.json')

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for development flexibility
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def list_directory(self, path):
        """Disable directory listing"""
        self.send_error(403, "Directory listing is disabled")
        return None

    def do_GET(self):
        # Security: Prevent access to sensitive files and directories
        if any(x in self.path for x in ['.env', '.git', 'node_modules', 'credentials']):
            self.send_error(403, "Access Denied: Sensitive content")
            return

        # Parse path to handle query parameters
        from urllib.parse import urlparse
        parsed_path = urlparse(self.path)
        path_only = parsed_path.path

        # Redirect root to the legacy dashboard
        if path_only == '/' or path_only == '/index.html':
            self.send_response(302)
            self.send_header('Location', '/project-process/legacy-dashboard/index.html')
            self.end_headers()
            return
            
        # Serve roadmap.js at root (requested by index.html)
        elif path_only == '/roadmap.js':
            self.path = '/project-process/roadmap.js'
        # Serve styles.css at root
        elif path_only == '/styles.css':
            self.path = '/project-process/styles.css'
            
        return super().do_GET()

    def do_HEAD(self):
        # Security: Prevent access to sensitive files and directories
        if any(x in self.path for x in ['.env', '.git', 'node_modules', 'credentials']):
            self.send_error(403, "Access Denied: Sensitive content")
            return

        # Parse path to handle query parameters
        from urllib.parse import urlparse
        parsed_path = urlparse(self.path)
        path_only = parsed_path.path

        # Redirect root to the legacy dashboard
        if path_only == '/' or path_only == '/index.html':
            self.send_response(302)
            self.send_header('Location', '/project-process/legacy-dashboard/index.html')
            self.end_headers()
            return
            
        # Serve roadmap.js at root (requested by index.html)
        elif path_only == '/roadmap.js':
            self.path = '/project-process/roadmap.js'
        # Serve styles.css at root
        elif path_only == '/styles.css':
            self.path = '/project-process/styles.css'
            
        return super().do_HEAD()

    def do_POST(self):
        """Handle file saving"""
        try:
            length = int(self.headers['Content-Length'])
            content = self.rfile.read(length)
            
            # Simple routing for file saving
            # Expected URL: /api/save?path=path/to/file
            if self.path.startswith('/api/save'):
                from urllib.parse import urlparse, parse_qs
                query = parse_qs(urlparse(self.path).query)
                file_path = query.get('path', [None])[0]
                
                if not file_path:
                    self.send_error(400, "Missing 'path' parameter")
                    return
                
                # Security check: prevent directory traversal
                if '..' in file_path or file_path.startswith('/'):
                    self.send_error(403, "Invalid path")
                    return
                
                # Normalize path relative to current directory
                full_path = os.path.join(os.getcwd(), file_path)
                
                # Ensure directory exists
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                
                # Write content
                with open(full_path, 'wb') as f:
                    f.write(content)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status": "success"}')
                print(f"Saved file: {full_path}")
            else:
                self.send_error(404, "Endpoint not found")
                
        except Exception as e:
            print(f"Error handling POST: {e}")
            self.send_error(500, str(e))

if __name__ == "__main__":
    print(f"Starting server at http://localhost:{PORT}")
    print(f"Serving files from {os.getcwd()}")
    print("UTF-8 encoding enabled for .md, .html, .js, .css, .json")

    # Allow address reuse to prevent "Address already in use" errors
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)
