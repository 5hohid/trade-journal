// A row of tap-friendly radio "chips". options: strings or { value, label }.
export default function Chips({ name, options, value, onChange, kind = '' }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const cls = kind === 'dir' ? (v === 'Buy' ? 'buy' : 'sell') : kind;
        return (
          <label key={v} className={'chip ' + cls}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
            <span>{label}</span>
          </label>
        );
      })}
    </div>
  );
}
