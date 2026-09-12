import { loginRequestSchema } from '@leadradar/shared';
import { useState, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { messageForError, useLogin } from '../features/auth/useLogin';

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const errorMessage =
    validationMessage ?? (loginMutation.isError ? messageForError(loginMutation.error) : null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setValidationMessage(null);

    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      // Deliberately generic: never name which field failed against an account.
      setValidationMessage('Enter a valid email address and password.');
      return;
    }

    try {
      await loginMutation.mutateAsync(parsed.data);
      await navigate('/', { replace: true });
    } catch {
      // Rendered from the mutation's error state below.
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-background px-4 py-12 text-foreground">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-foreground">Sign in to LeadRadar</h1>
        <p className="mt-1 text-sm text-muted">Use your owner account.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground-secondary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground-secondary">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus"
            />
          </div>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-md border border-danger bg-danger-surface px-3 py-2 text-sm text-danger"
            >
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-app-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
