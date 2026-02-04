from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from pathlib import Path
import os
from datetime import datetime

from ...utils.logger import LOG_ROOT, get_logger

router = APIRouter()
logger = get_logger()

@router.get("/stats")
async def get_log_stats():
    """
    Get system-wide log statistics.
    """
    try:
        total_size = 0
        total_files = 0
        user_count = 0
        
        # Iterate through LOG_ROOT
        if LOG_ROOT.exists():
            for entry in LOG_ROOT.iterdir():
                if entry.is_dir() and entry.name not in ["system", "archive", "temp"]:
                    user_count += 1
                    # Calculate user dir size
                    for root, dirs, files in os.walk(entry):
                        total_files += len(files)
                        for f in files:
                            fp = os.path.join(root, f)
                            total_size += os.path.getsize(fp)
                elif entry.is_file():
                    total_files += 1
                    total_size += entry.stat().st_size

        return {
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "total_files": total_files,
            "user_count": user_count,
            "log_root": str(LOG_ROOT)
        }
    except Exception as e:
        logger.error(f"Failed to get log stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users")
async def list_log_users():
    """
    List all users who have logs.
    """
    try:
        users = []
        if LOG_ROOT.exists():
            for entry in LOG_ROOT.iterdir():
                if entry.is_dir() and entry.name not in ["system", "archive", "temp"]:
                    users.append(entry.name)
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{user_id}/stats")
async def get_user_log_stats(user_id: str):
    """
    Get log stats for a specific user.
    """
    user_dir = LOG_ROOT / user_id
    if not user_dir.exists():
        raise HTTPException(status_code=404, detail="User logs not found")
    
    try:
        total_size = 0
        file_count = 0
        dates = []
        
        for date_dir in user_dir.iterdir():
            if date_dir.is_dir():
                dates.append(date_dir.name)
                for f in date_dir.iterdir():
                    if f.is_file():
                        file_count += 1
                        total_size += f.stat().st_size
        
        return {
            "user_id": user_id,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "file_count": file_count,
            "dates": sorted(dates, reverse=True)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
