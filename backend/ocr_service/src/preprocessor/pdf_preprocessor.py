"""
PDF Preprocessing Module

Converts PDF documents to high-quality images and applies enhancement techniques:
- PDF rendering at configurable DPI (300-400 recommended)
- Image denoising and cleanup
- Deskewing (rotation correction)
- Adaptive thresholding for binarization
- Quality assessment
- ROI (Region of Interest) extraction
"""

import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import fitz  # PyMuPDF
import numpy as np
from scipy.ndimage import rotate


class PDFRenderer:
    """Render PDF pages to high-quality images"""

    def __init__(self, dpi: int = 300, color_mode: str = "grayscale"):
        """
        Initialize PDF renderer

        Args:
            dpi: Dots per inch for rendering (300-400 recommended)
            color_mode: "rgb" or "grayscale"
        """
        self.dpi = dpi
        self.color_mode = color_mode
        # PyMuPDF uses matrix for scaling: dpi/72 = zoom factor
        self.zoom = dpi / 72.0

    def render(self, pdf_path: Path, page_num: int = 0) -> List[np.ndarray]:
        """
        Render specific PDF page to image

        Args:
            pdf_path: Path to PDF file
            page_num: Page number (0-indexed)

        Returns:
            List containing single rendered page as numpy array

        Raises:
            FileNotFoundError: If PDF file doesn't exist
        """
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        doc = fitz.open(pdf_path)

        if page_num >= doc.page_count:
            doc.close()
            raise ValueError(f"Page {page_num} out of range (0-{doc.page_count - 1})")

        page = doc[page_num]
        mat = fitz.Matrix(self.zoom, self.zoom)

        # Render page to pixmap
        if self.color_mode == "grayscale":
            pix = page.get_pixmap(matrix=mat, alpha=False, colorspace=fitz.csGRAY)
        else:
            pix = page.get_pixmap(matrix=mat, alpha=False)

        # Convert to numpy array
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)

        # If grayscale, remove channel dimension
        if self.color_mode == "grayscale" and img.shape[2] == 1:
            img = img.squeeze()

        doc.close()

        return [img]

    def render_all(self, pdf_path: Path) -> List[np.ndarray]:
        """
        Render all pages from PDF

        Args:
            pdf_path: Path to PDF file

        Returns:
            List of rendered pages as numpy arrays
        """
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        doc = fitz.open(pdf_path)
        images = []

        for page_num in range(doc.page_count):
            page = doc[page_num]
            mat = fitz.Matrix(self.zoom, self.zoom)

            if self.color_mode == "grayscale":
                pix = page.get_pixmap(matrix=mat, alpha=False, colorspace=fitz.csGRAY)
            else:
                pix = page.get_pixmap(matrix=mat, alpha=False)

            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)

            if self.color_mode == "grayscale" and img.shape[2] == 1:
                img = img.squeeze()

            images.append(img)

        doc.close()
        return images

    def get_page_count(self, pdf_path: Path) -> int:
        """
        Get total page count from PDF

        Args:
            pdf_path: Path to PDF file

        Returns:
            Number of pages
        """
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        doc = fitz.open(pdf_path)
        count = doc.page_count
        doc.close()

        return count


class ImageEnhancer:
    """Image enhancement operations for scanned documents"""

    def denoise(self, image: np.ndarray, strength: int = 10) -> np.ndarray:
        """
        Apply denoising filter to reduce noise

        Args:
            image: Input grayscale or color image
            strength: Denoising strength (higher = more smoothing)

        Returns:
            Denoised image
        """
        if len(image.shape) == 2:
            # Grayscale
            return cv2.fastNlMeansDenoising(image, None, strength, 7, 21)
        else:
            # Color
            return cv2.fastNlMeansDenoisingColored(image, None, strength, strength, 7, 21)

    def detect_skew(self, image: np.ndarray) -> float:
        """
        Detect skew angle of document

        Args:
            image: Input grayscale image

        Returns:
            Skew angle in degrees
        """
        # Convert to binary
        if len(image.shape) > 2:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Apply threshold
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Find contours
        coords = np.column_stack(np.where(binary > 0))

        if len(coords) < 5:
            return 0.0

        # Fit rotated rectangle
        rect = cv2.minAreaRect(coords)
        angle = rect[-1]

        # Adjust angle
        if angle < -45:
            angle = 90 + angle
        elif angle > 45:
            angle = angle - 90

        return angle

    def deskew(self, image: np.ndarray, angle: Optional[float] = None) -> np.ndarray:
        """
        Correct image skew

        Args:
            image: Input image
            angle: Rotation angle (if None, auto-detect)

        Returns:
            Deskewed image
        """
        if angle is None:
            angle = self.detect_skew(image)

        if abs(angle) < 0.5:
            return image

        # Rotate image
        rotated = rotate(image, angle, reshape=False, mode="nearest")
        rotated = np.clip(rotated, 0, 255).astype(np.uint8)

        return rotated

    def adaptive_threshold(
        self, image: np.ndarray, block_size: int = 15, c: int = 10
    ) -> np.ndarray:
        """
        Apply adaptive thresholding for binarization

        Args:
            image: Input grayscale image
            block_size: Size of neighborhood area (must be odd)
            c: Constant subtracted from weighted mean

        Returns:
            Binary image
        """
        if len(image.shape) > 2:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Ensure block_size is odd
        if block_size % 2 == 0:
            block_size += 1

        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, block_size, c
        )

        return binary

    def enhance_contrast(self, image: np.ndarray) -> np.ndarray:
        """
        Enhance image contrast using CLAHE

        Args:
            image: Input image

        Returns:
            Contrast-enhanced image
        """
        if len(image.shape) > 2:
            # Convert to LAB color space for color images
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)

            # Apply CLAHE to L channel
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)

            # Merge and convert back
            lab = cv2.merge([l, a, b])
            enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        else:
            # Grayscale
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(image)

        return enhanced

    def remove_borders(self, image: np.ndarray, border_threshold: int = 50) -> np.ndarray:
        """
        Remove black borders from scanned documents

        Args:
            image: Input image
            border_threshold: Threshold for detecting borders

        Returns:
            Image with borders removed
        """
        if len(image.shape) > 2:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Find non-zero pixels
        coords = cv2.findNonZero(cv2.threshold(gray, border_threshold, 255, cv2.THRESH_BINARY)[1])

        if coords is None:
            return image

        # Get bounding box
        x, y, w, h = cv2.boundingRect(coords)

        # Crop image
        cropped = image[y : y + h, x : x + w]

        return cropped


class ImageQualityChecker:
    """Assess image quality metrics"""

    def calculate_sharpness(self, image: np.ndarray) -> float:
        """
        Calculate image sharpness using Laplacian variance

        Args:
            image: Input image

        Returns:
            Sharpness score (higher = sharper)
        """
        if len(image.shape) > 2:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Calculate Laplacian variance
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        sharpness = laplacian.var()

        return float(sharpness)

    def is_sharp(self, image: np.ndarray, threshold: float = 100.0) -> bool:
        """
        Check if image is sharp enough

        Args:
            image: Input image
            threshold: Sharpness threshold

        Returns:
            True if sharp, False if blurry
        """
        sharpness = self.calculate_sharpness(image)
        return sharpness >= threshold

    def calculate_contrast(self, image: np.ndarray) -> float:
        """
        Calculate image contrast

        Args:
            image: Input image

        Returns:
            Contrast score
        """
        if len(image.shape) > 2:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Calculate standard deviation as contrast measure
        contrast = float(np.std(gray))

        return contrast

    def estimate_noise(self, image: np.ndarray) -> float:
        """
        Estimate noise level using median absolute deviation

        Args:
            image: Input image

        Returns:
            Noise estimate
        """
        if len(image.shape) > 2:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Estimate noise using MAD (Median Absolute Deviation)
        median = np.median(gray)
        mad = np.median(np.abs(gray - median))
        noise = float(mad)

        return noise

    def calculate_quality_score(self, image: np.ndarray) -> float:
        """
        Calculate overall quality score (0-1)

        Combines sharpness, contrast, and noise metrics

        Args:
            image: Input image

        Returns:
            Quality score between 0 and 1
        """
        # Calculate individual metrics
        sharpness = self.calculate_sharpness(image)
        contrast = self.calculate_contrast(image)
        noise = self.estimate_noise(image)

        # Normalize metrics (these thresholds are heuristic)
        sharpness_score = min(sharpness / 500.0, 1.0)
        contrast_score = min(contrast / 100.0, 1.0)
        noise_score = max(0, 1.0 - noise / 50.0)

        # Weighted average
        quality = 0.4 * sharpness_score + 0.3 * contrast_score + 0.3 * noise_score

        return float(quality)


class ROIExtractor:
    """Extract Regions of Interest from document images"""

    def detect_text_regions(
        self, image: np.ndarray, min_area: int = 100
    ) -> List[Tuple[int, int, int, int]]:
        """
        Detect text regions in document

        Args:
            image: Input grayscale image
            min_area: Minimum region area to keep

        Returns:
            List of regions as (x, y, w, h) tuples
        """
        if len(image.shape) > 2:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Apply binary threshold
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        regions = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h

            if area >= min_area:
                regions.append((x, y, w, h))

        return regions

    def extract_roi(
        self, image: np.ndarray, x: int, y: int, w: int, h: int
    ) -> np.ndarray:
        """
        Extract ROI by coordinates

        Args:
            image: Input image
            x, y: Top-left coordinates
            w, h: Width and height

        Returns:
            Extracted ROI
        """
        return image[y : y + h, x : x + w]

    def extract_header(self, image: np.ndarray) -> np.ndarray:
        """
        Extract header region (top ~10% of document)

        Args:
            image: Input image

        Returns:
            Header region
        """
        height = image.shape[0]
        header_height = int(height * 0.1)

        return image[:header_height, :]

    def extract_owner_section(self, image: np.ndarray) -> np.ndarray:
        """
        Extract ownership section (heuristic: middle portion)

        Args:
            image: Input image

        Returns:
            Owner section
        """
        height = image.shape[0]
        start = int(height * 0.3)
        end = int(height * 0.6)

        return image[start:end, :]

    def extract_area_section(self, image: np.ndarray) -> np.ndarray:
        """
        Extract area summary section (heuristic: lower portion)

        Args:
            image: Input image

        Returns:
            Area section
        """
        height = image.shape[0]
        start = int(height * 0.6)

        return image[start:, :]

    def sort_regions_vertically(
        self, regions: List[Tuple[int, int, int, int]]
    ) -> List[Tuple[int, int, int, int]]:
        """
        Sort regions by vertical position (top to bottom)

        Args:
            regions: List of (x, y, w, h) tuples

        Returns:
            Sorted list of regions
        """
        return sorted(regions, key=lambda r: r[1])


class PreprocessingPipeline:
    """Complete preprocessing pipeline"""

    def __init__(
        self,
        dpi: int = 300,
        enhance: bool = True,
        quality_threshold: float = 0.5,
        save_intermediate: bool = False,
        output_dir: Optional[Path] = None,
        track_performance: bool = False,
    ):
        """
        Initialize preprocessing pipeline

        Args:
            dpi: Rendering DPI
            enhance: Apply enhancement steps
            quality_threshold: Minimum quality score
            save_intermediate: Save intermediate results
            output_dir: Directory for intermediate files
            track_performance: Track processing time
        """
        self.dpi = dpi
        self.enhance = enhance
        self.quality_threshold = quality_threshold
        self.save_intermediate = save_intermediate
        self.output_dir = output_dir
        self.track_performance = track_performance

        # Initialize components
        self.renderer = PDFRenderer(dpi=dpi, color_mode="grayscale")
        self.enhancer = ImageEnhancer()
        self.quality_checker = ImageQualityChecker()
        self.roi_extractor = ROIExtractor()

        if save_intermediate and output_dir:
            output_dir.mkdir(parents=True, exist_ok=True)

    def process_page(self, pdf_path: Path, page_num: int = 0) -> Dict:
        """
        Process single PDF page

        Args:
            pdf_path: Path to PDF file
            page_num: Page number

        Returns:
            Dict with processed image and metadata
        """
        start_time = time.time() if self.track_performance else None

        # Render page
        images = self.renderer.render(pdf_path, page_num)
        image = images[0]

        # Enhance image
        if self.enhance:
            image = self.enhancer.denoise(image)
            image = self.enhancer.deskew(image)
            image = self.enhancer.enhance_contrast(image)

        # Check quality
        quality_score = self.quality_checker.calculate_quality_score(image)

        # Build result
        result = {"image": image, "quality_score": quality_score, "metadata": {}}

        # Add quality warning
        if quality_score < self.quality_threshold:
            result["metadata"]["warning"] = f"Quality below threshold: {quality_score:.2f}"

        # Add timing
        if self.track_performance:
            result["metadata"]["processing_time"] = time.time() - start_time

        # Save intermediate
        if self.save_intermediate and self.output_dir:
            filename = f"{pdf_path.stem}_page{page_num}.png"
            cv2.imwrite(str(self.output_dir / filename), image)

        return result

    def process_document(self, pdf_path: Path) -> List[Dict]:
        """
        Process entire PDF document

        Args:
            pdf_path: Path to PDF file

        Returns:
            List of processed pages
        """
        page_count = self.renderer.get_page_count(pdf_path)
        results = []

        for page_num in range(page_count):
            result = self.process_page(pdf_path, page_num)
            result["page_num"] = page_num
            results.append(result)

        return results
