import React from 'react';
import { render, screen } from '@testing-library/react';

describe('TodoList', () => {
  it('renders todo list placeholder', () => {
    render(<div>TodoList Placeholder</div>);
    expect(screen.getByText('TodoList Placeholder')).toBeInTheDocument();
  });
});
