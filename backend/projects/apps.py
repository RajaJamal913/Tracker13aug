from django.apps import AppConfig


class ProjectsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'projects'


from django.apps import AppConfig

class ProjectsConfig(AppConfig):
    name = "projects"

    def ready(self):
        import projects.signals  # noqa
# projects/apps.py
from django.apps import AppConfig

class ProjectsConfig(AppConfig):
    name = "projects"

    def ready(self):
        # import signals so they register
        from . import signals  # noqa
