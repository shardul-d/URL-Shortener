import { LoginForm, type LoginFormValues } from '@/components/login_form';
import { api } from '@/main';
import { createFileRoute } from '@tanstack/react-router';
import { AxiosError } from 'axios';

export const Route = createFileRoute('/auth/login')({
  component: LoginComponent,
});

function LoginComponent() {
  async function handleSubmit(values: LoginFormValues): Promise<void> {
    try {
      const { username, password } = values;
      const response = await api.post('/auth/login', { username, password });

      console.log('Login successful:', response.data);
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
    </div>
  );
}
