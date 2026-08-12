import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the void message', () => {
  render(<App />);
  const message = screen.getByText(/have some fun in the void/i);
  expect(message).toBeInTheDocument();
});
