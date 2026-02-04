import { type DragEvent, useState } from 'react';
import {
  Type,
  ImageIcon,
  Eye,
  Box,
  Eraser,
  Maximize2,
  Minimize2,
  Grid3X3,
  LayoutGrid,
  Palette,
  Wand2,
  Crop,
  Layers,
  Download,
  Upload,
  Hash,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Shapes,
  RotateCw,
  Repeat,
  ScanSearch,
  SearchCheck,
  Diamond,
  Flame,
  Scissors,
  Sparkles,
  Paintbrush,
  Dices,
  Film,
  Search,
  X,
} from 'lucide-react';
import { legacyNodeDefinitions as nodeDefinitions, nodeCategories, type NodeType } from '../nodes';
import { cn } from '../../lib/utils';

const nodeIcons: Record<NodeType, typeof Type> = {
  textPrompt: Type,
  imageUpload: Upload,
  number: Hash,
  styleReference: Paintbrush,
  seedControl: Dices,
  imageGen: ImageIcon,
  isometricTile: Diamond,
  spriteSheet: Film,
  model3DGen: Box,
  kilnGen: Flame,
  batchGen: Sparkles,
  removeBg: Eraser,
  resize: Maximize2,
  compress: Minimize2,
  crop: Crop,
  pixelate: Grid3X3,
  tile: LayoutGrid,
  colorPalette: Palette,
  filter: Wand2,
  combine: Layers,
  rotate: RotateCw,
  iterate: Repeat,
  analyze: ScanSearch,
  qualityCheck: SearchCheck,
  sliceSheet: Scissors,
  preview: Eye,
  save: Download,
  exportGLB: Shapes,
  exportSheet: LayoutGrid,
};

export function NodePalette() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    input: true,
    generate: true,
    process: true,
    output: true,
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const categories = Object.entries(nodeCategories) as [keyof typeof nodeCategories, (typeof nodeCategories)[keyof typeof nodeCategories]][];

  const filteredNodes = nodeDefinitions.filter((def) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      def.label.toLowerCase().includes(query) ||
      def.description.toLowerCase().includes(query)
    );
  });

  // Collapsed view - just show icons
  if (isCollapsed) {
    return (
      <div className="absolute left-4 top-4 z-10 flex flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center justify-center p-2 hover:bg-[var(--bg-tertiary)]"
          title="Expand palette"
        >
          <ChevronRight className="h-5 w-5 text-[var(--text-secondary)]" />
        </button>
        <div className="border-t border-[var(--border-color)]">
          {categories.map(([categoryKey, category]) => (
            <div
              key={categoryKey}
              className="flex items-center justify-center p-2"
              title={category.label}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center border-t border-[var(--border-color)] p-2">
          <Shapes className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute left-4 top-4 z-10 flex max-h-[calc(100vh-32px)] w-56 flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Node Palette</h3>
          <p className="text-xs text-[var(--text-secondary)]">Drag nodes to canvas</p>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
          title="Collapse palette"
        >
          <ChevronLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
      </div>

      <div className="border-b border-[var(--border-color)] px-2 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] py-1 pl-7 pr-7 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchQuery ? (
          <div className="flex flex-col gap-1 p-2">
            {filteredNodes.map((def) => {
              const Icon = nodeIcons[def.type];
              const category = nodeCategories[def.category];
              return (
                <div
                  key={def.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, def.type)}
                  className={cn(
                    'flex cursor-grab items-center gap-2 rounded border px-2 py-1.5 transition-colors active:cursor-grabbing',
                    'border-[var(--border-color)] bg-[var(--bg-tertiary)]',
                    'hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)]'
                  )}
                  title={def.description}
                >
                  <Icon
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: category.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-[var(--text-primary)]">
                      {def.label}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredNodes.length === 0 && (
              <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                No nodes match "{searchQuery}"
              </div>
            )}
          </div>
        ) : (
          categories.map(([categoryKey, category]) => {
          const categoryNodes = nodeDefinitions.filter((def) => def.category === categoryKey);
          const isExpanded = expandedCategories[categoryKey];

          return (
            <div key={categoryKey} className="border-b border-[var(--border-color)] last:border-b-0">
              <button
                onClick={() => toggleCategory(categoryKey)}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[var(--bg-tertiary)]"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                    {category.label}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">({categoryNodes.length})</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
                )}
              </button>

              {isExpanded && (
                <div className="flex flex-col gap-1 px-2 pb-2">
                  {categoryNodes.map((def) => {
                    const Icon = nodeIcons[def.type];
                    return (
                      <div
                        key={def.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, def.type)}
                        className={cn(
                          'flex cursor-grab items-center gap-2 rounded border px-2 py-1.5 transition-colors active:cursor-grabbing',
                          'border-[var(--border-color)] bg-[var(--bg-tertiary)]',
                          'hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)]'
                        )}
                        title={def.description}
                      >
                        <Icon
                          className="h-4 w-4 flex-shrink-0"
                          style={{ color: category.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-[var(--text-primary)]">
                            {def.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }))}
      </div>

      <div className="border-t border-[var(--border-color)] px-3 py-2">
        <div className="flex gap-1 text-xs text-[var(--text-secondary)]">
          <span className="rounded bg-[var(--bg-tertiary)] px-1">Drag</span>
          <span>to add</span>
        </div>
      </div>
    </div>
  );
}
