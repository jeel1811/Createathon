# Generated by Django 4.2.19 on 2025-02-18 19:38

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("challenges", "0002_initial"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="category",
            options={"verbose_name_plural": "Categories"},
        ),
        migrations.AlterModelOptions(
            name="submission",
            options={"ordering": ["-created_at"]},
        ),
        migrations.RemoveField(
            model_name="submission",
            name="score",
        ),
        migrations.RemoveField(
            model_name="submission",
            name="submitted_at",
        ),
        migrations.RemoveField(
            model_name="userprogress",
            name="attempts",
        ),
        migrations.RemoveField(
            model_name="userprogress",
            name="best_score",
        ),
        migrations.RemoveField(
            model_name="userprogress",
            name="status",
        ),
        migrations.AddField(
            model_name="achievement",
            name="challenges_required",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="achievement",
            name="created_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name="category",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="challenge",
            name="created_by",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="created_challenges",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="challenge",
            name="template",
            field=models.TextField(
                blank=True, help_text="Initial code template for the challenge"
            ),
        ),
        migrations.AddField(
            model_name="challenge",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="submission",
            name="created_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name="userprogress",
            name="current_score",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="userprogress",
            name="started_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AlterField(
            model_name="achievement",
            name="icon",
            field=models.URLField(
                default="https://example.com/default-achievement-icon.png"
            ),
        ),
        migrations.AlterField(
            model_name="achievement",
            name="points_required",
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="category",
            name="created_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AlterField(
            model_name="category",
            name="description",
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="challenge",
            name="category",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="challenges",
                to="challenges.category",
            ),
        ),
        migrations.AlterField(
            model_name="challenge",
            name="created_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AlterField(
            model_name="challenge",
            name="difficulty",
            field=models.CharField(
                choices=[("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")],
                default="easy",
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="challenge",
            name="points",
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="submission",
            name="challenge",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="submissions",
                to="challenges.challenge",
            ),
        ),
        migrations.AlterField(
            model_name="submission",
            name="execution_time",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="submission",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("running", "Running"),
                    ("passed", "Passed"),
                    ("failed", "Failed"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="submission",
            name="user",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="submissions",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="userachievement",
            name="earned_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AlterField(
            model_name="userachievement",
            name="user",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="achievements",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="userprogress",
            name="completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="userprogress",
            name="user",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="progress",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name="Discussion",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("content", models.TextField()),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "challenge",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="discussions",
                        to="challenges.challenge",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="discussions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
