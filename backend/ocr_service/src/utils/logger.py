import sys
from datetime import datetime
from pathlib import Path

from loguru import logger

# Define log root directory
PROJECT_ROOT = Path("/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA")
LOG_ROOT = PROJECT_ROOT / "logs"

class UserFileSink:
    """
    Custom sink to handle dynamic user-based logging with rotation.
    """
    def __init__(self, log_root: Path, rotation_size: int = 10 * 1024 * 1024):
        self.log_root = log_root
        self.rotation_size = rotation_size

    def write(self, message):
        record = message.record
        user_id = record["extra"].get("user_id", "anonymous")
        timestamp = record["time"]
        date_str = timestamp.strftime("%Y-%m-%d")
        level = record["level"].name

        # Directory: /logs/{user_id}/{date}/
        user_dir = self.log_root / user_id / date_str
        user_dir.mkdir(parents=True, exist_ok=True)

        # Base Filename: user_{user_id}_{date}_{log_level}.log
        filename = f"user_{user_id}_{date_str}_{level}.log"
        file_path = user_dir / filename

        # Check rotation (size based)
        if file_path.exists() and file_path.stat().st_size > self.rotation_size:
            # Rotate: Rename current file to include timestamp
            rotation_time = datetime.now().strftime("%H%M%S")
            rotated_filename = f"user_{user_id}_{date_str}_{rotation_time}_{level}.log"
            rotated_path = user_dir / rotated_filename
            try:
                file_path.rename(rotated_path)
            except OSError:
                pass # Handle race condition or error

        # Write message
        try:
            with open(file_path, "a", encoding="utf-8") as f:
                f.write(message)
        except Exception as e:
            print(f"Failed to write to user log: {e}", file=sys.stderr)

class SystemLogger:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SystemLogger, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def initialize(self):
        if self.initialized:
            return

        # Remove default handler
        logger.remove()

        # Add console handler for development (stderr)
        logger.add(
            sys.stderr,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            level="INFO"
        )

        # Add system-wide error log
        logger.add(
            str(LOG_ROOT / "system" / "error.log"),
            rotation="10 MB",
            retention="30 days",
            compression="zip",
            level="ERROR",
            enqueue=True,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message} | {extra}"
        )

        # Add user-based logging using custom sink
        user_sink = UserFileSink(LOG_ROOT)
        logger.add(
            user_sink.write,
            enqueue=True,      # Async logging
            filter=lambda record: "user_id" in record["extra"],
            format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}"
        )

        self.initialized = True
        logger.info("System Logger Initialized")

    def setup_dynamic_sink(self):
        pass

# Initialize
system_logger = SystemLogger()

def get_logger():
    if not system_logger.initialized:
        system_logger.initialize()
    return logger
