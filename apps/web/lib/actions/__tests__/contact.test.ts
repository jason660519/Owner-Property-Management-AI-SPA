import { sendContactEmail } from "@/lib/actions/contact";
import { createAdminClient } from "@/utils/supabase/admin";
import nodemailer from "nodemailer";

// Mock dependencies
jest.mock("@/utils/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({}),
  }),
}));

describe("Contact Action Integration Test", () => {
  const mockSingle = jest.fn();
  const mockSelect = jest.fn(() => ({ single: mockSingle }));
  const mockInsert = jest.fn(() => ({ select: mockSelect }));
  const mockSupabase = {
    from: jest.fn(() => ({ insert: mockInsert })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSingle.mockResolvedValue({
      data: { id: "12345678-1234-1234-1234-1234567890ab" },
      error: null,
    });
  });

  const validData = {
    name: "Test User",
    email: "test@example.com",
    inquiryType: "合作提案",
    message: "Hello world",
    phone: "1234567890",
    sourcePath: "/pricing",
    sourceContext: {
      entryPoint: "pricing-cta",
    },
  };

  it("should insert into DB, return lead reference, and send email on success", async () => {
    const result = await sendContactEmail(validData);

    expect(result.success).toBe(true);
    expect(result.leadReference).toBe("LEAD-12345678");

    // Verify DB insert
    expect(mockSupabase.from).toHaveBeenCalledWith("contact_messages");
    expect(mockInsert).toHaveBeenCalledWith({
      name: validData.name,
      email: validData.email,
      phone: validData.phone,
      inquiry_type: validData.inquiryType,
      message: validData.message,
      source_path: validData.sourcePath,
      source_context: validData.sourceContext,
    });

    // Verify Email
    const transporter = nodemailer.createTransport();
    expect(transporter.sendMail).toHaveBeenCalledTimes(2); // Support email + Auto reply
  });

  it("should fail when DB save fails because lead capture was not created", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "DB Error" },
    });

    const result = await sendContactEmail(validData);

    expect(result.success).toBe(false);
    expect(result.error).toContain("無法建立 lead");

    const transporter = nodemailer.createTransport();
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it("should keep lead capture success even if email delivery fails", async () => {
    const transporter = nodemailer.createTransport();
    (transporter.sendMail as jest.Mock).mockRejectedValue(
      new Error("SMTP Error"),
    );

    const result = await sendContactEmail(validData);

    expect(result.success).toBe(true);
    expect(result.leadReference).toBe("LEAD-12345678");
    expect(result.emailSent).toBe(false);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("should fail validation for invalid source path", async () => {
    const transporter = nodemailer.createTransport();
    (transporter.sendMail as jest.Mock).mockResolvedValue({});

    const result = await sendContactEmail({
      ...validData,
      sourcePath: "https://malicious.example",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("資料驗證失敗");
  });
});
