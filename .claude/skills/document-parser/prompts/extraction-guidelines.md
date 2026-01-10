# Document Extraction Guidelines & Best Practices

## Overview
This document provides best practices for extracting data from Taiwan real estate documents, with a focus on accuracy, consistency, and handling edge cases.

## Character Encoding Issues

### Special Traditional Chinese Characters
Taiwan government documents use special Unicode characters that may cause OCR issues:

| Character | Unicode | Common In | Standard Alternative |
|-----------|---------|-----------|---------------------|
| ㆒ | U+3181 | Numbers (一) | 一 |
| ㆓ | U+3182 | Numbers (二) | 二 |
| ㆔ | U+3183 | Numbers (三) | 三 |
| ㈲ | U+3232 | 有限公司 | 有 |
| ㈾ | U+3236 | 資本 | 資 |
| ㈪ | U+3228 | Month (月) | 月 |
| ㈰ | U+3230 | Day (日) | 日 |
| ㊞ | U+325E | 印刷 | 印 |
| ㈹ | U+3239 | 代表 | 代 |
| ㊣ | U+3263 | 正本 | 正 |

**Handling Strategy**:
- Preserve original characters if clearly readable
- Note character encoding issues in `extractionMetadata.notes`
- Provide standard alternatives in parentheses if needed

## Date Format Handling

### ROC (Republic of China) Calendar
Taiwan uses 民國 (Minguo) calendar where Year 1 = 1912 CE.

**Conversion Formula**: 民國年 + 1911 = 西元年

Examples:
- 民國093年 = 2004 CE (93 + 1911)
- 民國102年 = 2013 CE (102 + 1911)
- 民國113年 = 2024 CE (113 + 1911)

**Extraction Strategy**:
- Keep original format: `民國093年03月22日`
- Optionally add ISO format in metadata: `2004-03-22`
- Never lose the original ROC date

### Incomplete Dates
Sometimes dates show as: `民國---年--月--日`

**Handling**:
- Extract as-is: `民國---年--月--日`
- Set `fieldsRequiringReview: ["constructionCompletionDate"]`
- Note: "Incomplete date in original document"

## Area and Measurement Handling

### Area Units
All areas in Taiwan transcripts are in **平方公尺** (square meters, m²).

**Common Conversions** (for reference only, don't convert in extraction):
- 1 坪 (ping) ≈ 3.306 m²
- 1 m² ≈ 0.3025 坪

### Masked Areas (*****)
Format: `****224.82平方公尺`

**Extraction Strategy**:
1. Extract visible numbers: `224.82`
2. Note masking: `fieldsRequiringReview: ["totalArea"]`
3. Add note: "Partial masking present in original"

### Multiple Area Entries
Buildings may have:
- **主建物面積** (Main building area)
- **附屬建物面積** (Auxiliary area) - e.g., balcony, terrace
- **共有部分面積** (Common area) - e.g., shared facilities

**Structure**:
```json
{
  "totalArea": 224.82,
  "floorDetails": [
    {"floorLevel": "十層", "area": 224.82}
  ],
  "auxiliaryBuildings": [
    {"purpose": "陽台", "area": 36.18}
  ],
  "commonAreas": [
    {
      "buildingNumber": "01719-000",
      "area": 2424.04,
      "ownershipRatio": "242404分之3564"
    }
  ]
}
```

## Ownership Ratio Handling

### Format Patterns
Taiwan uses fraction notation: `[分母]分之[分子]`

Examples:
- `全部` or `1分之1` → Full ownership
- `242404分之3564` → 3564/242404 share
- `2分之1` → 1/2 share

**Extraction**:
- Keep original Chinese format
- Extract denominator and numerator separately if needed for calculations
- Never convert to decimal in extraction phase

### Common Area Ownership (公設持分)
Multiple common area entries may reference different building numbers.

**Pattern**:
```
1683公設持分110377934188分之10215940009
1712公設持分110377934188分之1597121304
```

**Structure**:
```json
{
  "otherRegistrationNotes": [
    "1683公設持分110377934188分之10215940009",
    "1712公設持分110377934188分之1597121304"
  ]
}
```

## Address Parsing

### Taiwan Address Structure
`[縣市][區][路/街][段][巷/弄][號][樓層]`

Example: `台北市大安區仁愛里19鄰敦化南路1段236巷5號10樓`

Components:
- 縣市: 台北市
- 區: 大安區
- 里鄰: 仁愛里19鄰
- 路段: 敦化南路1段
- 巷: 236巷
- 號: 5號
- 樓層: 10樓

**Extraction Strategy**:
- Store complete address as single string
- Optionally parse components for database indexing (future enhancement)

## Registration Sequence and References

### Cross-References
Documents may reference:
- Other building numbers (建號)
- Related encumbrances (他項權利)
- Related registrations

Example: `相關他項權利登記次序：0004-000 0005-000`

**Structure**:
```json
{
  "relatedEncumbrances": ["0004-000", "0005-000"]
}
```

## Quality Control Checklist

### Before Returning Results
- [ ] All required schema fields present
- [ ] No null values in required fields
- [ ] Date formats consistent (ROC format)
- [ ] Areas are numbers, not strings
- [ ] Arrays properly structured (not single strings)
- [ ] Owner name extracted correctly
- [ ] Building number matches format: ####-###
- [ ] Confidence score assigned
- [ ] Review fields flagged if uncertain

### Common Errors to Avoid
1. ❌ Converting ROC dates to CE dates
2. ❌ Converting 坪 to m² (should stay in m²)
3. ❌ Splitting single addresses into array items
4. ❌ Losing special Unicode characters
5. ❌ Omitting asterisk-masked fields
6. ❌ Merging multiple common areas into one entry

### Red Flags for Manual Review
- Confidence score < 0.85
- Owner name contains numbers or special characters (unlikely)
- Total area doesn't match sum of floor areas
- Building number doesn't match section/district
- Registration dates are chronologically inconsistent
- Ownership ratio exceeds "1分之1" (unless co-ownership)

## Batch Processing Recommendations

### For Multiple Documents
1. Process documents sequentially, not in parallel (to track errors)
2. Maintain a processing log with filenames and confidence scores
3. Flag documents with confidence < 0.85 for human review
4. Generate summary report: extracted fields, missing data, errors

### Output File Naming
Convention: `{building-number}_{date-extracted}.json`

Example: `01691-000_20240111.json`

## Integration with Database

### ClickHouse Insertion Strategy
1. Validate JSON against schema before insertion
2. Use appropriate data types:
   - `String` for IDs and ratios
   - `Float64` for areas
   - `Date` for dates (convert ROC to CE for storage)
   - `Array(String)` for notes and arrays
3. Create separate tables for:
   - Main building data
   - Ownership records (with history)
   - Common areas (many-to-many relationship)

### Handling Updates
- Building data is immutable (use versioning)
- Ownership changes create new records
- Keep extraction timestamp for audit trail

## Edge Cases

### Multiple Owners
If ownership section shows co-ownership:
```json
{
  "owner": {
    "name": "謝裕隆、王美玲",  // Multiple names
    "address": "..."
  },
  "ownershipRatio": "2分之1"  // Each owns 1/2
}
```

Flag for review if structure is unclear.

### Commercial vs. Residential
Identify from `mainPurpose`:
- 住家用 → Residential
- 商業用 → Commercial
- 辦公室 → Office
- 店鋪 → Retail shop
- 工廠 → Factory

### Historic Buildings
May have:
- Very old construction dates
- Multiple registration amendments
- Complex ownership history
- Cultural heritage notes in `otherRegistrationNotes`

### Condominiums (公寓大廈)
Characterized by:
- Multiple common area entries
- Small ownership ratios (large denominators)
- Shared facilities in `otherRegistrationNotes`

## Troubleshooting

### Low Confidence Scores
**Causes**:
- Poor PDF quality or scan resolution
- Handwritten annotations
- Water damage or fading
- Complex layouts

**Solutions**:
- Request higher quality scan
- Manual verification of critical fields
- Use multiple extraction attempts and compare

### Inconsistent Extraction Results
**Causes**:
- Non-standard document formats
- Multiple document versions
- OCR instability

**Solutions**:
- Use deterministic extraction rules
- Validate against known good examples
- Implement field-level validation logic

### Missing Fields
**Causes**:
- Document is partial (節本 vs. 全部謄本)
- Fields genuinely not applicable
- OCR failed to detect section

**Solutions**:
- Check document type in header
- Verify against PDF visually
- Set appropriate null values with explanatory notes

## Future Enhancements

1. **Multi-page Document Handling**
   - Automatic page concatenation
   - Section boundary detection

2. **Historical Data Extraction**
   - Parse registration history (if present)
   - Track ownership changes over time

3. **Land Transcript Support**
   - Adapt schema for 土地登記謄本
   - Handle land-specific fields

4. **Automated Validation**
   - Cross-check with government API (if available)
   - Verify building numbers against official database

5. **Machine Learning Integration**
   - Train custom OCR model on Taiwan government docs
   - Improve field boundary detection
   - Automate quality scoring
