import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { FAQ } from "@/components/sections/FAQ";

describe("FAQ", () => {
  test("應顯示多角色常見問題與支援導流", () => {
    render(<FAQ />);

    expect(screen.getByText(/常見問題與導入說明/i)).toBeInTheDocument();
    expect(screen.getByText(/哪些角色現在可以免費使用/i)).toBeInTheDocument();
    expect(screen.getByText(/仲介與分店要怎麼開始導入/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看完整方案/i })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });
});
