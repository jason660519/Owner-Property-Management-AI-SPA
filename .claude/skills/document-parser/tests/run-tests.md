# Document Parser Testing Guide

## Overview
This guide helps you test the document-parser skill with the provided sample building transcripts.

## Prerequisites
- Access to Claude Code CLI
- Sample PDFs in `建物謄本PDF範例/` directory (18 files)
- Write permissions for output directory

## Test Scenarios

### Scenario 1: Single Document Parsing
**Objective**: Verify basic parsing functionality with one document

**Steps**:
1. Choose a sample PDF (e.g., 102AF022944REG02E9EC68747504C53A80B70B286C68179.pdf)
2. Run the parser:
   ```bash
   /document-parser parse-building ./建物謄本PDF範例/102AF022944REG02E9EC68747504C53A80B70B286C68179.pdf
   ```
3. Review the output JSON
4. Check confidence score (should be >0.85)
5. Verify critical fields:
   - buildingNumber: "01691-000"
   - address: "敦化南路一段２３６巷５號十樓"
   - owner.name: "謝裕隆"
   - totalArea: 224.82

**Expected Result**:
- ✅ Valid JSON output
- ✅ All required schema fields present
- ✅ Confidence score ≥ 0.85
- ✅ Critical fields accurate

### Scenario 2: Batch Processing
**Objective**: Process multiple documents efficiently

**Steps**:
1. Run batch parser:
   ```bash
   /document-parser batch-parse ./建物謄本PDF範例/
   ```
2. Wait for processing to complete (2-3 minutes)
3. Check output directory for JSON files
4. Review batch summary report

**Expected Result**:
- ✅ 18 JSON files created
- ✅ Processing success rate = 100%
- ✅ Average confidence score >0.85
- ✅ Summary report generated

### Scenario 3: Schema Validation
**Objective**: Ensure output conforms to schema

**Steps**:
1. Parse a document (any from samples)
2. Save output to file
3. Run validator:
   ```bash
   /document-parser validate ./output/01691-000.json
   ```
4. Check validation results

**Expected Result**:
- ✅ Schema validation passes
- ✅ All required fields present
- ✅ Data types correct
- ✅ No validation errors

### Scenario 4: Edge Case Handling
**Objective**: Test handling of challenging documents

**Test Cases**:

#### A. Incomplete Construction Date
Documents with `民國---年--月--日`

**Steps**:
1. Parse document with incomplete date
2. Check `fieldsRequiringReview` array
3. Verify date field captures incomplete format

**Expected**:
- ⚠️ Field flagged for review
- ✅ Incomplete date preserved as-is
- ✅ Note added in extractionMetadata

#### B. Multiple Common Areas
Documents with extensive 公設持分 entries

**Steps**:
1. Parse document with many common area entries
2. Verify all entries in `otherRegistrationNotes` array
3. Check common area allocations

**Expected**:
- ✅ All common area entries captured
- ✅ Ownership ratios preserved correctly
- ✅ Array structure maintained

#### C. Special Unicode Characters
Documents with ㆒㆓㈲ characters

**Steps**:
1. Parse document with special characters
2. Check character preservation
3. Verify no encoding errors

**Expected**:
- ✅ Special characters preserved
- ✅ No garbled text
- ✅ Readable output

### Scenario 5: Database Integration Test
**Objective**: Verify database-ready output format

**Steps**:
1. Run extract-to-db command:
   ```bash
   /document-parser extract-to-db ./建物謄本PDF範例/102AF022944.pdf ./db-ready/
   ```
2. Check generated files:
   - `building-01691-000.json`
   - `ownership-01691-000.json`
   - `common-areas-01691-000.json`
3. Verify each file structure

**Expected Result**:
- ✅ Separate files for each table
- ✅ ClickHouse-compatible format
- ✅ Foreign key relationships maintained
- ✅ Ready for INSERT statements

## Test Data Overview

### Sample Documents (18 total)

| File Pattern | Count | Description |
|-------------|--------|-------------|
| 102AF006*** | 10 | Different building numbers (006705-006715) |
| 102AF022*** | 8 | Different building numbers (022944-022950) |

### Building Types
- Residential (住家用): Majority
- Various floor levels: 1F to 14F
- Multiple districts: 大安區, etc.

### Ownership Patterns
- Single owner: Most documents
- Full ownership (全部): Common
- Co-ownership: Some documents
- Various registration reasons: 買賣, 門牌整編

## Performance Benchmarks

### Target Metrics
| Metric | Target | Acceptable |
|--------|--------|------------|
| Processing time | <10s | <15s |
| Confidence score | >0.90 | >0.85 |
| Field accuracy | >95% | >90% |
| Success rate | 100% | >95% |

### How to Measure

#### Processing Time
```bash
time /document-parser parse-building <pdf-path>
```

#### Confidence Score
Check `extractionMetadata.confidenceScore` in output JSON

#### Field Accuracy
Manually compare 5-10 random fields against source PDF

#### Success Rate
```
Success Rate = (Successful extractions / Total attempts) × 100%
```

## Common Issues and Solutions

### Issue 1: Permission Denied
**Symptom**: Cannot write output files
**Solution**:
```bash
chmod +w ./output/
```

### Issue 2: PDF Not Found
**Symptom**: "File not found" error
**Solution**:
- Verify file path is correct
- Use absolute path if relative fails
- Check file actually exists: `ls -la <pdf-path>`

### Issue 3: Low Confidence Score
**Symptom**: Score <0.85, many fields flagged
**Solution**:
- Check PDF quality (scan resolution)
- Look for handwritten annotations
- Verify document is standard format
- May require manual verification

### Issue 4: Validation Failures
**Symptom**: JSON doesn't pass schema validation
**Solution**:
- Check for missing required fields
- Verify data types (number vs string)
- Ensure arrays are properly structured
- Review error messages for specific violations

## Manual Verification Checklist

For critical production use, manually verify:

- [ ] Owner name matches PDF exactly
- [ ] Address is complete and correct
- [ ] Building number format: ####-###
- [ ] Total area matches sum of floor areas
- [ ] Ownership ratio is valid format
- [ ] Registration dates are in ROC format
- [ ] District and section match header
- [ ] Common area ratios are reasonable
- [ ] No OCR errors in critical fields
- [ ] Special characters preserved

## Regression Testing

### After Code Changes
Run full test suite:

```bash
# 1. Parse all samples
/document-parser batch-parse ./建物謄本PDF範例/

# 2. Validate all outputs
for file in output/*.json; do
  /document-parser validate "$file"
done

# 3. Compare with baseline
diff -r output/ baseline/
```

### Baseline Establishment
First run creates baseline:

```bash
# Initial baseline
/document-parser batch-parse ./建物謄本PDF範例/
cp -r output/ baseline/
```

Future runs compare against baseline.

## Reporting Issues

When reporting extraction errors, include:

1. **Sample PDF** (if not sensitive)
2. **Generated JSON** (full output)
3. **Confidence score**
4. **Specific fields** with errors
5. **Expected values** from manual review
6. **Error messages** (if any)

### Issue Template
```markdown
### Document Parser Issue

**Document**: 102AF022944REG02E9EC68747504C53A80B70B286C68179.pdf
**Confidence Score**: 0.78
**Issue Type**: Field extraction error

**Problem**:
- Field: `ownershipSection.owner.address`
- Extracted: "台北市大安區..."
- Expected: "台北市大安區仁愛里１９鄰..."
- Missing: 里鄰 information

**Notes**:
- Special characters present in address
- OCR may have skipped segment
```

## Test Coverage Goals

### Phase 1 (Current)
- ✅ Basic parsing (18 samples)
- ✅ Schema validation
- ✅ Confidence scoring
- ⚠️ Edge case handling (partial)

### Phase 2 (Next)
- 📋 Multi-page documents
- 📋 Poor quality scans
- 📋 Handwritten annotations
- 📋 Non-standard formats

### Phase 3 (Future)
- 📋 100+ document corpus
- 📋 Automated regression suite
- 📋 Performance benchmarking
- 📋 Cross-validation with government API

## Success Criteria

A test run is successful when:

1. ✅ All 18 sample documents process without errors
2. ✅ Average confidence score ≥ 0.85
3. ✅ All outputs pass schema validation
4. ✅ Critical fields (owner, address, area) 100% accurate
5. ✅ Processing time within acceptable range
6. ✅ No manual intervention required for standard documents

## Next Steps After Testing

### If Tests Pass
1. Document results
2. Commit changes to git
3. Proceed with production integration planning
4. Begin Python microservice development

### If Tests Fail
1. Document failure patterns
2. Update extraction guidelines
3. Refine prompts
4. Re-test with adjustments
5. Consider manual verification workflow

---

**Test Suite Version**: 1.0.0
**Last Updated**: 2024-01-11
**Status**: Active
