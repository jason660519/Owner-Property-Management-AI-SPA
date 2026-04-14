"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import {
  sendContactEmail,
  type ContactSubmissionResult,
} from "@/lib/actions/contact";
import {
  getSourceSummary,
  inquiryOptions,
  sanitizeEntryPoint,
  sanitizePropertyId,
  sanitizePropertyTitle,
  sanitizeSourcePath,
} from '@/app/contact/utils';

function ContactPageContent() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<ContactSubmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestedInquiryType = searchParams.get("inquiryType");
  const initialInquiryType = inquiryOptions.includes(
    requestedInquiryType as (typeof inquiryOptions)[number],
  )
    ? requestedInquiryType
    : "一般諮詢";
  const sourcePath = sanitizeSourcePath(searchParams.get("sourcePath"));
  const entryPoint = sanitizeEntryPoint(searchParams.get("entryPoint"));
  const propertyId = sanitizePropertyId(searchParams.get("propertyId"));
  const propertyTitle = sanitizePropertyTitle(
    searchParams.get("propertyTitle"),
  );
  const sourceContext =
    entryPoint || propertyId || propertyTitle
      ? {
          ...(entryPoint ? { entryPoint } : {}),
          ...(propertyId ? { propertyId } : {}),
          ...(propertyTitle ? { propertyTitle } : {}),
        }
      : undefined;
  const sourceSummary = getSourceSummary({
    sourcePath,
    entryPoint,
    propertyTitle,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSubmissionResult(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      inquiryType: formData.get("inquiryType") as string,
      message: formData.get("message") as string,
      ...(sourcePath ? { sourcePath } : {}),
      ...(sourceContext ? { sourceContext } : {}),
    };

    try {
      const result = await sendContactEmail(data);

      if (result.success) {
        setSubmissionResult(result);
      } else {
        setError(result.error || "發送失敗，請稍後再試。");
      }
    } catch (err) {
      setError("發送失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-urbanist">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden px-6 pb-20 pt-32 md:px-12 lg:px-20">
          <div className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.12),_transparent_35%)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <span className="mb-4 inline-flex rounded-full border border-accent/30 bg-accent-subtle px-4 py-2 text-sm uppercase tracking-[0.18em] text-accent">
              Contact us
            </span>
            <h1 className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
              聯絡我們
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-8 text-text-muted">
              無論你是想導入平台、洽談合作，或是有台灣不動產流程的具體問題，我們都樂意直接談。
            </p>
          </div>
        </section>

        {/* Contact Content */}
        <section className="pb-20 px-6 md:px-12 lg:px-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
            {/* Contact Information */}
            <div>
              <span className="text-accent font-semibold tracking-wider uppercase text-sm mb-2 block">
                保持聯繫
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-8">
                讓我們開始對話
              </h2>
              <p className="text-text-muted mb-12 leading-relaxed">
                無論你是仲介、店長、代書、律師或企業合作方，我們可以先從了解你的案件流開始，再決定最小可行的導入方式。
              </p>

              <div className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-full bg-bg-primary border border-border-default flex items-center justify-center flex-shrink-0 text-accent">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">Email</h3>
                    <p className="text-text-muted">a0405142777@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-full bg-bg-primary border border-border-default flex items-center justify-center flex-shrink-0 text-accent">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">聯絡電話</h3>
                    <p className="text-text-muted">請透過 Email 或表單預約通話時間</p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-full bg-bg-primary border border-border-default flex items-center justify-center flex-shrink-0 text-accent">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">服務地區</h3>
                    <p className="text-text-muted">台灣全台（線上服務）</p>
                    <p className="text-text-muted">台北市信義區信義路五段 7 號</p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-full bg-bg-primary border border-border-default flex items-center justify-center flex-shrink-0 text-accent">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">回覆時間</h3>
                    <p className="text-text-muted">週一至週五：09:00 - 18:00</p>
                    <p className="text-text-muted">一般 24 小時內回覆</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-12">
                <p className="text-sm text-text-muted mb-4 uppercase tracking-wider">社群聯絡</p>
                <div className="flex gap-4">
                  {["Facebook", "Line", "Instagram", "LinkedIn"].map((social) => (
                    <Button
                      key={social}
                      variant="icon"
                      size="md"
                      className="rounded-full border-none bg-bg-secondary text-text-primary hover:bg-accent-hover"
                    >
                      <span className="sr-only">{social}</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.909c3.916 0 7.091 3.175 7.091 7.091 0 3.916-3.175 7.091-7.091 7.091-3.916 0-7.091-3.175-7.091-7.091 0-3.916 3.175-7.091 7.091-7.091z" />
                      </svg>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="mt-10 rounded-2xl border border-border-default bg-bg-secondary p-5">
                <p className="text-sm font-semibold text-text-secondary mb-3">常見洽詢類型</p>
                <div className="flex flex-wrap gap-2">
                  {["仲介方案洽談", "分店導入", "代書合作", "企業 API 串接", "功能建議"].map((tag) => (
                    <span key={tag} className="rounded-full border border-border-light bg-bg-tertiary px-3 py-1 text-xs text-text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <Card className="bg-bg-primary border-border-default p-8">
                {submissionResult ? (
                  <Alert
                    variant="default"
                    className="bg-bg-secondary border-accent text-text-primary"
                  >
                    <AlertTitle className="text-accent text-lg font-bold mb-2">
                      發送成功！
                    </AlertTitle>
                    <AlertDescription>
                      感謝您的聯繫，我們已收到您的訊息。我們的團隊將會在 24
                      小時內回覆這筆詢問。
                      <br />
                      <br />
                      <strong>Lead 編號：</strong>
                      {submissionResult.leadReference}
                      <br />
                      {sourceSummary && (
                        <>
                          <strong>{sourceSummary.title}：</strong>
                          {sourceSummary.body}
                          <br />
                          {sourceSummary.detail && (
                            <>
                              <strong>來源動作：</strong>
                              {sourceSummary.detail}
                              <br />
                            </>
                          )}
                        </>
                      )}
                      {submissionResult.emailSent ? (
                        <>請留意您的收件匣（或垃圾郵件匣）。</>
                      ) : (
                        <>
                          Lead 已建立，但自動回覆郵件暫時未送出，我們仍會人工跟進。
                        </>
                      )}
                      <Button
                        variant="outline"
                        className="mt-4 w-full"
                        onClick={() => setSubmissionResult(null)}
                      >
                        發送另一則訊息
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form className="space-y-6" onSubmit={handleSubmit}>
                    {sourceSummary && (
                      <div className="rounded-xl border border-border-light bg-bg-secondary px-4 py-3 text-sm text-text-secondary">
                        <span className="block text-xs uppercase tracking-[0.18em] text-accent">
                          {sourceSummary.title}
                        </span>
                        <span className="mt-2 block">{sourceSummary.body}</span>
                        {sourceSummary.detail && (
                          <span className="mt-2 block text-text-muted">
                            {sourceSummary.detail}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">
                          姓名
                        </label>
                        <Input
                          required
                          name="name"
                          placeholder="請輸入您的姓名"
                          className="bg-bg-secondary border-border-light"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">
                          Email
                        </label>
                        <Input
                          required
                          name="email"
                          type="email"
                          placeholder="請輸入您的 Email"
                          className="bg-bg-secondary border-border-light"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">
                          電話（選填）
                        </label>
                        <Input
                          name="phone"
                          placeholder="09xx-xxx-xxx"
                          className="bg-bg-secondary border-border-light"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">
                          詢問類型
                        </label>
                        <select
                          defaultValue={initialInquiryType ?? "一般諮詢"}
                          name="inquiryType"
                          className="h-11 min-h-11 w-full rounded-md border border-border-light bg-bg-secondary px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          {inquiryOptions.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">
                        訊息內容
                      </label>
                      <textarea
                        required
                        name="message"
                        rows={6}
                        placeholder="請描述您的需求，例如：目前案件量、想導入的角色、或具體問題…"
                        className="min-h-11 w-full rounded-md border border-border-light bg-bg-secondary px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      ></textarea>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <input
                        required
                        type="checkbox"
                        id="scrapi"
                        className="rounded bg-bg-secondary border-border-light text-accent focus:ring-accent"
                      />
                      <label htmlFor="scrapi" className="text-sm text-text-muted">
                        我同意 Owner AI 處理我的個人資料以回應此詢問，並遵守台灣個人資料保護法相關規定。
                      </label>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      fullWidth
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "發送中..." : "發送訊息"}
                    </Button>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </section>

        {/* Map / Location Section */}
        <section className="h-[360px] w-full bg-bg-secondary relative flex items-center justify-center border-t border-border-default">
          <div className="relative z-10 bg-bg-primary p-8 rounded-xl border border-border-light shadow-2xl max-w-sm w-full mx-6">
            <h3 className="text-xl font-bold mb-2">服務地區</h3>
            <p className="text-text-muted mb-1">台北市信義區信義路五段 7 號</p>
            <p className="text-text-muted mb-4">線上服務覆蓋台灣全台</p>
            <Button variant="outline" size="sm" fullWidth>
              在 Google 地圖上查看
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary text-text-primary" />}>
      <ContactPageContent />
    </Suspense>
  );
}
