from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.register_view, name="register"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("profile/", views.user_profile_view, name="profile"),
    path("admins/", views.admin_list_view, name="admin-list"),
    path("forgot-password/", views.forgot_password_view, name="forgot-password"),
    path("reset-password/", views.reset_password_view, name="reset-password"),
]
