import { sendContactEmail } from '@/lib/actions/contact';
import { createClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({}),
  }),
}));

describe('Contact Action Integration Test', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    mockSupabase.insert.mockResolvedValue({ error: null });
  });

  const validData = {
    name: 'Test User',
    email: 'test@example.com',
    inquiryType: 'general',
    message: 'Hello world',
    phone: '1234567890',
  };

  it('should insert into DB and send email on success', async () => {
    const result = await sendContactEmail(validData);

    expect(result.success).toBe(true);
    
    // Verify DB insert
    expect(mockSupabase.from).toHaveBeenCalledWith('contact_messages');
    expect(mockSupabase.insert).toHaveBeenCalledWith({
      name: validData.name,
      email: validData.email,
      phone: validData.phone,
      inquiry_type: validData.inquiryType,
      message: validData.message,
    });

    // Verify Email
    const transporter = nodemailer.createTransport();
    expect(transporter.sendMail).toHaveBeenCalledTimes(2); // Support email + Auto reply
  });

  it('should handle DB failure but still try to send email', async () => {
    mockSupabase.insert.mockResolvedValue({ error: { message: 'DB Error' } });

    const result = await sendContactEmail(validData);

    // It should still return success if email succeeds (based on logic "Email sent but DB save failed" -> success)
    expect(result.success).toBe(true); 
    
    const transporter = nodemailer.createTransport();
    expect(transporter.sendMail).toHaveBeenCalled();
  });

  it('should handle Email failure but still try to insert to DB', async () => {
    const transporter = nodemailer.createTransport();
    (transporter.sendMail as jest.Mock).mockRejectedValue(new Error('SMTP Error'));

    const result = await sendContactEmail(validData);

    expect(result.success).toBe(true); // "Saved to DB but email failed" -> success
    expect(mockSupabase.insert).toHaveBeenCalled();
  });

  it('should fail if both DB and Email fail', async () => {
    mockSupabase.insert.mockResolvedValue({ error: { message: 'DB Error' } });
    const transporter = nodemailer.createTransport();
    (transporter.sendMail as jest.Mock).mockRejectedValue(new Error('SMTP Error'));

    const result = await sendContactEmail(validData);

    expect(result.success).toBe(false);
    expect(result.error).toContain('系統錯誤');
  });
});
