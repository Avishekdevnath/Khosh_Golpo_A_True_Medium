export type SelectionMutation = {
  nextValue: string;
  selectionStart: number;
  selectionEnd: number;
};

type PrefixedBlockArgs = {
  value: string;
  start: number;
  end: number;
  selected: string;
  prefix: string;
  placeholder: string;
};

function trimBlockSelection(content: string): string {
  return content.replace(/^\n+/, "").replace(/\n+$/, "");
}

function mapPrefixedLines(content: string, prefix: string): string {
  return content
    .split("\n")
    .map((line) => (line.length > 0 ? `${prefix}${line}` : prefix.trimEnd()))
    .join("\n");
}

export function createPrefixedBlockMutation({
  value,
  start,
  end,
  selected,
  prefix,
  placeholder,
}: PrefixedBlockArgs): SelectionMutation {
  const beforeText = value.slice(0, start).replace(/[ \t]+$/, "");
  const afterText = value.slice(end).replace(/^[ \t]+/, "");
  const content = trimBlockSelection(selected || placeholder);
  const nextBlock = mapPrefixedLines(content, prefix);

  const leadingSeparator = beforeText.length === 0 || beforeText.endsWith("\n") ? "" : "\n\n";
  const trailingSeparator = afterText.length === 0 || afterText.startsWith("\n") ? "" : "\n\n";
  const blockStart = beforeText.length + leadingSeparator.length;

  return {
    nextValue: `${beforeText}${leadingSeparator}${nextBlock}${trailingSeparator}${afterText}`,
    selectionStart: blockStart,
    selectionEnd: blockStart + nextBlock.length,
  };
}
