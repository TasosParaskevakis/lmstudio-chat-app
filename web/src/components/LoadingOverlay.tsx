type Props = { visible: boolean, text?: string }
export function LoadingOverlay({ visible, text }: Props) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
      <div className="bg-white rounded shadow px-6 py-4">
        <div className="font-medium">{text || 'Loading...'}</div>
      </div>
    </div>
  );
}

