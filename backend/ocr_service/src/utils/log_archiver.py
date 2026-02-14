import asyncio
import shutil
from datetime import datetime, timedelta
from pathlib import Path

from loguru import logger


class LogArchiver:
    def __init__(self, log_root: str, retention_days: int = 30, archive_size_mb: int = 100):
        self.log_root = Path(log_root)
        self.retention_days = retention_days
        self.archive_size_mb = archive_size_mb
        self.archive_dir = self.log_root / "archive"
        self.temp_dir = self.log_root / "temp"

        # Ensure directories exist
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    async def run_cleanup(self):
        """
        Main entry point for cleanup task.
        """
        logger.info("Starting log cleanup and archiving process...")
        try:
            await self._archive_old_files()
            await self._cleanup_expired_archives()
            logger.info("Log cleanup completed successfully.")
        except Exception as e:
            logger.error(f"Log cleanup failed: {e}")
            # In a real system, send alert here

    async def _archive_old_files(self):
        """
        Archive files that are old but not yet deleted, or move rotated files to archive.
        In this system, Loguru handles rotation and compression (zip) in place.
        So we might just want to move old user logs to the central archive folder
        to keep user folders clean, or just enforce retention.

        The requirement says: "2) compress and archive logs exceeding specific size".
        Loguru does this.
        "3) auto delete logs exceeding retention period".
        Loguru does this too with 'retention'.

        However, if we want a separate 'archive' process (e.g., move to cold storage /archive folder),
        we can implement it here.
        Let's assume we want to move zipped logs from user folders to /logs/archive after 7 days,
        and delete from /logs/archive after 30 days.
        """

        # Iterate over user directories
        for user_dir in self.log_root.iterdir():
            if not user_dir.is_dir() or user_dir.name in ["archive", "temp", "system"]:
                continue

            # Iterate over date directories
            for date_dir in user_dir.iterdir():
                if not date_dir.is_dir():
                    continue

                # Check if date_dir is older than 7 days
                try:
                    dir_date = datetime.strptime(date_dir.name, "%Y-%m-%d")
                    if datetime.now() - dir_date > timedelta(days=7):
                        # Move entire date folder to archive
                        archive_user_path = self.archive_dir / user_dir.name
                        archive_user_path.mkdir(exist_ok=True)

                        target_path = archive_user_path / date_dir.name
                        if not target_path.exists():
                            shutil.move(str(date_dir), str(target_path))
                            logger.info(f"Archived logs for user {user_dir.name} date {date_dir.name}")
                        else:
                            # Merge? Or just remove source if target exists (assuming immutable logs)
                            shutil.rmtree(str(date_dir))
                except ValueError:
                    continue

        # Allow async loop to breathe
        await asyncio.sleep(0.1)

    async def _cleanup_expired_archives(self):
        """
        Delete files in archive older than retention_days.
        """
        cutoff_date = datetime.now() - timedelta(days=self.retention_days)

        for user_dir in self.archive_dir.iterdir():
            if not user_dir.is_dir():
                continue

            for date_dir in user_dir.iterdir():
                try:
                    dir_date = datetime.strptime(date_dir.name, "%Y-%m-%d")
                    if dir_date < cutoff_date:
                        shutil.rmtree(str(date_dir))
                        logger.info(f"Deleted expired archive: {date_dir}")
                except ValueError:
                    continue

# Usage example:
# archiver = LogArchiver("/path/to/logs")
# asyncio.create_task(archiver.run_cleanup())
