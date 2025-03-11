from rest_framework import serializers
from django.contrib.auth import get_user_model
from challenges.models import UserProgress, UserAchievement
from challenges.serializers import UserProgressSerializer, UserAchievementSerializer

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'bio', 'avatar', 'total_points', 'github_username',
            'linkedin_username', 'website', 'display_name',
            'preferred_language', 'date_joined'
        ]
        read_only_fields = ['total_points', 'date_joined']

class UserDetailSerializer(UserSerializer):
    progress = UserProgressSerializer(many=True, read_only=True, source='userprogress_set')
    achievements = UserAchievementSerializer(many=True, read_only=True, source='userachievement_set')
    
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ['progress', 'achievements']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name']
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
