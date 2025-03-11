from django.contrib import admin
from .models import Challenge, Category, Submission, Discussion, Achievement, UserAchievement, UserProgress

@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'difficulty', 'created_by', 'created_at')
    list_filter = ('category', 'difficulty', 'created_at')
    search_fields = ('title', 'content')
    date_hierarchy = 'created_at'

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name', 'description')

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('user', 'challenge', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'challenge__title')
    date_hierarchy = 'created_at'

@admin.register(Discussion)
class DiscussionAdmin(admin.ModelAdmin):
    list_display = ('user', 'challenge', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'challenge__title', 'content')
    date_hierarchy = 'created_at'

@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'points_required', 'challenges_required')
    search_fields = ('name', 'description')

@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ('user', 'achievement', 'earned_at')
    list_filter = ('earned_at',)
    search_fields = ('user__username', 'achievement__name')
    date_hierarchy = 'earned_at'

@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'challenge', 'status')
    list_filter = ('status',)
    search_fields = ('user__username', 'challenge__title')
