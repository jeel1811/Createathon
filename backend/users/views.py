from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from rest_framework.authtoken.models import Token
from .serializers import UserSerializer, UserDetailSerializer, UserRegistrationSerializer
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.db import models
from rest_framework.authentication import TokenAuthentication
from .models import RefreshToken

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]  # Default to authenticated for all actions
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserDetailSerializer
        if self.action == 'create':
            return UserRegistrationSerializer
        return UserSerializer
    
    def get_permissions(self):
        # Only allow unauthenticated access to login and register
        if self.action in ['login', 'register']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get', 'put', 'patch'],
            permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        user = request.user
        
        if request.method == 'GET':
            # Get user stats
            user_data = UserDetailSerializer(user).data
            
            # Add challenge stats
            user_data.update({
                'completed_challenges': user.progress.filter(status='completed').count(),
                'in_progress': user.progress.filter(status='in_progress').count(),
                'calculated_points': user.progress.filter(status='completed').aggregate(
                    points=Sum('challenge__points')
                )['points'] or 0,
                'category_progress': []
            })
            
            # Add category progress
            from challenges.models import Category
            categories = Category.objects.all()
            for category in categories:
                total_challenges = category.challenges.count()
                completed_challenges = user.progress.filter(
                    challenge__category=category,
                    status='completed'
                ).count()
                
                user_data['category_progress'].append({
                    'name': category.name,
                    'completed': completed_challenges,
                    'total': total_challenges
                })
            
            return Response(user_data)
        
        # Handle PUT/PATCH requests
        serializer = UserDetailSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def achievements(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, 
                          status=status.HTTP_401_UNAUTHORIZED)
        user = request.user
        achievements = []
        
        # Get completed challenges count
        completed_count = user.progress.filter(status='completed').count()
        
        # Basic achievements based on completed challenges
        if completed_count >= 1:
            achievements.append({
                'id': 'first_challenge',
                'name': 'First Steps',
                'description': 'Completed your first challenge',
                'icon': 'trophy',
                'earned_at': user.progress.filter(status='completed').order_by('completed_at').first().completed_at
            })
        
        if completed_count >= 5:
            achievements.append({
                'id': 'five_challenges',
                'name': 'Getting Started',
                'description': 'Completed 5 challenges',
                'icon': 'star',
                'earned_at': user.progress.filter(status='completed').order_by('completed_at')[4].completed_at
            })
        
        if completed_count >= 10:
            achievements.append({
                'id': 'ten_challenges',
                'name': 'Rising Star',
                'description': 'Completed 10 challenges',
                'icon': 'fire',
                'earned_at': user.progress.filter(status='completed').order_by('completed_at')[9].completed_at
            })
        
        # Points based achievements
        total_points = user.progress.filter(status='completed').aggregate(
            points=Sum('challenge__points')
        )['points'] or 0
        
        if total_points >= 100:
            achievements.append({
                'id': 'points_100',
                'name': 'Point Collector',
                'description': 'Earned 100 points',
                'icon': 'lightning',
                'earned_at': timezone.now()
            })
        
        if total_points >= 500:
            achievements.append({
                'id': 'points_500',
                'name': 'Point Master',
                'description': 'Earned 500 points',
                'icon': 'crown',
                'earned_at': timezone.now()
            })
        
        return Response(achievements)
    
    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, 
                          status=status.HTTP_401_UNAUTHORIZED)
        timeframe = request.query_params.get('timeframe', 'all')
        
        # Base query with annotations
        queryset = User.objects.annotate(
            completed_challenges=models.Count(
                'progress',
                filter=models.Q(progress__status='completed')
            ),
            calculated_points=models.Sum(
                'progress__challenge__points',
                filter=models.Q(progress__status='completed'),
                default=0
            )
        )

        # Apply timeframe filter if needed
        if timeframe == 'week':
            start_date = timezone.now() - timezone.timedelta(days=7)
            queryset = queryset.filter(progress__completed_at__gte=start_date)
        elif timeframe == 'month':
            start_date = timezone.now() - timezone.timedelta(days=30)
            queryset = queryset.filter(progress__completed_at__gte=start_date)

        # Order by points and get top users
        top_users = queryset.order_by('-calculated_points', '-completed_challenges')[:10]
        
        serializer = UserDetailSerializer(top_users, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Please provide both username and password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(username=username, password=password)

        if not user:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Create access token
        token, _ = Token.objects.get_or_create(user=user)
        
        # Create refresh token
        refresh_token = RefreshToken.objects.create(user=user)

        return Response({
            'token': token.key,
            'refresh_token': str(refresh_token.token),
            'user': UserSerializer(user).data
        })

    @action(detail=False, methods=['post'])
    def refresh(self, request):
        refresh_token = request.data.get('refresh_token')
        if not refresh_token:
            return Response({'error': 'Refresh token is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh_token_obj = RefreshToken.objects.get(token=refresh_token)
            
            # Check if refresh token is valid
            if not refresh_token_obj.is_valid:
                refresh_token_obj.delete()
                return Response({'error': 'Refresh token expired'}, 
                              status=status.HTTP_401_UNAUTHORIZED)

            # Create new access token
            token, _ = Token.objects.get_or_create(user=refresh_token_obj.user)

            return Response({
                'token': token.key,
                'user': UserSerializer(refresh_token_obj.user).data
            })
        except RefreshToken.DoesNotExist:
            return Response({'error': 'Invalid refresh token'}, 
                          status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
