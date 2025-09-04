import { RegistrationForm, type RegistrationFormValues } from '@/components/registration_form';
import { api } from '@/main';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AxiosError } from 'axios';

export const Route = createFileRoute('/auth/register')({
  component: RegisterComponent,
});

function RegisterComponent() {
  const navigate = useNavigate();

  async function handleSubmit(values: RegistrationFormValues): Promise<void> {
    try {
      const { username, password } = values;
      await api.post('/auth/register', { username, password });

      localStorage.setItem('username', username);

      await navigate({ to: '/dashboard' });
    } catch (error) {
      if (error instanceof AxiosError && 'status' in error && error.status === 500) {
        console.error('Server error: ', error);
      } else {
        console.log('Registration failed:', error);
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      <RegistrationForm onSubmit={handleSubmit} />
      <a href ="/auth/login" className="mt-4 text-blue-500 hover:underline">
        Already have an account? Login here
      </a>
    </div>
  );
}
