from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
import uuid
from django.utils import timezone

class User(AbstractUser):
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    total_points = models.IntegerField(default=0)
    github_username = models.CharField(max_length=100, blank=True)
    linkedin_username = models.CharField(max_length=100, blank=True)
    website = models.URLField(max_length=200, blank=True)
    display_name = models.CharField(max_length=100, blank=True)
    preferred_language = models.CharField(max_length=50, default='python')
    
    # Fix group and permission clashes
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_set',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_set',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )
    
    class Meta:
        ordering = ['-total_points']
    
    def update_total_points(self):
        from challenges.models import UserProgress
        total = UserProgress.objects.filter(
            user=self,
            status='completed'
        ).aggregate(
            total=models.Sum('best_score')
        )['total'] or 0
        
        self.total_points = total
        self.save(update_fields=['total_points'])

class RefreshToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        return self.expires_at > timezone.now()
