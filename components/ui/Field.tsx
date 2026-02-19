import { type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  id: string;
  label: string;
  value: string;
  error?: string;
  helper?: string;
  onChange: (value: string) => void;
}

export default function Field({
  id,
  label,
  value,
  error,
  helper,
  onChange,
  className,
  ...props
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
        {label}
      </label>

      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "min-h-[44px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[16px] outline-none ring-brand-600/20 transition focus:ring",
          error ? "border-red-300" : "",
          className,
        )}
        {...props}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : helper ? <p className="text-xs text-gray-500">{helper}</p> : null}
    </div>
  );
}
