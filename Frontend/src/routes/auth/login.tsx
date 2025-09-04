import { LoginForm, type LoginFormValues } from '@/components/login_form';
import { api } from '@/main';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AxiosError } from 'axios';

export const Route = createFileRoute('/auth/login')({
  component: LoginComponent,
});

function LoginComponent() {
  const navigate = useNavigate();

  async function handleSubmit(values: LoginFormValues): Promise<void> {
    try {
      const { username, password } = values;
      await api.post('/auth/login', { username, password });

      localStorage.setItem('username', username);

      await navigate({ to: '/dashboard' });
    } catch (error) {
      if (error instanceof AxiosError && 'status' in error && error.status === 500) {
        console.error('Server error: ', error);
      } else {
        console.log('Login failed:', error);
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <LoginForm onSubmit={handleSubmit} />
      <a href="/auth/register" className="mt-4 text-blue-500 hover:underline">
        Don't have an account? Register here
      </a>
    </div>
  );
}
