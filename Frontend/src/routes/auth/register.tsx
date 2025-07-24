import { RegistrationForm, type RegistrationFormValues } from '@/components/registration_form';
import { api } from '@/main';
import { createFileRoute } from '@tanstack/react-router';
import { AxiosError } from 'axios';

export const Route = createFileRoute('/auth/register')({
  component: RegisterComponent,
});

function RegisterComponent() {
  async function handleSubmit(values: RegistrationFormValues): Promise<void> {
    try {
      const { username, password } = values;
      const response = await api.post('/auth/register', { username, password });

      console.log('Registration successful:', response.data);
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
    </div>
  );
}
