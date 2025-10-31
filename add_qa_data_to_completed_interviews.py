#!/usr/bin/env python
"""
Script to add Q&A data to candidates with completed interviews
that have both AI and manual evaluations
"""
import os
import sys
import django
import uuid
from datetime import datetime, timedelta
from django.utils import timezone

# Setup Django
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_platform.settings')
django.setup()

from interviews.models import Interview
from ai_interview.models import (
    AIInterviewSession,
    AIInterviewQuestion,
    AIInterviewResponse,
    AIInterviewResult
)
from evaluation.models import Evaluation

def add_qa_data_to_completed_interviews():
    """Add Q&A data to completed interviews with both AI and manual evaluations"""
    
    # Sample questions and answers for different types
    sample_qa_data = [
        {
            "question_type": "behavioral",
            "questions": [
                {
                    "text": "Tell me about yourself and your experience.",
                    "answers": [
                        "I am a software engineer with 5 years of experience in full-stack development. I've worked on various projects including web applications and mobile apps.",
                        "I have been working as a developer for the past 4 years, specializing in Python and JavaScript. I've contributed to several open-source projects.",
                        "I'm a frontend developer with expertise in React and Vue.js. I've built multiple responsive web applications for e-commerce platforms."
                    ]
                },
                {
                    "text": "Describe a challenging project you worked on and how you overcame obstacles.",
                    "answers": [
                        "I worked on a large-scale e-commerce platform that needed to handle millions of requests. I implemented caching strategies and database optimization to improve performance.",
                        "One challenging project was migrating a legacy system to microservices architecture. I broke it down into smaller modules and coordinated with multiple teams.",
                        "I developed a real-time chat application with WebSocket connections. I faced latency issues which I solved by implementing connection pooling and message queuing."
                    ]
                },
                {
                    "text": "How do you handle tight deadlines and pressure?",
                    "answers": [
                        "I prioritize tasks based on urgency and importance, break down complex tasks into smaller ones, and communicate proactively with stakeholders about progress.",
                        "I maintain a clear schedule, use project management tools to track progress, and ensure I take breaks to maintain focus and productivity.",
                        "I believe in proactive communication and setting realistic expectations. When under pressure, I focus on delivering quality work while keeping stakeholders informed."
                    ]
                }
            ]
        },
        {
            "question_type": "technical",
            "questions": [
                {
                    "text": "Explain the difference between REST and GraphQL APIs.",
                    "answers": [
                        "REST uses multiple endpoints for different resources, while GraphQL uses a single endpoint with queries. GraphQL allows clients to request exactly the data they need.",
                        "REST is stateless and uses HTTP methods, while GraphQL provides more flexibility in data fetching but can be more complex to implement.",
                        "REST follows a resource-based approach, while GraphQL uses a query language. GraphQL reduces over-fetching and under-fetching of data."
                    ]
                },
                {
                    "text": "What is the difference between SQL and NoSQL databases?",
                    "answers": [
                        "SQL databases are relational and use structured schemas, while NoSQL databases are non-relational and offer more flexibility in data storage.",
                        "SQL databases use tables with relationships, while NoSQL uses documents, key-value pairs, or graphs. SQL is better for complex queries, NoSQL for scalability.",
                        "SQL databases enforce ACID properties, while NoSQL databases prioritize availability and partition tolerance in distributed systems."
                    ]
                },
                {
                    "text": "How does async/await work in JavaScript?",
                    "answers": [
                        "Async/await is syntactic sugar over Promises. Async functions return a Promise, and await pauses execution until the Promise resolves.",
                        "The async keyword makes a function return a Promise, and await waits for that Promise to resolve before continuing execution in a non-blocking way.",
                        "Async functions allow you to write asynchronous code that looks synchronous. Await can only be used inside async functions."
                    ]
                },
                {
                    "text": "Explain the concept of closures in JavaScript.",
                    "answers": [
                        "A closure is a function that has access to variables in its outer scope even after the outer function has returned. It's created when a function is defined inside another function.",
                        "Closures allow inner functions to access variables from their containing scope, enabling data privacy and function factories in JavaScript.",
                        "A closure is a combination of a function and its lexical environment. The inner function remembers the variables from the outer function's scope."
                    ]
                }
            ]
        },
        {
            "question_type": "coding",
            "questions": [
                {
                    "text": "Write a function to reverse a string in Python.",
                    "answers": [
                        "def reverse_string(s):\n    return s[::-1]\n\n# Or using built-in:\nreturn ''.join(reversed(s))",
                        "def reverse_string(s):\n    result = ''\n    for char in s:\n        result = char + result\n    return result",
                        "I would use slicing: s[::-1] which is the most Pythonic way, or ''.join(reversed(s)) for readability."
                    ]
                },
                {
                    "text": "Explain time complexity of common sorting algorithms.",
                    "answers": [
                        "QuickSort has average O(n log n) but worst case O(n²). MergeSort has O(n log n) in all cases. BubbleSort is O(n²).",
                        "HeapSort and MergeSort are both O(n log n) in worst case. QuickSort averages O(n log n) but can degrade to O(n²) with bad pivots.",
                        "For time complexity: MergeSort is consistently O(n log n), QuickSort averages O(n log n), while BubbleSort and SelectionSort are O(n²)."
                    ]
                }
            ]
        }
    ]
    
    # Find interviews with both AI and manual evaluations
    interviews_to_update = []
    
    for interview in Interview.objects.filter(status='completed'):
        has_ai_result = hasattr(interview, 'ai_result') and interview.ai_result is not None
        has_evaluation = Evaluation.objects.filter(interview=interview).exists()
        
        if has_ai_result and has_evaluation:
            interviews_to_update.append(interview)
    
    print(f"Found {len(interviews_to_update)} interviews with both AI and manual evaluations")
    
    qa_added_count = 0
    
    for interview in interviews_to_update:
        try:
            # Get or create AI session for this interview
            ai_session, created = AIInterviewSession.objects.get_or_create(
                interview=interview,
                defaults={
                    'status': 'COMPLETED',
                    'model_name': 'gemini-1.5-flash',
                    'model_version': 'latest',
                    'current_question_index': 0,
                    'total_questions': 0,
                    'session_started_at': interview.started_at or timezone.now() - timedelta(hours=1),
                    'session_ended_at': interview.ended_at or timezone.now(),
                    'ai_configuration': {
                        'candidate_name': interview.candidate.full_name,
                        'job_description': interview.job.job_title if interview.job else '',
                        'language_code': 'en',
                    }
                }
            )
            
            # Check if questions already exist
            existing_questions = AIInterviewQuestion.objects.filter(session=ai_session)
            if existing_questions.exists():
                print(f"  Interview {interview.id} already has {existing_questions.count()} questions. Verifying data...")
                # Verify responses exist
                existing_responses = AIInterviewResponse.objects.filter(session=ai_session)
                print(f"    - Questions: {existing_questions.count()}, Responses: {existing_responses.count()}")
                if existing_responses.exists():
                    continue
                else:
                    print(f"    - No responses found. Adding responses to existing questions...")
                    # Add responses to existing questions with relevant answers
                    for question in existing_questions:
                        if not AIInterviewResponse.objects.filter(question=question).exists():
                            import random
                            
                            # Generate contextually relevant answers based on question type
                            question_text_lower = question.question_text.lower()
                            answer = ""
                            
                            if question.question_type == "behavioral":
                                if "tell me about yourself" in question_text_lower or "experience" in question_text_lower:
                                    answer = f"I am {interview.candidate.full_name}, a professional with strong background in software development. I have worked on multiple projects involving full-stack development, REST APIs, and modern frontend frameworks. I'm passionate about writing clean, maintainable code and solving complex problems."
                                elif "challenging" in question_text_lower or "project" in question_text_lower:
                                    answer = "One of the most challenging projects I worked on was developing a microservices architecture for an e-commerce platform. The main challenge was ensuring service communication and data consistency. I solved it by implementing message queues and eventual consistency patterns."
                                elif "deadline" in question_text_lower or "pressure" in question_text_lower:
                                    answer = "I handle pressure by breaking down tasks into smaller, manageable pieces and prioritizing based on impact. I also maintain open communication with stakeholders about progress and potential blockers."
                                else:
                                    answer = "In my experience, I've found that effective communication and collaboration are key to success. I believe in taking a systematic approach to problem-solving and continuously learning from each project."
                            
                            elif question.question_type == "technical":
                                if "rest" in question_text_lower and "graphql" in question_text_lower:
                                    answer = "REST is a stateless architectural style using HTTP methods, while GraphQL is a query language that allows clients to request exactly the data they need. GraphQL reduces over-fetching and under-fetching but can be more complex to implement."
                                elif "sql" in question_text_lower or "nosql" in question_text_lower:
                                    answer = "SQL databases are relational with structured schemas and ACID properties, ideal for complex queries. NoSQL databases offer more flexibility and scalability, using document, key-value, or graph models. The choice depends on use case requirements."
                                elif "async" in question_text_lower or "await" in question_text_lower:
                                    answer = "Async/await in JavaScript is syntactic sugar over Promises. The async keyword makes a function return a Promise, and await pauses execution until the Promise resolves, allowing asynchronous code to be written in a synchronous style."
                                elif "closure" in question_text_lower:
                                    answer = "A closure is a function that has access to variables in its outer scope even after the outer function has returned. It's created when a function is defined inside another function, enabling data privacy and function factories."
                                else:
                                    answer = "Based on my understanding, this concept involves understanding the underlying principles and applying them in practical scenarios. I have hands-on experience implementing this in production systems."
                            
                            elif question.question_type == "coding":
                                if "reverse" in question_text_lower or "string" in question_text_lower:
                                    answer = "def reverse_string(s):\n    return s[::-1]\n\n# This uses Python slicing to reverse the string efficiently in O(n) time."
                                elif "sort" in question_text_lower or "algorithm" in question_text_lower:
                                    answer = "Common sorting algorithms: QuickSort averages O(n log n) but worst case O(n²), MergeSort is consistently O(n log n) with O(n) space, and BubbleSort is O(n²) but simple to implement."
                                else:
                                    answer = "Here's a solution approach:\n1. Analyze the problem requirements\n2. Consider edge cases\n3. Implement with appropriate data structures\n4. Optimize for time/space complexity"
                            
                            else:
                                answer = "Based on my experience and understanding, I can provide insights on this topic. I have worked on similar scenarios in my previous projects."
                            
                            AIInterviewResponse.objects.create(
                                session=ai_session,
                                question=question,
                                response_text=answer,
                                response_type='text',
                                response_submitted_at=question.question_asked_at + timedelta(seconds=60),
                                response_duration=random.randint(30, 120),
                                ai_score=random.uniform(75, 95),
                                ai_feedback=f"Good response demonstrating understanding of {question.question_type} concepts.",
                            )
                            print(f"      ✓ Added response for question {question.question_index} ({question.question_type})")
                    qa_added_count += 1
                    continue
            
            # Create questions and responses
            question_index = 1
            all_questions = []
            
            # Flatten all questions from different types
            for category in sample_qa_data:
                for qa_pair in category['questions']:
                    all_questions.append({
                        'text': qa_pair['text'],
                        'type': category['question_type'],
                        'answers': qa_pair['answers']
                    })
            
            # Limit to 8 questions per interview
            selected_questions = all_questions[:8]
            
            for qa_item in selected_questions:
                import random
                answer = random.choice(qa_item['answers'])
                
                # Create question
                question = AIInterviewQuestion.objects.create(
                    session=ai_session,
                    question_index=question_index,
                    question_type=qa_item['type'],
                    difficulty='medium',
                    question_text=qa_item['text'],
                    question_asked_at=timezone.now() - timedelta(minutes=30 - question_index * 2),
                    is_answered=True,
                )
                
                # Create response
                response = AIInterviewResponse.objects.create(
                    session=ai_session,
                    question=question,
                    response_text=answer,
                    response_type='text',
                    response_submitted_at=timezone.now() - timedelta(minutes=30 - question_index * 2 + 1),
                    response_duration=random.randint(30, 120),  # 30-120 seconds
                    ai_score=random.uniform(70, 100),
                    ai_feedback=f"Good response demonstrating understanding of {qa_item['type']} concepts.",
                )
                
                # Update question
                question.response_received_at = response.response_submitted_at
                question.response_time = response.response_duration
                question.is_correct = response.ai_score > 75
                question.score = response.ai_score
                question.save()
                
                question_index += 1
            
            # Update session
            ai_session.total_questions = len(selected_questions)
            ai_session.current_question_index = len(selected_questions)
            ai_session.questions_answered = len(selected_questions)
            ai_session.save()
            
            # Ensure AIInterviewResult exists and links to session
            if not hasattr(interview, 'ai_result') or not interview.ai_result:
                # Create AI result if it doesn't exist
                ai_result = AIInterviewResult.objects.create(
                    session=ai_session,
                    interview=interview,
                    total_score=random.uniform(7, 9),
                    technical_score=random.uniform(6, 9),
                    behavioral_score=random.uniform(7, 9),
                    coding_score=random.uniform(6, 9),
                    communication_score=random.uniform(7, 9),
                    problem_solving_score=random.uniform(7, 9),
                    questions_attempted=len(selected_questions),
                    questions_correct=random.randint(len(selected_questions) - 1, len(selected_questions)),
                    average_response_time=random.uniform(45, 90),
                    completion_time=random.randint(1800, 3600),
                    ai_summary=f"Strong candidate with good technical knowledge and communication skills. Performed well across all question types.",
                    ai_recommendations="Recommended for next round. Candidate demonstrates solid understanding of core concepts.",
                    strengths=["Technical knowledge", "Clear communication", "Problem-solving approach"],
                    weaknesses=["Could improve on time management", "Some areas need more depth"],
                    overall_rating=random.choice(["excellent", "good"]),
                    hire_recommendation=True,
                    confidence_level=random.uniform(8, 10),
                )
            
            qa_added_count += 1
            print(f"  ✓ Added Q&A data for interview {interview.id} (Candidate: {interview.candidate.full_name})")
            
        except Exception as e:
            print(f"  ✗ Error adding Q&A for interview {interview.id}: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n✅ Successfully added Q&A data to {qa_added_count} interviews")
    return qa_added_count

if __name__ == "__main__":
    print("Starting to add Q&A data to completed interviews...\n")
    count = add_qa_data_to_completed_interviews()
    print(f"\nProcess complete! Updated {count} interviews with Q&A data.")

