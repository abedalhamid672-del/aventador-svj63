import { SPECS, type Spec } from '../data/specs';

export type SpecKey = keyof typeof SPECS;

const formatValue = (spec: Spec) =>
  `${spec.prefix ? `${spec.prefix} ` : ''}${spec.value.toLocaleString('en-US', { minimumFractionDigits: spec.decimals, maximumFractionDigits: spec.decimals })}`;

/** Specs as a real definition list: every figure stays selectable, searchable text. */
export function SpecList({ keys }: { readonly keys: readonly SpecKey[] }) {
  return (
    <dl className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
      {keys.map((key) => {
        const spec: Spec = SPECS[key];
        return (
          <div key={key} data-fade className="border-t border-[var(--hairline-red)] pt-3">
            <dt className="text-sm text-smoke">{spec.label}</dt>
            <dd className="mt-1 font-mono text-2xl text-white tabular">
              {spec.prefix && `${spec.prefix} `}
              <span data-count={spec.value} data-decimals={spec.decimals}>
                {formatValue({ ...spec, prefix: undefined })}
              </span>{' '}
              <span className="text-base text-smoke">{spec.unit}</span>
              {spec.qualifier && <span className="block text-sm text-smoke">{spec.qualifier}</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export { formatValue };
