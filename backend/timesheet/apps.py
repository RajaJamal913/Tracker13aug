# timesheet/apps.py

from django.apps import AppConfig

class TimesheetConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'timesheet'

    def ready(self):
        # import your signals module so that they get registered
        import timesheet.signals  # adjust if you put signals in a different path


    
