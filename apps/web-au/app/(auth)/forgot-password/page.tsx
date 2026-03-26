// TODO: Wire up Supabase resetPasswordForEmail action

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md p-8 rounded-xl bg-bg-secondary border border-border-default">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Reset password</h1>
      <p className="text-text-muted text-sm mb-8">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Email</label>
          <input
            type="email"
            placeholder="you@example.com.au"
            className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <button className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors">
          Send reset link
        </button>
      </div>

      <div className="mt-6 text-center text-sm text-text-muted">
        <a href="/login" className="text-accent hover:underline">← Back to sign in</a>
      </div>
    </div>
  );
}
