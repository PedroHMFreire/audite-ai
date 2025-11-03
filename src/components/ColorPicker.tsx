import { useState } from 'react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  colors?: string[]
}

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#8B5A3C', // Brown
  '#6B7280', // Gray
  '#1F2937', // Dark Gray
  '#059669', // Emerald
  '#DC2626'  // Dark Red
]

export default function ColorPicker({ value, onChange, colors = DEFAULT_COLORS }: ColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customColor, setCustomColor] = useState(value)

  const handleCustomSubmit = () => {
    onChange(customColor)
    setShowCustom(false)
  }

  return (
    <div className="space-y-3">
      {/* Preset Colors */}
      <div className="flex gap-2 flex-wrap">
        {colors.map(color => (
          <button
            key={color}
            type="button"
            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-105 ${
              value === color 
                ? 'border-zinc-900 dark:border-zinc-100 scale-110' 
                : 'border-zinc-300 dark:border-zinc-600'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            title={color}
          />
        ))}
        
        {/* Custom Color Button */}
        <button
          type="button"
          className="w-8 h-8 rounded-full border-2 border-dashed border-zinc-400 dark:border-zinc-500 flex items-center justify-center text-zinc-500 hover:border-zinc-600 dark:hover:border-zinc-400 transition-colors"
          onClick={() => setShowCustom(!showCustom)}
          title="Cor personalizada"
        >
          +
        </button>
      </div>

      {/* Custom Color Input */}
      {showCustom && (
        <div className="flex gap-2 items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <input
            type="color"
            value={customColor}
            onChange={e => setCustomColor(e.target.value)}
            className="w-10 h-8 rounded border-0 cursor-pointer"
          />
          <input
            type="text"
            value={customColor}
            onChange={e => setCustomColor(e.target.value)}
            className="input flex-1 text-sm"
            placeholder="#000000"
            pattern="^#[0-9A-Fa-f]{6}$"
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            className="badge"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setShowCustom(false)}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Current Color Preview */}
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <div 
          className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-600"
          style={{ backgroundColor: value }}
        />
        <span>Cor selecionada: {value}</span>
      </div>
    </div>
  )
}