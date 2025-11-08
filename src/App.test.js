import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve([]),
    }),
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders dictionary title', async () => {
  await act(async () => {
    render(<App />);
  });
  const heading = await screen.findByRole('heading', {
    name: /uyghur dictionary/i,
  });
  expect(heading).toBeInTheDocument();
});
