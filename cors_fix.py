# Replace CORS section in app.py
import fileinput
import sys

with open('src/app.py', 'r') as f:
    content = f.read()

# Find and replace the CORS section
old_cors = """CORS(app, 
         origins=['*'],  # Allow all origins for Flask-Admin
         supports_credentials=True,
         allow_headers=['*'],  # Allow all headers
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         expose_headers=['*'])"""

new_cors = """CORS(app, 
         origins=[
             'https://bookish-funicular-9754qgjjg9743pqr7-3000.app.github.dev',
             'https://bookish-funicular-9754qgjjg9743pqr7-3001.app.github.dev',
             'http://localhost:3000'
         ],
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])"""

content = content.replace(old_cors, new_cors)

with open('src/app.py', 'w') as f:
    f.write(content)

print("✅ CORS configuration updated")
