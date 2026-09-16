from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from urllib.parse import quote_plus
import os

load_dotenv()  # reads .env file

# On Render, DATABASE_URL is injected automatically for PostgreSQL.
# Locally, we build the MySQL URL from individual DB_* vars.
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    user     = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    host     = os.getenv("DB_HOST", "localhost")
    port     = os.getenv("DB_PORT", "3306")
    db_name  = os.getenv("DB_NAME", "resume_analyzer")
    DATABASE_URL = f"mysql+pymysql://{user}:{quote_plus(password)}@{host}:{port}/{db_name}"
else:
    # Render gives postgres:// URL — SQLAlchemy needs postgresql+pg8000://
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
    if not DATABASE_URL.startswith("postgresql+pg8000"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
