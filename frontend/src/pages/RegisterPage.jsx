import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { School, Eye, EyeOff, Building2, User, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';

const registerSchema = z.object({
  school_name: z.string().min(2, 'School name must be at least 2 characters'),
  school_address: z.string().optional(),
  school_city: z.string().optional(),
  school_country: z.string().optional(),
  school_phone: z.string().optional(),
  school_email: z.string().email('Invalid email').optional().or(z.literal('')),
  admin_email: z.string().email('Invalid email address'),
  admin_password: z.string().min(8, 'Password must be at least 8 characters'),
  admin_first_name: z.string().min(1, 'First name is required'),
  admin_last_name: z.string().min(1, 'Last name is required'),
  admin_phone: z.string().optional(),
});

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('school');
  const { register: registerSchool } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      school_name: '',
      school_address: '',
      school_city: '',
      school_country: '',
      school_phone: '',
      school_email: '',
      admin_email: '',
      admin_password: '',
      admin_first_name: '',
      admin_last_name: '',
      admin_phone: '',
    },
  });

  const handleNextStep = async () => {
    const isValid = await trigger(['school_name']);
    if (isValid) {
      setStep('admin');
    }
  };

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      await registerSchool(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mb-4">
            <School className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">EdOS</h1>
          <p className="text-gray-600 mt-1">Register your school</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Create an account</CardTitle>
            <CardDescription className="text-center">
              Set up your school management system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Tabs value={step} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="school" onClick={() => setStep('school')}>
                    <Building2 className="w-4 h-4 mr-2" />
                    School Info
                  </TabsTrigger>
                  <TabsTrigger value="admin" onClick={() => setStep('admin')}>
                    <User className="w-4 h-4 mr-2" />
                    Admin Account
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="school" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="school_name">School Name *</Label>
                    <Input
                      id="school_name"
                      placeholder="Enter school name"
                      {...register('school_name')}
                      data-testid="register-school-name"
                    />
                    {errors.school_name && (
                      <p className="text-sm text-red-500">{errors.school_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="school_address">Address</Label>
                    <Input
                      id="school_address"
                      placeholder="School address"
                      {...register('school_address')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="school_city">City</Label>
                      <Input
                        id="school_city"
                        placeholder="City"
                        {...register('school_city')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school_country">Country</Label>
                      <Input
                        id="school_country"
                        placeholder="Country"
                        {...register('school_country')}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="school_phone">Phone</Label>
                      <Input
                        id="school_phone"
                        placeholder="Phone number"
                        {...register('school_phone')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school_email">School Email</Label>
                      <Input
                        id="school_email"
                        type="email"
                        placeholder="info@school.edu"
                        {...register('school_email')}
                      />
                    </div>
                  </div>

                  <Button type="button" className="w-full" onClick={handleNextStep}>
                    Next: Admin Account
                  </Button>
                </TabsContent>

                <TabsContent value="admin" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin_first_name">First Name *</Label>
                      <Input
                        id="admin_first_name"
                        placeholder="First name"
                        {...register('admin_first_name')}
                        data-testid="register-first-name"
                      />
                      {errors.admin_first_name && (
                        <p className="text-sm text-red-500">{errors.admin_first_name.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin_last_name">Last Name *</Label>
                      <Input
                        id="admin_last_name"
                        placeholder="Last name"
                        {...register('admin_last_name')}
                        data-testid="register-last-name"
                      />
                      {errors.admin_last_name && (
                        <p className="text-sm text-red-500">{errors.admin_last_name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin_email">Admin Email *</Label>
                    <Input
                      id="admin_email"
                      type="email"
                      placeholder="admin@school.edu"
                      {...register('admin_email')}
                      data-testid="register-email"
                    />
                    {errors.admin_email && (
                      <p className="text-sm text-red-500">{errors.admin_email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin_password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="admin_password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        {...register('admin_password')}
                        data-testid="register-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.admin_password && (
                      <p className="text-sm text-red-500">{errors.admin_password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin_phone">Phone Number</Label>
                    <Input
                      id="admin_phone"
                      placeholder="Your phone number"
                      {...register('admin_phone')}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading} data-testid="register-submit">
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </TabsContent>
              </Tabs>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
