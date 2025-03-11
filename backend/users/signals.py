from django.db.models.signals import post_save
from django.dispatch import receiver
from challenges.models import UserProgress, Achievement, UserAchievement
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(post_save, sender=UserProgress)
def update_user_points(sender, instance, created, **kwargs):
    if instance.status == 'completed':
        instance.user.update_total_points()
        
        # Check for new achievements
        achievements = Achievement.objects.filter(
            points_required__lte=instance.user.total_points
        ).exclude(
            userachievement__user=instance.user
        )
        
        for achievement in achievements:
            UserAchievement.objects.create(
                user=instance.user,
                achievement=achievement
            )
