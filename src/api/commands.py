# src/api/commands.py - FIXED VERSION

import click
from api.models import db, User

"""
In this file, you can add as many commands as you want using the @app.cli.command decorator
Flask commands are useful to run cronjobs or tasks outside of the API but still in integration 
with your database, for example: Import the price of bitcoin every night at 12am
"""

def setup_commands(app):
    
    """ 
    This is an example command "insert-test-users" that you can run from the command line
    by typing: $ flask insert-test-users 5
    Note: 5 is the number of users to add
    """
    @app.cli.command("insert-test-users") # name of our command
    @click.argument("count") # argument of our command
    def insert_test_users(count):
        print("Creating test users")
        for x in range(1, int(count) + 1):
            # Check if user already exists
            email = f"test_user{x}@test.com"
            username = f"test_user{x}"
            
            existing_user = User.query.filter(
                (User.email == email) | (User.username == username)
            ).first()
            
            if existing_user:
                print(f"User {email} already exists, skipping...")
                continue
            
            # Create user properly
            user = User(
                email=email,
                username=username,
                is_active=True
            )
            
            # 🔧 FIXED: Use the proper password hashing method
            user.set_password("123456")
            
            db.session.add(user)
            
            try:
                db.session.commit()
                print(f"User: {user.email} created successfully.")
            except Exception as e:
                db.session.rollback()
                print(f"Error creating user {email}: {str(e)}")

        print("Test user creation completed")

    @app.cli.command("insert-test-data")
    def insert_test_data():
        """Command to insert test gaming data"""
        print("This command can be used to insert test gaming groups, games, etc.")
        # You can add test data creation here
        pass
    
    @app.cli.command("cleanup-test-users")
    def cleanup_test_users():
        """Command to remove test users"""
        try:
            test_users = User.query.filter(User.email.like('test_user%@test.com')).all()
            count = len(test_users)
            
            for user in test_users:
                # Clear associations first
                user.groups.clear()
                user.owned_games.clear()
                
                # Handle created groups
                created_groups = user.created_groups
                for group in created_groups:
                    other_members = [m for m in group.members if m.id != user.id]
                    if other_members:
                        group.creator_id = other_members[0].id
                    else:
                        db.session.delete(group)
                
                db.session.delete(user)
            
            db.session.commit()
            print(f"Deleted {count} test users successfully")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error cleaning up test users: {str(e)}")

    @app.cli.command("create-admin-user")
    @click.argument("username")
    @click.argument("email") 
    @click.argument("password")
    def create_admin_user(username, email, password):
        """Create an admin user for testing"""
        try:
            existing = User.query.filter(
                (User.email == email) | (User.username == username)
            ).first()
            
            if existing:
                print(f"User with email {email} or username {username} already exists!")
                return
            
            user = User(
                email=email,
                username=username,
                is_active=True,
                bio="Admin user created via CLI"
            )
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            print(f"Admin user '{username}' created successfully!")
            print(f"Email: {email}")
            print("You can now login with these credentials.")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error creating admin user: {str(e)}")