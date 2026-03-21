import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/about/page";

jest.mock("@/components/layout/Header", () => ({
  Header: () => <div>Header</div>,
}));

jest.mock("@/components/layout/Footer", () => ({
  Footer: () => <div>Footer</div>,
}));

describe("AboutPage", () => {
  test("應顯示多角色平台定位與主要導流連結", () => {
    render(<AboutPage />);

    expect(
      screen.getByRole("heading", {
        name: /我們正在重做不動產服務的協作底層/i,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /一個案件，讓買賣方、租賃方與專業角色共用同一條協作節奏/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/台灣與澳洲雙市場策略/i)).toBeInTheDocument();
    expect(
      screen.getByText(/買方、租客、自租屋主先免費進場/i),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /查看角色定價/i })).toHaveAttribute(
      "href",
      "/pricing",
    );
    const inquiryLinks = screen.getAllByRole("link", { name: /預約平台導入/i });

    expect(inquiryLinks).toHaveLength(2);
    expect(inquiryLinks[0]).toHaveAttribute(
      "href",
      "/contact?inquiryType=合作提案",
    );
  });
});
