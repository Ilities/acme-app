import { FormField } from './FormField';
import styles from './CardFields.module.css';

export function parseExpiry(value: string): { expMonth: number; expYear: number } | null {
  const match = value.trim().match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) return null;
  const expMonth = Number(match[1]);
  const year = Number(match[2]);
  if (expMonth < 1 || expMonth > 12) return null;
  return { expMonth, expYear: year < 100 ? 2000 + year : year };
}

export function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

interface CardFieldsProps {
  number: string;
  expiry: string;
  cvc: string;
  onNumberChange: (value: string) => void;
  onExpiryChange: (value: string) => void;
  onCvcChange: (value: string) => void;
}

/** Card number, expiry and CVC inputs, shared by plan checkout and booking deposits. */
export function CardFields({
  number,
  expiry,
  cvc,
  onNumberChange,
  onExpiryChange,
  onCvcChange,
}: CardFieldsProps) {
  return (
    <>
      <FormField
        label="Card number"
        inputMode="numeric"
        autoComplete="cc-number"
        value={number}
        onChange={(event) => onNumberChange(formatCardNumber(event.target.value))}
        required
      />
      <div className={styles.row}>
        <FormField
          label="Expiry"
          placeholder="MM/YY"
          autoComplete="cc-exp"
          value={expiry}
          onChange={(event) => onExpiryChange(event.target.value)}
          required
        />
        <FormField
          label="CVC"
          inputMode="numeric"
          autoComplete="cc-csc"
          maxLength={4}
          value={cvc}
          onChange={(event) => onCvcChange(event.target.value.replace(/\D/g, ''))}
          required
        />
      </div>
    </>
  );
}
