from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'challenges', views.ChallengeViewSet)
router.register(r'categories', views.CategoryViewSet)
router.register(r'submissions', views.SubmissionViewSet, basename='submission')
router.register(r'discussions', views.DiscussionViewSet, basename='discussion')
router.register(r'achievements', views.AchievementViewSet)
router.register(r'user-achievements', views.UserAchievementViewSet, basename='user-achievement')
router.register(r'progress', views.UserProgressViewSet, basename='progress')
router.register(r'stats', views.UserStatsViewSet, basename='user-stats')

urlpatterns = [
    path('', include(router.urls)),
]
