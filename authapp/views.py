from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.conf import settings
from .serializers import RegisterSerializer, LoginSerializer
from .models import CustomUser, PasswordResetOTP
from utils.logger import (
    log_user_login,
    log_user_logout,
    log_user_registration,
    ActionLogger,
)
import logging

logger = logging.getLogger(__name__)


class IsAdminUserCustom(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and getattr(request.user, "role", "").upper() == "ADMIN"
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    """User registration with comprehensive logging"""
    try:
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, created = Token.objects.get_or_create(user=user)

            # Log successful registration
            log_user_registration(user=user, ip_address=request.META.get("REMOTE_ADDR"))

            ActionLogger.log_user_action(
                user=user,
                action="user_registration",
                details={
                    "registration_data": {
                        "email": user.email,
                        "role": user.role,
                        "company_name": user.company_name,
                    },
                    "ip_address": request.META.get("REMOTE_ADDR"),
                    "user_agent": request.META.get("HTTP_USER_AGENT", "unknown"),
                },
                status="SUCCESS",
            )

            user_data = {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "company_name": user.company_name,
            }

            # Add company_id only for company users
            if user.role == "COMPANY" and user.company:
                user_data["company_id"] = user.company.id

            return Response(
                {"token": token.key, "user": user_data}, status=status.HTTP_201_CREATED
            )
        else:
            # Log registration failure
            ActionLogger.log_user_action(
                user=None,
                action="user_registration",
                details={
                    "errors": serializer.errors,
                    "attempted_data": request.data,
                    "ip_address": request.META.get("REMOTE_ADDR"),
                },
                status="FAILED",
            )

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        # Log registration error
        ActionLogger.log_user_action(
            user=None,
            action="user_registration",
            details={
                "error": str(e),
                "attempted_data": request.data,
                "ip_address": request.META.get("REMOTE_ADDR"),
            },
            status="FAILED",
        )
        raise


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """User login with comprehensive logging"""
    try:
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            password = serializer.validated_data["password"]

            # Try to authenticate
            user = authenticate(request, email=email, password=password)

            if user:
                login(request, user)
                token, created = Token.objects.get_or_create(user=user)

                # Log successful login
                log_user_login(user=user, ip_address=request.META.get("REMOTE_ADDR"))

                ActionLogger.log_user_action(
                    user=user,
                    action="user_login",
                    details={
                        "login_method": "email_password",
                        "ip_address": request.META.get("REMOTE_ADDR"),
                        "user_agent": request.META.get("HTTP_USER_AGENT", "unknown"),
                        "token_created": created,
                    },
                    status="SUCCESS",
                )

                user_data = {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "company_name": user.company_name,
                }

                # Add company_id only for company users
                if user.role == "COMPANY" and user.company:
                    user_data["company_id"] = user.company.id

                return Response(
                    {"token": token.key, "user": user_data}, status=status.HTTP_200_OK
                )
            else:
                # Log failed login attempt
                ActionLogger.log_user_action(
                    user=None,
                    action="user_login",
                    details={
                        "attempted_email": email,
                        "ip_address": request.META.get("REMOTE_ADDR"),
                        "user_agent": request.META.get("HTTP_USER_AGENT", "unknown"),
                        "reason": "Invalid credentials",
                    },
                    status="FAILED",
                )

                return Response(
                    {"error": "Invalid credentials"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
        else:
            # Log login validation failure
            ActionLogger.log_user_action(
                user=None,
                action="user_login",
                details={
                    "errors": serializer.errors,
                    "attempted_data": request.data,
                    "ip_address": request.META.get("REMOTE_ADDR"),
                },
                status="FAILED",
            )

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        # Log login error
        ActionLogger.log_user_action(
            user=None,
            action="user_login",
            details={
                "error": str(e),
                "attempted_data": request.data,
                "ip_address": request.META.get("REMOTE_ADDR"),
            },
            status="FAILED",
        )
        raise


@api_view(["POST"])
def logout_view(request):
    """User logout with comprehensive logging"""
    try:
        if request.user.is_authenticated:
            # Log successful logout
            log_user_logout(
                user=request.user, ip_address=request.META.get("REMOTE_ADDR")
            )

            ActionLogger.log_user_action(
                user=request.user,
                action="user_logout",
                details={
                    "ip_address": request.META.get("REMOTE_ADDR"),
                    "user_agent": request.META.get("HTTP_USER_AGENT", "unknown"),
                },
                status="SUCCESS",
            )

            # Delete token
            try:
                request.user.auth_token.delete()
            except:
                pass  # Token might not exist

            logout(request)

            return Response(
                {"message": "Successfully logged out"}, status=status.HTTP_200_OK
            )
        else:
            # Log logout attempt by unauthenticated user
            ActionLogger.log_user_action(
                user=None,
                action="user_logout",
                details={
                    "ip_address": request.META.get("REMOTE_ADDR"),
                    "reason": "User not authenticated",
                },
                status="FAILED",
            )

            return Response(
                {"error": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED
            )

    except Exception as e:
        # Log logout error
        ActionLogger.log_user_action(
            user=request.user if request.user.is_authenticated else None,
            action="user_logout",
            details={"error": str(e), "ip_address": request.META.get("REMOTE_ADDR")},
            status="FAILED",
        )
        raise


@api_view(["GET", "PATCH"])
def user_profile_view(request):
    """Get and update user profile"""
    try:
        if request.method == "GET":
            # Get user profile
            user = request.user
            return Response(
                {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "company_name": user.company_name,
                    "username": user.username,
                },
                status=status.HTTP_200_OK,
            )

        elif request.method == "PATCH":
            # Update user profile
            user = request.user
            data = request.data

            # Update allowed fields
            if "full_name" in data:
                user.full_name = data["full_name"]
            if "company_name" in data:
                user.company_name = data["company_name"]

            user.save()

            return Response(
                {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "company_name": user.company_name,
                    "username": user.username,
                },
                status=status.HTTP_200_OK,
            )

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAdminUserCustom])
def admin_list_view(request):
    """List all admin users (admin-only access)"""
    admins = CustomUser.objects.filter(role__iexact="ADMIN")
    data = [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_name": user.company_name,
            "username": user.username,
        }
        for user in admins
    ]
    return Response({"admins": data}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password_view(request):
    """Request password reset OTP"""
    try:
        email = request.data.get("email", "").strip().lower()

        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user exists
        try:
            user = CustomUser.objects.get(email__iexact=email)
        except CustomUser.DoesNotExist:
            # Don't reveal if email exists for security
            ActionLogger.log_user_action(
                user=None,
                action="password_reset_request",
                details={
                    "attempted_email": email,
                    "ip_address": request.META.get("REMOTE_ADDR"),
                    "result": "user_not_found",
                },
                status="FAILED",
            )
            # Return success message even if user doesn't exist (security best practice)
            return Response(
                {"message": "If an account exists with this email, an OTP has been sent."},
                status=status.HTTP_200_OK,
            )

        # Generate OTP
        otp_code = PasswordResetOTP.generate_otp()
        expires_at = timezone.now() + timezone.timedelta(minutes=15)  # OTP valid for 15 minutes

        # Create OTP record
        PasswordResetOTP.objects.create(
            user=user,
            email=user.email,
            otp_code=otp_code,
            expires_at=expires_at,
        )

        # Invalidate old unused OTPs for this user
        PasswordResetOTP.objects.filter(
            user=user,
            is_used=False,
            email=user.email
        ).exclude(otp_code=otp_code).update(is_used=True)

        # Send email with OTP
        subject = "Password Reset OTP - Talaro"
        message = f"""
Hello {user.full_name or user.email},

You requested a password reset for your Talaro account.

Your OTP code is: {otp_code}

This OTP will expire in 15 minutes.

If you didn't request this password reset, please ignore this email or contact support.

Best regards,
Talaro Team

---
This is an automated message. Please do not reply to this email.
        """

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            logger.info(f"Password reset OTP email sent to: {user.email}")
        except Exception as email_error:
            logger.warning(
                f"SMTP password reset OTP email failed, falling back to console: {email_error}"
            )
            try:
                from django.core.mail import get_connection
                connection = get_connection(
                    backend="django.core.mail.backends.console.EmailBackend"
                )
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                    connection=connection,
                )
                logger.info(
                    f"Password reset OTP email sent to console (fallback mode): {user.email}"
                )
            except Exception as console_error:
                logger.error(f"Both SMTP and console password reset OTP email failed: {console_error}")

        ActionLogger.log_user_action(
            user=user,
            action="password_reset_request",
            details={
                "ip_address": request.META.get("REMOTE_ADDR"),
                "user_agent": request.META.get("HTTP_USER_AGENT", "unknown"),
            },
            status="SUCCESS",
        )

        return Response(
            {"message": "If an account exists with this email, an OTP has been sent."},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Error in forgot_password_view: {e}")
        ActionLogger.log_user_action(
            user=None,
            action="password_reset_request",
            details={
                "error": str(e),
                "attempted_email": request.data.get("email", ""),
                "ip_address": request.META.get("REMOTE_ADDR"),
            },
            status="FAILED",
        )
        return Response(
            {"error": "An error occurred. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password_view(request):
    """Verify OTP and reset password"""
    try:
        email = request.data.get("email", "").strip().lower()
        otp_code = request.data.get("otp", "").strip()
        new_password = request.data.get("new_password", "")

        if not email or not otp_code or not new_password:
            return Response(
                {"error": "Email, OTP, and new password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate password strength
        if len(new_password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters long"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get user
        try:
            user = CustomUser.objects.get(email__iexact=email)
        except CustomUser.DoesNotExist:
            ActionLogger.log_user_action(
                user=None,
                action="password_reset",
                details={
                    "attempted_email": email,
                    "ip_address": request.META.get("REMOTE_ADDR"),
                    "result": "user_not_found",
                },
                status="FAILED",
            )
            return Response(
                {"error": "Invalid email or OTP"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find valid OTP
        try:
            otp_record = PasswordResetOTP.objects.filter(
                user=user,
                email=email,
                otp_code=otp_code,
                is_used=False,
            ).latest("created_at")
        except PasswordResetOTP.DoesNotExist:
            ActionLogger.log_user_action(
                user=user,
                action="password_reset",
                details={
                    "ip_address": request.META.get("REMOTE_ADDR"),
                    "result": "invalid_otp",
                },
                status="FAILED",
            )
            return Response(
                {"error": "Invalid or expired OTP"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if OTP is valid
        if not otp_record.is_valid():
            otp_record.attempts += 1
            otp_record.save()
            ActionLogger.log_user_action(
                user=user,
                action="password_reset",
                details={
                    "ip_address": request.META.get("REMOTE_ADDR"),
                    "result": "expired_otp" if otp_record.is_expired() else "invalid_otp",
                },
                status="FAILED",
            )
            return Response(
                {"error": "Invalid or expired OTP"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check OTP attempts (max 5 attempts)
        if otp_record.attempts >= 5:
            otp_record.is_used = True
            otp_record.save()
            ActionLogger.log_user_action(
                user=user,
                action="password_reset",
                details={
                    "ip_address": request.META.get("REMOTE_ADDR"),
                    "result": "max_attempts_exceeded",
                },
                status="FAILED",
            )
            return Response(
                {"error": "Maximum OTP verification attempts exceeded. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reset password
        user.password = make_password(new_password)
        user.save()

        # Mark OTP as used
        otp_record.is_used = True
        otp_record.save()

        # Invalidate all other unused OTPs for this user
        PasswordResetOTP.objects.filter(
            user=user,
            is_used=False,
            email=email
        ).update(is_used=True)

        # Send confirmation email
        subject = "Password Reset Successful - Talaro"
        message = f"""
Hello {user.full_name or user.email},

Your password has been successfully reset.

If you didn't make this change, please contact our support team immediately.

Best regards,
Talaro Team

---
This is an automated message. Please do not reply to this email.
        """

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            logger.info(f"Password reset confirmation email sent to: {user.email}")
        except Exception as email_error:
            logger.warning(
                f"SMTP password reset confirmation email failed, falling back to console: {email_error}"
            )
            try:
                from django.core.mail import get_connection
                connection = get_connection(
                    backend="django.core.mail.backends.console.EmailBackend"
                )
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                    connection=connection,
                )
                logger.info(
                    f"Password reset confirmation email sent to console (fallback mode): {user.email}"
                )
            except Exception as console_error:
                logger.error(f"Both SMTP and console password reset confirmation email failed: {console_error}")

        ActionLogger.log_user_action(
            user=user,
            action="password_reset",
            details={
                "ip_address": request.META.get("REMOTE_ADDR"),
                "user_agent": request.META.get("HTTP_USER_AGENT", "unknown"),
            },
            status="SUCCESS",
        )

        return Response(
            {"message": "Password has been reset successfully"},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(f"Error in reset_password_view: {e}")
        ActionLogger.log_user_action(
            user=None,
            action="password_reset",
            details={
                "error": str(e),
                "attempted_email": request.data.get("email", ""),
                "ip_address": request.META.get("REMOTE_ADDR"),
            },
            status="FAILED",
        )
        return Response(
            {"error": "An error occurred. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
