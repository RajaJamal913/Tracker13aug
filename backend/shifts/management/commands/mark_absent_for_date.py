### File: shifts/management/commands/mark_absent_for_date.py

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import datetime
from shifts.utils import mark_absent_for_date

class Command(BaseCommand):
    help = "Mark ABSENT for all shifts on a given date (YYYY-MM-DD). If no date given, uses yesterday in server timezone."

    def add_arguments(self, parser):
        parser.add_argument('--date', type=str, help='Target date in YYYY-MM-DD format (optional)')

    def handle(self, *args, **options):
        date_str = options.get('date')
        if date_str:
            try:
                target_date = datetime.fromisoformat(date_str).date()
            except Exception:
                raise CommandError('Invalid date format. Use YYYY-MM-DD')
        else:
            # default to yesterday (server local date)
            target_date = (timezone.localdate() - timezone.timedelta(days=1))

        created = mark_absent_for_date(target_date)
        self.stdout.write(self.style.SUCCESS(f"Marked {len(created)} attendances as ABSENT for {target_date}"))
