from sqlalchemy import Column, String, Float, Text, DateTime, JSON
from sqlalchemy.sql import func
from backend.database import Base

class Span(Base):
    __tablename__ = "spans"

    span_id = Column(String, primary_key=True)
    trace_id = Column(String, nullable=False, index=True)
    parent_id = Column(String, nullable=True)
    service_name = Column(String, nullable=False)
    operation_name = Column(String, nullable=False)
    duration_ms = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    attributes = Column(JSON, nullable=True)
    category = Column(String, nullable=True, default="general")
    created_at = Column(DateTime, default=func.now())


class TraceSummary(Base):
    __tablename__ = "trace_summaries"

    trace_id = Column(String, primary_key=True)
    summary = Column(Text, nullable=False)
    root_service = Column(String, nullable=True)
    total_duration_ms = Column(Float, nullable=True)
    has_error = Column(String, nullable=True)
    category = Column(String, nullable=True, default="general")
    created_at = Column(DateTime, default=func.now())