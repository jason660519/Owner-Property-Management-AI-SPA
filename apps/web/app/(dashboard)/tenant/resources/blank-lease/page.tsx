'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FileText, Download, Printer } from 'lucide-react'

const leaseContent = `
住宅租賃契約書 (範本)

立契約書人：
出租人：____________________ (以下簡稱甲方)
承租人：____________________ (以下簡稱乙方)

茲因甲方願將所有坐落於 ____________________ 之房屋出租給乙方，雙方議定租賃條件如下：

第一條：租賃標的
房屋所在地：________________________________________
使用範圍：________________________________________

第二條：租賃期限
自民國 ____ 年 ____ 月 ____ 日起至民國 ____ 年 ____ 月 ____ 日止，共計 ____ 年 ____ 個月。

第三條：租金及支付方式
1. 每月租金新台幣 ________ 元整。
2. 乙方應於每月 ____ 日前，將租金支付予甲方。
3. 支付方式：□現金 □轉帳 (銀行：____ 分行：____ 帳號：________)

第四條：押金
1. 押金新台幣 ________ 元整。
2. 租賃期滿，乙方交還房屋且無違約或積欠費用情事者，甲方應無息退還押金。

第五條：使用租賃物之限制
1. 本房屋係供 ________ 使用，乙方不得非法使用或存放危險物品。
2. 未經甲方同意，乙方不得將房屋全部或一部轉租、出借、頂讓或以其他變相方法由他人使用。
3. 房屋有改裝設施之必要時，乙方應取得甲方之同意後始得自行裝設，但不得損害原有建築。

第六條：修繕及改裝
1. 房屋之修繕，除契約另有約定或因乙方之故意或過失致毀損者外，由甲方負擔。
2. 乙方如有改裝設施之必要，應取得甲方之同意。

第七條：租賃期滿
租賃期滿，乙方應即將房屋按照原狀遷空交還甲方，不得藉詞推委或主張任何權利。

第八條：違約處罰
1. 乙方如有違約情事，致甲方受有損害者，乙方應負賠償責任。
2. 乙方如積欠租金達兩個月以上，經甲方催告限期繳納仍不支付時，甲方得終止契約。

第九條：其他約定
1. ________________________________________________
2. ________________________________________________

立契約書人
甲方：
身分證字號：
電話：
地址：

乙方：
身分證字號：
電話：
地址：

中華民國 ____ 年 ____ 月 ____ 日
`

export default function BlankLeasePage() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">空白租約範本</h1>
          <p className="text-[#999999]">檢視標準住宅租賃契約書內容</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="hidden md:flex">
            <Printer className="w-4 h-4 mr-2" />
            列印
          </Button>
          <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
            <Download className="w-4 h-4 mr-2" />
            下載 PDF
          </Button>
        </div>
      </div>

      <Card className="bg-[#262626] border-[#333333]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#7C3AED]" />
            <CardTitle className="text-white">住宅租賃契約書</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-white text-black p-8 rounded-md shadow-sm overflow-auto max-h-[600px] font-serif whitespace-pre-wrap leading-relaxed">
            {leaseContent}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
