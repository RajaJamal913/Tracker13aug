# projects/apps.py
from django.apps import AppConfig

class ProjectsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "projects"

    def ready(self):
        # import signals so they register on app startup
        try:
            import projects.signals  # noqa: F401
        except Exception:
            # avoid crashing if signals fail to import (inspect logs)
            pass
