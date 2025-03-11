from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Submission, UserProgress

@receiver(post_save, sender=Submission)
def update_user_progress(sender, instance, created, **kwargs):
    if instance.status == 'completed':
        progress, _ = UserProgress.objects.get_or_create(
            user=instance.user,
            challenge=instance.challenge
        )
        
        progress.status = 'completed'
        progress.attempts += 1
        progress.best_score = max(progress.best_score, instance.score)
        progress.save()
