from http.server import SimpleHTTPRequestHandler, HTTPServer
import os

class NoCacheHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

if __name__ == '__main__':
    #os.chdir('www')  # Your web root directory
    port = 8088
    server = HTTPServer(('localhost', port), NoCacheHTTPRequestHandler)
    print(f"Serving at http://localhost:{port}")
    server.serve_forever()
