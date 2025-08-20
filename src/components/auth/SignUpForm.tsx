import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, MessageSquare, AlertCircle } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';

interface SignUpFormData {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
}

interface ValidationError {
  field: keyof SignUpFormData;
  message: string;
}

export function SignUpForm() {
  const [formData, setFormData] = useState<SignUpFormData>({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const signUp = useAuthStore((state) => state.signUp);
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];

    // Name validation
    if (!formData.name.trim()) {
      newErrors.push({ field: 'name', message: 'Nome é obrigatório' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.push({ field: 'email', message: 'Email inválido' });
    }

    // Phone validation
    const phoneRegex = /^[0-9+\-\s()]*$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.push({ field: 'phone', message: 'Telefone inválido' });
    }

    // Birth date validation
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      if (birthDate > today) {
        newErrors.push({ field: 'birthDate', message: 'Data de nascimento inválida' });
      }
    }

    // Password validation
    if (formData.password.length < 8) {
      newErrors.push({ field: 'password', message: 'Senha deve ter no mínimo 8 caracteres' });
    }

    if (!/[A-Z]/.test(formData.password)) {
      newErrors.push({ field: 'password', message: 'Senha deve conter pelo menos uma letra maiúscula' });
    }

    if (!/[0-9]/.test(formData.password)) {
      newErrors.push({ field: 'password', message: 'Senha deve conter pelo menos um número' });
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.push({ field: 'confirmPassword', message: 'Senhas não coincidem' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccess(false);

    // Rate limiting check
    if (attempts >= 5) {
      setErrors([{ field: 'email', message: 'Muitas tentativas. Tente novamente mais tarde.' }]);
      return;
    }

    // CAPTCHA validation
    if (!captchaToken) {
      setErrors([{ field: 'email', message: 'Por favor, complete o CAPTCHA' }]);
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setAttempts(prev => prev + 1);
      
      await signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        birthDate: formData.birthDate,
        captchaToken
      });

      setSuccess(true);
      console.info('Signup successful:', { email: formData.email, timestamp: new Date().toISOString() });
      
      setTimeout(() => {
        navigate('/app');
      }, 2000);
    } catch (err) {
      console.error('Signup failed:', { email: formData.email, timestamp: new Date().toISOString(), error: err });
      setErrors([{ field: 'email', message: 'Falha no cadastro. Tente novamente.' }]);
    }
  };

  const getFieldError = (field: keyof SignUpFormData) => 
    errors.find(error => error.field === field)?.message;

  return (
    <div className="min-h-screen flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516321497487-e288fb19713f')] opacity-20 bg-cover bg-center" />
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <MessageSquare className="w-20 h-20 mb-8" />
          <h1 className="text-4xl font-bold mb-4">Raytchel</h1>
          <p className="text-xl text-center text-indigo-100 max-w-md">
            Transforme seu atendimento com inteligência artificial
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Criar nova conta</h2>
            <p className="text-gray-600">Comece sua jornada com a Raytchel</p>
          </div>

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-700">
                Cadastro realizado com sucesso! Redirecionando...
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-sm">
            {/* Form fields */}
            <div className="space-y-4">
              {/* Name field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    getFieldError('name') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getFieldError('name') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
                )}
              </div>

              {/* Email field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    getFieldError('email') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getFieldError('email') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
                )}
              </div>

              {/* Phone field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    getFieldError('phone') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getFieldError('phone') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('phone')}</p>
                )}
              </div>

              {/* Birth date field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de nascimento
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    getFieldError('birthDate') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getFieldError('birthDate') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('birthDate')}</p>
                )}
              </div>

              {/* Password fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        getFieldError('password') ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {getFieldError('password') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar senha *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      getFieldError('confirmPassword') ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {getFieldError('confirmPassword') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('confirmPassword')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* CAPTCHA */}
            <div className="flex justify-center">
              <ReCAPTCHA
                sitekey="6LdPXpEpAAAAAFXfPTF_Ux0HWabXqVnwH8OHWYMc"
                onChange={(token) => setCaptchaToken(token)}
              />
            </div>

            {/* Password requirements */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Requisitos da senha:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Mínimo de 8 caracteres
                </li>
                <li className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Pelo menos uma letra maiúscula
                </li>
                <li className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Pelo menos um número
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={attempts >= 5}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Criar conta
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-indigo-500"
              >
                Já tem uma conta? <span className="font-medium text-indigo-600">Faça login</span>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}