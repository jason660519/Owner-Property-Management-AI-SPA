# Document Parser Quick Start Guide

## 🚀 Get Started in 30 Seconds

### Test with One Document
```bash
/document-parser parse-building ./建物謄本PDF範例/102AF022944REG02E9EC68747504C53A80B70B286C68179.pdf
```

### Process All Sample Documents
```bash
/document-parser batch-parse ./建物謄本PDF範例/
```

That's it! You'll get structured JSON output with property data.

## 📋 What You Get

**Input**: PDF building transcript (建物謄本)

**Output**: Clean JSON with:
```json
{
  "buildingIdentification": {
    "address": "敦化南路一段２３６巷５號十樓",
    "totalArea": 224.82,
    "mainPurpose": "住家用"
  },
  "ownershipSection": {
    "owner": {
      "name": "謝裕隆"
    },
    "ownershipRatio": "全部"
  }
}
```

## 📊 Sample Dataset

You have **18 real building transcripts** ready to test:
- Location: `./建物謄本PDF範例/`
- Various building types and ownership structures
- Perfect for testing the parser

## 🎯 Common Use Cases

### 1. Property Onboarding
When landlord uploads documents:
```bash
/document-parser parse-building <their-pdf>
# → Extract address, area, owner
# → Auto-fill property listing
```

### 2. Bulk Import
Import multiple properties:
```bash
/document-parser batch-parse ./new-properties/
# → Process all PDFs
# → Generate database-ready JSONs
```

### 3. Data Verification
Verify property ownership:
```bash
/document-parser parse-building <transcript>
# → Extract owner name
# → Compare with user account
```

## ✅ Quality Checks

Every extraction includes:
- **Confidence Score** (0-1): Higher is better
- **Review Flags**: Fields needing verification
- **Processing Notes**: Warnings and observations

**Good extraction**: Confidence ≥ 0.85
**Needs review**: Confidence < 0.85

## 🔧 Next Steps

### After Testing
1. ✅ Test with sample PDFs (confirm accuracy)
2. ✅ Review output JSON structure
3. ✅ Check confidence scores
4. ✅ Test with your own PDFs

### Integration Planning
1. 📋 Design database schema (ClickHouse)
2. 📋 Create REST API endpoints
3. 📋 Build UI for document upload
4. 📋 Add manual review workflow

### Production Migration
1. 📋 Develop Python microservice
2. 📋 Add local OCR engine
3. 📋 Implement batch processing queue
4. 📋 Deploy monitoring and logging

## 📚 Full Documentation

- [README.md](./README.md) - Complete overview
- [SKILL.md](./SKILL.md) - Detailed skill documentation
- [extraction-guidelines.md](./prompts/extraction-guidelines.md) - Best practices
- [run-tests.md](./tests/run-tests.md) - Testing guide

## 💡 Tips

**Best Results**:
- Use clear, high-quality PDF scans
- Official government transcripts work best
- Standard format documents (第二類謄本)

**Avoid**:
- Very poor quality scans (<300 DPI)
- Handwritten documents
- Partial or damaged PDFs
- Password-protected files

## ❓ Troubleshooting

**Low confidence score?**
→ Check PDF quality, request better scan

**Missing fields?**
→ Verify document type (節本 vs 全部謄本)

**Character errors?**
→ See extraction-guidelines.md for special characters

**Validation failed?**
→ Run: `/document-parser validate <json-file>`

## 🎉 Success Criteria

You're ready for production when:
- ✅ All 18 samples process successfully
- ✅ Average confidence ≥ 0.85
- ✅ Critical fields (owner, address, area) 100% accurate
- ✅ Processing time <15s per document
- ✅ Schema validation passes for all outputs

---

**Need Help?** Check the full documentation in README.md and SKILL.md

**Ready to Scale?** See the migration plan in SKILL.md (Phase 2: Python Microservice)
