import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_DIR = BASE_DIR.parent
DATA_DIR = PROJECT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Personal GTM Operating System"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_PATH: Path = DATA_DIR / "gtm.db"
    DATABASE_URL: str = f"sqlite:///{DATABASE_PATH}"
    
    # Clay Integration
    CLAY_CLI_PATH: str = os.path.expanduser("~/.local/bin/clay")
    CLAY_API_KEY: str = os.getenv("CLAY_API_KEY", "")
    
    # SMTP Defaults (Configurable per user/campaign)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Rishikesh Raj")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "rishikesh@aiviintelligence.com")
    
    # Verification settings
    SMTP_VERIFY_TIMEOUT: int = 5
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()
