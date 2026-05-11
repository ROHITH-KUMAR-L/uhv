from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard response envelope for all endpoints."""
    success: bool = True
    message: str = "OK"
    data: Optional[T] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated list response."""
    success: bool = True
    total: int
    page: int
    page_size: int
    data: list[T]


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    detail: Optional[Any] = None
