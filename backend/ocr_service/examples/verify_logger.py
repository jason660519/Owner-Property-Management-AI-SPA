import sys
import os
from pathlib import Path

# Add src to path
current_dir = Path(__file__).resolve().parent
src_dir = current_dir.parent / "src"
sys.path.append(str(src_dir))

from utils.logger import SystemLogger, get_logger
from loguru import logger

def test_logger():
    print("Initializing Logger...")
    sl = SystemLogger()
    sl.initialize()
    sl.setup_dynamic_sink()

    print("Logging for user test_user_123...")
    # Log with user context
    with logger.contextualize(user_id="test_user_123"):
        logger.info("This is a test info message for user 123")
        logger.error("This is a test error message for user 123")

    print("Logging system message...")
    # Log without user context
    logger.info("System message (should not appear in user log)")

    print("Check the logs directory.")

if __name__ == "__main__":
    test_logger()
