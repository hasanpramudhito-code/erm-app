import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './pages/Login';

jest.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({
    login: jest.fn(),
  }),
}));

test('renders login form for unauthenticated users', () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: 'Masuk' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument();
  expect(screen.getByText(/Masukkan kredensial Anda/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText('nama@email.com')).toBeInTheDocument();
});
