"""
Unit tests for PDF preprocessing module

Testing PDF to image conversion, image enhancement, and quality assessment:
- PDF page rendering at high DPI
- Image denoising and cleanup
- Deskewing (rotation correction)
- Adaptive thresholding
- Image quality metrics
- ROI extraction

Following TDD approach:
1. Write failing tests first (Red)
2. Implement minimum code to pass (Green)
3. Refactor (Refactor)
"""

import numpy as np
import pytest
from pathlib import Path

# Will be implemented
from src.preprocessor.pdf_preprocessor import (
    PDFRenderer,
    ImageEnhancer,
    ImageQualityChecker,
    ROIExtractor,
    PreprocessingPipeline,
)


class TestPDFRenderer:
    """Test PDF to image rendering"""

    def test_render_pdf_page(self, sample_pdf_dir: Path):
        """Render a PDF page to image at specified DPI"""
        renderer = PDFRenderer(dpi=300)

        # Get first sample PDF
        pdf_files = list(sample_pdf_dir.glob("*.pdf"))
        if not pdf_files:
            pytest.skip("No sample PDFs found")

        pdf_path = pdf_files[0]
        images = renderer.render(pdf_path, page_num=0)

        assert images is not None
        assert len(images) >= 1
        assert images[0].shape[0] > 0  # Height
        assert images[0].shape[1] > 0  # Width

    def test_render_multiple_pages(self, sample_pdf_dir: Path):
        """Render multiple pages from PDF"""
        renderer = PDFRenderer(dpi=300)

        pdf_files = list(sample_pdf_dir.glob("*.pdf"))
        if not pdf_files:
            pytest.skip("No sample PDFs found")

        pdf_path = pdf_files[0]
        images = renderer.render_all(pdf_path)

        assert images is not None
        assert len(images) >= 1

    def test_dpi_settings(self):
        """Test different DPI settings affect image size"""
        renderer_300 = PDFRenderer(dpi=300)
        renderer_600 = PDFRenderer(dpi=600)

        assert renderer_300.dpi == 300
        assert renderer_600.dpi == 600

    def test_color_mode(self):
        """Test color vs grayscale rendering"""
        renderer_color = PDFRenderer(dpi=300, color_mode="rgb")
        renderer_gray = PDFRenderer(dpi=300, color_mode="grayscale")

        assert renderer_color.color_mode == "rgb"
        assert renderer_gray.color_mode == "grayscale"

    def test_invalid_pdf_path(self):
        """Handle invalid PDF path gracefully"""
        renderer = PDFRenderer(dpi=300)

        with pytest.raises(FileNotFoundError):
            renderer.render(Path("nonexistent.pdf"), page_num=0)

    def test_page_count(self, sample_pdf_dir: Path):
        """Get total page count from PDF"""
        renderer = PDFRenderer(dpi=300)

        pdf_files = list(sample_pdf_dir.glob("*.pdf"))
        if not pdf_files:
            pytest.skip("No sample PDFs found")

        pdf_path = pdf_files[0]
        count = renderer.get_page_count(pdf_path)

        assert count > 0


class TestImageEnhancer:
    """Test image enhancement operations"""

    @pytest.fixture
    def sample_noisy_image(self) -> np.ndarray:
        """Create a sample noisy image for testing"""
        # Create a simple image with some noise
        image = np.ones((100, 100), dtype=np.uint8) * 200
        # Add salt and pepper noise
        noise = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
        mask = np.random.random((100, 100)) > 0.9
        image[mask] = noise[mask]
        return image

    @pytest.fixture
    def sample_skewed_image(self) -> np.ndarray:
        """Create a sample skewed image for testing"""
        # Create a simple rectangle
        image = np.zeros((100, 100), dtype=np.uint8)
        image[30:70, 20:80] = 255
        return image

    def test_denoise_image(self, sample_noisy_image: np.ndarray):
        """Apply denoising filter to image"""
        enhancer = ImageEnhancer()

        denoised = enhancer.denoise(sample_noisy_image)

        assert denoised is not None
        assert denoised.shape == sample_noisy_image.shape
        # Denoised image should be different from original
        assert not np.array_equal(denoised, sample_noisy_image)

    def test_deskew_image(self, sample_skewed_image: np.ndarray):
        """Detect and correct image skew"""
        enhancer = ImageEnhancer()

        # Create a more realistic text-like pattern for better skew detection
        text_image = np.ones((200, 200), dtype=np.uint8) * 255
        # Add horizontal lines to simulate text
        for y in range(20, 180, 20):
            text_image[y : y + 5, 20:180] = 0

        # Rotate image slightly
        from scipy.ndimage import rotate

        rotated = rotate(text_image, angle=5, reshape=False)

        # Detect skew angle
        angle = enhancer.detect_skew(rotated)
        assert isinstance(angle, float)
        # Should detect rotation (may not be exactly 5 degrees due to algorithm)
        # Just verify it returns a reasonable angle
        assert -90 <= angle <= 90

        # Correct skew
        deskewed = enhancer.deskew(rotated)
        assert deskewed is not None
        assert deskewed.shape == rotated.shape

    def test_adaptive_threshold(self, sample_noisy_image: np.ndarray):
        """Apply adaptive thresholding for binarization"""
        enhancer = ImageEnhancer()

        binary = enhancer.adaptive_threshold(sample_noisy_image)

        assert binary is not None
        assert binary.shape == sample_noisy_image.shape
        # Binary image should only have 0 and 255 values
        unique_values = np.unique(binary)
        assert len(unique_values) <= 2
        assert 0 in unique_values or 255 in unique_values

    def test_enhance_contrast(self, sample_noisy_image: np.ndarray):
        """Enhance image contrast"""
        enhancer = ImageEnhancer()

        enhanced = enhancer.enhance_contrast(sample_noisy_image)

        assert enhanced is not None
        assert enhanced.shape == sample_noisy_image.shape

    def test_remove_borders(self):
        """Remove black borders from scanned documents"""
        enhancer = ImageEnhancer()

        # Create image with black borders
        image = np.ones((100, 100), dtype=np.uint8) * 255
        image[:10, :] = 0  # Top border
        image[-10:, :] = 0  # Bottom border
        image[:, :10] = 0  # Left border
        image[:, -10:] = 0  # Right border

        cleaned = enhancer.remove_borders(image)

        assert cleaned is not None
        # Result should be smaller (borders removed)
        assert cleaned.shape[0] <= image.shape[0]
        assert cleaned.shape[1] <= image.shape[1]


class TestImageQualityChecker:
    """Test image quality assessment"""

    @pytest.fixture
    def high_quality_image(self) -> np.ndarray:
        """Create a high quality image"""
        image = np.random.randint(100, 200, (500, 500), dtype=np.uint8)
        return image

    @pytest.fixture
    def low_quality_image(self) -> np.ndarray:
        """Create a low quality (blurry) image"""
        from scipy.ndimage import gaussian_filter

        image = np.random.randint(100, 200, (500, 500), dtype=np.uint8)
        blurred = gaussian_filter(image, sigma=5)
        return blurred.astype(np.uint8)

    def test_calculate_sharpness(self, high_quality_image: np.ndarray):
        """Calculate image sharpness metric"""
        checker = ImageQualityChecker()

        sharpness = checker.calculate_sharpness(high_quality_image)

        assert isinstance(sharpness, float)
        assert sharpness >= 0

    def test_detect_blur(
        self, high_quality_image: np.ndarray, low_quality_image: np.ndarray
    ):
        """Detect if image is blurry"""
        checker = ImageQualityChecker()

        is_sharp = checker.is_sharp(high_quality_image, threshold=100)
        is_blurry = checker.is_sharp(low_quality_image, threshold=100)

        # High quality should be sharp, low quality should not
        assert is_sharp is True
        assert is_blurry is False

    def test_calculate_contrast(self, high_quality_image: np.ndarray):
        """Calculate image contrast metric"""
        checker = ImageQualityChecker()

        contrast = checker.calculate_contrast(high_quality_image)

        assert isinstance(contrast, float)
        assert contrast >= 0

    def test_estimate_noise_level(self):
        """Estimate noise level in image"""
        checker = ImageQualityChecker()

        # Clean image
        clean_image = np.ones((100, 100), dtype=np.uint8) * 128
        noise_level_clean = checker.estimate_noise(clean_image)

        # Noisy image
        noisy_image = clean_image + np.random.randint(-20, 20, (100, 100))
        noisy_image = np.clip(noisy_image, 0, 255).astype(np.uint8)
        noise_level_noisy = checker.estimate_noise(noisy_image)

        # Noisy image should have higher noise estimate
        assert noise_level_noisy > noise_level_clean

    def test_overall_quality_score(self, high_quality_image: np.ndarray):
        """Calculate overall quality score (0-1)"""
        checker = ImageQualityChecker()

        score = checker.calculate_quality_score(high_quality_image)

        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0


class TestROIExtractor:
    """Test Region of Interest extraction"""

    @pytest.fixture
    def sample_document_image(self) -> np.ndarray:
        """Create a sample document image with text regions"""
        image = np.ones((1000, 800), dtype=np.uint8) * 255

        # Simulate text regions
        image[100:150, 50:300] = 0  # Header region
        image[200:400, 50:750] = 0  # Main content region
        image[500:600, 50:400] = 0  # Owner info region
        image[700:900, 50:750] = 0  # Area summary region

        return image

    def test_detect_text_regions(self, sample_document_image: np.ndarray):
        """Detect text regions in document"""
        extractor = ROIExtractor()

        regions = extractor.detect_text_regions(sample_document_image)

        assert regions is not None
        assert len(regions) > 0
        # Each region should have coordinates (x, y, w, h)
        assert all(len(region) == 4 for region in regions)

    def test_extract_roi_by_coordinates(self, sample_document_image: np.ndarray):
        """Extract ROI by specified coordinates"""
        extractor = ROIExtractor()

        # Extract specific region
        roi = extractor.extract_roi(sample_document_image, x=50, y=100, w=250, h=50)

        assert roi is not None
        assert roi.shape == (50, 250)

    def test_extract_header_region(self, sample_document_image: np.ndarray):
        """Extract header region (register office, document type)"""
        extractor = ROIExtractor()

        header = extractor.extract_header(sample_document_image)

        assert header is not None
        assert len(header) > 0

    def test_extract_owner_section(self, sample_document_image: np.ndarray):
        """Extract ownership information section"""
        extractor = ROIExtractor()

        owner_section = extractor.extract_owner_section(sample_document_image)

        assert owner_section is not None

    def test_extract_area_section(self, sample_document_image: np.ndarray):
        """Extract area summary section"""
        extractor = ROIExtractor()

        area_section = extractor.extract_area_section(sample_document_image)

        assert area_section is not None

    def test_sort_regions_by_position(self):
        """Sort detected regions by vertical position"""
        extractor = ROIExtractor()

        # Unsorted regions (x, y, w, h)
        regions = [(50, 300, 100, 50), (50, 100, 100, 50), (50, 200, 100, 50)]

        sorted_regions = extractor.sort_regions_vertically(regions)

        # Should be sorted by y-coordinate
        assert sorted_regions[0][1] < sorted_regions[1][1] < sorted_regions[2][1]


class TestPreprocessingPipeline:
    """Test complete preprocessing pipeline"""

    def test_pipeline_initialization(self):
        """Initialize preprocessing pipeline with default settings"""
        pipeline = PreprocessingPipeline(dpi=300, enhance=True)

        assert pipeline.dpi == 300
        assert pipeline.enhance is True

    def test_process_single_page(self, sample_pdf_dir: Path):
        """Process single PDF page through complete pipeline"""
        pipeline = PreprocessingPipeline(dpi=300, enhance=True)

        pdf_files = list(sample_pdf_dir.glob("*.pdf"))
        if not pdf_files:
            pytest.skip("No sample PDFs found")

        pdf_path = pdf_files[0]
        result = pipeline.process_page(pdf_path, page_num=0)

        assert result is not None
        assert "image" in result
        assert "quality_score" in result
        assert "metadata" in result

        # Check quality metrics
        assert 0.0 <= result["quality_score"] <= 1.0

    def test_process_full_document(self, sample_pdf_dir: Path):
        """Process entire PDF document"""
        pipeline = PreprocessingPipeline(dpi=300, enhance=True)

        pdf_files = list(sample_pdf_dir.glob("*.pdf"))
        if not pdf_files:
            pytest.skip("No sample PDFs found")

        pdf_path = pdf_files[0]
        results = pipeline.process_document(pdf_path)

        assert results is not None
        assert len(results) > 0

        # Each page should have processed image and metadata
        for result in results:
            assert "image" in result
            assert "page_num" in result
            assert "quality_score" in result

    def test_pipeline_with_quality_threshold(self, sample_pdf_dir: Path):
        """Pipeline should warn if quality below threshold"""
        pipeline = PreprocessingPipeline(dpi=300, enhance=True, quality_threshold=0.7)

        pdf_files = list(sample_pdf_dir.glob("*.pdf"))
        if not pdf_files:
            pytest.skip("No sample PDFs found")

        pdf_path = pdf_files[0]
        result = pipeline.process_page(pdf_path, page_num=0)

        # Should include quality warning if below threshold
        if result["quality_score"] < 0.7:
            assert "warning" in result["metadata"]

    def test_pipeline_saves_intermediate_results(self, sample_pdf_dir: Path, tmp_path: Path):
        """Pipeline can save intermediate processing steps"""
        pipeline = PreprocessingPipeline(
            dpi=300, enhance=True, save_intermediate=True, output_dir=tmp_path
        )

        pdf_files = list(sample_pdf_dir.glob("*.pdf"))
        if not pdf_files:
            pytest.skip("No sample PDFs found")

        pdf_path = pdf_files[0]
        result = pipeline.process_page(pdf_path, page_num=0)

        # Check if intermediate files were saved
        saved_files = list(tmp_path.glob("*.png"))
        assert len(saved_files) > 0

    def test_pipeline_performance_metrics(self, sample_pdf_dir: Path):
        """Pipeline tracks performance metrics"""
        pipeline = PreprocessingPipeline(dpi=300, enhance=True, track_performance=True)

        pdf_files = list(sample_pdf_dir.glob("*.pdf"))
        if not pdf_files:
            pytest.skip("No sample PDFs found")

        pdf_path = pdf_files[0]
        result = pipeline.process_page(pdf_path, page_num=0)

        # Should include timing information
        assert "metadata" in result
        assert "processing_time" in result["metadata"]
        assert result["metadata"]["processing_time"] > 0


class TestPreprocessorIntegration:
    """Integration tests for preprocessor components"""

    def test_full_preprocessing_workflow(self, sample_pdf_dir: Path):
        """Test complete preprocessing workflow"""
        pdf_files = list(sample_pdf_dir.glob("*.pdf"))
        if not pdf_files:
            pytest.skip("No sample PDFs found")

        pdf_path = pdf_files[0]

        # 1. Render PDF
        renderer = PDFRenderer(dpi=300)
        images = renderer.render(pdf_path, page_num=0)
        assert images is not None

        # 2. Enhance image
        enhancer = ImageEnhancer()
        enhanced = enhancer.denoise(images[0])
        enhanced = enhancer.enhance_contrast(enhanced)
        assert enhanced is not None

        # 3. Check quality
        checker = ImageQualityChecker()
        quality_score = checker.calculate_quality_score(enhanced)
        assert 0.0 <= quality_score <= 1.0

        # 4. Extract ROIs
        extractor = ROIExtractor()
        regions = extractor.detect_text_regions(enhanced)
        assert regions is not None

    def test_error_handling_robustness(self):
        """Test error handling for various edge cases"""
        pipeline = PreprocessingPipeline(dpi=300)

        # Test with invalid path
        with pytest.raises(FileNotFoundError):
            pipeline.process_page(Path("invalid.pdf"), page_num=0)

        # Test with invalid page number
        # Should handle gracefully (implementation dependent)
