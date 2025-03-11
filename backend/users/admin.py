from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth import get_user_model
from django.db import transaction
from django.contrib import messages

User = get_user_model()

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'date_joined', 'last_login')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'date_joined')
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('-date_joined',)
    actions = ['safe_delete_users']
    list_per_page = 50
    list_display_links = ('username', 'email')
    list_select_related = True
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
    )

    @admin.action(description='Safely delete selected users')
    def safe_delete_users(self, request, queryset):
        try:
            with transaction.atomic():
                # Delete related records first
                for user in queryset:
                    # Delete submissions
                    user.submissions.all().delete()
                    # Delete discussions
                    user.discussions.all().delete()
                    # Delete achievements
                    user.achievements.all().delete()
                    # Delete progress
                    user.progress.all().delete()
                    # Delete created challenges
                    user.created_challenges.all().delete()
                # Finally delete users
                deleted_count = queryset.delete()[0]
                messages.success(request, f'Successfully deleted {deleted_count} users and their related data.')
        except Exception as e:
            messages.error(request, f'Error deleting users: {str(e)}')

    def get_actions(self, request):
        actions = super().get_actions(request)
        if not request.user.is_superuser:
            if 'safe_delete_users' in actions:
                del actions['safe_delete_users']
        return actions
