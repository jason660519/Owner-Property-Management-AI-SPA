import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Testimonials } from "@/components/sections/Testimonials";

describe("Testimonials", () => {
  test("應顯示多角色使用者案例與導流連結", () => {
    render(<Testimonials />);

    expect(
      screen.getByText(/不同角色，正在用同一個平台推進案件/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /自售房東/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /仲介店長/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /代書協作顧問/i, level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看角色方案/i })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });
});
