# TRACKER/Project/Trackercode/backend/launcher_django.py

import os
import sys
import threading
import time

# 1) Set the DJANGO_SETTINGS_MODULE so that Django knows where to find your settings.
#    If your settings file is at TRACKER/Project/Trackercode/backend/settings.py,
#    then use "backend.settings". Adjust accordingly if your project name is different.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

# 2) Import Django but do NOT import call_command or get_wsgi_application yet.
import django


def run_django():
    """
    This function will:
      a) initialize Django (populate app registry),
      b) run migrations,
      c) start a simple WSGI server on 127.0.0.1:8000.
    """
    # 3) Initialize Django so that its app registry is ready
    django.setup()

    # 4) Now we can safely import management utilities:
    from django.core.management import call_command
    from django.core.wsgi import get_wsgi_application
    from wsgiref.simple_server import make_server

    # 5) Run any unapplied migrations (non-interactive)
    try:
        call_command("migrate", interactive=False)
    except Exception as exc:
        print(f"Error running migrations: {exc}", file=sys.stderr)
        sys.exit(1)

    # 6) Start serving via Django’s WSGI app on 127.0.0.1:8000
    application = get_wsgi_application()
    server = make_server("127.0.0.1", 8000, application)
    print(">>> Django development server is now running at http://127.0.0.1:8000/")
    server.serve_forever()


if __name__ == "__main__":
    # 7) Launch Django in a background (daemon) thread so that when the main thread exits,
    #    the server will stop as well.
    django_thread = threading.Thread(target=run_django, daemon=True)
    django_thread.start()

    # 8) Keep the main thread alive until someone presses Ctrl+C
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Received Ctrl+C, exiting launcher.")
        sys.exit(0)
