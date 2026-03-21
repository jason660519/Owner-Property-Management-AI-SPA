import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ServicesPage from "@/app/services/page";

jest.mock("@/components/layout/Header", () => ({
  Header: () => <div>Header</div>,
}));

jest.mock("@/components/layout/Footer", () => ({
  Footer: () => <div>Footer</div>,
}));

describe("ServicesPage", () => {
  test("應顯示多角色平台能力與導流連結", () => {
    render(<ServicesPage />);

    expect(
      screen.getByText(/多角色不動產 AI 協作平台能力/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/仲介與分店營運/i)).toBeInTheDocument();
    expect(screen.getByText(/代書與律師協作/i)).toBeInTheDocument();

    const consultationLinks = screen.getAllByRole("link", {
      name: /預約導入諮詢/i,
    });

    expect(consultationLinks[0]).toHaveAttribute(
      "href",
      "/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88",
    );
  });
});
