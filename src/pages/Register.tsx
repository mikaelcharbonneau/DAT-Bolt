import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, Form, FormField, TextInput, Text, Heading } from 'grommet';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, User } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (value: { email: string; password: string; name: string }) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signUp({
        email: value.email,
        password: value.password,
        options: {
          data: {
            name: value.name,
          },
        },
      });

      if (error) throw error;

      navigate('/login', { 
        state: { message: 'Registration successful! Please check your email to verify your account.' }
      });
    } catch (error) {
      const err = error as Error;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      fill
      align="center"
      justify="center"
      pad="medium"
      background="light-2"
    >
      <Box
        width="medium"
        pad="large"
        background="white"
        round="small"
        elevation="small"
      >
        <Heading level={2} margin={{ top: 'none', bottom: 'medium' }} textAlign="center">
          Create Account
        </Heading>
        
        <Form onSubmit={({ value }) => handleSubmit(value)}>
          <FormField name="name" label="Full Name">
            <TextInput
              name="name"
              icon={<User size={20} />}
              placeholder="Enter your full name"
              required
            />
          </FormField>

          <FormField name="email" label="Email">
            <TextInput
              name="email"
              icon={<Mail size={20} />}
              placeholder="Enter your email"
              type="email"
              required
            />
          </FormField>
          
          <FormField name="password" label="Password">
            <TextInput
              name="password"
              icon={<Lock size={20} />}
              placeholder="Create a password"
              type="password"
              required
            />
          </FormField>

          {error && (
            <Box margin={{ vertical: 'small' }} background="status-error" pad="small" round="small">
              <Text size="small" color="white">{error}</Text>
            </Box>
          )}

          <Button
            type="submit"
            primary
            label={loading ? 'Creating account...' : 'Create Account'}
            disabled={loading}
            margin={{ top: 'medium', bottom: 'small' }}
          />
        </Form>

        <Box align="center" margin={{ top: 'medium' }}>
          <Text size="small">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 hover:underline">
              Sign in
            </Link>
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default Register;