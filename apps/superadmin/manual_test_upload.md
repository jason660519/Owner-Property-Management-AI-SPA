# Manual Test Script for File Upload and OCR

## Pre-requisites
1. Start Backend: `cd backend/ocr_service && uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000`
2. Start Frontend: `cd apps/superadmin && npm run dev`
3. Access: `http://localhost:3001/superadmin/ai-service` -> Select "System Prompt" tab.

## Test Cases

### 1. File Format Validation
- [ ] Drag & Drop a `.txt` file.
  - **Expected**: Error message "format not supported" or similar.
- [ ] Drag & Drop a valid `.jpg` file.
  - **Expected**: File appears in list with thumbnail.

### 2. File Size Limit
- [ ] Select a file > 10MB.
  - **Expected**: Error message "File exceeds 10MB".

### 3. Batch Upload
- [ ] Select 5 valid images.
  - **Expected**: All 5 appear in list.
- [ ] Click "Start Upload".
  - **Expected**: Global status changes to "Uploading", then "Processing". Progress bars update.

### 4. Preview Functionality
- [ ] Upload a PDF.
  - **Expected**: Thumbnail shows the first page of the PDF.
- [ ] Upload an Image.
  - **Expected**: Thumbnail matches the image.

### 5. Error Handling & Recovery
- [ ] Disconnect Network (WiFi off) during upload.
  - **Expected**: "Connection interrupted" or "Upload failed" message. "Retry" button appears.

### 6. Real-time Progress (SSE)
- [ ] Watch the progress bars during processing.
  - **Expected**: Bars fill up from 0% to 100% sequentially or in parallel as backend emits events.

### 7. Cleanup
- [ ] Verify `/tmp/ocr_uploads` folder (or configured temp dir).
  - **Expected**: Files are created during upload and deleted after processing (or after 24h if process crashes).

### 8. Accessibility
- [ ] Use Keyboard (Tab) to navigate to dropzone.
- [ ] Press Enter to open file dialog.
- [ ] Use Screen Reader to hear status updates.

### 9. Cross-Browser
- [ ] Test on Chrome (Latest).
- [ ] Test on Safari (Latest).
- [ ] Test on Firefox (Latest).
