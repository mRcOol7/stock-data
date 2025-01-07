import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

test('renders without crashing', async () => {
  render(<App />);
  
  await waitFor(() => {
    const appElement = screen.getByTestId('app-container');
    expect(appElement).toBeInTheDocument();
  });
});
