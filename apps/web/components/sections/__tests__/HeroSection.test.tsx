import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { HeroSection } from "@/components/sections/HeroSection";

describe("HeroSection", () => {
  test("應顯示多角色平台定位與 CTA", () => {
    render(<HeroSection />);

    expect(screen.getByText(/不只服務房東/i)).toBeInTheDocument();
    expect(screen.getByText(/不動產協作鏈/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看角色方案/i })).toHaveAttribute(
      "href",
      "/pricing",
    );
    expect(screen.getByRole("link", { name: /查看平台能力/i })).toHaveAttribute(
      "href",
      "/services",
    );
  });

  test("應顯示角色標籤與平台統計", () => {
    render(<HeroSection />);

    expect(screen.getByText("房東")).toBeInTheDocument();
    expect(screen.getByText("仲介")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("免費入口角色")).toBeInTheDocument();
  });
});
