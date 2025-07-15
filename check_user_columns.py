import sqlite3

# Path to your SQLite database
db_path = "src/instance/steamusers.db"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get the schema for the user table
cursor.execute("PRAGMA table_info(user);")
columns = cursor.fetchall()

print("Columns in 'user' table:")
for col in columns:
    # col[1] is the column name, col[2] is the type
    print(f" - {col[1]} ({col[2]})")

conn.close()