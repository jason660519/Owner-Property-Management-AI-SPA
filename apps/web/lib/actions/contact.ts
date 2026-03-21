"use server";

import nodemailer from "nodemailer";
import { z } from "zod";
import { createAdminClient } from "@/utils/supabase/admin";

const allowedEntryPoints = [
  "pricing-cta",
  "services-cta",
  "about-cta",
  "property-detail-viewing",
  "property-detail-legal",
  "property-detail-collaboration",
] as const;

const sourceContextSchema = z
  .object({
    entryPoint: z.enum(allowedEntryPoints).optional(),
    propertyId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,80}$/)
      .optional(),
    propertyTitle: z.string().trim().min(1).max(120).optional(),
  })
  .optional();

const contactFormSchema = z.object({
  name: z.string().min(1, "姓名是必填的"),
  email: z.string().email("請輸入有效的 Email"),
  phone: z.string().optional(),
  inquiryType: z.string(),
  message: z.string().min(1, "訊息內容是必填的"),
  sourcePath: z
    .string()
    .regex(/^\/[A-Za-z0-9\-/_?=&%]*$/)
    .max(200)
    .optional(),
  sourceContext: sourceContextSchema,
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

export interface ContactSubmissionResult {
  success: boolean;
  error?: string;
  leadReference?: string;
  emailSent?: boolean;
  sourcePath?: string;
}

async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay);
  }
}

export async function sendContactEmail(
  data: ContactFormData,
): Promise<ContactSubmissionResult> {
  const result = contactFormSchema.safeParse(data);

  if (!result.success) {
    return { success: false, error: "資料驗證失敗" };
  }

  const {
    name,
    email,
    phone,
    inquiryType,
    message,
    sourcePath,
    sourceContext,
  } = result.data;

  // 1. Save to Database
  const supabase = createAdminClient();
  const { data: insertedLead, error: insertError } = await supabase
    .from("contact_messages")
    .insert({
      name,
      email,
      phone,
      inquiry_type: inquiryType,
      message,
      source_path: sourcePath,
      source_context: sourceContext ?? {},
    })
    .select("id")
    .single();

  if (insertError || !insertedLead?.id) {
    console.error("Database insertion failed:", insertError);
    return {
      success: false,
      error: "無法建立 lead，請稍後再試。",
    };
  }

  const leadReference = `LEAD-${insertedLead.id.slice(0, 8).toUpperCase()}`;
  let emailSent = true;

  // 2. Send Email
  try {
    // Configure transporter for local Supabase InBucket
    // In production, these values should come from environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "54325"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "test",
        pass: process.env.SMTP_PASS || "test",
      },
      connectionTimeout: 5000,
    });

    await transporter.verify();

    const sourceSummary = [
      sourcePath ? `來源頁面: ${sourcePath}` : null,
      sourceContext?.entryPoint
        ? `來源入口: ${sourceContext.entryPoint}`
        : null,
      sourceContext?.propertyId ? `案件 ID: ${sourceContext.propertyId}` : null,
      sourceContext?.propertyTitle
        ? `案件標題: ${sourceContext.propertyTitle}`
        : null,
      `Lead 編號: ${leadReference}`,
    ]
      .filter(Boolean)
      .join("\n");

    await retry(async () => {
      await transporter.sendMail({
        from: '"Vision Real Estate Website" <a0405142777@gmail.com>',
        to: "a0405142777@gmail.com",
        replyTo: email,
        subject: `[${inquiryType}] 來自 ${name} 的新詢問`,
        text: `
          Lead 編號: ${leadReference}
          姓名: ${name}
          Email: ${email}
          電話: ${phone || "未提供"}
          詢問類型: ${inquiryType}
          ${sourceSummary}
          
          訊息內容:
          ${message}
        `,
        html: `
          <h2>收到新的聯絡詢問</h2>
          <p><strong>Lead 編號:</strong> ${leadReference}</p>
          <p><strong>姓名:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>電話:</strong> ${phone || "未提供"}</p>
          <p><strong>詢問類型:</strong> ${inquiryType}</p>
          ${sourcePath ? `<p><strong>來源頁面:</strong> ${sourcePath}</p>` : ""}
          ${sourceContext?.entryPoint ? `<p><strong>來源入口:</strong> ${sourceContext.entryPoint}</p>` : ""}
          ${sourceContext?.propertyId ? `<p><strong>案件 ID:</strong> ${sourceContext.propertyId}</p>` : ""}
          ${sourceContext?.propertyTitle ? `<p><strong>案件標題:</strong> ${sourceContext.propertyTitle}</p>` : ""}
          <br/>
          <p><strong>訊息內容:</strong></p>
          <p>${message.replace(/\n/g, "<br/>")}</p>
        `,
      });
    });

    await retry(async () => {
      await transporter.sendMail({
        from: '"Vision Real Estate Support" <a0405142777@gmail.com>',
        to: email,
        subject: "我們已收到您的詢問 - Owner AI",
        text: `
          親愛的 ${name} 您好，
          
          感謝您的聯繫。我們已收到您的訊息，我們的團隊將會在 24 小時內回覆您。
          您的 Lead 編號：${leadReference}
          
          您的詢問內容：
          --------------------------------------------------
          類型: ${inquiryType}
          訊息: ${message}
          --------------------------------------------------
          
          此郵件為系統自動發送，請勿直接回覆。
          
          Owner AI 團隊 敬上
        `,
        html: `
          <h2>親愛的 ${name} 您好，</h2>
          <p>感謝您的聯繫。我們已收到您的訊息，我們的團隊將會在 24 小時內回覆您。</p>
          <p><strong>Lead 編號:</strong> ${leadReference}</p>
          <hr/>
          <h3>您的詢問內容：</h3>
          <p><strong>類型:</strong> ${inquiryType}</p>
          <p><strong>訊息:</strong> ${message}</p>
          <hr/>
          <p style="color: #666; font-size: 12px;">此郵件為系統自動發送，請勿直接回覆。</p>
          <br/>
          <p><strong>Owner AI 團隊 敬上</strong></p>
        `,
      });
    });
  } catch (error) {
    console.error("Email sending failed:", error);
    emailSent = false;
  }

  return {
    success: true,
    leadReference,
    emailSent,
    sourcePath,
  };
}
