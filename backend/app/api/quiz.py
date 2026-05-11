"""Quiz Router — Interactive scam identification scenarios."""
import random
import uuid
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.core.supabase_client import get_supabase
from app.schemas.common import APIResponse, PaginatedResponse
from app.schemas.quiz import LeaderboardEntry, QuizResult, QuizScenario, QuizSubmission

router = APIRouter(prefix="/quiz", tags=["Quiz"])


@router.get("/scenarios", response_model=APIResponse[list[QuizScenario]])
async def get_scenarios(
    count: int = Query(10, ge=1, le=30),
    difficulty: str | None = Query(None, description="easy | medium | hard"),
):
    """Fetch a randomized set of quiz scenarios."""
    db = get_supabase()
    query = db.table("quiz_bank").select("id, difficulty, scenario_text, image_url, option_a, option_b, category")
    if difficulty:
        query = query.eq("difficulty", difficulty)
    result = query.execute()
    scenarios = result.data
    if len(scenarios) > count:
        scenarios = random.sample(scenarios, count)
    return APIResponse(data=[QuizScenario(**s) for s in scenarios])


@router.post("/submit", response_model=APIResponse[QuizResult])
async def submit_quiz(body: QuizSubmission, current_user: dict = Depends(get_current_user)):
    """Submit quiz answers and receive a scored result with explanations."""
    db = get_supabase()
    question_ids = [a.question_id for a in body.answers]

    # Fetch correct answers for submitted questions
    result = db.table("quiz_bank").select("id, correct_option, explanation").in_("id", question_ids).execute()
    answer_map = {r["id"]: r for r in result.data}

    score = 0
    feedback = []
    for answer in body.answers:
        correct_data = answer_map.get(answer.question_id)
        if not correct_data:
            continue
        is_correct = answer.selected_option.lower() == correct_data["correct_option"].lower()
        if is_correct:
            score += 1
        feedback.append({
            "question_id": answer.question_id,
            "correct": is_correct,
            "your_answer": answer.selected_option,
            "correct_answer": correct_data["correct_option"],
            "explanation": correct_data["explanation"],
        })

    total = len(body.answers)
    percentage = round((score / total) * 100, 1) if total > 0 else 0.0

    # Save result
    result_id = str(uuid.uuid4())
    db.table("quiz_results").insert({
        "id": result_id, "user_id": current_user["sub"],
        "score": score, "total_questions": total, "percentage": percentage,
    }).execute()

    return APIResponse(data=QuizResult(score=score, total_questions=total, percentage=percentage, feedback=feedback))


@router.get("/my-history", response_model=APIResponse)
async def my_quiz_history(current_user: dict = Depends(get_current_user)):
    """Return the current user's quiz attempt history."""
    db = get_supabase()
    result = (db.table("quiz_results").select("*")
              .eq("user_id", current_user["sub"]).order("completed_at", desc=True).execute())
    return APIResponse(data=result.data)
