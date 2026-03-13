import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { authApi } from '../api/auth';
import { Button } from '../components/Button';
import { FormField, Input } from '../components/FormField';
import { ErrorAlert } from '../components/ErrorAlert';
import { useState } from 'react';

const schema = z.object({
  full_name: z.string().min(2, 'Full name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenant_name: z.string().min(2, 'Organization name required'),
  tenant_slug: z
    .string()
    .min(2, 'Slug required')
    .regex(/^[a-z0-9-]+$/, 'Slug: lowercase letters, numbers, hyphens only'),
});

type FormValues = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    try {
      await authApi.register(values);
      navigate('/login', { state: { registered: true } });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setServerError(axiosErr?.response?.data?.detail || 'Registration failed. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/30">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 text-sm mt-1">Start tracking your finances</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && <ErrorAlert message={serverError} />}

            <FormField label="Full Name" error={errors.full_name?.message} required>
              <Input placeholder="Jane Smith" error={!!errors.full_name} {...register('full_name')} />
            </FormField>

            <FormField label="Email" error={errors.email?.message} required>
              <Input type="email" placeholder="you@example.com" error={!!errors.email} {...register('email')} />
            </FormField>

            <FormField label="Password" error={errors.password?.message} required>
              <Input type="password" placeholder="Min 8 characters" error={!!errors.password} {...register('password')} />
            </FormField>

            <FormField
              label="Organization Name"
              error={errors.tenant_name?.message}
              required
              hint="Your company or personal finance workspace name"
            >
              <Input placeholder="Acme Corp" error={!!errors.tenant_name} {...register('tenant_name')} />
            </FormField>

            <FormField
              label="Workspace Slug"
              error={errors.tenant_slug?.message}
              required
              hint="Unique identifier, e.g. acme-corp"
            >
              <Input placeholder="acme-corp" error={!!errors.tenant_slug} {...register('tenant_slug')} />
            </FormField>

            <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
