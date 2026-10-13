type Option = { id: string; name: string }

/** Seleção múltipla em etiquetas: toque para marcar ou desmarcar. */
export default function ChipPicker({ legend, hint, options, value, onChange }: {
  legend: string
  hint?: string
  options: Option[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.id)}
              className={`min-h-9 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                on ? 'border-ink bg-ink font-medium text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
              }`}
            >
              {o.name}
            </button>
          )
        })}
      </div>
      {hint && <p className="mt-2 text-xs text-zinc-500">{hint}</p>}
    </fieldset>
  )
}
