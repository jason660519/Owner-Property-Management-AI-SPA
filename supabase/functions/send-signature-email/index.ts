
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

console.log("send-signature-email Edge Function started.");

serve(async (req) => {
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const { to_email, subject, secure_link, pdf_url } = await req.json();

        if (!to_email || !subject || !secure_link) {
            return new Response("Missing required fields: to_email, subject, secure_link", { status: 400 });
        }

        // TODO: Replace with actual email sending service integration (e.g., Resend, SendGrid)
        // For now, we'll log the email content or use a placeholder API call.
        console.log(`Sending email to: ${to_email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Secure Link: ${secure_link}`);
        if (pdf_url) {
            console.log(`Signed PDF URL: ${pdf_url}`);
        }

        // Example of a placeholder fetch call to an external email service (replace with actual)
        // const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        // const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL");

        // if (!RESEND_API_KEY || !SENDER_EMAIL) {
        //     console.error("RESEND_API_KEY or SENDER_EMAIL not set.");
        //     return new Response("Email service not configured", { status: 500 });
        // }

        // let htmlContent = `<p>Please sign your contract by clicking this link: <a href=\"${secure_link}\">${secure_link}</a></p>`;
        // if (pdf_url) {
        //     htmlContent += `<p>View/Download your signed contract: <a href=\"${pdf_url}\">${pdf_url}</a></p>`;
        // }

        // const res = await fetch("https://api.resend.com/emails", {
        //     method: "POST",
        //     headers: {
        //         "Content-Type": "application/json",
        //         Authorization: `Bearer ${RESEND_API_KEY}`,
        //     },
        //     body: JSON.stringify({
        //         from: SENDER_EMAIL,
        //         to: to_email,
        //         subject: subject,
        //         html: htmlContent,
        //     }),
        // });

        // if (!res.ok) {
        //     const errorData = await res.json();
        //     console.error("Failed to send email:", errorData);
        //     return new Response("Failed to send email", { status: 500 });
        // }

        return new Response("Email sending initiated successfully", { status: 200 });
    } catch (error) {
        console.error("Error processing email request:", error);
        return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
});
