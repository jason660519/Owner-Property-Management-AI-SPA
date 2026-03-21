import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/Footer";

describe("Footer", () => {
  test("應顯示多角色平台 CTA 與關鍵導流連結", () => {
    render(<Footer />);

    expect(
      screen.getByText(/把案件、角色與流程留在同一個平台/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看角色方案/i })).toHaveAttribute(
      "href",
      "/pricing",
    );
    expect(screen.getByRole("link", { name: /預約平台諮詢/i })).toHaveAttribute(
      "href",
      "/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88",
    );
  });
});
