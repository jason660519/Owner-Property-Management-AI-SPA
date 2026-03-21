import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import PropertyDetailsPage from "@/app/properties/[id]/page";

const mockNotFound = jest.fn();
const mockGetProperty = jest.fn();
const mockGetUser = jest.fn();

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    fill,
    priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img {...props} alt={props.alt ?? ""} />,
}));

jest.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

jest.mock("@/components/layout/Header", () => ({
  Header: () => <div>Header</div>,
}));

jest.mock("@/components/layout/Footer", () => ({
  Footer: () => <div>Footer</div>,
}));

jest.mock("@/components/property/PropertyContactCard", () => ({
  PropertyContactCard: ({
    isLoggedIn,
    propertyId,
    propertyTitle,
  }: {
    isLoggedIn: boolean;
    propertyId?: string;
    propertyTitle?: string;
  }) => (
    <div>
      {isLoggedIn ? "Logged-in contact card" : "Guest contact card"}
      {propertyId ? ` ${propertyId}` : ""}
      {propertyTitle ? ` ${propertyTitle}` : ""}
    </div>
  ),
}));

jest.mock("@/lib/api/properties", () => ({
  getProperty: (...args: unknown[]) => mockGetProperty(...args),
}));

jest.mock("@/utils/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  }),
}));

describe("PropertyDetailsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  test("應顯示案件協作視角內容", async () => {
    mockGetProperty.mockResolvedValue({
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
    });

    const page = await PropertyDetailsPage({
      params: Promise.resolve({ id: "sale-1" }),
    });

    render(page);

    expect(screen.getByText(/買賣協作鏈/i)).toBeInTheDocument();
    expect(screen.getByText(/推薦接手角色/i)).toBeInTheDocument();
    expect(screen.getByText(/案件協作節點/i)).toBeInTheDocument();
    expect(screen.getAllByText(/自售房東/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/仲介/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Guest contact card/i)).toBeInTheDocument();
    expect(screen.getByText(/sale-1/i)).toBeInTheDocument();
  });

  test("登入使用者應顯示 logged-in contact card", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
    });
    mockGetProperty.mockResolvedValue({
      id: "sale-2",
      title: "台北大安整合案件",
      description: "讓買家、仲介與代書一起接手的市區案件。",
      address: "台北市大安區",
      type: "電梯大樓",
      status: "sale",
      statusLabel: "available",
      price: "NT$ 42,000,000",
      rawPrice: 42000000,
      area: 48,
      bedrooms: 3,
      bathrooms: 2,
      imageUrl: "/images/property-2.jpg",
      images: ["/images/property-2.jpg"],
      created_at: "2026-03-22T00:00:00.000Z",
    });

    const page = await PropertyDetailsPage({
      params: Promise.resolve({ id: "sale-2" }),
    });

    render(page);

    expect(screen.getByText(/Logged-in contact card/i)).toBeInTheDocument();
    expect(screen.getByText(/sale-2/i)).toBeInTheDocument();
    expect(screen.getAllByText(/台北大安整合案件/i)).toHaveLength(2);
  });

  test("查無案件時應呼叫 notFound", async () => {
    mockGetProperty.mockResolvedValue(null);

    const page = await PropertyDetailsPage({
      params: Promise.resolve({ id: "missing-id" }),
    });

    render(page);

    expect(mockNotFound).toHaveBeenCalled();
  });
});
