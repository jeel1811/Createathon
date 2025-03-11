from rest_framework import viewsets, permissions, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, Sum, Q
from .models import Challenge, Category, Submission, Discussion, Achievement, UserAchievement, UserProgress
from .serializers import (
    ChallengeSerializer, CategorySerializer, SubmissionSerializer,
    DiscussionSerializer, AchievementSerializer, UserAchievementSerializer,
    UserProgressSerializer, UserStatsSerializer
)
from django.utils import timezone
import requests
import json
import tempfile
import subprocess
import os

# Language IDs for Judge0
LANGUAGE_IDS = {
    'python': 71,    # Python (3.8.1)
    'javascript': 63,  # JavaScript (Node.js 12.14.0)
    'java': 62,       # Java (OpenJDK 13.0.1)
    'cpp': 54,        # C++ (GCC 9.2.0)
}


# Permission that only suoer users can create challenges
# class IsSuperUser(permissions.BasePermission):
#     def has_permission(self, request, view):
#         if request.method == 'POST':
#             return request.user.is_superuser
#         return True

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of a challenge to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the challenge
        return obj.created_by == request.user

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

class ChallengeViewSet(viewsets.ModelViewSet):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    # permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly, IsSuperUser]

    def get_permissions(self):
        if self.action in ['run', 'submit', 'discussions']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.query_params.get('category', None)
        difficulty = self.request.query_params.get('difficulty', None)

        if category:
            queryset = queryset.filter(category__name=category)
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def execute_code(self, code, language, input_data):
        """Execute code using subprocess with support for Python, JavaScript, Java, and C++"""
        try:
            # Create a temporary file with appropriate extension
            language_configs = {
                'python': {
                    'extension': '.py',
                    'run_command': ['python'],
                    'compile_required': False
                },
                'javascript': {
                    'extension': '.js',
                    'run_command': ['node'],
                    'compile_required': False
                },
                'java': {
                    'extension': '.java',
                    'run_command': ['java'],
                    'compile_command': ['javac'],
                    'compile_required': True,
                    'class_based': True
                },
                'cpp': {
                    'extension': '.cpp',
                    'run_command': None,  # Will be compiled
                    'compile_command': ['g++', '-o'],
                    'compile_required': True
                }
            }

            # Default to Python if language not recognized
            config = language_configs.get(language, language_configs['python'])
            
            # Create a temporary file
            with tempfile.NamedTemporaryFile(suffix=config['extension'], mode='w', delete=False) as f:
                f.write(code)
                temp_file = f.name

            try:
                # Compilation for Java and C++
                if config.get('compile_required', False):
                    if language == 'java':
                        # Java compilation
                        compile_process = subprocess.run(
                            config['compile_command'] + [temp_file],
                            capture_output=True,
                            text=True
                        )
                        
                        if compile_process.returncode != 0:
                            return {
                                "stdout": "",
                                "stderr": compile_process.stderr,
                                "error": "Compilation Error: " + compile_process.stderr,
                                "status": "Compilation Error"
                            }
                        
                        # For Java, use the class name (filename without extension)
                        run_command = config['run_command'] + [os.path.splitext(os.path.basename(temp_file))[0]]
                    
                    elif language == 'cpp':
                        # C++ compilation
                        compile_output = temp_file + '.out'
                        compile_process = subprocess.run(
                            config['compile_command'] + [compile_output, temp_file],
                            capture_output=True,
                            text=True
                        )
                        
                        if compile_process.returncode != 0:
                            return {
                                "stdout": "",
                                "stderr": compile_process.stderr,
                                "error": "Compilation Error: " + compile_process.stderr,
                                "status": "Compilation Error"
                            }
                        
                        run_command = [compile_output]
                else:
                    # For Python and JavaScript
                    run_command = config['run_command'] + [temp_file]

                # Run the code
                process = subprocess.run(
                    run_command,
                    input=input_data,
                    text=True,
                    capture_output=True,
                    timeout=5  # 5 second timeout
                )
                
                # Check for runtime errors
                if process.returncode != 0:
                    return {
                        "stdout": process.stdout,
                        "stderr": process.stderr or f"Error: Program exited with code {process.returncode}",
                        "error": process.stderr or f"Error: Program exited with code {process.returncode}",
                        "status": "Error"
                    }
                
                return {
                    "stdout": process.stdout,
                    "stderr": process.stderr,
                    "error": None,
                    "status": "Success"
                }
                
            finally:
                # Clean up temporary files
                os.unlink(temp_file)
                if language == 'cpp':
                    compiled_file = temp_file + '.out'
                    if os.path.exists(compiled_file):
                        os.unlink(compiled_file)
                elif language == 'java':
                    # Remove compiled .class file
                    class_file = os.path.splitext(temp_file)[0] + '.class'
                    if os.path.exists(class_file):
                        os.unlink(class_file)
        
        except subprocess.TimeoutExpired:
            return {
                "stdout": "",
                "stderr": "Execution timed out after 5 seconds",
                "error": "Execution timed out after 5 seconds",
                "status": "Timeout"
            }
        except Exception as e:
            error_msg = str(e)
            return {
                "stdout": "",
                "stderr": error_msg,
                "error": error_msg,
                "status": "Error"
            }

    def process_test_cases(self, challenge, code, language):
        """Process all test cases for a challenge"""
        test_results = []
        all_passed = True
        
        for i, test_case in enumerate(challenge.test_cases):
            try:
                # Safely handle None values for input and output
                input_data = str(test_case.get('input', ''))
                expected_output = str(test_case.get('output', ''))
                
                # Only strip if the values are not empty
                input_data = input_data.strip() if input_data else ''
                expected_output = expected_output.strip() if expected_output else ''
                
                # Execute code
                result = self.execute_code(code, language, input_data)
                actual_output = (result.get("stdout", "") or "").strip()
                stderr = result.get("stderr", "")
                error = result.get("error", "")
                
                # Check if test case passed (no errors and output matches)
                passed = not stderr and not error and actual_output == expected_output
                if not passed:
                    all_passed = False
                
                test_results.append({
                    'test_case': i + 1,
                    'input': input_data,
                    'expected_output': expected_output,
                    'actual_output': actual_output,
                    'output': actual_output,  # Keep output for backward compatibility
                    'passed': passed,
                    'stderr': stderr,
                    'error': error
                })
            except Exception as e:
                error_msg = str(e)
                test_results.append({
                    'test_case': i + 1,
                    'input': str(test_case.get('input', '')),
                    'expected_output': str(test_case.get('output', '')),
                    'actual_output': '',
                    'output': '',
                    'passed': False,
                    'stderr': error_msg,
                    'error': error_msg
                })
                all_passed = False
        
        return test_results, all_passed

    @action(detail=True, methods=['get'])
    def submissions(self, request, pk=None):
        challenge = self.get_object()
        submissions = challenge.submissions.filter(user=request.user)
        serializer = SubmissionSerializer(submissions, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def run(self, request, pk=None):
        """Run code against a specific test case"""
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required to run code.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        challenge = self.get_object()
        code = request.data.get('code')
        language = request.data.get('language', 'python')
        input_data = request.data.get('input')
        expected_output = request.data.get('expected_output')
        
        if not code:
            return Response(
                {'detail': 'Code is required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Execute the code with the provided input
            result = self.execute_code(code, language, input_data)
            
            # Check for execution errors
            if result.get('status') == 'Error':
                return Response({
                    'error': result.get('error'),
                    'output': result.get('stdout', '')
                })
            
            # Return the execution result
            return Response({
                'output': result.get('stdout', '').strip(),
                'error': result.get('stderr', None)
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required to submit code.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        challenge = self.get_object()
        code = request.data.get('code')
        language = request.data.get('language')
        
        if not code:
            return Response(
                {'detail': 'Code is required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        test_results, all_passed = self.process_test_cases(challenge, code, language)
        
        # Update user progress
        progress, created = UserProgress.objects.get_or_create(
            user=request.user,
            challenge=challenge,
            defaults={'status': 'in_progress'}
        )
        
        progress.attempts += 1
        if all_passed:
            progress.status = 'completed'
            progress.completed_at = timezone.now()
            current_score = challenge.points
            progress.current_score = current_score
            if current_score > progress.best_score:
                progress.best_score = current_score
        
        progress.save()
        
        # Create the submission
        submission = Submission.objects.create(
            user=request.user,
            challenge=challenge,
            code=code,
            language=language,
            status='passed' if all_passed else 'failed',
            test_results=test_results
        )
        
        serializer = SubmissionSerializer(submission, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def discussions(self, request, pk=None):
        challenge = self.get_object()
        
        if request.method == 'POST':
            if not request.user.is_authenticated:
                return Response(
                    {'detail': 'Authentication required to post comments.'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )

            content = request.data.get('content')
            if not content or not content.strip():
                return Response(
                    {'detail': 'Comment content is required.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create new discussion
            discussion = Discussion.objects.create(
                challenge=challenge,
                user=request.user,
                content=content.strip()
            )
            serializer = DiscussionSerializer(discussion, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        # GET method
        discussions = challenge.discussions.all()
        serializer = DiscussionSerializer(discussions, many=True, context={'request': request})
        return Response(serializer.data)

class SubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = SubmissionSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Submission.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        challenge_id = serializer.validated_data.get('challenge')
        challenge = get_object_or_404(Challenge, id=challenge_id)
        code = serializer.validated_data.get('code')
        
        # Initialize test results
        test_results = []
        all_passed = True
        
        # Execute each test case
        for i, test_case in enumerate(challenge.test_cases):
            try:
                # For now, we'll just compare the code output with expected output
                # In a real implementation, you'd want to actually execute the code safely
                expected_output = str(test_case.get('output', '')).strip()
                actual_output = code.strip()  # Replace with actual code execution
                
                passed = actual_output == expected_output
                if not passed:
                    all_passed = False
                
                test_results.append({
                    'test_case': i + 1,
                    'input': test_case.get('input', ''),
                    'expected_output': expected_output,
                    'actual_output': actual_output,
                    'output': actual_output,  # Keep output for backward compatibility
                    'passed': passed
                })
            except Exception as e:
                test_results.append({
                    'test_case': i + 1,
                    'input': test_case.get('input', ''),
                    'expected_output': test_case.get('output', ''),
                    'actual_output': str(e),
                    'output': '',
                    'passed': False,
                    'error': str(e)
                })
                all_passed = False
        
        # Update user progress
        progress, created = UserProgress.objects.get_or_create(
            user=self.request.user,
            challenge=challenge,
            defaults={'status': 'in_progress'}
        )
        
        progress.attempts += 1
        if all_passed:
            progress.status = 'completed'
            progress.completed_at = timezone.now()
            current_score = challenge.points
            progress.current_score = current_score
            if current_score > progress.best_score:
                progress.best_score = current_score
        
        progress.save()
        
        # Save the submission with results
        submission = serializer.save(
            user=self.request.user,
            challenge=challenge,
            status='passed' if all_passed else 'failed',
            test_results=test_results
        )

class DiscussionViewSet(viewsets.ModelViewSet):
    serializer_class = DiscussionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Discussion.objects.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class UserStatsViewSet(viewsets.ViewSet):
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        user = request.user
        total_points = Submission.objects.filter(
            user=user,
            status='passed'
        ).aggregate(
            total_points=Sum('challenge__points')
        )['total_points'] or 0

        completed_challenges = Challenge.objects.filter(
            submissions__user=user,
            submissions__status='passed'
        ).distinct().count()

        in_progress_challenges = Challenge.objects.filter(
            submissions__user=user
        ).exclude(
            submissions__status='passed'
        ).distinct().count()

        category_progress = Category.objects.annotate(
            total_challenges=Count('challenges'),
            completed_challenges=Count(
                'challenges',
                filter=Q(
                    challenges__submissions__user=user,
                    challenges__submissions__status='passed'
                )
            )
        ).values('name', 'total_challenges', 'completed_challenges')

        data = {
            'total_points': total_points,
            'completed_challenges': completed_challenges,
            'in_progress_challenges': in_progress_challenges,
            'category_progress': list(category_progress)
        }

        serializer = UserStatsSerializer(data)
        return Response(serializer.data)

class AchievementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class UserAchievementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserAchievementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserAchievement.objects.filter(user=self.request.user)

class UserProgressViewSet(viewsets.ModelViewSet):
    serializer_class = UserProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserProgress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        stats = UserProgress.objects.filter(user=request.user).aggregate(
            total_completed=Count('id', filter={'status': 'completed'}),
            total_points=Sum('best_score'),
            total_attempts=Count('attempts')
        )
        return Response(stats)
