from pydantic import BaseModel
from typing import Optional


class QuizScenario(BaseModel):
    id: str
    difficulty: str
    scenario_text: str
    image_url: Optional[str]
    option_a: str
    option_b: str
    category: str


class QuizAnswer(BaseModel):
    question_id: str
    selected_option: str   # 'a' or 'b'


class QuizSubmission(BaseModel):
    answers: list[QuizAnswer]


class QuizResult(BaseModel):
    score: int
    total_questions: int
    percentage: float
    feedback: list[dict]   # [{question_id, correct, explanation}]


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    full_name: Optional[str]
    cyber_safety_score: int
