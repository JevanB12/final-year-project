from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    created_at: datetime

    class Config:
        from_attributes = True