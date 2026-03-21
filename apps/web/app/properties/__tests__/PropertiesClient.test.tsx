import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import PropertiesClient from "@/app/properties/PropertiesClient";
import type { Property } from "@/lib/api/properties";

const mockProperties: Property[] = [
  {
    id: "sale-1",
    title: "台北信義自售案件",
    description: "由自售房東啟動、可交由仲介接續推進的市中心案件。",
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
    id: "rent-1",
    title: "淡水租賃協作案件",
    description: "租客、房東與簽約流程可在同一條工作流中接力。",
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

describe("PropertiesClient", () => {
  test("應顯示多角色案件市場定位與導流連結", () => {
    render(<PropertiesClient initialProperties={mockProperties} />);

    expect(
      screen.getByRole("heading", { name: /多角色案件市場/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/讓案件先進場，再選擇誰來接手推進/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看平台能力/i })).toHaveAttribute(
      "href",
      "/services",
    );
    expect(screen.getByRole("link", { name: /預約導入諮詢/i })).toHaveAttribute(
      "href",
      "/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88",
    );
  });

  test("應顯示協作鏈標籤並可依狀態篩選", () => {
    render(<PropertiesClient initialProperties={mockProperties} isMock />);

    expect(screen.getByText(/目前顯示的是展示用資料/i)).toBeInTheDocument();
    expect(screen.getByText(/買賣協作鏈/i)).toBeInTheDocument();
    expect(screen.getByText(/租賃協作鏈/i)).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("所有狀態"), {
      target: { value: "rent" },
    });

    expect(screen.queryByText("台北信義自售案件")).not.toBeInTheDocument();
    expect(screen.getByText("淡水租賃協作案件")).toBeInTheDocument();
  });

  test("沒有符合條件時應顯示案件導流型空狀態", () => {
    render(<PropertiesClient initialProperties={mockProperties} />);

    fireEvent.change(screen.getByPlaceholderText(/搜尋關鍵字/i), {
      target: { value: "不存在的案件" },
    });

    expect(screen.getByText(/目前沒有符合條件的案件/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /清除搜尋條件/i }),
    ).toBeInTheDocument();
  });
});
