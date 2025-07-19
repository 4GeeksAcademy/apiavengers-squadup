# src/api/commands.py - FIXED VERSION

import click
from api.models import db, User

def setup_commands(app):
    @app.cli.command("insert-test-users")
    @click.argument("count")
    def insert_test_users(count):
        print("Creating test users")
        for x in range(1, int(count) + 1):
            email = f"test_user{x}@test.com"
            username = f"test_user{x}"
            
            if User.query.filter((User.email == email) | (User.username == username)).first():
                print(f"User {email} already exists, skipping...")
                continue
            
            user = User(email=email, username=username, is_active=True)
            
            # 🔧 FIXED: Use the proper password hashing method from the User model
            user.set_password("TestPassword123")
            
            db.session.add(user)
            db.session.commit()
            print(f"User: {user.email} created successfully.")