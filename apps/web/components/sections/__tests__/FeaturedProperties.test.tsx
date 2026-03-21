import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { FeaturedProperties } from "@/components/sections/FeaturedProperties";
import type { Property } from "@/lib/api/properties";

const mockProperties: Property[] = [
  {
    id: "property-1",
    title: "台北信義協作案件",
    description: "適合自售房東與仲介共同推進的市中心案件。",
    address: "台北市信義區",
    type: "公寓",
    status: "sale",
    statusLabel: "available",
    price: "NT$ 25,000,000",
    rawPrice: 25000000,
    area: 35,
    bedrooms: 3,
    bathrooms: 2,
    imageUrl: "/images/property-1.jpg",
    images: ["/images/property-1.jpg"],
    created_at: "2026-03-22T00:00:00.000Z",
  },
  {
    id: "property-2",
    title: "新店分店帶看案件",
    description: "可供分店主管追蹤帶看節點的買賣案件。",
    address: "新北市新店區",
    type: "別墅",
    status: "sale",
    statusLabel: "available",
    price: "NT$ 48,000,000",
    rawPrice: 48000000,
    area: 85,
    bedrooms: 4,
    bathrooms: 3,
    imageUrl: "/images/property-2.jpg",
    images: ["/images/property-2.jpg"],
    created_at: "2026-03-22T00:00:00.000Z",
  },
  {
    id: "property-3",
    title: "淡水租賃導流案件",
    description: "租客與房東先進場，再導入代書與簽約流程。",
    address: "新北市淡水區",
    type: "套房",
    status: "rent",
    statusLabel: "vacant",
    price: "NT$ 35,000/月",
    rawPrice: 35000,
    area: 15,
    bedrooms: 2,
    bathrooms: 1,
    imageUrl: "/images/property-3.jpg",
    images: ["/images/property-3.jpg"],
    created_at: "2026-03-22T00:00:00.000Z",
  },
];

describe("FeaturedProperties", () => {
  test("應顯示多角色案件入口文案與 CTA", () => {
    render(<FeaturedProperties properties={mockProperties} />);

    expect(screen.getByText(/精選案件入口/i)).toBeInTheDocument();
    expect(
      screen.getByText(/先讓案件進場，再把協作角色接上/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看全部案件/i })).toHaveAttribute(
      "href",
      "/properties",
    );
    expect(screen.getByRole("link", { name: /查看平台能力/i })).toHaveAttribute(
      "href",
      "/services",
    );
  });

  test("應顯示模擬資料提醒與案件卡內容", () => {
    render(<FeaturedProperties properties={mockProperties} isMock />);

    expect(screen.getByText(/目前系統正使用模擬資料模式/i)).toBeInTheDocument();
    expect(screen.getByText("台北信義協作案件")).toBeInTheDocument();
    expect(screen.getByText("新店分店帶看案件")).toBeInTheDocument();
    expect(screen.getByText("淡水租賃導流案件")).toBeInTheDocument();
    expect(screen.getAllByText(/買賣協作鏈/i)).toHaveLength(2);
    expect(screen.getByText(/租賃協作鏈/i)).toBeInTheDocument();
  });
});
