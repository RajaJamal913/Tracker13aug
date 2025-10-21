# task_api/migrations/0002_add_hours.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ("task_api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="taskai",
            name="hours",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
