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
  test("應顯示委託型態比較表與導流連結", () => {
    render(<ServicesPage />);

    expect(screen.getByRole("heading", { name: /台灣不動產全流程 AI 協作平台/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /OwneAI \+ 屋主自售 vs 一般約 vs 專任約/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /OwneAI \+ 屋主自售/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^一般約$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^專任約$/i })).toBeInTheDocument();

    const consultationLinks = screen.getAllByRole("link", {
      name: /預約導入諮詢/i,
    });

    expect(consultationLinks[0]).toHaveAttribute(
      "href",
      "/contact?inquiryType=合作提案",
    );
  });
});
