"""
Performance benchmark tests for OCR VLM system
"""
import pytest
import asyncio
import time
import statistics
from pathlib import Path
from unittest.mock import AsyncMock, patch
from src.core.ocr_processor import OCRProcessor
from src.utils.cache_manager import CacheManager
from src.utils.metrics_collector import MetricsCollector


class TestOCRPerformance:
    @pytest.fixture
    def sample_pdf_paths(self):
        """Get multiple sample PDF files for benchmarking"""
        samples_dir = "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/resources/samples/建物謄本PDF範例"
        pdf_files = list(Path(samples_dir).glob("*.pdf"))
        
        if not pdf_files:
            pytest.skip("No sample PDF files found")
        
        # Use first 5 files for benchmarking
        return [str(f) for f in pdf_files[:5]]
    
    @pytest.fixture
    def sample_pdf_data_list(self, sample_pdf_paths):
        """Read multiple sample PDF data"""
        data_list = []
        for path in sample_pdf_paths:
            with open(path, "rb") as f:
                data_list.append(f.read())
        return data_list
    
    @pytest.fixture
    def benchmark_processor(self):
        """Create OCRProcessor for benchmarking"""
        cache_manager = CacheManager(redis_url=None)  # Memory cache
        metrics_collector = MetricsCollector()
        
        processor = OCRProcessor()
        processor.cache_manager = cache_manager
        processor.metrics_collector = metrics_collector
        
        return processor
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_single_document_processing_time(self, benchmark_processor, sample_pdf_data_list):
        """Benchmark single document processing time"""
        await benchmark_processor.initialize()
        
        processing_times = []
        
        for i, pdf_data in enumerate(sample_pdf_data_list):
            start_time = time.time()
            
            result = await benchmark_processor.process_document(
                pdf_data,
                f"benchmark_{i}.pdf",
                request_id=f"benchmark_{i}"
            )
            
            end_time = time.time()
            processing_time = end_time - start_time
            processing_times.append(processing_time)
            
            # Basic validation
            assert "status" in result
            assert "processing_time" in result
            
            print(f"Document {i}: {processing_time:.2f}s, Status: {result['status']}")
        
        # Calculate statistics
        avg_time = statistics.mean(processing_times)
        min_time = min(processing_times)
        max_time = max(processing_times)
        std_dev = statistics.stdev(processing_times) if len(processing_times) > 1 else 0
        
        print(f"\nSingle Document Processing Benchmark:")
        print(f"  Documents processed: {len(processing_times)}")
        print(f"  Average time: {avg_time:.2f}s")
        print(f"  Minimum time: {min_time:.2f}s")
        print(f"  Maximum time: {max_time:.2f}s")
        print(f"  Standard deviation: {std_dev:.2f}s")
        
        # Performance requirements: < 10 seconds per document
        assert avg_time < 10.0, f"Average processing time {avg_time:.2f}s exceeds 10s limit"
        assert max_time < 30.0, f"Maximum processing time {max_time:.2f}s exceeds 30s limit"
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_batch_processing_throughput(self, benchmark_processor, sample_pdf_data_list):
        """Benchmark batch processing throughput"""
        await benchmark_processor.initialize()
        
        # Create batch data
        batch_data = []
        for i, pdf_data in enumerate(sample_pdf_data_list):
            batch_data.append((pdf_data, f"batch_{i}.pdf"))
        
        start_time = time.time()
        
        results = await benchmark_processor.process_batch_documents(batch_data)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Calculate throughput
        documents_processed = len(results)
        throughput = documents_processed / total_time  # documents per second
        
        print(f"\nBatch Processing Benchmark:")
        print(f"  Documents processed: {documents_processed}")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Throughput: {throughput:.2f} docs/sec")
        print(f"  Time per document: {total_time/documents_processed:.2f}s")
        
        # Verify all documents were processed
        assert len(results) == len(batch_data)
        
        # Performance requirements: > 0.5 docs/sec throughput
        assert throughput > 0.5, f"Throughput {throughput:.2f} docs/sec below 0.5 docs/sec requirement"
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_cache_performance_improvement(self, benchmark_processor, sample_pdf_data_list):
        """Benchmark cache performance improvement"""
        await benchmark_processor.initialize()
        
        pdf_data = sample_pdf_data_list[0]  # Use first document
        
        # First processing (cache miss)
        start_time = time.time()
        result1 = await benchmark_processor.process_document(pdf_data, "cache_test.pdf")
        first_time = time.time() - start_time
        
        # Second processing (cache hit)
        start_time = time.time()
        result2 = await benchmark_processor.process_document(pdf_data, "cache_test.pdf")
        cached_time = time.time() - start_time
        
        # Calculate improvement
        improvement = first_time / cached_time
        
        print(f"\nCache Performance Benchmark:")
        print(f"  First processing (cache miss): {first_time:.2f}s")
        print(f"  Second processing (cache hit): {cached_time:.2f}s")
        print(f"  Improvement factor: {improvement:.1f}x")
        
        # Verify cache hit
        assert result2.get("cached", False) is True
        
        # Performance requirement: > 10x improvement with cache
        assert improvement > 10.0, f"Cache improvement {improvement:.1f}x below 10x requirement"
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_concurrent_processing(self, benchmark_processor, sample_pdf_data_list):
        """Benchmark concurrent document processing"""
        await benchmark_processor.initialize()
        
        pdf_data = sample_pdf_data_list[0]  # Use same document for all concurrent requests
        
        async def process_document_async():
            return await benchmark_processor.process_document(pdf_data, "concurrent_test.pdf")
        
        # Process multiple documents concurrently
        num_concurrent = 3
        start_time = time.time()
        
        results = await asyncio.gather(*[
            process_document_async() for _ in range(num_concurrent)
        ])
        
        end_time = time.time()
        total_time = end_time - start_time
        
        print(f"\nConcurrent Processing Benchmark:")
        print(f"  Concurrent requests: {num_concurrent}")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Time per request: {total_time/num_concurrent:.2f}s")
        
        # Verify all requests completed
        assert len(results) == num_concurrent
        assert all("status" in result for result in results)
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_memory_usage(self, benchmark_processor, sample_pdf_data_list):
        """Benchmark memory usage during processing"""
        import psutil
        import os
        
        await benchmark_processor.initialize()
        
        # Get initial memory usage
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        memory_usages = []
        
        for i, pdf_data in enumerate(sample_pdf_data_list):
            # Measure memory before processing
            memory_before = process.memory_info().rss / 1024 / 1024
            
            result = await benchmark_processor.process_document(pdf_data, f"memory_test_{i}.pdf")
            
            # Measure memory after processing
            memory_after = process.memory_info().rss / 1024 / 1024
            memory_used = memory_after - memory_before
            memory_usages.append(memory_used)
            
            print(f"Document {i}: Memory used: {memory_used:.1f}MB")
        
        # Calculate statistics
        avg_memory = statistics.mean(memory_usages)
        max_memory = max(memory_usages)
        
        print(f"\nMemory Usage Benchmark:")
        print(f"  Average memory per document: {avg_memory:.1f}MB")
        print(f"  Maximum memory per document: {max_memory:.1f}MB")
        print(f"  Initial memory: {initial_memory:.1f}MB")
        
        # Memory requirements: < 500MB per document
        assert max_memory < 500.0, f"Memory usage {max_memory:.1f}MB exceeds 500MB limit"
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_large_document_processing(self, benchmark_processor):
        """Benchmark processing of large documents"""
        await benchmark_processor.initialize()
        
        # Create a large PDF document (multi-page)
        import fitz
        doc = fitz.open()
        
        # Add multiple pages with content
        for page_num in range(20):  # 20 pages
            page = doc.new_page()
            page.insert_text((50, 50), f"Page {page_num + 1} - 測試內容", fontsize=12)
            # Add some table-like content
            for row in range(10):
                page.insert_text((50, 100 + row * 20), f"欄位{row}\t值{row}\t備註{row}", fontsize=9)
        
        large_pdf_data = doc.tobytes()
        doc.close()
        
        # Process large document
        start_time = time.time()
        
        result = await benchmark_processor.process_document(
            large_pdf_data,
            "large_document.pdf",
            request_id="large_doc_test"
        )
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        print(f"\nLarge Document Benchmark:")
        print(f"  Pages processed: 20")
        print(f"  Processing time: {processing_time:.2f}s")
        print(f"  Time per page: {processing_time/20:.2f}s")
        print(f"  Status: {result['status']}")
        
        # Performance requirement: < 30 seconds for 20 pages
        assert processing_time < 30.0, f"Large document processing time {processing_time:.2f}s exceeds 30s limit"
        assert result["status"] in ["success", "error"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])