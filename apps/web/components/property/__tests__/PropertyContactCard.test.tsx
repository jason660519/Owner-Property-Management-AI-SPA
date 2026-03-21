import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { PropertyContactCard } from "@/components/property/PropertyContactCard";

describe("PropertyContactCard", () => {
  test("guest 應顯示登入註冊與合作支援導流", () => {
    render(
      <PropertyContactCard
        isLoggedIn={false}
        propertyId="mock-1"
        propertyTitle="現代都會公寓"
      />,
    );

    expect(screen.getByText(/對這筆案件有興趣？/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /登入以預約看房/i }),
    ).toHaveAttribute("href", "/login?redirectTo=/properties");
    expect(screen.getByRole("link", { name: /免費建立帳號/i })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.getByRole("link", { name: /先談合作需求/i })).toHaveAttribute(
      "href",
      "/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88&entryPoint=property-detail-collaboration&sourcePath=%2Fproperties%2Fmock-1&propertyId=mock-1&propertyTitle=%E7%8F%BE%E4%BB%A3%E9%83%BD%E6%9C%83%E5%85%AC%E5%AF%93",
    );
  });

  test("logged-in 使用者應顯示多種案件協作入口", () => {
    render(
      <PropertyContactCard
        isLoggedIn
        propertyId="mock-1"
        propertyTitle="現代都會公寓"
      />,
    );

    expect(screen.getByText(/選擇你要推進的下一步/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /預約看房/i })).toHaveAttribute(
      "href",
      "/contact?inquiryType=%E7%9C%8B%E5%B1%8B&entryPoint=property-detail-viewing&sourcePath=%2Fproperties%2Fmock-1&propertyId=mock-1&propertyTitle=%E7%8F%BE%E4%BB%A3%E9%83%BD%E6%9C%83%E5%85%AC%E5%AF%93",
    );
    expect(screen.getByRole("link", { name: /詢問簽約支援/i })).toHaveAttribute(
      "href",
      "/contact?inquiryType=%E6%B3%95%E5%BE%8B%E8%AB%AE%E8%A9%A2&entryPoint=property-detail-legal&sourcePath=%2Fproperties%2Fmock-1&propertyId=mock-1&propertyTitle=%E7%8F%BE%E4%BB%A3%E9%83%BD%E6%9C%83%E5%85%AC%E5%AF%93",
    );
    expect(screen.getByRole("link", { name: /邀請合作角色/i })).toHaveAttribute(
      "href",
      "/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88&entryPoint=property-detail-collaboration&sourcePath=%2Fproperties%2Fmock-1&propertyId=mock-1&propertyTitle=%E7%8F%BE%E4%BB%A3%E9%83%BD%E6%9C%83%E5%85%AC%E5%AF%93",
    );
  });
});
