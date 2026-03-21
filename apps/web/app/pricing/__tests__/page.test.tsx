import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import PricingPage from "@/app/pricing/page";

jest.mock("@/components/layout/Header", () => ({
  Header: () => <div>Header</div>,
}));

jest.mock("@/components/layout/Footer", () => ({
  Footer: () => <div>Footer</div>,
}));

describe("PricingPage", () => {
  test("應顯示多角色定價方案與比較矩陣", () => {
    render(<PricingPage />);

    expect(
      screen.getByRole("heading", { name: /免費流量入口/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /仲介個人版/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /分店管理版/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /企業合作版/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/一頁看懂每一層方案的角色與價值/i),
    ).toBeInTheDocument();
  });

  test("應支援幣別與計費週期切換", () => {
    render(<PricingPage />);

    fireEvent.click(screen.getByRole("button", { name: "AUD" }));
    fireEvent.click(screen.getByRole("button", { name: "年付" }));

    expect(screen.getByText("AUD 704")).toBeInTheDocument();
    expect(screen.getByText(/Per case AUD 20 - AUD 60/i)).toBeInTheDocument();
  });

  test("應將 CTA 導向真實聯絡頁", () => {
    render(<PricingPage />);

    expect(screen.getByRole("link", { name: /預約仲介方案/i })).toHaveAttribute(
      "href",
      "/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88",
    );
    expect(screen.getByRole("link", { name: /索取銷售簡報/i })).toHaveAttribute(
      "href",
      "/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88",
    );
  });
});
