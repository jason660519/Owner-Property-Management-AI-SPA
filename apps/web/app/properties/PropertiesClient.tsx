"use client";

// filepath: apps/web/app/properties/PropertiesClient.tsx
// created: 2026-01-22 | creator: Claude Opus 4.6
// last-modified: 2026-02-14 | modifier: Claude Opus 4.6

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardImage, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Property } from "@/lib/api/properties";

const ITEMS_PER_PAGE = 9;

interface PropertiesClientProps {
  initialProperties: Property[];
  isMock?: boolean;
}

function getWorkflowBadge(property: Property) {
  return property.status === "rent" ? "租賃協作鏈" : "買賣協作鏈";
}

function getWorkflowSummary(property: Property) {
  return property.status === "rent"
    ? "房東、租客、簽約與點交可在同一案件流轉"
    : "自售房東、買家、仲介與代書可接力推進";
}

export default function PropertiesClient({
  initialProperties,
  isMock = false,
}: PropertiesClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Dynamically derive available property types from actual data
  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>();
    initialProperties.forEach((p) => {
      if (p.type) typeSet.add(p.type);
    });
    return Array.from(typeSet).sort();
  }, [initialProperties]);

  const filteredProperties = useMemo(() => {
    return initialProperties.filter((property) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        property.title.toLowerCase().includes(searchLower) ||
        property.description.toLowerCase().includes(searchLower) ||
        property.address.toLowerCase().includes(searchLower);

      const matchesType = filterType === "all" || property.type === filterType;
      const matchesStatus =
        filterStatus === "all" || property.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [initialProperties, searchTerm, filterType, filterStatus]);

  // Pagination calculations
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProperties.length / ITEMS_PER_PAGE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProperties = filteredProperties.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  // Reset to page 1 when filters change
  const handleFilterChange = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
      setter(value);
      setCurrentPage(1);
    },
    [],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setFilterType("all");
    setFilterStatus("all");
    setCurrentPage(1);
  }, []);

  // Generate page numbers for pagination
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [1];

    if (safeCurrentPage > 3) {
      pages.push("ellipsis");
    }

    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (safeCurrentPage < totalPages - 2) {
      pages.push("ellipsis");
    }

    pages.push(totalPages);
    return pages;
  };

  const summaryItems = [
    { label: "可瀏覽案件", value: String(initialProperties.length) },
    { label: "免費入口角色", value: "4" },
    { label: "可接手角色", value: "仲介 / 代書 / 律師 / 團隊" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Mock data banner */}
      {isMock && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm text-center">
          目前顯示的是展示用資料。資料庫連線不可用或尚無真實物件。
        </div>
      )}

      {/* Header & Search */}
      <div className="mb-12">
        <div className="mb-8 rounded-[28px] border border-border-default bg-bg-secondary p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="mb-4 inline-flex rounded-full border border-accent/30 bg-accent-subtle px-4 py-2 text-sm uppercase tracking-[0.18em] text-accent">
                Marketplace workflow
              </span>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                多角色案件市場
              </h1>
              <p className="text-text-secondary leading-7">
                讓案件先進場，再選擇誰來接手推進。這裡不只是傳統物件列表，而是把自售、自租、買賣與租賃案件，導向仲介、代書、律師與其他合作角色的工作入口。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/services">
                <Button variant="secondary">查看平台能力</Button>
              </Link>
              <Link href="/contact?inquiryType=%E5%90%88%E4%BD%9C%E6%8F%90%E6%A1%88">
                <Button>預約導入諮詢</Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border-default bg-bg-primary px-5 py-4"
              >
                <span className="block text-xs uppercase tracking-[0.16em] text-text-muted">
                  {item.label}
                </span>
                <strong className="mt-2 block text-lg text-text-primary">
                  {item.value}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-bg-secondary p-6 rounded-xl border border-border-default flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜尋關鍵字 (如：買賣案件、台北市、套房)..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-bg-primary border-border-light h-12"
            />
          </div>
          <div className="w-full md:w-48">
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) =>
                  handleFilterChange(setFilterType, e.target.value)
                }
                className="w-full h-12 px-4 bg-bg-primary border border-border-light rounded-lg text-text-primary appearance-none focus:outline-none focus:border-accent"
              >
                <option value="all">所有類型</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="w-full md:w-48">
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) =>
                  handleFilterChange(setFilterStatus, e.target.value)
                }
                className="w-full h-12 px-4 bg-bg-primary border border-border-light rounded-lg text-text-primary appearance-none focus:outline-none focus:border-accent"
              >
                <option value="all">所有狀態</option>
                <option value="sale">出售</option>
                <option value="rent">出租</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
          <Button className="md:w-32" onClick={() => setCurrentPage(1)}>
            搜尋
          </Button>
        </div>
      </div>

      {/* Results count */}
      {filteredProperties.length > 0 && (
        <p className="text-text-secondary text-sm mb-6">
          共 {filteredProperties.length} 筆案件
          {filteredProperties.length > ITEMS_PER_PAGE && (
            <span>
              ，顯示第 {startIndex + 1}-
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredProperties.length)}{" "}
              筆
            </span>
          )}
        </p>
      )}

      {/* Properties Grid */}
      {paginatedProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {paginatedProperties.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="group"
            >
              <Card
                hoverable
                padding="md"
                className="h-full bg-bg-secondary border-border-default group-hover:border-accent/50 transition-colors"
              >
                <CardImage
                  src={property.imageUrl}
                  alt={property.title}
                  aspectRatio="16/9"
                  className="group-hover:scale-105 transition-transform duration-500"
                />
                <CardContent>
                  <div className="mb-3 inline-flex rounded-full border border-accent/20 bg-accent-subtle px-3 py-1 text-xs font-semibold text-accent">
                    {getWorkflowBadge(property)}
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        property.status === "rent"
                          ? "bg-accent-subtle text-accent"
                          : "bg-green-500/20 text-green-500"
                      }`}
                    >
                      {property.status === "rent" ? "出租" : "出售"}
                    </span>
                    <span className="text-text-secondary text-xs border border-border-light px-2 py-1 rounded">
                      {property.type}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors">
                    {property.title}
                  </h3>
                  <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                    {property.description}
                  </p>
                  <p className="text-text-muted text-sm mb-4">
                    {getWorkflowSummary(property)}
                  </p>

                  <div className="grid grid-cols-3 gap-4 border-t border-border-default pt-4 mb-2">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                      {property.bedrooms} 房
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {property.bathrooms} 衛
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      {property.area} 坪
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto pt-4 border-t border-border-default">
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-xl font-bold">{property.price}</span>
                    <span className="text-accent text-sm font-medium hover:underline">
                      查看案件詳情 &rarr;
                    </span>
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-bg-secondary rounded-xl border border-border-default">
          <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">目前沒有符合條件的案件</h3>
          <p className="text-text-secondary">
            請調整搜尋條件，或重新整理成適合房東、租客、買家與專業角色接力的案件入口。
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={handleClearFilters}
          >
            清除搜尋條件
          </Button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex justify-center border-t border-border-default pt-8">
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-border-default bg-bg-primary px-2 py-2 sm:gap-4 sm:px-4">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 min-w-11 shrink-0"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              &larr;
            </Button>
            <div className="flex flex-wrap justify-center gap-2">
              {getPageNumbers().map((page, index) => {
                if (page === "ellipsis") {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="flex min-h-11 items-end px-1 text-text-muted"
                    >
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`flex min-h-11 min-w-11 items-center justify-center rounded-full text-sm transition-colors ${
                      page === safeCurrentPage
                        ? "bg-accent font-bold text-white"
                        : "text-text-secondary hover:bg-bg-tertiary"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 min-w-11 shrink-0"
              disabled={safeCurrentPage >= totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
            >
              &rarr;
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
