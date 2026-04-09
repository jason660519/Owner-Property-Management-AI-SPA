import JSZip from 'jszip';
import {
  buildContractDocumentFileName,
  getContractOfficialDocxTemplatePath,
  renderContractDocumentDocx,
  renderContractDocumentHtml,
} from '../contract-document-renderer';
import type { ContractDraft } from '@/lib/types/contracts';

async function createBaseTemplateDocx() {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '</Types>',
  ].join(''));

  zip.folder('_rels')?.file('.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '</Relationships>',
  ].join(''));

  zip.folder('word')?.file('document.xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<w:body>',
    '<w:p><w:r><w:t>原始官方內容</w:t></w:r></w:p>',
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr>',
    '</w:body>',
    '</w:document>',
  ].join(''));

  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>',
    '</Relationships>',
  ].join(''));

  zip.folder('word')?.folder('theme')?.file('theme1.xml', '<theme>official-template-theme</theme>');

  return zip.generateAsync({ type: 'uint8array' });
}

async function createOfficialLeaseTemplateDocx() {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '</Types>',
  ].join(''));

  zip.folder('_rels')?.file('.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '</Relationships>',
  ].join(''));

  zip.folder('word')?.file('document.xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    '<w:p><w:r><w:t>契約審閱權</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>本契約於中華民國　　　年　　　月　　　日經承租人攜回審閱</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>房屋租賃契約書範本</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>立契約書人</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第一條　　房屋標示及租賃範圍</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>房屋標示：原始空白內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第二條　　租賃 附屬設備</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>附屬設備原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第三條　　租賃期間</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>租賃期間原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第四條　　租金約定及支付</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>租金原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第五條　　擔保金（押金）約定及返還</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>押金原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第九條　　使用房屋之限制</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>本房屋係供＿＿之使用。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第十四條　　租賃物之返還</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>租賃契約終止時，承租人應即將房屋返還出租人，不應藉詞推諉或主張任何權利。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>倍支付違約金至遷讓完竣，承租人及保證人不得有異議。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第十六條　　其他約定</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>其他約定原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第二十四條　　契約分存</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>本契約書壹式　　　份，由立契約人各執乙份，以昭信守。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第二十五條　　未盡事宜</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>本契約如有未盡事宜，依有關法令、習慣及誠實信用原則公平解決之。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第二十六條　　範本之使用</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>如在契約中表明使用內政部範本，而記載文字與範本不符者，仍以原範本之文字為準。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>附件</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>□其他（測量成果圖、室內空間現狀照片）</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>立契約書人</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>出租人：　　　　　　　　（簽章）</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>國民身分證統一編號：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>地址：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>電話：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>承租人：　　　　　　　　（簽章）</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>國民身分證統一編號：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>地址：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>電話：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>中　　　華　　　民　　　國　　　　　年　　　　　月　　　　　日</w:t></w:r></w:p>',
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr>',
    '</w:body>',
    '</w:document>',
  ].join(''));

  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
  ].join(''));

  return zip.generateAsync({ type: 'uint8array' });
}

async function createOfficialSaleTemplateDocx() {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '</Types>',
  ].join(''));

  zip.folder('_rels')?.file('.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '</Relationships>',
  ].join(''));

  zip.folder('word')?.file('document.xml', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    '<w:p><w:r><w:t>契約審閱權</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>契約於中華民國　　　年　　　月　　　日經買方攜回審閱</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>成　屋　買　賣　契　約　書　範　本</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>立契約書人</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第一條　　買賣標的</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>買賣標的原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第二條　　價款議定</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>本買賣總價款為新台幣元整。土地、建物及車位價款分別如下：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>一、土地價款：新台幣元整。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>二、建物價款：新台幣元整。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>三、車位價款：土地部分新台幣元整。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>建物部分新台幣元整。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第三條　　付款約定</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>付款約定原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>簽約款</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>新臺幣　　　　　　元</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>簽約款原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>備證款</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>新臺幣　　　　　　元</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>備證款原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>完稅款</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>新臺幣　　　　　　元</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>完稅款原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>交屋款</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>新臺幣　　　　　　元</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>交屋款原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第五條　　貸款處理之二</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>買方應於交付完稅款同時開立與未付價款同額且註明「禁止背書轉讓」之本票。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第六條　　產權移轉</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>產權移轉原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第七條　　稅費負擔</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>稅費負擔原始內容一</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>稅費負擔原始內容二</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>稅費負擔原始內容三</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>稅費負擔原始內容四</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>本買賣契約有關之稅費、代辦費，依下列約定辦理：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第八條　　點交</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>點交原始內容</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第十一條　　其他約定</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>履行本契約之各項通知均應以契約書上記載之地址為準，如有變更未經通知他方或　　　　　，致無法送達時（包括拒收），均以第一次郵遞之日期視為送達。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>因本契約發生之爭議，雙方同意...</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>本契約所定之權利義務對雙方之繼受人均有效力。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>建物被他人占用之情形：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>占用他人土地之情形：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>出租或出借情形：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>第十二條　　契約分存</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>本契約之附件及廣告為本契約之一部分。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>本契約如有未盡事宜，依有關法令、習慣及誠實信用原則公平解決之。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>本契約壹式兩份，雙方各執乙份為憑。副本由　　　　　留存。</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>立契約人</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>買　　　　　　　方：　　　　　　　　　　　　　簽章</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>國民身分證統一編號：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>地　　　　　　　址：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>電　　　　　　　話：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>賣　　　　　　　方：　　　　　　　　　　　　　簽章</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>國民身分證統一編號：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>地　　　　　　　址：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>電　　　　　　　話：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>見證人</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>姓　　　　　　　名：　　　　　　　　　　　　　簽章</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>國民身分證統一編號：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>地　　　　　　　址：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>電　　　　　　　話：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>姓　　　　　　　名：　　　　　　　　　　　　　簽章</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>國民身分證統一編號：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>地　　　　　　　址：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>電　　　　　　　話：</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>中　　　　華　　　　民　　　　國　　　　　　　年　　　　　　月　　　　　　　日</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>十三、買賣若透過仲介業務之公司（或商號）辦理者，應由該公司指派經紀人於本契約簽章。（不動產經紀業管理條例第二十二條）</w:t></w:r></w:p>',
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr>',
    '</w:body>',
    '</w:document>',
  ].join(''));

  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
  ].join(''));

  return zip.generateAsync({ type: 'uint8array' });
}

function createLeaseDraft(): ContractDraft {
  return {
    contractType: 'lease',
    draftStatus: 'draft',
    templateCode: 'tw-lease-template',
    templateVersion: '1.0.0',
    propertyId: 'property-lease-1',
    propertyAddress: '臺北市大安區仁愛路四段295號3樓',
    ownerName: '王大明',
    buildingTranscriptAttached: true,
    landTranscriptAttached: false,
    attachments: [
      {
        attachmentId: 'attach-1',
        attachmentType: 'building_transcript',
        fileName: 'building-transcript.pdf',
        storagePath: 'contracts/property-lease-1/building-transcript.pdf',
        isRequired: true,
        isAttached: true,
      },
    ],
    tenantName: '林小美',
    contractDate: '2026-03-20',
    leaseStartDate: '2026-04-01',
    leaseEndDate: '2027-03-31',
    monthlyRent: 32000,
    depositAmount: 64000,
    contractCopiesCount: 3,
    holdoverPenaltyMultiple: 2,
    paymentDueDay: 5,
    usePurpose: 'commercial',
    includedItems: ['冷氣', '冰箱'],
    specialTerms: '承租人不得飼養寵物。',
    transcriptAttachmentNote: '本契約附建物或土地謄本副本至少一份，供雙方核對標的資訊。',
    encumbranceSummary: '目前未見特別記載之他項權利。',
  };
}

function createSaleDraft(): ContractDraft {
  return {
    contractType: 'sale',
    draftStatus: 'draft',
    templateCode: 'tw-sale-template',
    templateVersion: '1.0.0',
    propertyId: 'property-sale-1',
    propertyAddress: '臺北市信義區松仁路100號15樓',
    ownerName: '陳賣方',
    buildingTranscriptAttached: true,
    landTranscriptAttached: true,
    attachments: [
      {
        attachmentId: 'attach-building',
        attachmentType: 'building_transcript',
        fileName: 'building-copy.pdf',
        storagePath: 'contracts/property-sale-1/building-copy.pdf',
        isRequired: true,
        isAttached: true,
      },
      {
        attachmentId: 'attach-land',
        attachmentType: 'land_transcript',
        fileName: 'land-copy.pdf',
        storagePath: 'contracts/property-sale-1/land-copy.pdf',
        isRequired: true,
        isAttached: true,
      },
    ],
    sellerName: '陳賣方',
    buyerName: '黃買方<script>alert(1)</script>',
    agentName: '王經紀',
    brokerName: '安心房屋仲介股份有限公司',
    scrivenerName: '林代書',
    buildingNumber: '信義建字第123號',
    landNumbers: ['信義段一小段100地號'],
    landPrice: 16000000,
    buildingPrice: 8200000,
    parkingLandPrice: 600000,
    parkingBuildingPrice: 1000000,
    parkingInfo: '坡道平面車位 1 位',
    deliveryCondition: '依現況點交，附建物現況確認書。',
    transcriptSections: {
      buildingDescription: { title: '建物標示部', content: '建號 123，建物面積 30 坪。', transcriptType: 'building' },
      buildingOwnership: { title: '建物所有權部', content: '所有權人陳賣方，持分全部。', transcriptType: 'building' },
      landDescription: { title: '土地標示部', content: '地號 100，使用分區住三。', transcriptType: 'land' },
      landOwnership: { title: '土地所有權部', content: '所有權人陳賣方，持分全部。', transcriptType: 'land' },
    },
    salePriceTotal: 25800000,
    taxAllocation: '土地增值稅由賣方負擔，地價稅與房屋稅以點交日為準按比例分擔。',
    registrationFeeAllocation: '所有權移轉登記規費、印花稅及契稅由買方負擔。',
    brokerFeeAllocation: '仲介費由買賣雙方各自負擔二分之一。',
    escrowMethod: '價金履約保證專戶辦理。',
    occupiedByOthersCondition: '目前由前屋主持續占用，點交前完成遷離。',
    encroachmentCondition: '無占用他人土地情形。',
    leaseBorrowCondition: '現有租客已同意於交屋日前終止租約。',
    copyRetentionHolder: '永慶代書事務所',
    defaultClauseSummary: '若有未盡事宜，雙方同意另以書面特約補充。',
    paymentSchedule: [
      { label: '簽約款', amount: 1000000, dueDate: '2026-04-01' },
      { label: '尾款', amount: 24800000, dueDate: '2026-06-30' },
    ],
    transcriptAttachmentNote: '本契約附建物謄本及土地謄本副本各一份，供雙方核對標的與權利狀態。',
    manualReviewRequired: true,
    riskNotes: '有抵押設定，請人工確認清償流程。',
  };
}

describe('contract-document-renderer', () => {
  it('renders a lease contract HTML document', () => {
    const html = renderContractDocumentHtml(createLeaseDraft());

    expect(html).toContain('房屋租賃契約書草稿');
    expect(html).toContain('契約審閱權');
    expect(html).toContain('第一條 房屋標示及租賃範圍');
    expect(html).toContain('第二條 租賃附屬設備');
    expect(html).toContain('附屬設備：冷氣、冰箱');
    expect(html).toContain('第四條 租金約定及支付');
    expect(html).toContain('第九條 使用房屋之限制');
    expect(html).toContain('本房屋係供 商業 之使用。');
    expect(html).toContain('第十四條 租賃物之返還');
    expect(html).toContain('第十六條 其他約定');
    expect(html).toContain('其他特約：承租人不得飼養寵物。');
    expect(html).toContain('承租人未即時遷出返還房屋時，出租人每月得向承租人請求按照月租金 2 倍支付違約金至遷讓完竣');
    expect(html).toContain('第二十四條 契約分存');
    expect(html).toContain('本契約書壹式 3 份，由立契約人各執乙份，以昭信守。');
    expect(html).toContain('第二十六條 範本之使用');
    expect(html).toContain('出租人');
    expect(html).toContain('林小美');
    expect(html).toContain('本契約附建物或土地謄本副本至少一份');
    expect(html).not.toContain('{{');
  });

  it('escapes sale contract values before rendering HTML', () => {
    const html = renderContractDocumentHtml(createSaleDraft());

    expect(html).toContain('成屋買賣契約書草稿');
    expect(html).toContain('契約審閱權');
    expect(html).toContain('第一條　買賣標的');
    expect(html).toContain('第三條　付款約定');
    expect(html).toContain('第七條　稅費負擔');
    expect(html).toContain('第八條　點交');
    expect(html).toContain('第十條　違約罰則');
    expect(html).toContain('價金履約保證專戶辦理。');
    expect(html).toContain('若有未盡事宜，雙方同意另以書面特約補充。');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('林代書');
    expect(html).toContain('建物標示部');
    expect(html).toContain('有抵押設定，請人工確認清償流程。');
    expect(html).not.toContain('{{');
  });

  it('builds a localized file name for exports', () => {
    expect(buildContractDocumentFileName(createLeaseDraft())).toBe('租賃契約草稿-property-lease-1.html');
    expect(buildContractDocumentFileName(createSaleDraft())).toBe('買賣契約草稿-property-sale-1.html');
    expect(buildContractDocumentFileName(createLeaseDraft(), 'docx')).toBe('租賃契約草稿-property-lease-1.docx');
    expect(buildContractDocumentFileName(createSaleDraft(), 'docx')).toBe('買賣契約草稿-property-sale-1.docx');
    expect(getContractOfficialDocxTemplatePath('lease')).toBe('/contract-templates/tw-lease-template.docx');
    expect(getContractOfficialDocxTemplatePath('sale')).toBe('/contract-templates/tw-sale-template.docx');
  });

  it('builds a docx package with embedded HTML contract content', async () => {
    const buffer = await renderContractDocumentDocx(createSaleDraft());
    const zip = await JSZip.loadAsync(buffer);

    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      '[Content_Types].xml',
      '_rels/.rels',
      'word/document.xml',
      'word/_rels/document.xml.rels',
      'word/afchunk.html',
    ]));

    const documentXml = await zip.file('word/document.xml')?.async('string');
    const chunkHtml = await zip.file('word/afchunk.html')?.async('string');

    expect(documentXml).toContain('w:altChunk');
    expect(chunkHtml).toContain('成屋買賣契約書草稿');
    expect(chunkHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(chunkHtml).not.toContain('{{');
  });

  it('reuses official template packages when template bytes are provided', async () => {
    const templateDocxBytes = await createBaseTemplateDocx();
    const buffer = await renderContractDocumentDocx(createLeaseDraft(), { templateDocxBytes });
    const zip = await JSZip.loadAsync(buffer);

    const contentTypesXml = await zip.file('[Content_Types].xml')?.async('string');
    const documentXml = await zip.file('word/document.xml')?.async('string');
    const relationshipsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');
    const themeXml = await zip.file('word/theme/theme1.xml')?.async('string');

    expect(themeXml).toContain('official-template-theme');
    expect(contentTypesXml).toContain('Extension="html"');
    expect(documentXml).toContain('w:altChunk');
    expect(documentXml).toContain('w:pgSz w:w="12240" w:h="15840"');
    expect(documentXml).not.toContain('原始官方內容');
    expect(relationshipsXml).toContain('Target="theme/theme1.xml"');
    expect(relationshipsXml).toContain('Target="afchunk.html"');
  });

  it('replaces key official lease template paragraphs inline when anchors exist', async () => {
    const templateDocxBytes = await createOfficialLeaseTemplateDocx();
    const buffer = await renderContractDocumentDocx(createLeaseDraft(), { templateDocxBytes });
    const zip = await JSZip.loadAsync(buffer);

    const documentXml = await zip.file('word/document.xml')?.async('string');
    const relationshipsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');

    expect(documentXml).toContain('房屋租賃契約書草稿');
    expect(documentXml).toContain('王大明');
    expect(documentXml).toContain('林小美');
    expect(documentXml).toContain('臺北市大安區仁愛路四段295號3樓');
    expect(documentXml).toContain('租賃附屬設備：冷氣、冰箱');
    expect(documentXml).toContain('每月應繳月租金新台幣 32,000 元整');
    expect(documentXml).toContain('擔保金新台幣 64,000 元整');
    expect(documentXml).toContain('本房屋係供商業之使用。');
    expect(documentXml).toContain('承租人未即時遷出返還房屋時，出租人每月得向承租人請求按照月租金2倍支付違約金至遷讓完竣，承租人及保證人不得有異議。');
    expect(documentXml).toContain('其他特約：承租人不得飼養寵物。');
    expect(documentXml).toContain('目前未見特別記載之他項權利');
    expect(documentXml).toContain('本契約書壹式3份，由立契約人各執乙份，以昭信守。');
    expect(documentXml).toContain('出租人：王大明（簽章）');
    expect(documentXml).toContain('承租人：林小美（簽章）');
    expect(documentXml).toContain('中華民國115年03月20日');
    expect(documentXml).not.toContain('w:altChunk');
    expect(relationshipsXml).not.toContain('afchunk.html');
  });

  it('replaces key official sale template payment paragraphs inline when anchors exist', async () => {
    const saleDraft = {
      ...createSaleDraft(),
      contractDate: '2026-03-20',
      ownershipTransferDate: '2026-06-20',
      handoverDate: '2026-06-30',
      paymentSchedule: [
        { label: '簽約款', amount: 1000000, dueDate: '2026-03-20' },
        { label: '備證款', amount: 5000000, dueDate: '2026-04-01' },
        { label: '完稅款', amount: 7000000, dueDate: '2026-05-01' },
        { label: '交屋款', amount: 12800000, dueDate: '2026-06-30' },
      ],
    } satisfies ContractDraft;
    const templateDocxBytes = await createOfficialSaleTemplateDocx();
    const buffer = await renderContractDocumentDocx(saleDraft, { templateDocxBytes });
    const zip = await JSZip.loadAsync(buffer);

    const documentXml = await zip.file('word/document.xml')?.async('string');
    const relationshipsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');

    expect(documentXml).toContain('成屋買賣契約書草稿');
    expect(documentXml).toContain('臺北市信義區松仁路100號15樓');
    expect(documentXml).toContain('土地標示：地號 100，使用分區住三。');
    expect(documentXml).toContain('土地權利：所有權人陳賣方，持分全部。');
    expect(documentXml).toContain('建物標示：建號 123，建物面積 30 坪。');
    expect(documentXml).toContain('建物權利：所有權人陳賣方，持分全部。');
    expect(documentXml).toContain('停車位：坡道平面車位 1 位');
    expect(documentXml).toContain('交付現況：依現況點交，附建物現況確認書。');
    expect(documentXml).toContain('本買賣總價款為新台幣 25,800,000 元整');
    expect(documentXml).toContain('一、土地價款：新台幣 16,000,000 元整。');
    expect(documentXml).toContain('二、建物價款：新台幣 8,200,000 元整。');
    expect(documentXml).toContain('三、車位價款：土地部分新台幣 600,000 元整。');
    expect(documentXml).toContain('建物部分新台幣 1,000,000 元整。');
    expect(documentXml).toContain('新臺幣1,000,000元');
    expect(documentXml).toContain('新臺幣5,000,000元');
    expect(documentXml).toContain('新臺幣7,000,000元');
    expect(documentXml).toContain('新臺幣12,800,000元');
    expect(documentXml).toContain('價金履約／保管方式：價金履約保證專戶辦理。');
    expect(documentXml).toContain('所有權移轉預定日為中華民國115年06月20日，並交由林代書專責辦理。');
    expect(documentXml).toContain('稅費負擔：土地增值稅由賣方負擔，地價稅與房屋稅以點交日為準按比例分擔。');
    expect(documentXml).toContain('登記規費：所有權移轉登記規費、印花稅及契稅由買方負擔。');
    expect(documentXml).toContain('本買賣契約有關之稅費、代辦費：仲介費由買賣雙方各自負擔二分之一。');
    expect(documentXml).toContain('交屋日：中華民國115年06月30日');
    expect(documentXml).toContain('建物被他人占用之情形：目前由前屋主持續占用，點交前完成遷離。');
    expect(documentXml).toContain('占用他人土地之情形：無占用他人土地情形。');
    expect(documentXml).toContain('出租或出借情形：現有租客已同意於交屋日前終止租約。');
    expect(documentXml).toContain('本契約壹式兩份，雙方各執乙份為憑。副本由永慶代書事務所留存。');
    expect(documentXml).toContain('買方：黃買方&lt;script&gt;alert(1)&lt;/script&gt; 簽章');
    expect(documentXml).toContain('賣方：陳賣方 簽章');
    expect(documentXml).toContain('中華民國115年03月20日');
    expect(documentXml).toContain('經紀業：安心房屋仲介股份有限公司；經紀人：王經紀');
    expect(documentXml).not.toContain('w:altChunk');
    expect(relationshipsXml).not.toContain('afchunk.html');
  });
});