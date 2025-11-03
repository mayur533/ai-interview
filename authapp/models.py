from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import random
import string


class Role(models.TextChoices):
    ADMIN = "ADMIN", "Admin"
    COMPANY = "COMPANY", "Company"
    HIRING_AGENCY = "HIRING_AGENCY", "Hiring Agency"
    RECRUITER = "RECRUITER", "Recruiter"
    HR = "HR", "HR"
    TALENT_ACQUISITION = "TALENT_ACQUISITION", "Talent Acquisition Specialist"
    TECHNICAL_INTERVIEWER = "TECHNICAL_INTERVIEWER", "Technical Interviewer"
    TEAM_LEAD = "TEAM_LEAD", "Team Lead"
    DEPARTMENT_HEAD = "DEPARTMENT_HEAD", "Department Head"
    PROJECT_MANAGER = "PROJECT_MANAGER", "Project Manager"
    CTO = "CTO", "CTO"
    OTHERS = "OTHERS", "Others"


class CustomUser(AbstractUser):
    full_name = models.CharField(max_length=100)
    company_name = models.CharField(max_length=100, blank=True, null=True)
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.OTHERS)
    # Add company relationship for proper hierarchy
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )

    def __str__(self):
        return f"{self.username} ({self.role})"

    def get_company_name(self):
        """Get company name from company relationship or fallback to company_name field"""
        if self.company:
            return self.company.name
        return self.company_name or "No Company"

    def is_admin(self):
        """Check if user is admin"""
        return self.role == Role.ADMIN

    def is_company(self):
        """Check if user is company user"""
        return self.role == Role.COMPANY

    def is_hiring_agency(self):
        """Check if user is hiring agency"""
        return self.role == Role.HIRING_AGENCY

    def is_recruiter(self):
        """Check if user is recruiter"""
        return self.role == Role.RECRUITER


class PasswordResetOTP(models.Model):
    """Model for storing password reset OTP codes"""
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='password_reset_otps')
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'is_used']),
            models.Index(fields=['otp_code', 'is_used']),
        ]

    def __str__(self):
        return f"OTP for {self.email} - {'Used' if self.is_used else 'Active'}"

    @staticmethod
    def generate_otp():
        """Generate a 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=6))

    def is_expired(self):
        """Check if OTP has expired"""
        return timezone.now() > self.expires_at

    def is_valid(self):
        """Check if OTP is valid (not used and not expired)"""
        return not self.is_used and not self.is_expired()