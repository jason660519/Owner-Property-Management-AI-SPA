"""
Table detection for documents
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
import tempfile

from loguru import logger


class TableDetector:
    """Table detection using OpenCV"""

    def __init__(self):
        self.is_initialized = False

    async def initialize(self):
        """Initialize the table detector"""
        self.is_initialized = True
        logger.info("Table detector initialized")

    async def detect_tables(self, images: List[np.ndarray]) -> List[Dict[str, Any]]:
        """
        Detect tables in a list of images

        Args:
            images: List of preprocessed images as numpy arrays

        Returns:
            List of detected tables with their properties
        """
        tables = []

        for img_idx, image in enumerate(images):
            detected_tables = await self._detect_tables_in_image(image, img_idx)
            tables.extend(detected_tables)

        logger.info(f"Detected {len(tables)} tables across {len(images)} images")
        return tables

    async def _detect_tables_in_image(
        self, image: np.ndarray, image_idx: int
    ) -> List[Dict[str, Any]]:
        """Detect tables in a single image"""
        try:
            # Convert to grayscale if needed
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image

            # Apply threshold to get binary image
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

            # Detect horizontal and vertical lines
            horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
            vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))

            horizontal_lines = cv2.morphologyEx(
                binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2
            )
            vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

            # Combine lines
            table_mask = cv2.addWeighted(horizontal_lines, 0.5, vertical_lines, 0.5, 0.0)

            # Find contours
            contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            tables = []
            for contour_idx, contour in enumerate(contours):
                # Filter small contours
                area = cv2.contourArea(contour)
                if area < 10000:  # Minimum table area
                    continue

                # Get bounding box
                x, y, w, h = cv2.boundingRect(contour)

                # Validate table aspect ratio
                aspect_ratio = w / h
                if aspect_ratio < 0.5 or aspect_ratio > 5.0:
                    continue

                # Extract table region
                table_region = image[y : y + h, x : x + w]

                table_info = {
                    "table_id": f"table_{image_idx}_{contour_idx}",
                    "page": image_idx + 1,
                    "bbox": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                    "area": int(area),
                    "aspect_ratio": float(aspect_ratio),
                    "confidence": self._calculate_table_confidence(contour, table_mask),
                    "cells": await self._extract_cells(table_region),
                }

                tables.append(table_info)

            return tables

        except Exception as e:
            logger.error(f"Error detecting tables in image {image_idx}: {e}")
            return []

    def _calculate_table_confidence(self, contour: np.ndarray, mask: np.ndarray) -> float:
        """Calculate confidence score for table detection"""
        try:
            # Create mask for this contour
            contour_mask = np.zeros(mask.shape, dtype=np.uint8)
            cv2.drawContours(contour_mask, [contour], -1, 255, -1)

            # Calculate line density in the region
            region_pixels = cv2.bitwise_and(mask, contour_mask)
            line_density = np.sum(region_pixels > 0) / np.sum(contour_mask > 0)

            # Higher confidence for higher line density
            confidence = min(0.95, line_density * 2.0)

            return float(confidence)

        except Exception:
            return 0.5  # Default confidence

    async def _extract_cells(self, table_region: np.ndarray) -> List[Dict[str, Any]]:
        """Extract individual cells from a table region"""
        try:
            # Convert to grayscale if needed
            if len(table_region.shape) == 3:
                gray = cv2.cvtColor(table_region, cv2.COLOR_BGR2GRAY)
            else:
                gray = table_region

            # Apply adaptive threshold
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
            )

            # Detect horizontal and vertical lines for cell boundaries
            horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 1))
            vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 20))

            horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel)
            vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel)

            # Find line intersections (cell corners)
            intersections = cv2.bitwise_and(horizontal_lines, vertical_lines)

            # Find contours for cells
            contours, _ = cv2.findContours(
                intersections, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )

            cells = []
            for cell_idx, contour in enumerate(contours):
                area = cv2.contourArea(contour)
                if area < 50:  # Minimum cell area
                    continue

                x, y, w, h = cv2.boundingRect(contour)

                cell_info = {
                    "cell_id": f"cell_{cell_idx}",
                    "row": y // 30,  # Approximate row
                    "col": x // 50,  # Approximate column
                    "bbox": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                    "text": "",  # To be filled by OCR
                    "confidence": 0.8,
                }

                cells.append(cell_info)

            return cells

        except Exception as e:
            logger.error(f"Error extracting cells: {e}")
            return []

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        try:
            # Test with a simple synthetic table image
            test_image = np.ones((200, 300), dtype=np.uint8) * 255

            # Draw simple grid
            for i in range(0, 300, 60):
                cv2.line(test_image, (i, 0), (i, 200), 0, 2)
            for i in range(0, 200, 40):
                cv2.line(test_image, (0, i), (300, i), 0, 2)

            # Test detection
            tables = await self.detect_tables([test_image])

            return {
                "status": "healthy" if len(tables) > 0 else "degraded",
                "message": f"Test detection found {len(tables)} tables",
                "test_passed": len(tables) > 0,
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "message": f"Health check failed: {e}",
                "test_passed": False,
            }
