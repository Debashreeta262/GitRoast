from typing import List, Dict, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field

class GitHubUserProfile(BaseModel):
    username: str
    name: Optional[str] = None
    avatar_url: str = ""
    bio: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    blog: Optional[str] = None
    twitter_username: Optional[str] = None
    public_repos: int = 0
    public_gists: int = 0
    followers: int = 0
    following: int = 0
    created_at: Optional[str] = None
    hireable: Optional[bool] = None
    has_profile_readme: bool = False

class GitHubRepoRaw(BaseModel):
    name: str
    description: Optional[str] = None
    language: Optional[str] = None
    stars: int = Field(default=0, alias="stargazers_count")
    forks: int = Field(default=0, alias="forks_count")
    is_fork: bool = Field(default=False, alias="fork")
    updated_at: Optional[str] = None
    pushed_at: Optional[str] = None
    created_at: Optional[str] = None
    homepage: Optional[str] = None
    license: Optional[str] = None
    topics: List[str] = Field(default_factory=list)
    has_readme: bool = False
    languages: Dict[str, int] = Field(default_factory=dict)
    size_kb: int = 0

class GitHubEvent(BaseModel):
    id: str
    type: str
    created_at: str
    repo_name: Optional[str] = None

class GitHubUserData(BaseModel):
    profile: GitHubUserProfile
    repos: List[GitHubRepoRaw]
    events: List[GitHubEvent]
    total_repos_count: int
    analyzed_repos_count: int
    cached: bool = False
