import os
from sqlmodel import SQLModel, create_engine, Session

DB_PATH = os.environ.get("BLINDSPOT_DB_PATH", "blindspot.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

connect_args = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
