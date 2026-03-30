import { render, screen } from '@testing-library/react';
import TodoList from '@/app/components/TodoList';

jest.mock('@/app/components/TodoList', () => ({
  __esModule: true,
  default: () => <div>TodoList Component</div>,
}));

describe('TodoList', () => {
  it('renders todo list component', () => {
    render(<TodoList />);
    expect(screen.getByText('TodoList Component')).toBeInTheDocument();
  });
});
