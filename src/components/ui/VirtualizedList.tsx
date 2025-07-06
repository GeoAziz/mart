import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import React from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  width?: number | string;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  width = '100%',
  renderItem,
}: VirtualizedListProps<T>) {
  const Row = ({ index, style }: ListChildComponentProps) => (
    <div style={style}>
      {renderItem(items[index], index)}
    </div>
  );

  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width={width}
    >
      {Row}
    </List>
  );
}
