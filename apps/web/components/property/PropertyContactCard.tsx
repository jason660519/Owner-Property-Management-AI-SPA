"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface Props {
  isLoggedIn: boolean;
  propertyId?: string;
  propertyTitle?: string;
}

function buildContactHref(
  inquiryType: string,
  entryPoint:
    | "property-detail-viewing"
    | "property-detail-legal"
    | "property-detail-collaboration",
  propertyId?: string,
  propertyTitle?: string,
) {
  const params = new URLSearchParams({
    inquiryType,
    entryPoint,
    sourcePath: propertyId ? `/properties/${propertyId}` : "/properties",
  });

  if (propertyId) {
    params.set("propertyId", propertyId);
  }

  if (propertyTitle) {
    params.set("propertyTitle", propertyTitle);
  }

  return `/contact?${params.toString()}`;
}

/**
 * Right-column contact card on the property detail page.
 * Renders different UI for guests vs authenticated users.
 */
export function PropertyContactCard({
  isLoggedIn,
  propertyId,
  propertyTitle,
}: Props) {
  const collaborationHref = buildContactHref(
    "合作提案",
    "property-detail-collaboration",
    propertyId,
    propertyTitle,
  );

  if (!isLoggedIn) {
    return (
      <div className="bg-[#1A1A1A] p-8 rounded-xl border border-[#262626] sticky top-32">
        <h3 className="text-xl font-bold mb-3">對這筆案件有興趣？</h3>
        <p className="text-[#999999] mb-6">
          你可以先登入預約看房，也可以直接把合作需求丟進平台，讓我們協助安排仲介、代書或後續流程。
        </p>

        <div className="space-y-3">
          <Link href="/login?redirectTo=/properties" className="block">
            <Button variant="primary" fullWidth size="lg">
              登入以預約看房
            </Button>
          </Link>
          <Link href="/register" className="block">
            <Button variant="secondary" fullWidth size="lg">
              免費建立帳號
            </Button>
          </Link>
          <Link href={collaborationHref} className="block">
            <Button variant="outline" fullWidth size="lg">
              先談合作需求
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-[#262626] text-center">
          <p className="text-[#999999] mb-2">或直接致電服務專線</p>
          <p className="text-xl font-bold text-white">+61 405 142 777</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] p-8 rounded-xl border border-[#262626] sticky top-32">
      <h3 className="text-xl font-bold mb-3">選擇你要推進的下一步</h3>
      <p className="text-[#999999] mb-8">
        你可以直接從案件頁發起看房、簽約支援或合作角色邀請，讓詢問不再停留在單純留資料。
      </p>

      <div className="space-y-3">
        <Link
          href={buildContactHref(
            "看屋",
            "property-detail-viewing",
            propertyId,
            propertyTitle,
          )}
          className="block"
        >
          <Button variant="primary" fullWidth size="lg">
            預約看房
          </Button>
        </Link>
        <Link
          href={buildContactHref(
            "法律諮詢",
            "property-detail-legal",
            propertyId,
            propertyTitle,
          )}
          className="block"
        >
          <Button variant="secondary" fullWidth size="lg">
            詢問簽約支援
          </Button>
        </Link>
        <Link href={collaborationHref} className="block">
          <Button variant="outline" fullWidth size="lg">
            邀請合作角色
          </Button>
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-[#333333] bg-[#141414] p-4">
        <p className="text-sm text-[#CCCCCC] leading-6">
          若你是買家、租客、自售房東或自租房東，系統會先把需求送進案件流程；若你是仲介、代書、律師或其他合作單位，則會由平台協助安排接手節點。
        </p>
      </div>

      <div className="mt-8 pt-8 border-t border-[#262626] text-center">
        <p className="text-[#999999] mb-2">或直接致電服務專線</p>
        <p className="text-xl font-bold text-white">+61 405 142 777</p>
      </div>
    </div>
  );
}
