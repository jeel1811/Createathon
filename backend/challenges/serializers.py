from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Challenge, Category, Submission, Discussion, UserProgress, Achievement, UserAchievement

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'avatar']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']

class ChallengeSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_name = serializers.CharField(write_only=True)
    submission_count = serializers.SerializerMethodField()
    user_status = serializers.SerializerMethodField()
    test_cases = serializers.JSONField(required=False)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Challenge
        fields = [
            'id', 'title', 'description', 'category', 'category_name', 'difficulty',
            'points', 'content', 'template', 'test_cases', 'time_limit',
            'submission_count', 'user_status', 'created_at', 'created_by'
        ]

    def get_submission_count(self, obj):
        return obj.submissions.count()

    def get_user_status(self, obj):
        user = self.context['request'].user
        if not user.is_authenticated:
            return None
        
        latest_submission = obj.submissions.filter(user=user).first()
        if not latest_submission:
            return 'not_started'
        return latest_submission.status

    def create(self, validated_data):
        category_name = validated_data.pop('category_name')
        category, _ = Category.objects.get_or_create(name=category_name)
        validated_data['category'] = category
        
        # Convert test_cases to JSON if it's a string
        if isinstance(validated_data.get('test_cases'), str):
            try:
                import json
                validated_data['test_cases'] = json.loads(validated_data['test_cases'])
            except json.JSONDecodeError:
                validated_data['test_cases'] = []
        elif validated_data.get('test_cases') is None:
            validated_data['test_cases'] = []
        
        return super().create(validated_data)

class SubmissionSerializer(serializers.ModelSerializer):
    challenge = ChallengeSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    test_results = serializers.JSONField(read_only=True)

    class Meta:
        model = Submission
        fields = [
            'id', 'challenge', 'user', 'code', 'language',
            'status', 'feedback', 'test_results', 'created_at'
        ]
        read_only_fields = ['status', 'feedback', 'test_results']

class DiscussionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    challenge = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Discussion
        fields = [
            'id', 'challenge', 'user', 'content',
            'created_at', 'updated_at'
        ]

class UserProgressSerializer(serializers.ModelSerializer):
    challenge_title = serializers.CharField(source='challenge.title', read_only=True)
    
    class Meta:
        model = UserProgress
        fields = [
            'id', 'user', 'challenge', 'challenge_title', 'status',
            'attempts', 'completed_at', 'best_score'
        ]
        read_only_fields = ['user']

class AchievementSerializer(serializers.ModelSerializer):
    earned = serializers.SerializerMethodField()
    earned_at = serializers.SerializerMethodField()

    class Meta:
        model = Achievement
        fields = [
            'id', 'name', 'description', 'icon',
            'points_required', 'challenges_required',
            'earned', 'earned_at'
        ]

    def get_earned(self, obj):
        user = self.context['request'].user
        if not user.is_authenticated:
            return False
        return UserAchievement.objects.filter(
            user=user,
            achievement=obj
        ).exists()

    def get_earned_at(self, obj):
        user = self.context['request'].user
        if not user.is_authenticated:
            return None
        
        user_achievement = UserAchievement.objects.filter(
            user=user,
            achievement=obj
        ).first()
        
        return user_achievement.earned_at if user_achievement else None

class UserAchievementSerializer(serializers.ModelSerializer):
    achievement_details = AchievementSerializer(source='achievement', read_only=True)
    
    class Meta:
        model = UserAchievement
        fields = ['id', 'user', 'achievement', 'achievement_details', 'earned_at']
        read_only_fields = ['user', 'earned_at']

class UserStatsSerializer(serializers.Serializer):
    total_points = serializers.IntegerField()
    completed_challenges = serializers.IntegerField()
    in_progress_challenges = serializers.IntegerField()
    category_progress = serializers.ListField(
        child=serializers.DictField()
    )
