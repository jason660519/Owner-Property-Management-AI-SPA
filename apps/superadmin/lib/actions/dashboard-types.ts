// filepath: apps/superadmin/lib/actions/dashboard-types.ts
// Pure types and constants for the admin dashboard (no 'use server').
// Importable from both server and client components.

export interface AdminStats {
  totalUsers: number;
  totalGroups: number;
  totalRoles: number;
  superadminCount: number;
  /** 活躍用戶數 (7 天內有登入) */
  activeUsersCount: number;
  onlineUsersCount: number;
  totalProperties: number;
  totalSales: number;
  totalRentals: number;
  /** 逾期案出售物件數 (property_sales status = pending) */
  overdueSalesCount: number;
  /** 逾期出租案數 (property_rentals status = maintenance，維護中/待結案) */
  overdueRentalsCount: number;
  /** 成交出售物件數 (property_sales status = sold) */
  soldSalesCount: number;
  totalBlogs: number;
  /** 物件調查報告書總數 (property_documents for sales) */
  surveyReportCountForSales: number;
  /** 買賣合約總數 (sales_agreements) */
  salesContractsCount: number;
  /** 出售物件部落格總數 (blog_posts, optional category filter) */
  salesBlogCount: number;
  /** 物件調查報告書總數 (property_documents for rentals) */
  surveyReportCountForRentals: number;
  /** 租賃合約總數 (lease_agreements) */
  leaseContractsCount: number;
  /** 出租物件部落格總數 (blog_posts) */
  rentalBlogCount: number;
  /** 尚未完成拍照的在售物件數 */
  salesWithoutPhotoCount: number;
  /** 尚未完成拍照的在租物件數 */
  rentalsWithoutPhotoCount: number;
  /** 尚未完成行銷部落格的在售物件數 */
  salesWithoutBlogCount: number;
  /** 尚未完成行銷部落格的在租物件數 */
  rentalsWithoutBlogCount: number;
  activeRentals: number;
  activeListings: number;
  totalRevenue: number;
  pendingVerifications: number;
}

export const FALLBACK_STATS: AdminStats = {
  totalUsers: 0,
  totalGroups: 0,
  totalRoles: 0,
  superadminCount: 0,
  activeUsersCount: 0,
  onlineUsersCount: 0,
  totalProperties: 0,
  totalSales: 0,
  totalRentals: 0,
  overdueSalesCount: 0,
  overdueRentalsCount: 0,
  soldSalesCount: 0,
  totalBlogs: 0,
  surveyReportCountForSales: 0,
  salesContractsCount: 0,
  salesBlogCount: 0,
  surveyReportCountForRentals: 0,
  leaseContractsCount: 0,
  rentalBlogCount: 0,
  salesWithoutPhotoCount: 0,
  rentalsWithoutPhotoCount: 0,
  salesWithoutBlogCount: 0,
  rentalsWithoutBlogCount: 0,
  activeRentals: 0,
  activeListings: 0,
  totalRevenue: 0,
  pendingVerifications: 0,
};
