'use server';

import nodemailer from 'nodemailer';
import { z } from 'zod';

const contactFormSchema = z.object({
  name: z.string().min(1, '姓名是必填的'),
  email: z.string().email('請輸入有效的 Email'),
  phone: z.string().optional(),
  inquiryType: z.string(),
  message: z.string().min(1, '訊息內容是必填的'),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

export async function sendContactEmail(data: ContactFormData) {
  const result = contactFormSchema.safeParse(data);

  if (!result.success) {
    return { success: false, error: '資料驗證失敗' };
  }

  const { name, email, phone, inquiryType, message } = result.data;

  // Configure transporter for local Supabase InBucket
  // In production, these values should come from environment variables
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '54325'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'test',
      pass: process.env.SMTP_PASS || 'test',
    },
  });

  try {
    await transporter.sendMail({
      from: '"Estatein Website" <website@estatein.com>', // sender address
      to: 'support@estatein.com', // list of receivers
      replyTo: email,
      subject: `[${inquiryType}] 來自 ${name} 的新詢問`, // Subject line
      text: `
        姓名: ${name}
        Email: ${email}
        電話: ${phone || '未提供'}
        詢問類型: ${inquiryType}
        
        訊息內容:
        ${message}
      `, // plain text body
      html: `
        <h2>收到新的聯絡詢問</h2>
        <p><strong>姓名:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>電話:</strong> ${phone || '未提供'}</p>
        <p><strong>詢問類型:</strong> ${inquiryType}</p>
        <br/>
        <p><strong>訊息內容:</strong></p>
        <p>${message.replace(/\n/g, '<br/>')}</p>
      `, // html body
    });

    // Send auto-reply to user
    await transporter.sendMail({
      from: '"Estatein Support" <support@estatein.com>',
      to: email,
      subject: '我們已收到您的詢問 - Estatein',
      text: `
        親愛的 ${name} 您好，
        
        感謝您的聯繫。我們已收到您的訊息，我們的團隊將會在 24 小時內回覆您。
        
        您的詢問內容：
        --------------------------------------------------
        類型: ${inquiryType}
        訊息: ${message}
        --------------------------------------------------
        
        此郵件為系統自動發送，請勿直接回覆。
        
        Estatein 團隊 敬上
      `,
      html: `
        <h2>親愛的 ${name} 您好，</h2>
        <p>感謝您的聯繫。我們已收到您的訊息，我們的團隊將會在 24 小時內回覆您。</p>
        <hr/>
        <h3>您的詢問內容：</h3>
        <p><strong>類型:</strong> ${inquiryType}</p>
        <p><strong>訊息:</strong> ${message}</p>
        <hr/>
        <p style="color: #666; font-size: 12px;">此郵件為系統自動發送，請勿直接回覆。</p>
        <br/>
        <p><strong>Estatein 團隊 敬上</strong></p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: '郵件發送失敗，請稍後再試' };
  }
}
