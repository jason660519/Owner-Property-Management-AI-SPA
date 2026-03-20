import type { ContractType } from '@/lib/types/contracts';

const leaseTemplate = `
  <h1>{{templateDisplayTitle}}</h1>
  <p class="muted">參考模板：{{templateSourceDocumentName}}</p>
  <h2>契約審閱權</h2>
  <p>本契約於簽署前，應由承租人攜回審閱，審閱期間至少 {{templateReviewPeriodDays}} 日。</p>
  <p>出租人簽章：________________　承租人簽章：________________</p>
  <table class="summary">
    <tr><th>契約狀態</th><td>{{draftStatus}}</td></tr>
    <tr><th>物件地址</th><td>{{propertyAddress}}</td></tr>
    <tr><th>出租人</th><td>{{ownerName}}</td></tr>
    <tr><th>承租人</th><td>{{tenantName}}</td></tr>
    <tr><th>租賃期間</th><td>{{leaseStartDate}} 至 {{leaseEndDate}}</td></tr>
    <tr><th>月租金</th><td>{{monthlyRent}}</td></tr>
    <tr><th>押金</th><td>{{depositAmount}}</td></tr>
    <tr><th>付款日</th><td>每月 {{paymentDueDay}} 日前</td></tr>
  </table>

  <h2>第一條 房屋標示及租賃範圍</h2>
  <p>房屋標示：{{propertyAddress}}</p>
  <p>{{buildingNumberLine}}</p>
  <p>{{landNumberLine}}</p>
  <p>租賃範圍：以目前建物現況、謄本記載及雙方點交內容為準。</p>
  <p>{{buildingAreaPingLine}}</p>
  <p>{{landAreaPingLine}}</p>

  <h2>第二條 租賃附屬設備</h2>
  <p>{{includedItemsLine}}</p>

  <h2>第三條 租賃期間</h2>
  <p>租期自 {{leaseStartDate}} 起至 {{leaseEndDate}} 止。</p>

  <h2>第四條 租金約定及支付</h2>
  <p>每月租金為 {{monthlyRent}}，承租人應於每月 {{paymentDueDay}} 日前支付。</p>
  <p>押金為 {{depositAmount}}。</p>

  <h2>第五條 擔保金（押金）約定及返還</h2>
  <p>押金於租期屆滿、承租人依約返還房屋且無積欠任何款項時返還之。</p>

  <h2>第六條 押租金方式給付租金</h2>
  <p>如雙方採押租金方式給付租金，其給付、抵充及返還方式，應依雙方另行約定辦理；未特別約定者，仍以第四條及第五條之月租金與押金約定為準。</p>

  <h2>第七條 租賃期間相關費用之支付</h2>
  <p>租賃期間，使用房屋所生之公共基金、管理費及其他相關費用，由雙方依約分擔；如未特別約定，租賃契約成立前之應繳費用由出租人負擔，成立後之使用性費用由實際使用人負擔。</p>

  <h2>第八條 稅費負擔</h2>
  <p>本租賃契約有關房屋稅、地價稅、印花稅、公證費、仲介費及其他代辦費用，除法令另有規定外，依雙方書面約定辦理；如未特別約定，房屋稅與地價稅由出租人負擔。</p>

  <h2>第九條 使用房屋之限制</h2>
  <p>{{usePurposeLine}}</p>
  <p>承租人應依房屋之通常使用方法及雙方約定用途使用房屋，不得違法使用、存放危險物品，或影響公共安全與鄰人安寧。</p>
  <p>未經出租人書面同意，承租人不得將房屋全部或一部轉租、出借或以其他方式供第三人使用。</p>

  <h2>第十條 修繕及改裝</h2>
  <p>房屋如有修繕必要，除可歸責於承租人之事由外，原則上由出租人負責修繕；承租人如需改裝設施，應先徵得出租人同意，並於返還房屋時依約回復原狀。</p>

  <h2>第十一條 承租人之責任</h2>
  <p>承租人應以善良管理人之注意保管房屋，如違反此義務致房屋毀損或滅失者，應負損害賠償責任。</p>

  <h2>第十二條 房屋部分滅失</h2>
  <p>租賃關係存續中，如因不可歸責於承租人之事由致房屋之一部滅失，承租人得按滅失部分請求減少租金；如無法達成租賃目的時，承租人得終止租賃契約。</p>

  <h2>第十三條 租期屆滿</h2>
  <p>本契約租期屆滿時，雙方得依約辦理續租；如任一方擬提前終止，應依雙方約定期間先行通知他方。</p>

  <h2>第十四條 租賃物之返還</h2>
  <p>租賃契約終止時，承租人應即將房屋返還出租人，不應藉詞推諉或主張任何權利。</p>
  <p>承租人未即時遷出返還房屋時，出租人每月得向承租人請求按照月租金 {{holdoverPenaltyMultiple}} 倍支付違約金至遷讓完竣，承租人及保證人不得有異議。</p>

  <h2>第十五條 房屋所有權之讓與</h2>
  <p>出租人於房屋交付後，如將所有權讓與第三人，除法令另有規定外，本租賃契約對受讓人仍繼續存在。</p>

  <h2>第十六條 其他約定</h2>
  <p>{{specialTermsLine}}</p>
  <p>{{buildingOwnershipSummaryLine}}</p>
  <p>{{landOwnershipSummaryLine}}</p>
  <p>{{encumbranceSummaryLine}}</p>
  <p>{{transcriptAttachmentNote}}</p>

  <h2>第十七條 遺留物之處理</h2>
  <p>承租人遷出時，如有遺留物品，雙方應依契約與法令處理；如需清運，相關費用得由押金或其他應返還款項中扣抵。</p>

  <h2>第十八條 送達及不能送達之處置</h2>
  <p>雙方相互間之通知，以本契約所載地址或後續書面通知之地址為準；如有變更未通知他方，致無法送達者，以第一次投遞日視為送達日。</p>

  <h2>第十九條 出租人終止租約</h2>
  <p>承租人如有遲付租金、違反使用限制、擅自轉租或積欠應分擔費用等重大違約情形，出租人得依法及依約終止租約。</p>

  <h2>第二十條 承租人終止租約</h2>
  <p>房屋如有危及承租人或其同居人安全、健康之瑕疵，或有應由出租人修繕而經催告仍未修繕之情形，承租人得依法終止租約。</p>

  <h2>第二十一條 疑義處理</h2>
  <p>本契約條款如有疑義，應依誠實信用原則及有利於承租人之解釋方法處理。</p>

  <h2>第二十二條 租賃契約之效力</h2>
  <p>本契約是否辦理公證，依雙方另行約定；其餘未盡事宜，悉依民法、土地法及相關法令辦理。</p>

  <h2>第二十三條 爭議處理</h2>
  <p>因本契約發生之爭議，雙方得先行調處或調解；如仍有訴訟必要，除專屬管轄外，以房屋所在地法院為第一審管轄法院。</p>

  <h2>第二十四條 契約分存</h2>
  <p>本契約書壹式 {{contractCopiesCount}} 份，由立契約人各執乙份，以昭信守。</p>

  <h2>第二十五條 未盡事宜</h2>
  <p>本契約如有未盡事宜，依有關法令、習慣及誠實信用原則公平解決之。</p>

  <h2>第二十六條 範本之使用</h2>
  <p>如契約表明使用主管機關範本，而記載文字與範本不符者，仍以原範本文字及相關強制規定為準。</p>

  <h2>附件</h2>
  <p>下列附件為本契約之一部分，雙方應於簽約前後逐項確認：</p>
  <table class="attachments">
    <thead>
      <tr>
        <th>附件類型</th>
        <th>檔名</th>
        <th>附件狀態</th>
        <th>必要性</th>
      </tr>
    </thead>
    <tbody>{{attachmentsRows}}</tbody>
  </table>

  <h2>立契約書人</h2>
  <div class="signature-grid">
    <div class="signature-box">
      <strong>出租人（甲方）</strong>
      <p>姓名：{{ownerName}}</p>
      <p>簽名／蓋章：</p>
    </div>
    <div class="signature-box">
      <strong>承租人（乙方）</strong>
      <p>姓名：{{tenantName}}</p>
      <p>簽名／蓋章：</p>
    </div>
  </div>
`;

const saleTemplate = `
  <h1>{{templateDisplayTitle}}</h1>
  <p class="muted">參考模板：{{templateSourceDocumentName}}</p>
  <h2>契約審閱權</h2>
  <p>本契約於簽署前，應由買方攜回審閱，審閱期間至少 {{templateReviewPeriodDays}} 日。</p>
  <p>買方簽章：________________　賣方簽章：________________</p>
  <table class="summary">
    <tr><th>契約狀態</th><td>{{draftStatus}}</td></tr>
    <tr><th>物件地址</th><td>{{propertyAddress}}</td></tr>
    <tr><th>賣方</th><td>{{sellerName}}</td></tr>
    <tr><th>買方</th><td>{{buyerName}}</td></tr>
    <tr><th>仲介經紀人</th><td>{{agentName}}</td></tr>
    <tr><th>仲介公司</th><td>{{brokerName}}</td></tr>
    <tr><th>代書／地政士</th><td>{{scrivenerName}}</td></tr>
    <tr><th>買賣總價</th><td>{{salePriceTotal}}</td></tr>
    <tr><th>交屋日</th><td>{{handoverDate}}</td></tr>
    <tr><th>過戶日</th><td>{{ownershipTransferDate}}</td></tr>
    <tr><th>人工覆核</th><td>{{manualReviewRequired}}</td></tr>
  </table>

  <h2>第一條 買賣標的</h2>
  <p>本契約買賣標的位於 {{propertyAddress}}，已登記者應以登記簿登載之面積及權利範圍為準。</p>
  <p>{{buildingNumberLine}}</p>
  <p>{{landNumbersLine}}</p>
  <p>本買賣範圍包括共同使用部分之應有部分在內，房屋現況除水電、門窗及固定設備外，應由雙方於建物現況確認書互為確認。</p>
  <p>{{deliveryConditionLine}}</p>

  <h2>第二條 價款議定</h2>
  <p>本買賣總價款為 {{salePriceTotal}}。</p>
  <p>{{salePriceBreakdownLines}}</p>

  <h2>第三條 付款約定</h2>
  <p>買方應依下列付款節點支付價款，雙方應依約同時履行備證、完稅、交屋及其他必要程序。</p>
  <table class="schedule">
    <thead>
      <tr>
        <th>付款期別</th>
        <th>約定付款金額</th>
        <th>日期</th>
        <th>備註</th>
      </tr>
    </thead>
    <tbody>{{paymentScheduleRows}}</tbody>
  </table>

  <h2>第四條 貸款處理之一</h2>
  <p>如買方預定辦理貸款抵付部分買賣價款，應依雙方約定之金融機構、核貸結果及撥付方式辦理；核貸不足或無法核貸之情形，依契約與法令處理。</p>
  {{riskNotesBlock}}

  <h2>第五條 貸款處理之二</h2>
  <p>如雙方另約定本票、擔保品或授權撥款等擔保機制，應於正式簽署版本記明其條件、金額及返還方式。</p>
  <p>{{escrowMethod}}</p>

  <h2>第六條 產權移轉</h2>
  <p>雙方應於備證款付款同時備齊所有權移轉登記所需文件，並依約配合用印、補件與其他必要程序。</p>
  <p>所有權移轉預定日：{{ownershipTransferDate}}</p>

  <h2>第七條 稅費負擔</h2>
  <p>地價稅、房屋稅、水電費、瓦斯費、管理費、公共基金等費用，以點交日為準按當年度日數比例分擔。</p>
  <p>{{taxAllocation}}</p>
  <p>{{registrationFeeAllocation}}</p>
  <p>{{brokerFeeAllocation}}</p>

  <h2>第八條 點交</h2>
  <p>本買賣成屋應由賣方於約定日期在現場點交買方，並於點交日前完成搬遷；如有未搬離之物件，視同廢棄物處理。</p>
  <p>交屋日：{{handoverDate}}</p>
  <p>{{transcriptAttachmentNote}}</p>

  <h2>第九條 擔保責任</h2>
  <p>賣方擔保本標的物產權清楚，並無一物數賣、被他人占用、占用他人土地、出租、設定他項權利或其他債務糾紛等情形；如有，應於完稅款交付日前負責排除或處理。</p>

  <h2>第十條 違約罰則</h2>
  <p>雙方如有違反本契約之情形，應依契約約定、民法及相關法令負違約責任；如造成他方損害，並應負損害賠償責任。</p>

  <h2>第十一條 其他約定</h2>
  <p>履行本契約之各項通知，應以契約所載地址為準；如有變更未通知他方致無法送達，以第一次郵遞之日期視為送達。</p>
  <p>建物被他人占用之情形：{{occupiedByOthersCondition}}</p>
  <p>占用他人土地之情形：{{encroachmentCondition}}</p>
  <p>出租或出借情形：{{leaseBorrowCondition}}</p>
  <p>{{defaultClauseSummary}}</p>

  <h2>謄本摘要</h2>
  {{transcriptSectionCards}}

  <h2>第十二條 契約分存</h2>
  <p>本契約之附件及廣告為本契約之一部分；如有未盡事宜，依有關法令、習慣及誠實信用原則公平解決。</p>
  <p>本契約壹式兩份，由雙方各執乙份為憑；副本由 {{copyRetentionHolder}} 留存。</p>
  <p>本契約壹式兩份，由雙方各執乙份為憑。</p>

  <h2>第十三條 仲介簽章</h2>
  <p>買賣若透過仲介業務之公司（或商號）辦理者，應由該公司指派經紀人於本契約簽章。</p>
  <p>{{brokerClauseLine}}</p>

  <h2>附件清單</h2>
  <table class="attachments">
    <thead>
      <tr>
        <th>附件類型</th>
        <th>檔名</th>
        <th>附件狀態</th>
        <th>必要性</th>
      </tr>
    </thead>
    <tbody>{{attachmentsRows}}</tbody>
  </table>

  <h2>立契約書人</h2>
  <div class="signature-grid">
    <div class="signature-box">
      <strong>賣方</strong>
      <p>姓名：{{sellerName}}</p>
      <p>簽名／蓋章：</p>
    </div>
    <div class="signature-box">
      <strong>買方</strong>
      <p>姓名：{{buyerName}}</p>
      <p>簽名／蓋章：</p>
    </div>
  </div>
`;

const templates: Record<ContractType, string> = {
  lease: leaseTemplate,
  sale: saleTemplate,
};

export function getContractTokenizedTemplate(contractType: ContractType) {
  return templates[contractType];
}

export function applyContractTemplateTokens(template: string, tokenMap: Record<string, string>) {
  return Object.entries(tokenMap).reduce((current, [token, value]) => {
    return current.split(token).join(value);
  }, template);
}