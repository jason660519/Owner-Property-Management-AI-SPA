// TODO: Wire up Supabase signUp action
// AU differences from TW:
//   - Social login: Google + Apple (no Line)
//   - Terms link should reference Australian privacy policy
//   - Default region = 'AU', currency = 'AUD' set on users_profile after signup

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md p-8 rounded-xl bg-bg-secondary border border-border-default">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Create account</h1>
      <p className="text-text-muted text-sm mb-8">Australia platform</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Full name</label>
          <input
            type="text"
            placeholder="Jane Smith"
            className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Email</label>
          <input
            type="email"
            placeholder="you@example.com.au"
            className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Password</label>
          <input
            type="password"
            placeholder="Min. 8 characters"
            className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">I am a</label>
          <select className="w-full px-4 py-2.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:border-accent">
            <option value="landlord">Landlord / Property Owner</option>
            <option value="potential_tenant">Tenant (looking to rent)</option>
            <option value="potential_buyer">Buyer (looking to purchase)</option>
            <option value="agent">Licensed Real Estate Agent</option>
          </select>
        </div>
        <button className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors">
          Create account
        </button>
      </div>

      <p className="mt-4 text-xs text-text-muted text-center">
        By signing up you agree to our{' '}
        <a href="/terms" className="text-accent hover:underline">Terms of Service</a>
        {' '}and{' '}
        <a href="/privacy" className="text-accent hover:underline">Privacy Policy</a>
        {' '}(Australian Privacy Act 1988)
      </p>

      <div className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <a href="/login" className="text-accent hover:underline">Sign in</a>
      </div>
    </div>
  );
}
