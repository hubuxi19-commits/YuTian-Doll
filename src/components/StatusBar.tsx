type StatusBarProps = {
  connectionLabel: string
  readOnly: boolean
  onExport: () => void
  onShare: () => void
  onReset: () => void
}

export function StatusBar({ connectionLabel, readOnly, onExport, onShare, onReset }: StatusBarProps) {
  return (
    <div className="top-actions">
      <span className="presence-pill"><i /> {connectionLabel}</span>
      <button className="soft-button" onClick={onExport}>下载图片</button>
      {!readOnly ? <button className="soft-button" onClick={onShare}>分享成品</button> : null}
      {!readOnly ? <button className="soft-button" onClick={onReset}>重新搭配</button> : null}
    </div>
  )
}
