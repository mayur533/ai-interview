#!/usr/bin/env python
"""
Script to add sample analytics data for hiring agencies
This creates sample users with different roles and candidates to populate analytics
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_platform.settings')
django.setup()

from authapp.models import CustomUser, Role
from candidates.models import Candidate
from interviews.models import Interview
from jobs.models import Job, Domain
from resumes.models import Resume
from django.contrib.auth.hashers import make_password


def create_sample_analytics_data():
    """Create sample hiring agencies, candidates, and interviews for analytics"""
    
    print("Creating sample analytics data...")
    
    # Create or get sample domains
    domains = ['Python', 'JavaScript', 'Java', 'React', 'Node.js']
    domain_objects = []
    for domain_name in domains:
        domain, _ = Domain.objects.get_or_create(name=domain_name)
        domain_objects.append(domain)
    
    # Create sample Hiring Agencies
    hiring_agencies = [
        {
            'username': 'tech_recruiters_inc',
            'full_name': 'Tech Recruiters Inc',
            'email': 'tech@recruiters.com',
            'company_name': 'Tech Recruiters Inc',
            'role': Role.HIRING_AGENCY,
        },
        {
            'username': 'staffing_solutions',
            'full_name': 'Staffing Solutions',
            'email': 'contact@staffing.com',
            'company_name': 'Staffing Solutions',
            'role': Role.HIRING_AGENCY,
        },
        {
            'username': 'talent_hunt',
            'full_name': 'Talent Hunt Agency',
            'email': 'info@talenthunt.com',
            'company_name': 'Talent Hunt Agency',
            'role': Role.HIRING_AGENCY,
        },
        {
            'username': 'global_tech_recruiters',
            'full_name': 'Global Tech Recruiters',
            'email': 'hire@globaltech.com',
            'company_name': 'Global Tech Recruiters',
            'role': Role.HIRING_AGENCY,
        },
        {
            'username': 'elite_staffing',
            'full_name': 'Elite Staffing',
            'email': 'recruit@elite.com',
            'company_name': 'Elite Staffing',
            'role': Role.HIRING_AGENCY,
        },
    ]
    
    created_agencies = []
    for agency_data in hiring_agencies:
        user, created = CustomUser.objects.get_or_create(
            username=agency_data['username'],
            defaults={
                'email': agency_data['email'],
                'full_name': agency_data['full_name'],
                'company_name': agency_data['company_name'],
                'role': agency_data['role'],
                'password': make_password('SamplePassword123!'),
            }
        )
        created_agencies.append(user)
        if created:
            print(f"✓ Created hiring agency: {agency_data['full_name']}")
        else:
            print(f"- Hiring agency already exists: {agency_data['full_name']}")
    
    # Create or get sample jobs
    jobs = []
    for i, domain in enumerate(domain_objects):
        job, _ = Job.objects.get_or_create(
            job_title=f'{domain.name} Developer',
            defaults={
                'company_name': 'Sample Tech Company',
                'domain': domain,
                'position_level': 'IC',
                'spoc_email': 'hr@sampletech.com',
                'hiring_manager_email': 'hiring@sampletech.com',
                'number_to_hire': 5,
                'tech_stack_details': f'{domain.name}, React, Node.js',
            }
        )
        jobs.append(job)
    
    # Add candidates for each hiring agency with different statuses
    candidate_names = [
        ('John Smith', 'john.smith@email.com', '9876543210'),
        ('Sarah Johnson', 'sarah.j@email.com', '9876543211'),
        ('Michael Brown', 'michael.b@email.com', '9876543212'),
        ('Emily Davis', 'emily.d@email.com', '9876543213'),
        ('David Wilson', 'david.w@email.com', '9876543214'),
        ('Lisa Anderson', 'lisa.a@email.com', '9876543215'),
        ('James Martinez', 'james.m@email.com', '9876543216'),
        ('Jennifer Taylor', 'jennifer.t@email.com', '9876543217'),
        ('Robert Thomas', 'robert.t@email.com', '9876543218'),
        ('Amanda Jackson', 'amanda.j@email.com', '9876543219'),
    ]
    
    # Statuses to distribute among agencies
    statuses = [
        Candidate.Status.NEW,
        Candidate.Status.INTERVIEW_SCHEDULED,
        Candidate.Status.HIRED,
        Candidate.Status.HIRED,  # More hired
        Candidate.Status.REJECTED,
        Candidate.Status.INTERVIEW_COMPLETED,
        Candidate.Status.INTERVIEW_COMPLETED,
        Candidate.Status.NEW,
        Candidate.Status.HIRED,
        Candidate.Status.REJECTED,
    ]
    
    candidate_counter = 0
    for agency in created_agencies:
        # Create 10 candidates per agency
        for i in range(10):
            name_idx = (candidate_counter) % len(candidate_names)
            candidate_data = candidate_names[name_idx]
            status_idx = candidate_counter % len(statuses)
            
            candidate, created = Candidate.objects.get_or_create(
                email=candidate_data[1],
                defaults={
                    'full_name': candidate_data[0],
                    'phone': candidate_data[2],
                    'recruiter': agency,
                    'job': jobs[i % len(jobs)],
                    'domain': domain_objects[i % len(domain_objects)].name,
                    'status': statuses[status_idx],
                    'work_experience': 3 + (i % 10),
                }
            )
            
            if created:
                print(f"  ✓ Created candidate: {candidate_data[0]} (Status: {statuses[status_idx]})")
            
            # Create some interviews for candidates
            if i < 7:  # Create interviews for 7 out of 10 candidates
                from django.utils import timezone
                import random
                
                interview, _ = Interview.objects.get_or_create(
                    candidate=candidate,
                    defaults={
                        'job': candidate.job,
                        'status': 'completed' if i < 3 else 'scheduled',
                    }
                )
                
                if created:
                    print(f"    ✓ Created interview for {candidate_data[0]}")
            
            candidate_counter += 1
    
    print(f"\n✅ Sample analytics data created successfully!")
    print(f"   - Hiring Agencies: {len(created_agencies)}")
    print(f"   - Total Candidates: {Candidate.objects.all().count()}")
    print(f"   - Total Interviews: {Interview.objects.all().count()}")
    print(f"   - Hired Candidates: {Candidate.objects.filter(status=Candidate.Status.HIRED).count()}")
    print(f"   - Rejected Candidates: {Candidate.objects.filter(status=Candidate.Status.REJECTED).count()}")
    

if __name__ == '__main__':
    try:
        create_sample_analytics_data()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

