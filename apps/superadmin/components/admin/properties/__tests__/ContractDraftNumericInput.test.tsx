import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumericInput } from '../ContractDraftNumericInput';

describe('NumericInput', () => {
  it('accepts integer input and calls onChange with parsed number', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<NumericInput value={0} onChange={onChange} aria-label="amount" />);

    const input = screen.getByLabelText('amount');
    await user.clear(input);
    await user.type(input, '12345');

    expect(input).toHaveDisplayValue('12345');
    expect(onChange).toHaveBeenLastCalledWith(12345);
  });

  it('strips non-numeric characters from integer input', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<NumericInput value={0} onChange={onChange} aria-label="amount" />);

    const input = screen.getByLabelText('amount');
    await user.clear(input);
    await user.type(input, 'abc123def');

    expect(input).toHaveDisplayValue('123');
  });

  it('accepts decimal input when allowDecimal is true', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<NumericInput value={0} onChange={onChange} allowDecimal aria-label="rate" />);

    const input = screen.getByLabelText('rate');
    await user.clear(input);
    await user.type(input, '3.14');

    expect(input).toHaveDisplayValue('3.14');
    expect(onChange).toHaveBeenLastCalledWith(3.14);
  });

  it('clamps value within min/max range', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<NumericInput value={5} onChange={onChange} min={1} max={31} aria-label="day" />);

    const input = screen.getByLabelText('day');
    await user.clear(input);
    await user.type(input, '99');

    expect(onChange).toHaveBeenLastCalledWith(31);
  });

  it('allows empty value when allowEmpty is true', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<NumericInput value={100} onChange={onChange} allowEmpty aria-label="penalty" />);

    const input = screen.getByLabelText('penalty');
    await user.clear(input);

    expect(input).toHaveDisplayValue('');
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('falls back to min on blur when cleared and allowEmpty is false', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <div>
        <NumericInput value={5} onChange={onChange} min={1} aria-label="count" />
        <button>other</button>
      </div>,
    );

    const input = screen.getByLabelText('count');
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'other' }));

    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(input).toHaveDisplayValue('1');
  });

  it('selects all text on focus for easy overwriting', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<NumericInput value={25800000} onChange={onChange} aria-label="price" />);

    const input = screen.getByLabelText('price');
    await user.click(input);

    // After click, input should have selection — type to overwrite
    await user.keyboard('30000000');

    expect(input).toHaveDisplayValue('30000000');
    expect(onChange).toHaveBeenLastCalledWith(30000000);
  });

  it('does not update display while focused when parent value changes', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <NumericInput value={100} onChange={onChange} aria-label="val" />,
    );

    const input = screen.getByLabelText('val');
    await user.click(input);
    // click triggers select-all, so typing replaces the selection
    await user.keyboard('999');

    // Simulate parent re-render with different value
    rerender(<NumericInput value={200} onChange={onChange} aria-label="val" />);

    // Should keep user's typed value (999), not jump to parent's 200
    expect(input).toHaveDisplayValue('999');
  });

  it('removes leading zeros for integer input', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<NumericInput value={''} onChange={onChange} allowEmpty aria-label="num" />);

    const input = screen.getByLabelText('num');
    await user.type(input, '007');

    expect(input).toHaveDisplayValue('7');
  });
});
